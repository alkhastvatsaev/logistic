"use client";

import { useEffect, useState } from "react";
import { rtdb, rtdbRef, set, push, update, remove, storage, storageRef, uploadBytesResumable, getDownloadURL } from "@/lib/firebase";
import { useRequestDetail } from "@/hooks/useFirebase";
import { motion, AnimatePresence } from "framer-motion";
import { calculateFinancialTotals, calculateDeliveryDates } from "@/lib/logic";
export const dynamic = "force-dynamic";
import { ArrowLeft, Trash2, ChevronRight, FileText, Copy, Check, Pencil, Save, Plus, Calculator, Truck, Package, Plane, Loader2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { generateQuotePDF, generateInternalInvoicePDF } from "@/lib/pdf";
import { toast } from "sonner";
import { SmartImage } from "@/components/ui/SmartImage";
import { VisionPill } from "@/components/ui/VisionPill";
import { TitaneLoader } from "@/components/ui/TitaneLoader";

export default function RequestDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { request, quotes, payments, loading } = useRequestDetail(params.id);
  const [sellingPrice, setSellingPrice] = useState("");
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [category, setCategory] = useState("");
  const [weight, setWeight] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [liveRate, setLiveRate] = useState(0.135);
  const [showBackModal, setShowBackModal] = useState(false);
  const [prevStageName, setPrevStageName] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [showLinkModal, setShowLinkModal] = useState(false);

  const acceptedQuote = quotes.find(q => q.id === request?.acceptedQuoteId);
  const totals = calculateFinancialTotals(acceptedQuote, sellingPrice, payments, liveRate);

  useEffect(() => {
    import("@/lib/logic").then(logic => logic.fetchLiveRate().then(setLiveRate));
  }, []);

  useEffect(() => {
    if (request) {
      if (request.sellingPrice) setSellingPrice(request.sellingPrice.toString());
      if (request.title) setTitle(request.title);
      if (request.brand) setBrand(request.brand);
      if (request.size) setSize(request.size);
      if (request.category) setCategory(request.category);
      if (request.estimatedWeight) setWeight(request.estimatedWeight.toString());
    }
  }, [request]);

  const saveField = async (field: string, value: any) => {
    try {
      await update(rtdbRef(rtdb, `requests/${params.id}`), { [field]: value });
    } catch (e) {
      console.error(e);
      toast.error("Erreur de sauvegarde.");
    }
  };

  const [showQCModal, setShowQCModal] = useState(false);
  const [qcUrl, setQCUrl] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleQC = async (url: string) => {
    try {
      await update(rtdbRef(rtdb, `requests/${params.id}`), { 
        qcMediaUrl: url || null,
        status: 'FINAL_PAYMENT',
        qcValidatedAt: Date.now()
      });
      setShowQCModal(false);
      setQCUrl("");
      toast.success("QC VALIDÉ : PASSAGE AU SOLDE.");
    } catch (err) {
      toast.error("Erreur de validation.");
    }
  };

  const handleUpload = async (file: File) => {
    if (!file) return;
    try {
      if (!storage) throw new Error("Firebase Storage non configuré.");
      const fileRef = storageRef(storage, `qc/${params.id}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);
      uploadTask.on('state_changed', 
        (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100), 
        (error) => { toast.error("Erreur Firebase : " + error.code); setUploadProgress(0); }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          await handleQC(downloadURL);
          setUploadProgress(0);
        }
      );
    } catch (err: any) {
      toast.error(err.message || "Erreur critique d'envoi.");
    }
  };

  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleDeposit = async () => {
    const sPrice = parseFloat(sellingPrice);
    if (!sPrice || sPrice <= 0) return toast.error("Veuillez définir un prix de vente.");
    const amount = sPrice * 0.3;
    await set(push(rtdbRef(rtdb, `payments/${params.id}`)), { amount, note: "Acompte 30%", createdAt: Date.now() });
    await update(rtdbRef(rtdb, `requests/${params.id}`), { status: 'IN_PRODUCTION' });
    toast.success(`Acompte de ${amount.toFixed(0)}€ encaissé. En production !`);
  };

  const handleBalancePayment = async (url?: string) => {
    const sPrice = parseFloat(sellingPrice);
    if (!sPrice || sPrice <= 0) return;
    const totalPaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const amount = sPrice - totalPaid;
    if (amount > 0) await set(push(rtdbRef(rtdb, `payments/${params.id}`)), { amount, note: "Solde Final (Automatique)", createdAt: Date.now() });
    await update(rtdbRef(rtdb, `requests/${params.id}`), { status: 'SHIPPED', paymentSlipUrl: url || request?.paymentSlipUrl || null, paidAt: Date.now() });
    setShowPaymentModal(false);
    setShowTrackingInput(true);
    toast.success(`Solde encaissé. Prêt pour expédition !`);
  };

  const handleAcceptQuote = async (quote: any) => {
    const dates = calculateDeliveryDates(quote.productionTimeDays);
    await update(rtdbRef(rtdb, `requests/${params.id}`), { acceptedQuoteId: quote.id, status: 'MANAGER_REVIEW', productionDeadline: dates.productionDeadline, deliveryEstimation: dates.deliveryEstimation });
  };

  const generateSupplierLink = async () => {
    try {
      const token = Math.random().toString(36).substring(2, 15);
      await update(rtdbRef(rtdb, `shareTokens/${token}`), { requestId: params.id, used: false, createdAt: Date.now() });
      const url = `${window.location.origin}/q/${token}`;
      setGeneratedLink(url);
      try { await navigator.clipboard.writeText(url); toast.success("LIEN COPIÉ"); } catch (err) { setShowLinkModal(true); }
      if (request?.status === 'DRAFT' || request?.status === 'WAITING_FOR_QUOTE') await update(rtdbRef(rtdb, `requests/${params.id}`), { status: 'WAITING_FOR_QUOTE' });
    } catch (e) { toast.error("Erreur lien."); }
  };

  const handleUnselectQuote = async () => {
    await update(rtdbRef(rtdb, `requests/${params.id}`), { acceptedQuoteId: null, status: 'QUOTED' });
    toast.success("OFFRE DÉ-SÉLECTIONNÉE.");
  };

  const [showTrackingInput, setShowTrackingInput] = useState(false);
  const [showEmailImport, setShowEmailImport] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [isEditingTracking, setIsEditingTracking] = useState(false);
  const [manualTracking, setManualTracking] = useState({ location: "", event: "", status: "" });
  const [isSyncing, setIsSyncing] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");

  const handleShipment = async (num: string) => {
    if (!num) return;
    await update(rtdbRef(rtdb, `requests/${params.id}`), { status: 'SHIPPED', trackingNumber: num, shippedAt: Date.now() });
    setTrackingNumber(num);
    setShowTrackingInput(false);
    syncTracking(num);
  };

  const syncTracking = async (num?: string) => {
    const trk = num || request?.trackingNumber;
    if (!trk) return;
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/track?num=${trk}`);
      const data = await res.json();
      if (!data.error) await update(rtdbRef(rtdb, `requests/${params.id}`), { trackingStatus: data.status, lastLocation: data.location, lastUpdateDate: data.date, lastEvent: data.event, lastSyncAt: Date.now() });
    } catch (e) { console.error(e); } finally { setIsSyncing(false); }
  };

  const handleManualTrackingSave = async () => {
    await update(rtdbRef(rtdb, `requests/${params.id}`), { trackingStatus: manualTracking.status || request.trackingStatus || 'EN ROUTE', lastLocation: manualTracking.location || request.lastLocation, lastEvent: manualTracking.event || request.lastEvent, lastSyncAt: Date.now() });
    setIsEditingTracking(false);
  };

  const handleEmailImport = async () => {
    if (!emailText) return;
    try {
      await update(rtdbRef(rtdb, `requests/${params.id}`), { trackingStatus: "EN ROUTE", lastLocation: "HUB LOGISTIQUE", lastEvent: "Information reçue", lastUpdateDate: "Dernier scan", lastSyncAt: Date.now() });
      setShowEmailImport(false);
      setEmailText("");
    } catch (e) { toast.error("Erreur import."); }
  };

  useEffect(() => { if (request?.status === 'SHIPPED' && request?.trackingNumber) syncTracking(); }, [request?.status, request?.trackingNumber]);

  const generatePDF = (t: 'QUOTE' | 'INVOICE') => {
    if (!totals || !request) return;
    const data = { id: request.id, title: title || request.title, size: size || request.size, sellingPrice: totals.sPrice, totals, status: request.status, imageUrl: request.imageUrl, goldColor: request.goldColor, stoneType: request.stoneType, weight: weight || request.estimatedWeight };
    if (t === 'QUOTE') generateQuotePDF(data); else generateInternalInvoicePDF(data);
  };

  if (loading) return <TitaneLoader />;
  if (!request) return <div className="layout">Not found</div>;

  const steps = [
    { id: 1, label: "Sourcing", statusMatch: ['DRAFT', 'WAITING_FOR_QUOTE'], date: request.createdAt ? new Date(request.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : null },
    { id: 2, label: "Review", statusMatch: ['QUOTED', 'MANAGER_REVIEW'] },
    { id: 3, label: "Deposit", statusMatch: ['WAITING_FOR_DEPOSIT'] },
    { id: 4, label: "Production", statusMatch: ['IN_PRODUCTION'] },
    { id: 5, label: "Payment", statusMatch: ['FINAL_PAYMENT'] },
    { id: 6, label: "Transit", statusMatch: ['SHIPPED'] },
    { id: 7, label: "Delivered", statusMatch: ['DELIVERED'], date: request.deliveryEstimation ? new Date(request.deliveryEstimation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : null }
  ];

  const statusOrder = ["DRAFT", "WAITING_FOR_QUOTE", "QUOTED", "MANAGER_REVIEW", "WAITING_FOR_DEPOSIT", "IN_PRODUCTION", "FINAL_PAYMENT", "SHIPPED", "DELIVERED"];

  return (
    <div className="layout" style={{ background: '#fff', paddingBottom: '160px' }}>
      <div style={{ position: 'relative', height: '440px', background: '#fff', overflow: 'hidden' }}>
         <div style={{ position: 'absolute', inset: 0 }}>{request.imageUrl && <SmartImage src={request.imageUrl} style={{ width: '100%', height: '100%' }} />}</div>
         <div style={{ position: 'absolute', top: '48px', left: '32px', right: '32px', display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
            <button onClick={() => router.back()} className="vision-action" style={{ background: 'rgba(0,0,0,0.3)', color: '#fff' }}><ArrowLeft size={18} /></button>
            <div style={{ display: 'flex', gap: '8px' }}>
               <button onClick={() => setIsEditing(!isEditing)} className="vision-action" style={{ background: isEditing ? 'var(--accent)' : 'rgba(0,0,0,0.3)', color: '#fff' }}><Pencil size={18} /></button>
               <button onClick={() => setShowDeleteModal(true)} className="vision-action" style={{ background: 'rgba(255,59,48,0.3)', color: '#FF3B30' }}><Trash2 size={18} /></button>
            </div>
         </div>
         <div style={{ position: 'absolute', bottom: '48px', left: '48px', right: '48px' }}>
            <div style={{ display: 'inline-block', padding: '5px 14px', background: 'var(--accent)', borderRadius: '100px', fontSize: '9px', fontWeight: 900, color: '#fff', textTransform: 'uppercase', marginBottom: '8px' }}>{request.status}</div>
            <h1 className="cyber-title" style={{ color: '#fff' }}>{request.title}</h1>
         </div>
      </div>

      <div style={{ padding: '0 32px' }}>
         <div style={{ margin: '32px 0' }}>
            <h1 style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-0.06em' }}>{request.title.toUpperCase()}</h1>
         </div>

         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '48px' }}>
            <div style={{ background: '#F9F9F9', padding: '16px', borderRadius: '24px', textAlign: 'center' }}><span className="cyber-label">HOUSE</span><p style={{ fontWeight: 900 }}>{request.brand?.toUpperCase() || '...'}</p></div>
            <div style={{ background: '#F9F9F9', padding: '16px', borderRadius: '24px', textAlign: 'center' }}><span className="cyber-label">SIZE</span><p style={{ fontWeight: 900, color: 'var(--accent)' }}>{request.size || 'STD'}</p></div>
            <div style={{ background: '#F9F9F9', padding: '16px', borderRadius: '24px', textAlign: 'center' }}><span className="cyber-label">WEIGHT</span><p style={{ fontWeight: 900 }}>{request.estimatedWeight || '...'}</p></div>
         </div>

         {/* FINANCE MODULE */}
         <div style={{ padding: '32px', background: '#F9F9F9', borderRadius: '40px', marginBottom: '48px' }}>
            <span className="cyber-label">PRIX DE VENTE</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
               <input type="number" value={sellingPrice} onChange={(e) => { setSellingPrice(e.target.value); saveField('sellingPrice', parseFloat(e.target.value) || 0); }} style={{ fontSize: '48px', fontWeight: 900, background: 'transparent', border: 'none', width: '200px' }} />
               <span style={{ fontSize: '24px', fontWeight: 900 }}>€</span>
            </div>
            {totals && (
               <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  <div><span className="cyber-label">ADAM</span><p style={{ fontSize: '20px', fontWeight: 900 }}>{totals.adamPart.toFixed(0)}€</p></div>
                  <div><span className="cyber-label">MIRZA</span><p style={{ fontSize: '20px', fontWeight: 900 }}>{totals.mirzaPart.toFixed(0)}€</p></div>
               </div>
            )}
         </div>

         {/* OFFERS */}
         {quotes.length > 0 && (
           <div style={{ marginBottom: '48px' }}>
             <span className="cyber-label">OFFRES ({quotes.length})</span>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                {quotes.map(q => (
                  <div key={q.id} onClick={() => request.acceptedQuoteId === q.id ? handleUnselectQuote() : handleAcceptQuote(q)} style={{ padding: '24px', borderRadius: '32px', background: request.acceptedQuoteId === q.id ? 'var(--accent)' : '#F9F9F9', color: request.acceptedQuoteId === q.id ? '#fff' : '#000', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p className="cyber-label" style={{ color: 'inherit' }}>{q.supplierName || 'FACTORY'}</p>
                      <p style={{ fontSize: '22px', fontWeight: 900 }}>{q.priceRMB} ¥</p>
                      <p style={{ fontSize: '10px', opacity: 0.6 }}>{q.goldWeight}g Gold / {q.diamondCount} Stones</p>
                    </div>
                    {request.acceptedQuoteId === q.id && <Check />}
                  </div>
                ))}
             </div>
           </div>
         )}

         {/* TIMELINE */}
         <div style={{ marginBottom: '64px' }}>
            <span className="cyber-label">PIPELINE</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
               {steps.map(step => {
                 const currentStatusIdx = statusOrder.indexOf(request.status);
                 const stepMaxIdx = Math.max(...step.statusMatch.map(s => statusOrder.indexOf(s)));
                 const isCompleted = currentStatusIdx > stepMaxIdx;
                 const isActive = step.statusMatch.includes(request.status);
                 return (
                   <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', opacity: (isActive || isCompleted) ? 1 : 0.2 }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '4px', background: 'var(--accent)' }} />
                      <span style={{ fontSize: '12px', fontWeight: 900 }}>{step.label.toUpperCase()}</span>
                      {step.date && <span style={{ fontSize: '10px', opacity: 0.5, marginLeft: 'auto' }}>{step.date}</span>}
                   </div>
                 );
               })}
            </div>
         </div>
      </div>

      <VisionPill width="calc(100% - 64px)">
         <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
            <button onClick={() => router.back()} className="vision-action" style={{ background: 'rgba(255,255,255,0.1)' }}><ArrowLeft /></button>
            <div style={{ flex: 1, display: 'flex', gap: '4px', overflowX: 'auto' }}>
               {['DRAFT', 'WAITING_FOR_QUOTE', 'QUOTED'].includes(request.status) && <button onClick={generateSupplierLink} className="vision-action active primary">NEW LINK</button>}
               {request.status === 'MANAGER_REVIEW' && <button onClick={() => update(rtdbRef(rtdb, `requests/${params.id}`), { status: 'WAITING_FOR_DEPOSIT' })} className="vision-action active primary">VALIDATE</button>}
               {request.status === 'WAITING_FOR_DEPOSIT' && <button onClick={handleDeposit} className="vision-action active primary">DEPOSIT</button>}
               {request.status === 'IN_PRODUCTION' && <button onClick={() => setShowQCModal(true)} className="vision-action active primary">QC READY</button>}
               {request.status === 'FINAL_PAYMENT' && <button onClick={() => handleBalancePayment()} className="vision-action active primary">BALANCE</button>}
               {request.status === 'SHIPPED' && <button onClick={() => update(rtdbRef(rtdb, `requests/${params.id}`), { status: 'DELIVERED' })} className="vision-action active primary">DELIVERED</button>}
            </div>
            <button onClick={() => generatePDF('QUOTE')} className="vision-action" style={{ background: 'rgba(255,255,255,0.1)' }}><FileText /></button>
         </div>
      </VisionPill>

      <AnimatePresence>
         {showQCModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <div style={{ background: '#fff', padding: '40px', borderRadius: '40px', maxWidth: '340px', width: '100%' }}>
                  <h2 style={{ fontWeight: 900 }}>QUALITY CONTROL</h2>
                  <input type="file" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                  <button onClick={() => setShowQCModal(false)}>CANCEL</button>
               </div>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}
