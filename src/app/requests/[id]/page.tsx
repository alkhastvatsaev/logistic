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
    <div style={{ padding: '20px 0 60px 0' }}>
      {/* HEADER NATIVE */}
      <header style={{ marginBottom: '24px', padding: '0 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '17px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ArrowLeft size={20} /> Retour
        </button>
        <div style={{ padding: '4px 12px', background: 'var(--success)', borderRadius: '20px', fontSize: '12px', fontWeight: 700, color: '#fff' }}>
          {request.status.replace(/_/g, ' ')}
        </div>
      </header>

      {/* SECTION 1: VISUEL & TITRE */}
      <div style={{ marginBottom: '32px' }}>
        {request.imageUrl && (
          <div style={{ borderRadius: '20px', overflow: 'hidden', background: 'var(--secondary-bg)', marginBottom: '16px', border: '0.5px solid var(--separator)' }}>
            <img src={request.imageUrl} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain' }} />
          </div>
        )}
        <h1 className="title" style={{ padding: '0 4px', fontSize: '28px' }}>{request.title}</h1>
        <p className="subtitle" style={{ padding: '0 4px', fontSize: '13px' }}>ID: {params.id.slice(0, 8).toUpperCase()}</p>
      </div>

      {/* SECTION 2: GESTION & MIRZA */}
      <div style={{ marginTop: '32px' }}>
        <p style={{ padding: '0 16px 8px 16px', fontSize: '13px', color: 'var(--faded)', fontWeight: 600 }}>GESTION & VALIDATION</p>
        <div className="list-group">
          {request.deliveryEstimation && (
            <div className="row-item" style={{ background: 'rgba(0, 122, 255, 0.05)', margin: '12px 16px', borderRadius: '12px', border: 'none' }}>
               <label style={{ color: 'var(--accent)', marginBottom: '8px', display: 'block' }}>CALENDRIER ESTIMÉ</label>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '11px', color: 'var(--faded)' }}>Sortie Usine</p>
                    <p style={{ fontSize: '12px', fontWeight: 600 }}>{new Date(request.productionDeadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <div style={{ height: '1px', flex: 1, background: 'var(--border)', margin: '0 12px' }}></div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '11px', color: 'var(--faded)' }}>Arrivée France</p>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--success)' }}>{new Date(request.deliveryEstimation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                  </div>
               </div>
            </div>
          )}
          {request.status === 'MANAGER_REVIEW' && (
            <div className="row-item" style={{ padding: '16px' }}>
              <a 
                href={`https://wa.me/33607808501?text=${encodeURIComponent(`Bonjour Mirza, voici une nouvelle pièce à valider :\n\n${request.title}\n${window.location.origin}/review/${params.id}`)}`}
                target="_blank" rel="noopener noreferrer" className="btn" style={{ width: '100%', background: '#25D366', border: 'none' }}
              >
                Envoyer à Mirza (WhatsApp)
              </a>
            </div>
          )}
          <div className="row-item" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <label>Flux Actuel</label>
            <select value={request.status} onChange={(e) => moveNextStep(e.target.value)} style={{ width: 'auto', fontWeight: 600, color: 'var(--accent)', fontSize: '15px' }}>
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
      </div>

      {/* SECTION 5: FINANCES & PROFITS */}
      <div style={{ marginTop: '32px' }}>
        <p style={{ padding: '0 16px 8px 16px', fontSize: '13px', color: 'var(--faded)', fontWeight: 600 }}>FINANCES & PROFITS</p>
        <div className="list-group">
          {/* PRIX DE VENTE */}
          <div className="row-item">
            <label>Prix de Vente Client (€)</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
               <input type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} placeholder="0.00" style={{ fontSize: '24px', fontWeight: 700, flex: 1 }} />
               <button className="btn btn-ghost" onClick={updateSellingPrice} style={{ padding: '8px' }}><Save size={20} /></button>
            </div>
          </div>

          {/* BILAN SI DEVIS ACCEPTE */}
          {getFinancialTotals() && (
            <div style={{ padding: '16px', background: 'var(--background)', margin: '12px 16px', borderRadius: '12px' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '11px' }}>Profit Net</label>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--success)' }}>{getFinancialTotals()?.profit.toFixed(2)} €</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <label style={{ fontSize: '11px' }}>Part/pers (50%)</label>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent)' }}>{(getFinancialTotals()?.profit! / 2).toFixed(2)} €</p>
                  </div>
               </div>
               <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '0.5px solid var(--separator)', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--faded)' }}>Cout Revient (Usine+DHL)</span>
                    <span>{getFinancialTotals()?.costEUR.toFixed(2)} €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--faded)' }}>Acompte Versé</span>
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>{getFinancialTotals()?.paid.toFixed(2)} €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: '8px' }}>
                    <span>Reste à Payer</span>
                    <span style={{ color: getFinancialTotals()?.balance! <= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {getFinancialTotals()?.balance! <= 0 ? "SOLDE OK ✓" : `${getFinancialTotals()?.balance.toFixed(2)} €`}
                    </span>
                  </div>
               </div>
            </div>
          )}

          {/* AJOUT PAIEMENT */}
          <div className="row-item" style={{ borderTop: '0.5px solid var(--separator)' }}>
             <label>Nouveau Versement (€)</label>
             <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginTop: '8px' }}>
                <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0.00" style={{ flex: 1, fontWeight: 600 }} />
                <label style={{ padding: '8px 12px', background: paymentReceipt ? 'var(--success)' : 'var(--background)', borderRadius: '10px', fontSize: '12px', color: paymentReceipt ? '#fff' : 'var(--accent)', cursor: 'pointer' }}>
                   {isUploadingReceipt ? '...' : paymentReceipt ? 'MÉMO ✓' : '+ REÇU'}
                   <input type="file" hidden accept="image/*" onChange={handleReceiptUpload} />
                </label>
             </div>
             <button className="btn" style={{ marginTop: '16px', width: '100%', background: 'var(--accent)' }} disabled={!paymentAmount || !paymentReceipt} onClick={saveRIAPayment}>Enregistrer le paiement</button>
          </div>

          {/* DOCUMENTS PDF */}
          <div style={{ padding: '16px', display: 'flex', gap: '8px' }}>
             <button className="btn btn-ghost" style={{ flex: 1, fontSize: '13px', background: 'var(--secondary-bg)' }} onClick={() => generatePDF('QUOTE')}>
                Devis PDF
             </button>
             <button className="btn btn-ghost" style={{ flex: 1, fontSize: '13px', background: 'var(--secondary-bg)' }} onClick={() => generatePDF('INVOICE')}>
                Facture Recap
             </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: USINES & DEVIS */}
      <div style={{ marginTop: '32px' }}>
        <p style={{ padding: '0 16px 8px 16px', fontSize: '13px', color: 'var(--faded)', fontWeight: 600 }}>USINES & DEVIS</p>
        <div className="list-group">
          <div className="row-item" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '17px', fontWeight: 500 }}>Partager Lien Usine</span>
            <button className="btn btn-ghost" onClick={generateSupplierLink} disabled={generatingLink} style={{ padding: '8px' }}>
               {generatingLink ? '...' : <Share size={20} />}
            </button>
          </div>
          {quotes.length > 0 ? quotes.map(q => (
            <div key={q.id} className="row-item" style={{ background: request.acceptedQuoteId === q.id ? 'rgba(52, 199, 89, 0.05)' : 'transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontWeight: 600, fontSize: '16px' }}>{q.supplierName}</h4>
                  <p style={{ fontSize: '13px', color: 'var(--faded)', marginTop: '2px' }}>Or: {q.goldWeight}g • Tot: {q.totalWeight}g • {q.productionTimeDays}j</p>
                  <p style={{ fontSize: '13px', color: 'var(--faded)' }}>Diam : {q.diamondCount} ({q.totalCarat}ct) {q.diamondType}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>¥{q.priceRMB}</div>
                  <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '4px 8px', color: 'var(--accent)' }} onClick={() => acceptQuote(q)} disabled={request.status !== 'QUOTED'}>
                    {request.acceptedQuoteId === q.id ? "ACCEPTÉ" : "ACCEPTER"}
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="row-item" style={{ textAlign: 'center', padding: '24px', color: 'var(--faded)', fontSize: '14px' }}>En attente de devis usine...</div>
          )}
        </div>
      </div>

      {/* SECTION 4: LOGISTIQUE */}
      <div style={{ marginTop: '32px' }}>
        <p style={{ padding: '0 16px 8px 16px', fontSize: '13px', color: 'var(--faded)', fontWeight: 600 }}>LOGISTIQUE & LIVRAISON</p>
        <div className="list-group">
          <div className="row-item" style={{ background: 'rgba(0, 122, 255, 0.05)', margin: '12px 16px', borderRadius: '12px', padding: '16px', border: 'none' }}>
            <label style={{ color: 'var(--accent)' }}>DESTINATION FINALE</label>
            <p style={{ fontSize: '14px', lineHeight: '1.4', marginTop: '4px' }}><strong>SACHA BENSADOUN</strong><br />4 Rue des Imprimeurs, 67118 Geispolsheim, France</p>
            <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '4px 0', marginTop: '8px', color: 'var(--accent)', justifyContent: 'flex-start' }} onClick={() => { navigator.clipboard.writeText("SACHA BENSADOUN, FedEx Express – Geispolsheim, 4 Rue des Imprimeurs, 67118 Geispolsheim, France"); alert("Adresse copiée"); }}>
              <Copy size={14} style={{ marginRight: '4px' }} /> Copier l'adresse
            </button>
          </div>
          <div className="row-item">
            <label>Suivi FedEx</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="Tracking #" />
              <button className="btn btn-ghost" onClick={updateTracking} style={{ padding: '8px' }}><Save size={20} /></button>
            </div>
          </div>
          {request.trackingNumber && (
            <div className="row-item" style={{ padding: 0 }}>
              <a href={`https://www.fedex.com/fedextrack/?trknbr=${request.trackingNumber}`} target="_blank" className="btn btn-ghost" style={{ width: '100%', fontSize: '14px', background: 'var(--background)', borderRadius: 0 }}>Ouvrir le suivi FedEx</a>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 6: SPÉCIFICATIONS */}
      <div style={{ marginTop: '32px' }}>
        <p style={{ padding: '0 16px 8px 16px', fontSize: '13px', color: 'var(--faded)', fontWeight: 600 }}>SPÉCIFICATIONS</p>
        <div className="list-group">
          <div className="row-item" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <label>Taille Demandée</label>
            {isEditingSize ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <select value={newSize} onChange={e => setNewSize(e.target.value)} style={{ fontWeight: 700, width: 'auto' }}>
                  {sizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={updateSize} style={{ color: 'var(--accent)', border: 'none', background: 'transparent', fontWeight: 700 }}>OK</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '17px' }}>{request.size}</span>
                <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={() => { setNewSize(request.size || "52"); setIsEditingSize(true); }}><Edit3 size={16} /></button>
              </div>
            )}
          </div>
          {request.goldColor && <div className="row-item" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><label>Or</label><span style={{ fontWeight: 600 }}>{request.goldColor.toUpperCase()}</span></div>}
          {request.sizeChangedByMirza && <div className="row-item" style={{ background: 'rgba(255, 59, 48, 0.05)' }}><label style={{ color: 'var(--danger)' }}>Modification Mirza</label><p style={{ fontSize: '12px' }}>Origine : {request.originalSizeBeforeMirza}</p></div>}
        </div>
        <button className="btn btn-ghost" style={{ width: '100%', color: 'var(--danger)', marginTop: '24px' }} onClick={async () => { if (confirm("Supprimer ce projet ?")) { await set(rtdbRef(rtdb, `requests/${params.id}`), null); router.push("/"); }}}>
          <Trash2 size={18} style={{ marginRight: '8px' }} /> Supprimer
        </button>
      </div>

      {copiedLink && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ position: 'fixed', bottom: 30, left: 20, right: 20, background: 'var(--foreground)', color: 'white', padding: '16px', borderRadius: '16px', textAlign: 'center', zIndex: 100 }}>Lien Usine Copié ✓</motion.div>}
    </div>
  );
}
