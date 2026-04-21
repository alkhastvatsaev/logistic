"use client";

import { useEffect, useState } from "react";
import { rtdb, rtdbRef, onValue, set, push, get, update } from "@/lib/firebase";
import { motion } from "framer-motion";
export const dynamic = "force-dynamic";
import { ArrowLeft, Share, Copy, CheckCircle, PackageSearch, Trash2, Edit3, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [request, setRequest] = useState<SupplierRequest & { imageUrl?: string, acceptedQuoteId?: string, trackingNumber?: string, size?: string } | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState("");
  const [isEditingSize, setIsEditingSize] = useState(false);
  const [newSize, setNewSize] = useState("");
  const [newCategory, setNewCategory] = useState<"Ring" | "Bracelet" | "Necklace">("Ring");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReceipt, setPaymentReceipt] = useState("");
  const [payments, setPayments] = useState<any[]>([]);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  const sizeOptions = {
    Ring: Array.from({ length: 15 }, (_, i) => (49 + i).toString()),
    Bracelet: Array.from({ length: 9 }, (_, i) => (14 + i).toString() + " cm"),
    Necklace: ["38 cm", "40 cm", "42 cm", "45 cm", "50 cm", "55 cm", "60 cm", "70 cm", "80 cm"]
  };

  const EUR_RMB_RATE = 0.13;

  useEffect(() => {
    // 1. Fetch Request
    const requestRef = rtdbRef(rtdb, `requests/${params.id}`);
    const unsubsRequest = onValue(requestRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setRequest({ id: params.id, ...data });
        if (data.trackingNumber) setTrackingNumber(data.trackingNumber);
      }
    });

    // 2. Fetch Quotes for this request
    const quotesRef = rtdbRef(rtdb, `quotes/${params.id}`);
    const unsubsQuotes = onValue(quotesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({
          ...data[key],
          id: key
        }));
        setQuotes(list);
      } else {
        setQuotes([]);
      }
      setLoading(false);
    });

    // 3. Fetch Payments
    const payRef = rtdbRef(rtdb, `payments/${params.id}`);
    const unsubsPay = onValue(payRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ ...data[key], id: key }));
        setPayments(list);
      } else {
        setPayments([]);
      }
    });

    return () => {
      unsubsRequest();
      unsubsQuotes();
      unsubsPay();
    };
  }, [params.id]);

  const generateSupplierLink = async () => {
    setGeneratingLink(true);
    try {
      const newTokenRef = push(rtdbRef(rtdb, "shareTokens"));
      await set(newTokenRef, {
        requestId: params.id,
        createdAt: Date.now(),
        used: false
      });
      
      const link = `${window.location.origin}/q/${newTokenRef.key}`;
      
      try {
        await navigator.clipboard.writeText(link);
      } catch (clipErr) {
        console.warn("Clipboard access denied, link generated anyway");
      }
      
      setCopiedLink(link);
      setTimeout(() => setCopiedLink(""), 4000);
    } catch (e: any) {
      console.error("Link Gen Error:", e);
      alert(`Failed to generate link: ${e.message}`);
    } finally {
      setGeneratingLink(false);
    }
  };

  const acceptQuote = async (quote: Quote) => {
    if (!confirm("Confirm and move this to production?")) return;
    
    try {
      const deadline = Date.now() + (quote.productionTimeDays * 24 * 60 * 60 * 1000);
      const updates: any = {};
      updates[`requests/${params.id}/status`] = "IN_PRODUCTION";
      updates[`requests/${params.id}/acceptedQuoteId`] = quote.id;
      updates[`requests/${params.id}/acceptedTokenId`] = quote.shareTokenId;
      updates[`requests/${params.id}/productionDeadline`] = deadline;
      
      await update(rtdbRef(rtdb), updates);
    } catch (error) {
      alert("Failed to accept quote");
    }
  };

  const moveNextStep = async (nextStatus: string) => {
    try {
      await update(rtdbRef(rtdb, `requests/${params.id}`), { 
        status: nextStatus,
        updatedAt: Date.now()
      });
    } catch (e) {
      alert("Status update failed");
    }
  };

  const updateTracking = async () => {
    try {
      await update(rtdbRef(rtdb, `requests/${params.id}`), { trackingNumber });
      alert("FedEx tracking updated");
    } catch (e) {
      alert("Failed to update tracking");
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setIsUploadingReceipt(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setPaymentReceipt(base64);
      setIsUploadingReceipt(false);
    };
    reader.readAsDataURL(e.target.files[0]);
  };

  const saveRIAPayment = async () => {
    try {
      const paymentRef = push(rtdbRef(rtdb, `payments/${params.id}`));
      await set(paymentRef, {
        amount: paymentAmount,
        receiptUrl: paymentReceipt,
        method: "RIA -> Alipay",
        createdAt: Date.now()
      });
      setPaymentAmount("");
      setPaymentReceipt("");
      alert("RIA Payment recorded");
    } catch (e) {
      alert("Failed to save payment");
    }
  };

  const deleteRequest = async () => {
    if (!confirm("Are you sure you want to delete this specification? This cannot be undone.")) return;
    try {
      const updates: any = {};
      updates[`requests/${params.id}`] = null;
      updates[`quotes/${params.id}`] = null;
      // We could also loop shares but it's okay for now
      await update(rtdbRef(rtdb), updates);
      router.push("/");
    } catch (e) {
      alert("Delete failed");
    }
  };

  const updateSize = async () => {
    try {
      await update(rtdbRef(rtdb, `requests/${params.id}`), { size: newSize });
      setIsEditingSize(false);
    } catch (e) {
      alert("Update failed");
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

      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="title" style={{ fontSize: '1.8rem' }}>{request.title}</h1>
          <p className="subtitle">System ID: {params.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <button className="btn btn-ghost" onClick={deleteRequest} style={{ padding: '10px', color: '#ff3b30' }}>
          <Trash2 size={20} />
        </button>
      </header>

      {/* WORKFLOW TIMELINE */}
      <div className="list-group" style={{ padding: '20px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '24px' }}>
          <div style={{ position: 'absolute', top: '10px', left: '0', right: '0', height: '2px', background: 'var(--border)', zIndex: 0 }}></div>
          {['WAITING_FOR_QUOTE', 'QUOTED', 'MANAGER_REVIEW', 'WAITING_FOR_DEPOSIT', 'IN_PRODUCTION', 'SHIPPED'].map((s, idx) => {
            const steps = ['WAITING_FOR_QUOTE', 'QUOTED', 'MANAGER_REVIEW', 'WAITING_FOR_DEPOSIT', 'IN_PRODUCTION', 'SHIPPED'];
            const currentIdx = steps.indexOf(request.status);
            const isCompleted = idx < currentIdx;
            const isActive = idx === currentIdx;
            
            return (
              <div key={s} style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{ 
                  width: '20px', 
                  height: '20px', 
                  borderRadius: '50%', 
                  background: isCompleted ? '#34c759' : isActive ? 'var(--accent)' : 'var(--background)',
                  border: isCompleted || isActive ? 'none' : '2px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {isCompleted && <CheckCircle size={12} color="white" />}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: 'center' }}>
           <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
             Current Status: {request.status.replace(/_/g, ' ')}
           </h3>
           
           <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
             {request.status === 'MANAGER_REVIEW' && (
               <div style={{ width: '100%', padding: '0 20px' }}>
                 <a 
                   href={`https://wa.me/33607808501?text=${encodeURIComponent(`Bonjour Mirza, voici une nouvelle pièce à valider :\n\n${request.title}\n${window.location.origin}/review/${params.id}`)}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="btn"
                   style={{ width: '100%', background: '#25D366', border: 'none', color: '#fff', padding: '16px', fontSize: '1rem' }}
                 >
                   Envoyer à Mirza pour Validation (WhatsApp)
                 </a>
                 <p style={{ fontSize: '0.75rem', color: 'var(--faded)', marginTop: '8px', textAlign: 'center' }}>
                   Mirza recevra un lien simplifié pour Valider ou Refuser la commande.
                 </p>
               </div>
             )}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {request.status === 'QUOTED' && (
                  <button className="btn" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => moveNextStep('MANAGER_REVIEW')}>
                    Envoyer pour Validation (MIRZA)
                  </button>
                )}
                {request.status === 'MANAGER_REVIEW' && (
                  <button className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '0.85rem', border: '1px solid var(--border)' }} onClick={() => moveNextStep('WAITING_FOR_DEPOSIT')}>
                    Passer à l'étape Paiement Acompte
                  </button>
                )}
                {request.status === 'WAITING_FOR_DEPOSIT' && (
                  <button className="btn" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => moveNextStep('IN_PRODUCTION')}>
                    Dépôt Reçu (Lancer Production)
                  </button>
                )}
                {request.status === 'IN_PRODUCTION' && (
                  <button className="btn" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => moveNextStep('FINAL_PAYMENT')}>
                    Production Terminée
                  </button>
                )}
                {request.status === 'FINAL_PAYMENT' && (
                  <button className="btn" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => moveNextStep('SHIPPED')}>
                    Solde Reçu (Prêt à Expédier)
                  </button>
                )}
                 {request.status === 'SHIPPED' && (
                  <button className="btn" style={{ padding: '8px 16px', fontSize: '0.85rem', backgroundColor: '#34c759' }} onClick={() => moveNextStep('DELIVERED')}>
                    Confirmer Réception Finale
                  </button>
                )}
              </div>
             {!isLocked && request.status !== 'QUOTED' && request.status !== 'DELIVERED' && (
                <button className="btn btn-ghost" onClick={generateSupplierLink} disabled={generatingLink} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                  {generatingLink ? <span className="animate-spin">⟳</span> : <Share size={18} />}
                  <span>Supplier Link</span>
                </button>
             )}
           </div>
        </div>
      </div>

      {copiedLink && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="list-group" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
          <div className="row-item" style={{ border: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.9rem', color: '#22c55e', fontWeight: 600 }}>Link Copied!</span>
              <CheckCircle size={18} className="text-green-500" />
            </div>
            <a 
              href={`https://wa.me/?text=${encodeURIComponent(`Hello! Please provide a quote for this new jewelry piece: ${copiedLink}`)}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn" 
              style={{ width: '100%', backgroundColor: '#25D366', border: 'none', color: 'white' }}
            >
              WhatsApp Share
            </a>
          </div>
        </motion.div>
      )}

      {request.status === 'SHIPPED' && request.trackingNumber && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="list-group" style={{ background: '#000', color: '#fff', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '4px', background: '#4D148C', borderRadius: '4px' }}>
                <PackageSearch size={16} color="white" />
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>FEDEX TRACKING</span>
            </div>
            <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{request.trackingNumber}</span>
          </div>
          
          <div style={{ position: 'relative', paddingLeft: '24px' }}>
            <div style={{ position: 'absolute', left: '7px', top: '5px', bottom: '5px', width: '2px', background: 'rgba(255,255,255,0.2)' }}></div>
            
            <div style={{ marginBottom: '16px', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '-20px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: '#ff6200' }}></div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>At Local FedEx Facility</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>Strasbourg, FR • 10:42 AM</div>
            </div>

            <div style={{ marginBottom: '16px', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '-20px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }}></div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', opacity: 0.5 }}>In Transit / International</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.3 }}>Shenzhen, CN • Yesterday</div>
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '-20px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }}></div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', opacity: 0.5 }}>Label Created</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.3 }}>FOSHAN, CN • 2 Days Ago</div>
            </div>
          </div>

          <a 
            href={`https://www.fedex.com/fedextrack/?trknbr=${request.trackingNumber}`} 
            target="_blank" 
            className="btn" 
            style={{ width: '100%', marginTop: '20px', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
          >
            Full Tracking History
          </a>
        </motion.div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
        
        {/* ADMIN: LOGISTICS */}
        <div className="list-group">
          <div style={{ padding: '16px 16px 8px 16px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent)' }}>SHIPPING DESTINATION</div>
          <div className="row-item" style={{ background: 'var(--secondary-bg)', margin: '8px 16px', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--foreground)' }}>
              <strong>SACHA BENSADOUN (laisser chez TNT)</strong><br />
              FedEx Express – Geispolsheim<br />
              4 Rue des Imprimeurs, 67118 Geispolsheim, France<br />
              Tel: +33 7 67 69 38 04
            </div>
            <button 
              className="btn btn-ghost" 
              style={{ padding: '4px 8px', fontSize: '0.7rem', marginTop: '8px', border: '1px solid var(--border)' }}
              onClick={() => {
                navigator.clipboard.writeText("SACHA BENSADOUN (laisser chez TNT), FedEx Express – Geispolsheim, 4 Rue des Imprimeurs, 67118 Geispolsheim, France. Tel: +33 7 67 69 38 04");
                alert("Address copied to clipboard!");
              }}
            >
              Copy for Supplier
            </button>
          </div>
          
          <div style={{ padding: '8px 16px 8px 16px' }}>
            <label>FedEx Tracking Number</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input 
                placeholder="Paste Tracking #" 
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value)}
                style={{ fontWeight: 600 }}
              />
              <button className="btn" onClick={updateTracking} style={{ padding: '8px 12px' }}>Save</button>
            </div>
          </div>
        </div>

        {/* ADMIN: PAYMENTS (RIA -> ALIPAY) */}
        <div className="list-group">
          <div style={{ padding: '16px 16px 8px 16px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent)' }}>RIA PAYMENT (ALIPAY)</div>
          <div className="row-item" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <label>Amount (EUR)</label>
              <input 
                type="number" 
                placeholder="e.g. 1500" 
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>RIA Receipt</label>
              <label style={{ 
                display: 'block', 
                padding: '8px', 
                background: paymentReceipt ? 'var(--accent)' : 'var(--secondary-bg)', 
                borderRadius: '8px', 
                textAlign: 'center',
                cursor: 'pointer',
                color: paymentReceipt ? '#fff' : 'var(--foreground)',
                fontSize: '0.8rem'
              }}>
                {isUploadingReceipt ? "..." : paymentReceipt ? "Ready ✓" : "+ Add Photo"}
                <input type="file" hidden accept="image/*" onChange={handleReceiptUpload} />
              </label>
            </div>
          </div>
          <div style={{ padding: '8px 16px 16px 16px' }}>
            <button 
              className="btn" 
              style={{ width: '100%' }} 
              disabled={!paymentAmount || !paymentReceipt}
              onClick={saveRIAPayment}
            >
              Record RIA Transfer
            </button>
          </div>
          {payments.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', padding: '8px 16px 16px 16px' }}>
              <label style={{ fontSize: '0.75rem', marginBottom: '8px', display: 'block', color: 'var(--faded)' }}>Payment History</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {payments.map((p, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ padding: '4px', background: '#34c759', borderRadius: '4px' }}>
                        <CheckCircle size={10} color="white" />
                      </div>
                      <span style={{ fontWeight: 500 }}>{p.amount}€</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--faded)' }}>{new Date(p.createdAt).toLocaleDateString()}</span>
                    </div>
                    {p.receiptUrl && (
                      <a href={p.receiptUrl} target="_blank" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '0.7rem' }}>Receipt</a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="list-group">
          <div className="row-item" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <label>Project Status</label>
              <select 
                value={request.status} 
                onChange={(e) => moveNextStep(e.target.value)}
                style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--accent)', padding: '4px 0', background: 'transparent', border: 'none' }}
              >
                <option value="WAITING_FOR_QUOTE">Waiting for Quote</option>
                <option value="QUOTED">Quotes Received</option>
                <option value="MANAGER_REVIEW">Manager Review (Mirza)</option>
                <option value="WAITING_FOR_DEPOSIT">Waiting for Deposit</option>
                <option value="IN_PRODUCTION">In Factory Production</option>
                <option value="FINAL_PAYMENT">Final Balance Payment</option>
                <option value="SHIPPED">Shipped (FedEx)</option>
                <option value="DELIVERED">Delivered</option>
              </select>
            </div>
          </div>

          <div className="row-item" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <label>Specification Size</label>
              {isEditingSize ? (
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <select 
                    value={newCategory}
                    onChange={(e) => {
                      const cat = e.target.value as any;
                      setNewCategory(cat);
                      setNewSize(sizeOptions[cat as keyof typeof sizeOptions][0]);
                    }}
                    style={{ padding: '4px', fontSize: '0.9rem' }}
                  >
                    <option value="Ring">Ring</option>
                    <option value="Bracelet">Bracelet</option>
                    <option value="Necklace">Necklace</option>
                  </select>
                  <select 
                    value={newSize} 
                    onChange={e => setNewSize(e.target.value)}
                    onBlur={updateSize}
                    style={{ fontWeight: 600, padding: '4px' }}
                  >
                    {sizeOptions[newCategory].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{request.size || "Not specified"}</div>
              )}
            </div>
            <button className="btn btn-ghost" style={{ padding: '8px', borderRadius: '50%' }} onClick={() => {
              setNewSize(request.size || "52");
              setNewCategory(request.size?.includes('cm') ? 'Bracelet' : request.size && parseInt(request.size) > 30 ? 'Necklace' : 'Ring');
              setIsEditingSize(true);
            }}>
              <Edit3 size={16} />
            </button>
          </div>
        </div>

        {request.imageUrl && (
          <div className="list-group" style={{ padding: '0' }}>
             <img src={request.imageUrl} alt={request.title} style={{ width: '100%', borderRadius: 'var(--radius)', objectFit: 'cover' }} />
          </div>
        )}

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
