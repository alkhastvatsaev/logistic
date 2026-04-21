"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { ArrowLeft, Share, Copy, CheckCircle, PackageSearch } from "lucide-react";
import Link from "next/link";
import { SupplierRequest } from "../../page";

interface Quote {
  id: string;
  shareTokenId: string;
  supplierName: string;
  priceRMB: number;
  totalWeight: number;
  goldWeight: number;
  diamondCount: number;
  diamondType: string;
  totalCarat: number;
  shippingCostRMB: number;
  productionTimeDays: number;
  createdAt: number;
}

export default function RequestDetail({ params }: { params: { id: string } }) {
  const [request, setRequest] = useState<SupplierRequest & { imageUrl?: string, acceptedQuoteId?: string, trackingNumber?: string } | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState("");

  const EUR_RMB_RATE = 0.13;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docRef = doc(db, "requests", params.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRequest({ id: docSnap.id, ...docSnap.data() } as any);
        }

        const q = query(collection(db, "quotes"), where("requestId", "==", params.id));
        const quoteSnaps = await getDocs(q);
        const fetchedQuotes = quoteSnaps.docs.map(d => ({ id: d.id, ...d.data() })) as Quote[];
        setQuotes(fetchedQuotes);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.id]);

  const generateSupplierLink = async () => {
    setGeneratingLink(true);
    try {
      const tokenRef = await addDoc(collection(db, "shareTokens"), {
        requestId: params.id,
        createdAt: Date.now(),
        used: false
      });
      
      const link = `${window.location.origin}/q/${tokenRef.id}`;
      await navigator.clipboard.writeText(link);
      setCopiedLink(link);
      setTimeout(() => setCopiedLink(""), 4000);
    } catch (e) {
      alert("Failed to generate link");
    } finally {
      setGeneratingLink(false);
    }
  };

  const acceptQuote = async (quote: Quote) => {
    if (!confirm("Confirm and move this to production?")) return;
    
    try {
      const deadline = Date.now() + (quote.productionTimeDays * 24 * 60 * 60 * 1000);
      await updateDoc(doc(db, "requests", params.id), {
        status: "IN_PRODUCTION",
        acceptedQuoteId: quote.id,
        acceptedTokenId: quote.shareTokenId,
        productionDeadline: deadline
      });
      setRequest(prev => prev ? { ...prev, status: "IN_PRODUCTION", acceptedQuoteId: quote.id } : null);
    } catch (error) {
      alert("Failed to accept quote");
    }
  };

  if (loading) return <div className="layout py-20 text-center animate-pulse">Loading core database...</div>;
  if (!request) return <div className="layout py-20 text-center">Request not found.</div>;

  const isLocked = ["IN_PRODUCTION", "SHIPPED", "DELIVERED"].includes(request.status);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Link href="/" className="btn btn-ghost mb-8" style={{ padding: "8px 16px" }}>
        <ArrowLeft size={16} /> Back
      </Link>

      <header style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="title">{request.title}</h1>
          <p className="subtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              display: 'inline-block', 
              padding: '4px 8px', 
              borderRadius: '4px', 
              backgroundColor: request.status === 'SHIPPED' ? 'rgba(0,255,0,0.1)' : 'var(--border)', 
              color: request.status === 'SHIPPED' ? '#22c55e' : 'var(--foreground)',
              fontSize: '0.8rem',
              fontWeight: 600
            }}>
              {request.status.replace(/_/g, ' ')}
            </span>
          </p>
        </div>
        {!isLocked && (
          <button className="btn" onClick={generateSupplierLink} disabled={generatingLink}>
            {generatingLink ? <span className="animate-spin">⟳</span> : <Share size={18} />}
            <span>Generate Supplier Link</span>
          </button>
        )}
      </header>

      {copiedLink && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="card mb-8"
          style={{ backgroundColor: 'rgba(0, 255, 0, 0.05)', border: '1px solid rgba(0, 255, 0, 0.2)', display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.9rem', color: '#22c55e' }}>Link generated and copied to clipboard!</span>
            <CheckCircle size={18} className="text-green-500" />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a 
              href={`https://wa.me/?text=${encodeURIComponent(`Hello! Please provide a quote for this new jewelry piece: ${copiedLink}`)}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-ghost" 
              style={{ flex: 1, backgroundColor: '#25D366', color: 'white', border: 'none' }}
            >
              Send via WhatsApp
            </a>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => navigator.clipboard.writeText(`Hello! Please provide a quote for this piece: ${copiedLink}`)}>
              Copy WeChat Message
            </button>
          </div>
        </motion.div>
      )}

      {request.status === 'SHIPPED' && request.trackingNumber && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="card mb-8" style={{ border: '1px solid #22c55e', backgroundColor: 'rgba(34, 197, 94, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <PackageSearch size={24} className="text-green-500" />
            <div>
              <h3 style={{ fontWeight: 600, color: '#22c55e' }}>FedEx Shipment Active</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--faded)' }}>Tracking number attached to this order.</p>
            </div>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, letterSpacing: '1px' }}>
            {request.trackingNumber}
          </div>
        </motion.div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: '16px', fontSize: '1rem' }}>Reference Specs</h3>
          {request.imageUrl ? (
            <img src={request.imageUrl} alt={request.title} style={{ width: '100%', borderRadius: 'var(--radius)', objectFit: 'cover', aspectRatio: '1/1' }} />
          ) : (
            <div style={{ padding: '48px', textAlign: 'center', background: 'rgba(0,0,0,0.05)', borderRadius: 'var(--radius)', color: 'var(--faded)', fontSize: '0.9rem' }}>
              No image
            </div>
          )}
        </div>

        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>
            {isLocked ? "Accepted Quote" : "Supplier Quotes"}
          </h2>
          {quotes.length === 0 ? (
            <div className="card text-center text-faded py-12" style={{ fontSize: '0.9rem' }}>
              No quotes yet. Send link via WhatsApp.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {quotes.map(q => {
                if (isLocked && q.id !== request.acceptedQuoteId) return null;

                const totalRMB = Number(q.priceRMB) + Number(q.shippingCostRMB);
                const totalEUR = totalRMB * EUR_RMB_RATE;
                const isAccepted = q.id === request.acceptedQuoteId;

                return (
                  <div key={q.id} className="card" style={{ 
                    display: 'flex', flexDirection: 'column', gap: '16px',
                    border: isAccepted ? '1px solid var(--foreground)' : '1px solid var(--border)' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ fontWeight: 600, fontSize: '1.1rem' }}>{q.supplierName || "Supplier"}</h4>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>€{totalEUR.toFixed(2)}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--faded)' }}>¥{totalRMB}</div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--faded)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <span>Gold: {q.goldWeight}g</span>
                      <span>Diamonds: {q.diamondCount} ({q.totalCarat}ct)</span>
                      <span>Type: {q.diamondType}</span>
                      <span>Prod: {q.productionTimeDays}d</span>
                    </div>

                    {!isLocked && (
                      <button className="btn" style={{ width: '100%', padding: '10px', fontSize: '0.9rem' }} onClick={() => acceptQuote(q)}>
                        Accept Quote
                      </button>
                    )}
                    {isLocked && (
                      <div style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, opacity: 0.5 }}>LOCK ACTIVE</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
