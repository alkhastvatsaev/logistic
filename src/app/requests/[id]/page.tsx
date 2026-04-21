"use client";

import { useEffect, useState } from "react";
import { rtdb, rtdbRef, onValue, set, push, update } from "@/lib/firebase";
import { motion } from "framer-motion";
export const dynamic = "force-dynamic";
import { ArrowLeft, Share, Copy, CheckCircle, Trash2, Edit3, Save } from "lucide-react";
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

  const EUR_RMB_RATE = 0.13;

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
    if (!acceptedQuote) return null;

    const costRMB = (parseFloat(acceptedQuote.priceRMB.toString()) || 0) + (parseFloat(acceptedQuote.shippingCostRMB.toString()) || 0);
    const costEUR = costRMB * EUR_RMB_RATE;
    const sPrice = parseFloat(sellingPrice) || 0;
    const profit = sPrice - costEUR;
    const paid = payments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
    const balance = sPrice - paid;

    return { costEUR, sPrice, profit, paid, balance };
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
      const prodDays = Number(quote.productionTimeDays) || 7;
      const shippingDays = 7; // Shenzhen -> France Fixed
      const totalDays = prodDays + shippingDays;
      
      const productionDeadline = Date.now() + (prodDays * 24 * 60 * 60 * 1000);
      const deliveryEstimation = Date.now() + (totalDays * 24 * 60 * 60 * 1000);

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
    <div className="layout" style={{ paddingTop: '40px', paddingBottom: '100px' }}>
      {/* HEADER 2026 */}
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => router.back()} style={{ 
          background: 'var(--glass-bg)', 
          border: '1px solid var(--glass-border)',
          width: '44px',
          height: '44px',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent)',
          backdropFilter: 'blur(10px)'
        }}>
          <ArrowLeft size={22} />
        </button>
        <div style={{ textAlign: 'right' }}>
           <h1 className="title" style={{ fontSize: '24px' }}>Détails</h1>
           <p className="subtitle" style={{ fontSize: '13px' }}>Projet en cours</p>
        </div>
      </header>

      {/* SECTION 1: PHOTO HERO */}
      <div style={{ position: 'relative', marginBottom: '40px' }}>
        {request.imageUrl && (
          <div style={{ 
            borderRadius: 'var(--radius-lg)', 
            overflow: 'hidden', 
            background: 'var(--glass-bg)', 
            border: '1px solid var(--glass-border)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
            <img src={request.imageUrl} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain' }} />
          </div>
        )}
        <div style={{ 
          marginTop: '20px',
          padding: '0 10px'
        }}>
           <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-1px', margin: 0 }}>{request.title}</h2>
           <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <span style={{ padding: '6px 12px', background: 'var(--success)', color: '#fff', borderRadius: '20px', fontSize: '12px', fontWeight: 800 }}>{request.status.replace(/_/g, ' ')}</span>
              <span style={{ padding: '6px 12px', background: 'var(--glass-bg)', color: 'var(--faded)', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>ID: {params.id.slice(0,6)}</span>
           </div>
        </div>
      </div>

      {/* SECTION 2: GESTION & CALENDRIER */}
      <p style={{ padding: '0 20px 10px 20px', fontSize: '14px', fontWeight: 800, color: 'var(--faded)' }}>TIMELINE & VALIDATION</p>
      <div className="list-group">
        {request.deliveryEstimation && (
          <div className="row-item" style={{ background: 'rgba(0, 122, 255, 0.08)', borderBottom: 'none', margin: '10px', borderRadius: '20px' }}>
             <label style={{ color: 'var(--accent)' }}>Estimation Livraison</label>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                   <p style={{ fontSize: '11px', color: 'var(--faded)', margin: 0 }}>Sortie Usine</p>
                   <p style={{ fontSize: '15px', fontWeight: 800 }}>{new Date(request.productionDeadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                </div>
                <div style={{ height: '2px', flex: 1, background: 'var(--accent)', opacity: 0.2, margin: '0 15px' }}></div>
                <div style={{ textAlign: 'right' }}>
                   <p style={{ fontSize: '11px', color: 'var(--faded)', margin: 0 }}>Arrivée France</p>
                   <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--success)' }}>{new Date(request.deliveryEstimation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                </div>
             </div>
          </div>
        )}
        
        {request.status === 'MANAGER_REVIEW' && (
          <div className="row-item">
            <a 
              href={`https://wa.me/33607808501?text=${encodeURIComponent(`Validation pour ${request.title} en taille ${request.size}\n${window.location.origin}/review/${params.id}`)}`}
              target="_blank" rel="noopener noreferrer" className="btn" style={{ width: '100%', background: '#25D366', border: 'none', borderRadius: '20px' }}
            >
              Envoyer Validation WhatsApp
            </a>
          </div>
        )}

        <div className="row-item" style={{ borderBottom: 'none' }}>
           <label>Changer Statut Manuel</label>
           <select value={request.status} onChange={(e) => moveNextStep(e.target.value)} style={{ background: 'transparent', fontWeight: 800, fontSize: '18px', color: 'var(--accent)', padding: 0 }}>
              <option value="WAITING_FOR_QUOTE">Attente Devis</option>
              <option value="QUOTED">Devis Reçus</option>
              <option value="MANAGER_REVIEW">Review Mirza</option>
              <option value="WAITING_FOR_DEPOSIT">Attente Acompte</option>
              <option value="IN_PRODUCTION">En Production</option>
              <option value="FINAL_PAYMENT">Attente Solde</option>
              <option value="SHIPPED">Expédié</option>
              <option value="DELIVERED">Terminé</option>
           </select>
        </div>
      </div>

      {/* SECTION 5: FINANCE 2026 */}
      <p style={{ padding: '0 20px 10px 20px', fontSize: '14px', fontWeight: 800, color: 'var(--faded)' }}>FINANCE & PROFIT</p>
      <div className="list-group">
        <div className="row-item">
          <label>Prix Vente (€)</label>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
             <input type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} style={{ fontSize: '32px', fontWeight: 800, background: 'transparent', padding: 0 }} />
             <button className="btn" onClick={updateSellingPrice} style={{ padding: '12px', borderRadius: '15px' }}><Save size={20} /></button>
          </div>
        </div>

        {getFinancialTotals() && (
          <div className="row-item" style={{ borderBottom: 'none', background: 'rgba(52, 199, 89, 0.05)', margin: '10px', borderRadius: '20px' }}>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                   <p style={{ fontSize: '11px', color: 'var(--faded)', margin: 0 }}>BÉNÉFICE NET</p>
                   <p style={{ fontSize: '24px', fontWeight: 800, color: 'var(--success)' }}>{getFinancialTotals()?.profit.toFixed(0)} €</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <p style={{ fontSize: '11px', color: 'var(--faded)', margin: 0 }}>PART PERS. (50%)</p>
                   <p style={{ fontSize: '24px', fontWeight: 800 }}>{(getFinancialTotals()?.profit! / 2).toFixed(0)} €</p>
                </div>
             </div>
             <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid var(--separator)', fontSize: '14px', fontWeight: 600 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--faded)' }}>Reçu (€)</span>
                  <span style={{ color: 'var(--success)' }}>{getFinancialTotals()?.paid.toFixed(0)} €</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--faded)' }}>Reste (€)</span>
                  <span style={{ color: getFinancialTotals()?.balance! > 0 ? 'var(--danger)' : 'var(--success)' }}>{getFinancialTotals()?.balance.toFixed(0)} €</span>
                </div>
             </div>
          </div>
        )}

        <div className="row-item" style={{ borderBottom: 'none' }}>
           <button className="btn btn-ghost" style={{ width: '100%', borderRadius: '20px', height: '60px' }} onClick={() => generatePDF('QUOTE')}>
              Générer Devis Client PDF
           </button>
           <button className="btn btn-ghost" style={{ width: '100%', borderRadius: '20px', height: '60px', marginTop: '10px' }} onClick={() => generatePDF('INVOICE')}>
              Récapitulatif Interne PDF
           </button>
        </div>
      </div>

      {/* SECTION 3: USINES 2026 */}
      <p style={{ padding: '0 20px 10px 20px', fontSize: '14px', fontWeight: 800, color: 'var(--faded)' }}>USINES & DEVIS</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <button onClick={generateSupplierLink} className="btn" style={{ background: 'var(--foreground)', color: 'var(--background)', borderRadius: '20px' }}>
          {generatingLink ? '...' : <><Share size={20} /> Nouveau Lien Usine</>}
        </button>

        {quotes.map(q => (
          <div key={q.id} className="card" style={{ border: request.acceptedQuoteId === q.id ? '2px solid var(--accent)' : '1px solid var(--glass-border)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{q.supplierName}</h4>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>¥{q.priceRMB}</p>
             </div>
             <p style={{ fontSize: '13px', color: 'var(--faded)', margin: '8px 0' }}>Or: {q.goldWeight}g • Tot: {q.totalWeight}g • {q.productionTimeDays}j</p>
             <button 
               className="btn" 
               style={{ width: '100%', height: '40px', fontSize: '14px', marginTop: '10px' }}
               onClick={() => acceptQuote(q)}
               disabled={request.status !== 'QUOTED'}
             >
                {request.acceptedQuoteId === q.id ? "DEVIS ACCEPTÉ" : "ACCEPTER"}
             </button>
          </div>
        ))}
      </div>

      {/* FOOTER ACTIONS */}
      <div style={{ marginTop: '40px', padding: '0 10px' }}>
         <div className="list-group">
            <div className="row-item" style={{ borderBottom: 'none' }}>
               <label>Taille Bijou</label>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '24px', fontWeight: 800 }}>{request.size}</span>
                  <button className="btn btn-ghost" style={{ padding: '10px' }} onClick={() => setIsEditingSize(true)}><Edit3 size={20} /></button>
               </div>
            </div>
         </div>
         <button className="btn btn-ghost" style={{ width: '100%', color: 'var(--danger)', borderColor: 'rgba(255,59,48,0.2)' }} onClick={async () => { if (confirm("Détruire ce projet ?")) { await set(rtdbRef(rtdb, `requests/${params.id}`), null); router.push("/"); }}}>
            <Trash2 size={18} /> Supprimer Définitivement
         </button>
      </div>

      {copiedLink && <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ position: 'fixed', bottom: 40, left: 20, right: 20, background: 'var(--foreground)', color: 'var(--background)', padding: '20px', borderRadius: '24px', textAlign: 'center', fontWeight: 800, zIndex: 100, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>LIEN COPIÉ ✓</motion.div>}
    </div>
  );
}
