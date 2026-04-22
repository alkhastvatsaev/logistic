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
    <div className="layout" style={{ paddingTop: '24px', paddingBottom: '140px' }}>
      {/* NATIVE HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', marginBottom: '24px' }}>
        <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '17px', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
          <ArrowLeft size={22} /> Retour
        </button>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--faded)', textTransform: 'uppercase' }}>
          {request.status.replace(/_/g, ' ')}
        </div>
      </header>

      {/* CORE INFO */}
      <div style={{ padding: '0 16px', marginBottom: '32px' }}>
        {request.imageUrl && (
          <img 
            src={request.imageUrl} 
            alt={request.title} 
            style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain', borderRadius: '12px', background: 'var(--secondary-bg)', marginBottom: '16px' }} 
          />
        )}
        <h1 className="title">{request.title}</h1>
        <p className="subtitle">ID: {params.id.slice(0, 8).toUpperCase()} • Taille {request.size || 'STD'}</p>
      </div>

      {/* FINANCE (AUTO-SAVE) */}
      <div className="list-group">
        <div className="row-item" style={{ padding: '16px' }}>
          <label>Prix de Vente Client (€)</label>
          <input 
            type="number" 
            value={sellingPrice} 
            onChange={e => setSellingPrice(e.target.value)} 
            onBlur={updateSellingPrice}
            placeholder="0.00" 
            style={{ fontSize: '34px', fontWeight: 700, padding: 0, marginTop: '4px', color: sellingPrice ? 'var(--foreground)' : 'var(--faded)' }} 
          />
        </div>

        {getFinancialTotals() && (
          <div className="row-item" style={{ background: 'var(--background)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '15px' }}>Bénéfice Net</span>
                <span style={{ fontSize: '17px', fontWeight: 600, color: 'var(--success)' }}>{getFinancialTotals()?.profit.toFixed(0)} €</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '15px' }}>Part par pers.</span>
                <span style={{ fontSize: '17px', fontWeight: 600 }}>{(getFinancialTotals()?.profit! / 2).toFixed(0)} €</span>
             </div>
          </div>
        )}
      </div>

      {/* QUOTES */}
      <div className="list-group">
        {quotes.map(q => (
          <div key={q.id} className="row-item">
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>{q.supplierName}</h4>
                <p style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>¥{q.priceRMB}</p>
             </div>
             <p style={{ fontSize: '13px', color: 'var(--faded)', margin: '0 0 12px 0' }}>Or {q.goldWeight}g • Diam: {q.diamondCount} ({q.totalCarat}ct) • {q.productionTimeDays}j</p>
             {request.acceptedQuoteId === q.id ? (
               <span style={{ fontSize: '14px', color: 'var(--success)', fontWeight: 600 }}>Accepté ✓</span>
             ) : (
               <button 
                 style={{ width: 'auto', alignSelf: 'flex-start', background: 'transparent', color: 'var(--accent)', border: 'none', fontSize: '15px', fontWeight: 600, padding: 0 }}
                 onClick={() => acceptQuote(q)}
                 disabled={request.status !== 'QUOTED'}
               >
                  Accepter ce devis
               </button>
             )}
          </div>
        ))}
        {quotes.length === 0 && (
          <div className="row-item" style={{ textAlign: 'center', color: 'var(--faded)', fontSize: '15px', border: 'none' }}>
            Aucun devis reçu pour l'instant.
          </div>
        )}
      </div>

      {/* TIMELINE */}
      {request.deliveryEstimation && (
        <div className="list-group">
           <div className="row-item">
             <label>Calendrier Estimé</label>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                <div>
                   <p style={{ fontSize: '13px', color: 'var(--faded)', margin: 0 }}>Prod. Usine</p>
                   <p style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>{new Date(request.productionDeadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <p style={{ fontSize: '13px', color: 'var(--faded)', margin: 0 }}>Arrivée France</p>
                   <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--success)', margin: 0 }}>{new Date(request.deliveryEstimation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                </div>
             </div>
           </div>
        </div>
      )}

      {/* ADVANCED OVERRIDE (HIDDEN) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px', opacity: 0.5 }}>
         <select value={request.status} onChange={(e) => moveNextStep(e.target.value)} style={{ width: 'auto', fontSize: '13px', color: 'var(--faded)', padding: 0, fontWeight: 500 }}>
             <option value="WAITING_FOR_QUOTE">Override: Attente Devis</option>
             <option value="QUOTED">Override: Devis Reçus</option>
             <option value="MANAGER_REVIEW">Override: Review Mirza</option>
             <option value="WAITING_FOR_DEPOSIT">Override: Attente Acompte</option>
             <option value="IN_PRODUCTION">Override: En Production</option>
             <option value="SHIPPED">Override: Expédié</option>
             <option value="DELIVERED">Override: Terminé</option>
         </select>
         <button style={{ border: 'none', background: 'transparent', color: 'var(--danger)', fontSize: '13px' }} onClick={async () => { if (confirm("Supprimer ce projet ?")) { await set(rtdbRef(rtdb, `requests/${params.id}`), null); router.push("/"); }}}>
            Supprimer
         </button>
      </div>

      {/* NATIVE APPLE TOOLBAR (Contextual Actions) */}
      <div className="tool-bar">
         {request.status === 'WAITING_FOR_QUOTE' && (
           <button className="btn" style={{ width: '100%' }} onClick={generateSupplierLink} disabled={generatingLink}>
             {generatingLink ? 'Création...' : 'Partager Lien Usine'}
           </button>
         )}
         {request.status === 'QUOTED' && quotes.length > 0 && (
           <div style={{ textAlign: 'center', fontWeight: 600, color: 'var(--faded)', fontSize: '15px' }}>
             Analysez et acceptez un devis ci-dessus
           </div>
         )}
         {request.status === 'MANAGER_REVIEW' && (
           <a href={`https://wa.me/33607808501?text=${encodeURIComponent(`Validation. Taille ${request.size}\n${window.location.origin}/review/${params.id}`)}`} target="_blank" rel="noopener noreferrer" className="btn" style={{ width: '100%', background: '#34C759' }}>
             Demander Validation (Mirza)
           </a>
         )}
         {request.status === 'WAITING_FOR_DEPOSIT' && (
           <button className="btn" style={{ width: '100%' }} onClick={() => moveNextStep('IN_PRODUCTION')}>
             Acompte Reçu (Lancer Prod.)
           </button>
         )}
         {request.status === 'IN_PRODUCTION' && (
           <button className="btn btn-ghost" style={{ width: '100%', border: '1.5px solid var(--accent)' }} onClick={() => moveNextStep('SHIPPED')}>
             Marquer comme Expédié
           </button>
         )}
         {request.status === 'SHIPPED' && (
           <button className="btn" style={{ width: '100%' }} onClick={() => moveNextStep('DELIVERED')}>
             Marquer comme Livré
           </button>
         )}
         {request.status === 'DELIVERED' && (
           <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
             <button className="btn btn-ghost" style={{ flex: 1, background: 'rgba(0,122,255,0.1)' }} onClick={() => generatePDF('QUOTE')}>Devis PDF</button>
             <button className="btn btn-ghost" style={{ flex: 1, background: 'rgba(0,122,255,0.1)' }} onClick={() => generatePDF('INVOICE')}>Facture PDF</button>
           </div>
         )}
      </div>

      {copiedLink && <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: 'var(--foreground)', color: 'var(--background)', padding: '12px 24px', borderRadius: '24px', textAlign: 'center', fontWeight: 600, fontSize: '14px', zIndex: 110, boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>Lien Copié</motion.div>}
    </div>
  );
}
