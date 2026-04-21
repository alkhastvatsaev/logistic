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
    <div className="layout" style={{ paddingTop: '24px', paddingBottom: '60px' }}>
      {/* NATIVE HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', marginBottom: '24px' }}>
        <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '17px', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
          <ArrowLeft size={22} /> Retour
        </button>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--foreground)' }}>
          {request.status.replace(/_/g, ' ')}
        </div>
      </header>

      {/* SECTION 1: VISUAL & TITLE */}
      <div style={{ padding: '0 16px', marginBottom: '32px' }}>
        {request.imageUrl && (
          <img 
            src={request.imageUrl} 
            alt={request.title} 
            style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain', borderRadius: '12px', background: 'var(--secondary-bg)', marginBottom: '16px' }} 
          />
        )}
        <h1 className="title">{request.title}</h1>
        <p className="subtitle">ID: {params.id.slice(0, 8).toUpperCase()}</p>
      </div>

      {/* SECTION 2: TIMELINE & VALIDATION */}
      <p style={{ padding: '0 16px', fontSize: '13px', fontWeight: 600, color: 'var(--faded)', marginBottom: '8px', textTransform: 'uppercase' }}>Timeline & Validation</p>
      <div className="list-group">
        {request.deliveryEstimation && (
          <div className="row-item" style={{ background: 'rgba(0, 122, 255, 0.05)' }}>
             <label style={{ color: 'var(--accent)' }}>Calendrier Estimé</label>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <div>
                   <p style={{ fontSize: '12px', color: 'var(--faded)', margin: 0 }}>Prod. terminée</p>
                   <p style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>{new Date(request.productionDeadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                </div>
                <div style={{ height: '1px', flex: 1, background: 'var(--separator)', margin: '0 16px' }}></div>
                <div style={{ textAlign: 'right' }}>
                   <p style={{ fontSize: '12px', color: 'var(--faded)', margin: 0 }}>Arrivée prévue</p>
                   <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--success)', margin: 0 }}>{new Date(request.deliveryEstimation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                </div>
             </div>
          </div>
        )}
        
        {request.status === 'MANAGER_REVIEW' && (
          <div className="row-item">
            <a 
              href={`https://wa.me/33607808501?text=${encodeURIComponent(`Validation pour ${request.title} en taille ${request.size}\n${window.location.origin}/review/${params.id}`)}`}
              target="_blank" rel="noopener noreferrer" style={{ color: 'var(--success)', fontSize: '17px', fontWeight: 600, textDecoration: 'none', textAlign: 'center', padding: '4px 0' }}
            >
              Envoyer à Mirza WhatsApp
            </a>
          </div>
        )}

        <div className="row-item" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
           <span style={{ fontSize: '17px' }}>Statut Manuel</span>
           <select value={request.status} onChange={(e) => moveNextStep(e.target.value)} style={{ width: 'auto', textAlign: 'right', color: 'var(--faded)', padding: 0 }}>
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

      {/* SECTION 3: FINANCE & PROFIT */}
      <p style={{ padding: '0 16px', fontSize: '13px', fontWeight: 600, color: 'var(--faded)', marginBottom: '8px', textTransform: 'uppercase' }}>Finance & Profit</p>
      <div className="list-group">
        <div className="row-item">
          <label>Prix de Vente Client (€)</label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
             <input type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} placeholder="0.00" style={{ fontSize: '22px', fontWeight: 600, flex: 1, padding: 0 }} />
             <button className="btn btn-ghost" onClick={updateSellingPrice} style={{ padding: '4px' }}><Save size={20} /></button>
          </div>
        </div>

        {getFinancialTotals() && (
          <div className="row-item" style={{ background: 'var(--background)' }}>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                   <p style={{ fontSize: '12px', color: 'var(--faded)', margin: 0 }}>Bénéfice Net</p>
                   <p style={{ fontSize: '19px', fontWeight: 600, color: 'var(--success)', margin: '4px 0 0 0' }}>{getFinancialTotals()?.profit.toFixed(2)} €</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <p style={{ fontSize: '12px', color: 'var(--faded)', margin: 0 }}>Part par pers.</p>
                   <p style={{ fontSize: '19px', fontWeight: 600, color: 'var(--foreground)', margin: '4px 0 0 0' }}>{(getFinancialTotals()?.profit! / 2).toFixed(2)} €</p>
                </div>
             </div>
             
             <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '0.5px solid var(--separator)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--faded)' }}>Coût Usine & DHL</span>
                  <span>{getFinancialTotals()?.costEUR.toFixed(2)} €</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--faded)' }}>Acompte Versé</span>
                  <span style={{ color: 'var(--success)' }}>{getFinancialTotals()?.paid.toFixed(2)} €</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 600 }}>
                  <span>Reste à Payer</span>
                  <span style={{ color: getFinancialTotals()?.balance! <= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {getFinancialTotals()?.balance! <= 0 ? "Solde OK" : `${getFinancialTotals()?.balance.toFixed(2)} €`}
                  </span>
                </div>
             </div>
          </div>
        )}

        <div className="row-item" style={{ flexDirection: 'row' }}>
           <button style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '15px', padding: '8px' }} onClick={() => generatePDF('QUOTE')}>
              Générer Devis PDF
           </button>
           <div style={{ width: '0.5px', background: 'var(--separator)', margin: '0 8px' }}></div>
           <button style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '15px', padding: '8px' }} onClick={() => generatePDF('INVOICE')}>
              Recap Interne PDF
           </button>
        </div>
      </div>

      {/* SECTION 4: USINES & DEVIS */}
      <p style={{ padding: '0 16px', fontSize: '13px', fontWeight: 600, color: 'var(--faded)', marginBottom: '8px', textTransform: 'uppercase' }}>Usines & Devis</p>
      <div className="list-group">
        <div className="row-item" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '17px' }}>Nouveau Lien Usine</span>
          <button style={{ border: 'none', background: 'transparent', color: 'var(--accent)', display: 'flex', padding: '4px' }} onClick={generateSupplierLink} disabled={generatingLink}>
             {generatingLink ? 'Création...' : <Share size={20} />}
          </button>
        </div>

        {quotes.map(q => (
          <div key={q.id} className="row-item" style={{ background: request.acceptedQuoteId === q.id ? 'rgba(52, 199, 89, 0.05)' : 'transparent' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>{q.supplierName}</h4>
                <p style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>¥{q.priceRMB}</p>
             </div>
             <p style={{ fontSize: '13px', color: 'var(--faded)', margin: '0 0 12px 0' }}>Or {q.goldWeight}g • Tot {q.totalWeight}g • Diam: {q.diamondCount} ({q.totalCarat}ct) • {q.productionTimeDays} jours</p>
             {request.acceptedQuoteId === q.id ? (
               <span style={{ fontSize: '14px', color: 'var(--success)', fontWeight: 600 }}>Devis Accepté</span>
             ) : (
               <button 
                 style={{ width: 'auto', alignSelf: 'flex-start', background: 'transparent', color: 'var(--accent)', border: 'none', fontSize: '14px', fontWeight: 600, padding: 0 }}
                 onClick={() => acceptQuote(q)}
                 disabled={request.status !== 'QUOTED'}
               >
                  Accepter
               </button>
             )}
          </div>
        ))}
        {quotes.length === 0 && (
          <div className="row-item" style={{ textAlign: 'center', color: 'var(--faded)', fontSize: '15px' }}>Aucun devis reçu.</div>
        )}
      </div>

      {/* SECTION 5: SPECS & SUPPRESSION */}
      <p style={{ padding: '0 16px', fontSize: '13px', fontWeight: 600, color: 'var(--faded)', marginBottom: '8px', textTransform: 'uppercase' }}>Spécifications</p>
      <div className="list-group">
        <div className="row-item" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
           <span style={{ fontSize: '17px' }}>Taille Demandée</span>
           {isEditingSize ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <select value={newSize} onChange={e => setNewSize(e.target.value)} style={{ padding: 0, color: 'var(--accent)', textAlign: 'right' }}>
                  {sizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={updateSize} style={{ border: 'none', background: 'transparent', color: 'var(--accent)', fontWeight: 600 }}>OK</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '17px', color: 'var(--faded)' }}>{request.size}</span>
                <button style={{ border: 'none', background: 'transparent', color: 'var(--accent)', padding: 0 }} onClick={() => setIsEditingSize(true)}><Edit3 size={16} /></button>
              </div>
            )}
        </div>
        <div className="row-item" style={{ flexDirection: 'row', justifyContent: 'center' }}>
           <button style={{ border: 'none', background: 'transparent', color: 'var(--danger)', fontSize: '17px', padding: '4px' }} onClick={async () => { if (confirm("Supprimer ce projet ?")) { await set(rtdbRef(rtdb, `requests/${params.id}`), null); router.push("/"); }}}>
              Supprimer le Projet
           </button>
        </div>
      </div>

      {copiedLink && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '12px 24px', borderRadius: '24px', fontSize: '14px', fontWeight: 500, backdropFilter: 'blur(10px)', zIndex: 100 }}>Lien Copié</motion.div>}
    </div>
  );
}
