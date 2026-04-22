"use client";

import { useEffect, useState } from "react";
import { rtdb, rtdbRef, onValue, set, push, update } from "@/lib/firebase";
import { motion } from "framer-motion";
import { calculateFinancialTotals, calculateDeliveryDates } from "@/lib/logic";
export const dynamic = "force-dynamic";
import { ArrowLeft, Share, Copy, CheckCircle, Trash2, Edit3, Save, Package, Clock, Truck, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

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
  const [request, setRequest] = useState<any | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState("");
  const [isEditingSize, setIsEditingSize] = useState(false);
  const [newSize, setNewSize] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReceipt, setPaymentReceipt] = useState("");
  const [payments, setPayments] = useState<any[]>([]);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [sellingPrice, setSellingPrice] = useState("");

  const sizeOptions = Array.from({ length: 15 }, (_, i) => (49 + i).toString())
    .concat(Array.from({ length: 9 }, (_, i) => (14 + i).toString() + " cm"))
    .concat(["38 cm", "40 cm", "42 cm", "45 cm", "50 cm", "55 cm", "60 cm", "70 cm", "80 cm"]);

  useEffect(() => {
    const requestRef = rtdbRef(rtdb, `requests/${params.id}`);
    const unsubsRequest = onValue(requestRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setRequest({ id: params.id, ...data });
        if (data.trackingNumber) setTrackingNumber(data.trackingNumber);
        if (data.sellingPrice) setSellingPrice(data.sellingPrice.toString());
      }
    });

    const quotesRef = rtdbRef(rtdb, `quotes/${params.id}`);
    const unsubsQuotes = onValue(quotesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ ...data[key], id: key }));
        setQuotes(list);
      } else {
        setQuotes([]);
      }
      setLoading(false);
    });

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

    return () => { unsubsRequest(); unsubsQuotes(); unsubsPay(); };
  }, [params.id]);

  const updateSellingPrice = async () => {
    try {
      await update(rtdbRef(rtdb, `requests/${params.id}`), { sellingPrice: parseFloat(sellingPrice) });
      alert("Prix de vente enregistré");
    } catch (e) { alert("Erreur"); }
  };

  const getFinancialTotals = () => {
    const acceptedQuote = quotes.find(q => q.id === request?.acceptedQuoteId);
    return calculateFinancialTotals(acceptedQuote, sellingPrice, payments);
  };

  const generateSupplierLink = async () => {
    setGeneratingLink(true);
    try {
      const newTokenRef = push(rtdbRef(rtdb, "shareTokens"));
      await set(newTokenRef, { requestId: params.id, createdAt: Date.now(), used: false });
      const link = `${window.location.origin}/q/${newTokenRef.key}`;
      try { await navigator.clipboard.writeText(link); } catch(e) {}
      setCopiedLink(link);
      setTimeout(() => setCopiedLink(""), 4000);
    } catch (e: any) {
      alert(`Erreur Lien : ${e.message}`);
    } finally {
      setGeneratingLink(false);
    }
  };

  const acceptQuote = async (quote: Quote) => {
    if (!confirm("Accepter ce devis et lancer la production ?")) return;
    try {
      const { productionDeadline, deliveryEstimation } = calculateDeliveryDates(quote.productionTimeDays);

      const updates: any = {};
      updates[`requests/${params.id}/status`] = "IN_PRODUCTION";
      updates[`requests/${params.id}/acceptedQuoteId`] = quote.id;
      updates[`requests/${params.id}/acceptedTokenId`] = quote.shareTokenId;
      updates[`requests/${params.id}/productionDeadline`] = productionDeadline;
      updates[`requests/${params.id}/deliveryEstimation`] = deliveryEstimation;
      updates[`requests/${params.id}/updatedAt`] = Date.now();
      
      await update(rtdbRef(rtdb), updates);
    } catch (error) { alert("Erreur acceptation"); }
  };

  const moveNextStep = async (nextStatus: string) => {
    try {
      await update(rtdbRef(rtdb, `requests/${params.id}`), { status: nextStatus, updatedAt: Date.now() });
    } catch (e) { alert("Erreur status"); }
  };

  const updateTracking = async () => {
    try {
      await update(rtdbRef(rtdb, `requests/${params.id}`), { trackingNumber });
      alert("Suivi FedEx enregistré");
    } catch (e) { alert("Erreur tracking"); }
  };

  const updateSize = async () => {
    try {
      await update(rtdbRef(rtdb, `requests/${params.id}`), { size: newSize });
      setIsEditingSize(false);
    } catch (e) { alert("Erreur taille"); }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setIsUploadingReceipt(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      setPaymentReceipt(ev.target?.result as string);
      setIsUploadingReceipt(false);
    };
    reader.readAsDataURL(e.target.files[0]);
  };

  const saveRIAPayment = async () => {
    try {
      const paymentRef = push(rtdbRef(rtdb, `payments/${params.id}`));
      await set(paymentRef, { amount: paymentAmount, receiptUrl: paymentReceipt, createdAt: Date.now() });
      setPaymentAmount(""); setPaymentReceipt("");
      alert("Paiement enregistré");
    } catch (e) { alert("Erreur paiement"); }
  };

  if (loading) return <div className="layout py-20 text-center animate-pulse">Chargement...</div>;
  if (!request) return <div className="layout py-20 text-center">Projet non trouvé.</div>;

  const generatePDF = (type: 'QUOTE' | 'INVOICE') => {
    alert(`Génération du ${type === 'QUOTE' ? 'Devis (Mirza)' : 'Recap Facture (Interne)'} en cours...`);
  };

  return (
    <div className="layout" style={{ paddingBottom: '140px', backgroundColor: 'var(--background)' }}>
      {/* 2030: HERO HEADER (Immersive Image) */}
      <div style={{ position: 'relative', height: '400px', width: '100%', marginBottom: '24px' }}>
        {request.imageUrl ? (
          <img 
            src={request.imageUrl} 
            alt={request.title} 
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} 
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(45deg, #111, #333)' }} />
        )}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,1) 100%)' }} />
        
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '24px', display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={() => router.back()} style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: 'none', color: '#fff', width: '48px', height: '48px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={20} />
          </button>
          <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', color: '#fff', padding: '0 16px', height: '48px', borderRadius: '24px', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em' }}>
            {request.status.replace(/_/g, ' ')}
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px' }}>
          <h1 className="title" style={{ fontSize: 'clamp(32px, 8vw, 48px)' }}>{request.title}</h1>
          <p className="subtitle">ID: {params.id.slice(0, 8).toUpperCase()} • SIZE {request.size || 'STD'}</p>
        </div>
      </div>

      <div style={{ padding: '0 24px' }}>
        {/* FINANCE WIDGET (Glass) */}
        <div className="widget-glass" style={{ marginBottom: '40px' }}>
          <label style={{ color: 'var(--accent)', fontWeight: 700 }}>SELLING PRICE (EUR)</label>
          <input 
            className="ghost-input"
            type="number" 
            value={sellingPrice} 
            onChange={e => setSellingPrice(e.target.value)} 
            onBlur={updateSellingPrice}
            placeholder="0.00"
            style={{ color: sellingPrice ? '#fff' : 'var(--faded)' }}
          />
          {getFinancialTotals() && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px' }}>
               <div>
                  <span style={{ fontSize: '11px', color: 'var(--faded)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Profit</span>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>{getFinancialTotals()?.profit.toFixed(0)} €</div>
               </div>
               <div>
                  <span style={{ fontSize: '11px', color: 'var(--faded)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Split 50/50</span>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginTop: '4px' }}>{(getFinancialTotals()?.profit! / 2).toFixed(0)} €</div>
               </div>
            </div>
          )}
        </div>

        {/* QUOTES WIDGET */}
        <div className="widget-glass" style={{ border: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
             <div style={{ width: '8px', height: '8px', background: 'var(--accent)', borderRadius: '50%' }} />
             <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff', letterSpacing: '0.1em' }}>FACTORY QUOTES</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {quotes.map(q => (
              <div key={q.id} className="widget" style={{ marginBottom: 0, border: request.acceptedQuoteId === q.id ? '1px solid var(--accent)' : '1px solid var(--separator)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 800 }}>{q.supplierName}</h4>
                      <p style={{ fontSize: '12px', color: 'var(--faded)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Au {q.goldWeight}g • {q.totalCarat}ct • {q.productionTimeDays} Days</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--accent)' }}>¥{q.priceRMB}</p>
                    </div>
                 </div>
                 
                 <div style={{ marginTop: '24px' }}>
                   {request.acceptedQuoteId === q.id ? (
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', fontSize: '14px', fontWeight: 700 }}>
                        <CheckCircle size={18} /> QUOTE ACCEPTED
                     </div>
                   ) : (
                     <button 
                       className="btn-cyber" 
                       style={{ background: 'transparent', border: '1px solid var(--separator)', padding: '12px', fontSize: '14px' }}
                       onClick={() => acceptQuote(q)}
                       disabled={request.status !== 'QUOTED'}
                     >
                        SELECT QUOTE
                     </button>
                   )}
                 </div>
              </div>
            ))}
            {quotes.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--faded)', fontSize: '14px', letterSpacing: '0.05em', border: '1px dashed var(--separator)', borderRadius: '24px' }}>
                AWAITING TRANSMISSION...
              </div>
            )}
          </div>
        </div>

        {/* TIMELINE NEON */}
        {request.deliveryEstimation && (
          <div className="widget-glass" style={{ border: 'none', marginTop: '32px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
               <Clock size={16} color="var(--accent)" />
               <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff', letterSpacing: '0.1em' }}>TIMELINE</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--secondary-bg)', padding: '16px 24px', borderRadius: '16px' }}>
                <div>
                   <p style={{ fontSize: '11px', color: 'var(--faded)', margin: '0 0 4px 0', textTransform: 'uppercase' }}>Factory Done</p>
                   <p style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>{new Date(request.productionDeadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</p>
                </div>
                <div style={{ flex: 1, borderTop: '2px dashed var(--separator)', margin: '0 16px' }} />
                <div style={{ textAlign: 'right' }}>
                   <p style={{ fontSize: '11px', color: 'var(--accent)', margin: '0 0 4px 0', textTransform: 'uppercase' }}>Arrival (Paris)</p>
                   <p style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: 0 }}>{new Date(request.deliveryEstimation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</p>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* DYNAMIC ISLAND TOOLBAR : Floating Action Pill */}
      <div className="floating-pill-container">
         <div className="floating-pill" style={{ padding: '8px', justifyContent: 'center' }}>
           {request.status === 'WAITING_FOR_QUOTE' && (
             <button className="btn-cyber accent" onClick={generateSupplierLink} disabled={generatingLink}>
               <Share size={20} /> {generatingLink ? 'LINKING...' : 'SHARE TO FACTORY'}
             </button>
           )}
           {request.status === 'QUOTED' && quotes.length > 0 && (
             <div style={{ color: 'var(--faded)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', padding: '16px 0' }}>
               SELECT FACTORY QUOTE ABOVE
             </div>
           )}
           {request.status === 'MANAGER_REVIEW' && (
             <a href={`https://wa.me/33607808501?text=${encodeURIComponent(`Validation. T${request.size}\n${window.location.origin}/review/${params.id}`)}`} target="_blank" rel="noopener noreferrer" className="btn-cyber" style={{ background: '#00FF66', color: '#000' }}>
               <ShieldCheck size={20} /> ASK REVIEW (MIRZA)
             </a>
           )}
           {request.status === 'WAITING_FOR_DEPOSIT' && (
             <button className="btn-cyber accent" onClick={() => moveNextStep('IN_PRODUCTION')}>
               DEPOSIT RECEIVED (START)
             </button>
           )}
           {request.status === 'IN_PRODUCTION' && (
             <button className="btn-cyber" style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)' }} onClick={() => moveNextStep('SHIPPED')}>
               <Truck size={20} /> MARK EXPEDITED
             </button>
           )}
           {request.status === 'SHIPPED' && (
             <button className="btn-cyber accent" onClick={() => moveNextStep('DELIVERED')}>
               <Package size={20} /> VERIFY DELIVERY
             </button>
           )}
           {request.status === 'DELIVERED' && (
             <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
               <button className="btn-cyber" style={{ flex: 1, padding: '16px 0', fontSize: '13px' }} onClick={() => generatePDF('QUOTE')}>PDF Devis</button>
               <button className="btn-cyber" style={{ flex: 1, background: 'rgba(255,255,255,0.1)', padding: '16px 0', fontSize: '13px' }} onClick={() => generatePDF('INVOICE')}>PDF Facture</button>
             </div>
           )}
         </div>
      </div>

      {copiedLink && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: '#000', padding: '12px 24px', borderRadius: '100px', fontWeight: 800, fontSize: '12px', letterSpacing: '0.1em', zIndex: 9999 }}>
          LINK COPIED TO CLIPBOARD
        </motion.div>
      )}
    </div>
  );
}
