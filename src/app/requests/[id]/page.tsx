"use client";

import { useEffect, useState } from "react";
import { rtdb, rtdbRef, set, push, update, remove, storage, storageRef, uploadBytesResumable, getDownloadURL } from "@/lib/firebase";
import { useRequestDetail } from "@/hooks/useFirebase";
import { motion, AnimatePresence } from "framer-motion";
import { calculateFinancialTotals, calculateDeliveryDates } from "@/lib/logic";
export const dynamic = "force-dynamic";
import { ArrowLeft, Trash2, ChevronRight, FileText, Copy, Check, Pencil, Save, Plus, Calculator, Truck, Package, Plane, Loader2, UploadCloud, RotateCcw, LayoutGrid, Link as LinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { generateQuotePDF, generateInternalInvoicePDF } from "@/lib/pdf";
import { toast } from "sonner";
import { SmartImage } from "@/components/ui/SmartImage";
import { VisionPill } from "@/components/ui/VisionPill";
import { TitaneLoader } from "@/components/ui/TitaneLoader";
import { logEvent } from "@/lib/logger";

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
  const [engraving, setEngraving] = useState("");
  const [carats, setCarats] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [showLinkModal, setShowLinkModal] = useState(false);

  const acceptedQuote = quotes.find(q => q.id === request?.acceptedQuoteId);
  const bestQuote = quotes.length > 0 ? [...quotes].sort((a,b) => a.priceRMB - b.priceRMB)[0] : undefined;
  const totals = calculateFinancialTotals(acceptedQuote || bestQuote, sellingPrice, payments, liveRate);

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
      if (request.engraving) setEngraving(request.engraving);
      if (request.mainStoneCarat) setCarats(request.mainStoneCarat.toString());
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
    toast.info("Initialisation de l'envoi...");
    try {
      if (!storage) throw new Error("Firebase Storage non configuré.");
      const fileRef = storageRef(storage, `qc/${params.id}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        }, 
        (error) => {
          toast.error("Erreur Firebase : " + error.code);
          setUploadProgress(0);
        }, 
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

  const handleDelete = async () => {
    try {
      await remove(rtdbRef(rtdb, `requests/${params.id}`));
      // Also clean up quotes/payments if needed, but for now just the request is enough
      await logEvent({ type: 'WORKFLOW', action: 'DELETE_REQUEST', requestId: params.id, details: { title: request?.title } });
      toast.success("COMMANDE SUPPRIMÉE");
      router.push('/');
    } catch (err) {
      toast.error("Erreur de suppression.");
    }
  };

  const generateSupplierLink = async () => {
    try {
      const token = Math.random().toString(36).substring(2, 15);
      await update(rtdbRef(rtdb, `shareTokens/${token}`), {
        requestId: params.id,
        used: false,
        createdAt: Date.now()
      });
      const url = `${window.location.origin}/q/${token}`;
      setGeneratedLink(url);
      setShowLinkModal(true);
      
      try {
        await navigator.clipboard.writeText(url);
        toast.success("LIEN COPIÉ");
      } catch (err) {
        console.warn("Clipboard auto-copy failed");
      }
      
      if (request?.status === 'DRAFT' || request?.status === 'WAITING_FOR_QUOTE') {
        await update(rtdbRef(rtdb, `requests/${params.id}`), { status: 'WAITING_FOR_QUOTE' });
      }
    } catch (e) {
      toast.error("Erreur génération lien.");
    }
  };

  const handleUnselectQuote = async () => {
    await update(rtdbRef(rtdb, `requests/${params.id}`), {
      acceptedQuoteId: null,
      status: 'QUOTED'
    });
    toast.success("OFFRE DÉ-SÉLECTIONNÉE.");
  };

  const [showTrackingInput, setShowTrackingInput] = useState(false);
  const [showEmailImport, setShowEmailImport] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [isEditingTracking, setIsEditingTracking] = useState(false);
  const [manualTracking, setManualTracking] = useState({ location: "", event: "", status: "" });
  const [isSyncing, setIsSyncing] = useState(false);

  const handleShipment = async (num: string) => {
    if (!num) return;
    toast.info("Synchronisation...");
    await update(rtdbRef(rtdb, `requests/${params.id}`), { 
      status: 'SHIPPED', 
      trackingNumber: num,
      shippedAt: Date.now()
    });
    setShowTrackingInput(false);
    syncTracking(num);
    await logEvent({ type: 'WORKFLOW', action: 'SHIPMENT_SENT', requestId: params.id, details: { trackingNumber: num } });
  };

  const handleGoBack = async () => {
    const currentIdx = statusOrder.indexOf(request.status);
    if (currentIdx > 0) {
      const prevStatus = statusOrder[currentIdx - 1];
      await update(rtdbRef(rtdb, `requests/${params.id}`), { status: prevStatus });
      await logEvent({ type: 'WORKFLOW', action: 'STATUS_ROLLBACK', requestId: params.id, details: { from: request.status, to: prevStatus } });
      toast.info(`RETOUR : ${prevStatus.replace(/_/g, ' ')}`);
      setShowBackModal(false);
    }
  };

  const syncTracking = async (num?: string) => {
    const trk = num || request?.trackingNumber;
    if (!trk) return;
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/track?num=${trk}`);
      const data = await res.json();
      if (!data.error) {
        await update(rtdbRef(rtdb, `requests/${params.id}`), {
          trackingStatus: data.status,
          lastLocation: data.location,
          lastUpdateDate: data.date,
          lastEvent: data.event,
          lastSyncAt: Date.now()
        });
        toast.success("Suivi synchronisé.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualTrackingSave = async () => {
    try {
      await update(rtdbRef(rtdb, `requests/${params.id}`), {
        trackingStatus: manualTracking.status || request.trackingStatus || 'EN ROUTE',
        lastLocation: manualTracking.location || request.lastLocation,
        lastEvent: manualTracking.event || request.lastEvent,
        lastSyncAt: Date.now()
      });
      setIsEditingTracking(false);
      toast.success("Statut mis à jour.");
    } catch (e) {
      toast.error("Erreur.");
    }
  };

  const handleEmailImport = async () => {
    if (!emailText) return;
    try {
      await update(rtdbRef(rtdb, `requests/${params.id}`), {
        trackingStatus: "EN ROUTE",
        lastLocation: "HUB LOGISTIQUE",
        lastEvent: "Import email effectué",
        lastSyncAt: Date.now()
      });
      setShowEmailImport(false);
      setEmailText("");
      toast.success("Import réussi.");
    } catch (e) {
      toast.error("Erreur import.");
    }
  };

  useEffect(() => {
    if (request?.status === 'SHIPPED' && request?.trackingNumber) {
      syncTracking();
    }
  }, [request?.status, request?.trackingNumber]);

  const handleDeposit = async () => {
    const sPrice = parseFloat(sellingPrice);
    if (!sPrice || sPrice <= 0) return toast.error("Veuillez définir un prix de vente.");
    const amount = sPrice * 0.3;
    await set(push(rtdbRef(rtdb, `payments/${params.id}`)), { amount, note: "Acompte 30%", createdAt: Date.now() });
    await update(rtdbRef(rtdb, `requests/${params.id}`), { status: 'IN_PRODUCTION' });
    await logEvent({ type: 'FINANCE', action: 'DEPOSIT_PAID', requestId: params.id, details: { amount } });
    toast.success(`Acompte encaissé.`);
  };

  const handleBalancePayment = async (url?: string) => {
    const sPrice = parseFloat(sellingPrice);
    if (!sPrice || sPrice <= 0) return;
    const totalPaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const amount = sPrice - totalPaid;
    if (amount > 0) {
        await set(push(rtdbRef(rtdb, `payments/${params.id}`)), { amount, note: "Solde Final", createdAt: Date.now() });
    }
    await update(rtdbRef(rtdb, `requests/${params.id}`), { status: 'SHIPPED', paymentSlipUrl: url || request?.paymentSlipUrl || null, paidAt: Date.now() });
    await logEvent({ type: 'FINANCE', action: 'BALANCE_PAID', requestId: params.id, details: { amount } });
    setShowPaymentModal(false);
    setShowTrackingInput(true);
    toast.success(`Solde encaissé.`);
  };

  const handleAcceptQuote = async (quote: any) => {
    const dates = calculateDeliveryDates(quote.productionTimeDays);
    await update(rtdbRef(rtdb, `requests/${params.id}`), {
      acceptedQuoteId: quote.id,
      status: 'MANAGER_REVIEW',
      productionDeadline: dates.productionDeadline,
      deliveryEstimation: dates.deliveryEstimation
    });
    await logEvent({ type: 'SUPPLIER', action: 'QUOTE_ACCEPTED', requestId: params.id, details: { supplier: quote.supplierName, price: quote.priceRMB } });
  };

  const generatePDF = (t: 'QUOTE' | 'INVOICE') => {
    if (!totals || !request) return;
    const data = { 
      id: request.id, title: title || request.title, size: size || request.size, 
      sellingPrice: totals.sPrice, totals, status: request.status,
      imageUrl: request.imageUrl, goldColor: request.goldColor,
      stoneType: request.stoneType, mainStoneCarat: carats || request.mainStoneCarat, weight: weight || request.estimatedWeight,
      goldPurity: acceptedQuote?.goldPurity,
      goldWeight: acceptedQuote?.goldWeight,
      diamondCount: acceptedQuote?.diamondCount,
      totalCarat: acceptedQuote?.totalCarat,
      stoneQuality: acceptedQuote?.stoneQuality
    };
    if (t === 'QUOTE') generateQuotePDF(data); else generateInternalInvoicePDF(data);
  };

  if (loading) return <TitaneLoader />;
  if (!request) return <div className="layout">Request not found</div>;

  const goldColors = [
    { id: "Or Jaune", label: "JAUNE", color: "#F5D061" },
    { id: "Or Blanc", label: "BLANC", color: "#E5E5E5" },
    { id: "Or Rose", label: "ROSE", color: "#E7A78B" }
  ];

  const stoneTypes = [
    { id: "Sans Pierre", label: "SANS", color: "#F9F9F9" },
    { id: "Diamants", label: "DIAMANTS", color: "#FFFFFF" },
    { id: "Rubis", label: "RUBIS", color: "#E0115F" },
    { id: "Saphir", label: "SAPHIR", color: "#0F52BA" },
    { id: "Émeraude", label: "ÉMERAUDE", color: "#50C878" },
    { id: "Perles", label: "PERLES", color: "#F0EAD6" }
  ];

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
         <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {request.imageUrl && <SmartImage src={request.imageUrl} style={{ width: '100%', height: '100%' }} />}
         </div>
         
         <div style={{ position: 'absolute', top: '48px', left: '32px', right: '32px', display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
            <button onClick={() => router.back()} style={{ width: '44px', height: '44px', borderRadius: '22px', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
               <ArrowLeft size={18} strokeWidth={3} />
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
               <button onClick={() => setIsEditing(!isEditing)} style={{ width: '44px', height: '44px', borderRadius: '22px', background: isEditing ? 'var(--accent)' : 'rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  {isEditing ? <Save size={18} strokeWidth={2.5} /> : <Pencil size={18} strokeWidth={2.5} />}
               </button>
               <button onClick={() => setShowDeleteModal(true)} style={{ width: '44px', height: '44px', borderRadius: '22px', background: 'rgba(255,59,48,0.3)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF3B30' }}>
                  <Trash2 size={18} strokeWidth={2.5} />
               </button>
            </div>
         </div>

         <div style={{ position: 'absolute', bottom: '48px', left: '48px', right: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
               <div style={{ padding: '5px 14px', background: 'var(--accent)', borderRadius: '100px', fontSize: '9px', fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {request.status.replace(/_/g, ' ')}
               </div>
            </div>
            <h1 className="cyber-title" style={{ color: '#fff' }}>{request.title}</h1>
         </div>
      </div>

      <div style={{ padding: '0 32px' }}>
         <div style={{ marginBottom: '32px', marginTop: '32px' }}>
            <h1 style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-0.06em', margin: 0 }}>{request.title?.toUpperCase()}</h1>
            {isEditing && (
              <div style={{ marginTop: '24px', display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', padding: '18px 24px', background: '#F9F9F9', borderRadius: '24px' }}>
                  <LinkIcon size={16} opacity={0.3} />
                  <input 
                    placeholder="Lien produit officiel..." 
                    value={request.productUrl || ""} 
                    onChange={(e) => saveField('productUrl', e.target.value)}
                    style={{ flex: 1, background: 'transparent', border: 'none', fontSize: '11px', fontWeight: 700, outline: 'none' }}
                  />
                </div>
                <button 
                  onClick={async () => {
                    if (!request.productUrl) return;
                    toast.info("ENRICHISSEMENT EN COURS...");
                    try {
                      const res = await fetch(`/api/enrich?url=${encodeURIComponent(request.productUrl)}`);
                      const data = await res.json();
                      if (data.error) throw new Error(data.error);
                      if (data.title) setTitle(data.title); await saveField('title', data.title);
                      if (data.goldColor) saveField('goldColor', data.goldColor);
                      if (data.stoneType) saveField('stoneType', data.stoneType);
                      if (data.brand) { setBrand(data.brand); saveField('brand', data.brand); }
                      if (data.imageUrl) saveField('imageUrl', data.imageUrl);
                      toast.success("DONNÉES MISES À JOUR");
                    } catch (e) { toast.error("ERREUR D'ENRICHISSEMENT"); }
                  }}
                  style={{ padding: '0 20px', borderRadius: '24px', background: 'var(--accent-glow)', border: 'none', color: 'var(--accent)', fontWeight: 900, fontSize: '9px' }}
                >
                  AUTO-FILL
                </button>
              </div>
            )}
         </div>
            
         {/* TECH SPECS: ROW 1 (Core) */}
         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', margin: '48px 0 16px 0' }}>
            <div style={{ padding: '20px 8px', borderRadius: '24px', background: '#F9F9F9', border: '1px solid rgba(0,0,0,0.02)', textAlign: 'center', position: 'relative' }}>
               <span className="cyber-label" style={{ fontSize: '7px', opacity: 0.5 }}>HOUSE</span>
               {isEditing ? (
                 <input value={brand} onChange={(e) => { setBrand(e.target.value); saveField('brand', e.target.value); }} style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'center', fontSize: '11px', fontWeight: 900, outline: 'none', color: 'var(--accent)' }} />
               ) : (
                 <p style={{ fontWeight: 900, fontSize: '11px', marginTop: '8px', letterSpacing: '0.05em' }}>{request.brand?.toUpperCase() || '...'}</p>
               )}
               {request.productUrl && (
                  <a href={request.productUrl} target="_blank" rel="noopener noreferrer" style={{ position: 'absolute', top: '-10px', right: '-10px', width: '24px', height: '24px', borderRadius: '12px', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', zIndex: 5 }}>
                     <FileText size={12} />
                  </a>
               )}
            </div>
            <div style={{ padding: '20px 8px', borderRadius: '24px', background: '#FDF7F9', border: '1px solid rgba(224,17,95,0.05)', textAlign: 'center' }}>
               <span className="cyber-label" style={{ fontSize: '7px', color: '#E0115F' }}>SIZE</span>
               {isEditing ? (
                 <input value={size} onChange={(e) => { setSize(e.target.value); saveField('size', e.target.value); }} style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'center', fontSize: '13px', fontWeight: 900, outline: 'none', color: '#E0115F' }} />
               ) : (
                 <p style={{ fontWeight: 900, fontSize: '13px', marginTop: '8px', color: '#E0115F' }}>{request.size || 'STD'}</p>
               )}
            </div>
            <div style={{ padding: '20px 8px', borderRadius: '24px', background: '#F9F9F9', border: '1px solid rgba(0,0,0,0.02)', textAlign: 'center' }}>
               <span className="cyber-label" style={{ fontSize: '7px', opacity: 0.5 }}>WEIGHT</span>
               {isEditing ? (
                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <input type="number" step="0.1" value={weight} onChange={(e) => { setWeight(e.target.value); saveField('estimatedWeight', parseFloat(e.target.value) || 0); }} style={{ width: '40px', background: 'transparent', border: 'none', textAlign: 'right', fontSize: '11px', fontWeight: 900, outline: 'none', color: 'var(--accent)' }} />
                   <span style={{ fontSize: '8px', fontWeight: 900, opacity: 0.3 }}>G</span>
                 </div>
               ) : (
                 <p style={{ fontWeight: 900, fontSize: '11px', marginTop: '8px' }}>{request.estimatedWeight || '...'}G</p>
               )}
            </div>
         </div>

         {/* TECH SPECS: ROW 2 (Extra) */}
         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px', marginBottom: '64px' }}>
            <div style={{ padding: '20px 16px', borderRadius: '24px', background: '#F9F9F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span className="cyber-label" style={{ fontSize: '7px' }}>CARATS</span>
               {isEditing ? (
                 <input type="number" step="0.01" value={carats} onChange={(e) => { setCarats(e.target.value); saveField('mainStoneCarat', parseFloat(e.target.value) || 0); }} style={{ width: '80px', background: 'transparent', border: 'none', textAlign: 'right', fontSize: '12px', fontWeight: 900, outline: 'none', color: 'var(--accent)' }} />
               ) : (
                 <p style={{ fontWeight: 900, fontSize: '12px', margin: 0 }}>{request.mainStoneCarat ? `${request.mainStoneCarat} ct` : '-'}</p>
               )}
            </div>
            <div style={{ padding: '20px 24px', borderRadius: '24px', background: '#000', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span className="cyber-label" style={{ fontSize: '7px', color: 'rgba(255,255,255,0.4)' }}>GRAVURE</span>
               {isEditing ? (
                 <input value={engraving} onChange={(e) => { setEngraving(e.target.value); saveField('engraving', e.target.value); }} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '11px', fontWeight: 900, textAlign: 'right', outline: 'none' }} placeholder="..." />
               ) : (
                 <p style={{ fontWeight: 900, fontSize: '11px', margin: 0 }}>{request.engraving || 'AUCUNE'}</p>
               )}
            </div>
         </div>

         <div style={{ marginBottom: '80px' }}>
            <p className="cyber-label" style={{ marginBottom: '24px' }}>CONFIGURATION VISUELLE</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div>
                <span className="cyber-label" style={{ fontSize: '8px', opacity: 0.4 }}>GOLD SELECTION</span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  {goldColors.map(g => (
                    <motion.button key={g.id} whileTap={{ scale: 0.95 }} onClick={() => isEditing && saveField('goldColor', g.id)}
                      style={{ flex: 1, padding: '16px 8px', borderRadius: '24px', background: request.goldColor === g.id ? g.color : '#F9F9F9', color: request.goldColor === g.id ? '#000' : 'rgba(0,0,0,0.3)', opacity: isEditing ? 1 : (request.goldColor === g.id ? 1 : 0.4), transition: 'all 0.4s ease', border: 'none' }}>
                        <span style={{ fontSize: '10px', fontWeight: 900 }}>{g.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div>
                <span className="cyber-label" style={{ fontSize: '8px', opacity: 0.4 }}>STONE SELECTION</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px' }}>
                  {stoneTypes.map(s => {
                      const isSelected = request.stoneType === s.id;
                      return (
                        <motion.button key={s.id} whileTap={{ scale: 0.95 }} onClick={() => isEditing && saveField('stoneType', s.id)}
                          style={{ padding: '14px 4px', borderRadius: '20px', background: isSelected ? s.color : '#F9F9F9', color: isSelected ? '#000' : 'rgba(0,0,0,0.3)', border: 'none', position: 'relative', overflow: 'hidden' }}>
                          <span style={{ fontSize: '9px', fontWeight: 900 }}>{s.label}</span>
                        </motion.button>
                      );
                  })}
                </div>
              </div>
            </div>
         </div>

         <div style={{ padding: '40px', background: 'linear-gradient(135deg, #fff 0%, #fafafa 100%)', borderRadius: '48px', border: '1px solid rgba(0,0,0,0.03)', marginBottom: '80px', boxShadow: '0 20px 60px rgba(0,0,0,0.03)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                <div>
                   <h2 style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em' }}>AUDIT FINANCIER</h2>
                   {liveRate && <div style={{ fontSize: '8px', fontWeight: 900, opacity: 0.3, marginTop: '4px' }}>TELEMETRY FX: 1¥ = {liveRate.toFixed(4)}€</div>}
                </div>
                {acceptedQuote && (
                  <div style={{ textAlign: 'right', background: 'var(--accent-glow)', padding: '8px 16px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 900, color: 'var(--accent)' }}>
                      {acceptedQuote.goldWeight}G ({acceptedQuote.goldPurity}) • {acceptedQuote.totalCarat}CT
                    </div>
                  </div>
                )}
             </div>

             <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px' }}>
                <input type="number" value={sellingPrice} onChange={(e) => { setSellingPrice(e.target.value); saveField('sellingPrice', parseFloat(e.target.value) || 0); }} style={{ fontSize: '56px', fontWeight: 900, background: '#F9F9F9', border: 'none', width: '100%', maxWidth: '240px', padding: '12px 24px', borderRadius: '24px', letterSpacing: '-0.04em' }} />
                <span style={{ fontSize: '32px', fontWeight: 900, opacity: 0.2 }}>EUR</span>
             </div>

             {totals ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '40px', borderTop: '1px dashed rgba(0,0,0,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="cyber-label" style={{ color: 'var(--accent)', opacity: 0.8 }}>ADAM PART (50%)</span>
                    <div style={{ fontSize: '28px', fontWeight: 900 }}>{totals.adamPart.toFixed(0)}€</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="cyber-label" style={{ color: 'var(--accent)', opacity: 0.8 }}>MIRZA PART (50%)</span>
                    <div style={{ fontSize: '28px', fontWeight: 900 }}>{totals.mirzaPart.toFixed(0)}€</div>
                  </div>

                  {acceptedQuote && acceptedQuote.goldPrice && (
                    <div style={{ marginTop: '24px', padding: '24px', borderRadius: '32px', background: '#F9F9F9', border: '1px solid rgba(0,0,0,0.03)' }}>
                      <span className="cyber-label" style={{ fontSize: '8px', opacity: 0.5, marginBottom: '16px', display: 'block' }}>ANTI-FRAUD AUDIT (FACTORY COST)</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
                          <span>OR ({acceptedQuote.goldWeight}g x {acceptedQuote.goldPrice}¥)</span>
                          <span>{(Number(acceptedQuote.goldWeight) * Number(acceptedQuote.goldPrice)).toFixed(0)} ¥</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
                          <span>MAIN D'OEUVRE</span>
                          <span>{acceptedQuote.labor || 0} ¥</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
                          <span>PIERRES / DIAMANTS</span>
                          <span>{acceptedQuote.stonePrice || 0} ¥</span>
                        </div>
                        <div style={{ height: '1px', background: 'rgba(0,0,0,0.05)', margin: '4px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 900, color: 'var(--accent)' }}>
                          <span>TOTAL CALCULÉ</span>
                          <span>{(Number(acceptedQuote.goldWeight || 0) * Number(acceptedQuote.goldPrice || 0) + Number(acceptedQuote.labor || 0) + Number(acceptedQuote.stonePrice || 0)).toFixed(0)} ¥</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 900, opacity: 0.3 }}>
                          <span>TOTAL FACTURÉ</span>
                          <span>{acceptedQuote.priceRMB} ¥</span>
                        </div>
                        {(Number(acceptedQuote.priceRMB) - (Number(acceptedQuote.goldWeight || 0) * Number(acceptedQuote.goldPrice || 0) + Number(acceptedQuote.labor || 0) + Number(acceptedQuote.stonePrice || 0))) > 500 && (
                          <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(255,59,48,0.1)', color: '#FF3B30', borderRadius: '10px', fontSize: '10px', fontWeight: 900, textAlign: 'center' }}>
                            ATTENTION : SURCOÛT INEXPLIQUÉ (+{(Number(acceptedQuote.priceRMB) - (Number(acceptedQuote.goldWeight || 0) * Number(acceptedQuote.goldPrice || 0) + Number(acceptedQuote.labor || 0) + Number(acceptedQuote.stonePrice || 0))).toFixed(0)}¥)
                          </div>
                        )}
                      </div>
                    </div>
                  )}
               </div>
             ) : (
               <p style={{ fontSize: '11px', fontWeight: 800, opacity: 0.3 }}>En attente de devis validé...</p>
             )}
         </div>

         {quotes.length > 0 && (
             <div style={{ marginBottom: '80px' }}>
               <span className="cyber-label" style={{ opacity: 0.4 }}>OFFRES FOURNISSEURS ({quotes.length})</span>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
                  {quotes.map(q => (
                    <motion.div key={q.id} whileTap={{ scale: 0.98 }} onClick={() => request.acceptedQuoteId === q.id ? handleUnselectQuote() : handleAcceptQuote(q)}
                       style={{ 
                          padding: '32px', borderRadius: '40px', background: request.acceptedQuoteId === q.id ? 'var(--accent)' : '#fff', 
                          border: request.acceptedQuoteId === q.id ? 'none' : '1px solid rgba(0,0,0,0.06)', 
                          color: request.acceptedQuoteId === q.id ? '#fff' : '#000', 
                          boxShadow: request.acceptedQuoteId === q.id ? '0 20px 40px rgba(0,0,0,0.1)' : 'none',
                          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                       }}>
                      <div style={{ width: '100%' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ padding: '6px 12px', background: 'rgba(0,0,0,0.03)', borderRadius: '100px', fontSize: '9px', fontWeight: 900 }}>{q.supplierName?.toUpperCase() || 'FACTORY'}</div>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: request.acceptedQuoteId === q.id ? '#fff' : 'var(--accent)' }}>
                              {((Number(q.priceRMB) + Number(q.shippingCostRMB || 0)) * liveRate).toFixed(0)}€
                            </div>
                         </div>
                         <div style={{ fontSize: '32px', fontWeight: 900 }}>{Number(q.priceRMB) + Number(q.shippingCostRMB || 0)} ¥</div>
                         <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '10px', opacity: 0.5, fontWeight: 700 }}>
                            <span>ITEM: {q.priceRMB}¥</span>
                            <span>•</span>
                            <span>SHIP: {q.shippingCostRMB || 0}¥</span>
                         </div>
                         <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '10px', opacity: 0.6, fontWeight: 800 }}>{q.goldWeight}G ({q.goldPurity}) • {q.totalCarat}CT ({q.stoneQuality})</div>
                            {request.acceptedQuoteId === q.id ? <Check size={18} strokeWidth={4} /> : <div style={{ width: '24px', height: '24px', borderRadius: '12px', background: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={14} /></div>}
                         </div>
                      </div>
                    </motion.div>
                  ))}
               </div>
             </div>
           )}

         {request.status === 'SHIPPED' && request.trackingNumber && (
            <div style={{ marginBottom: '48px', padding: '32px', background: '#4D148C', borderRadius: '40px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
               <div style={{ position: 'relative', zIndex: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                     <div style={{ background: '#fff', padding: '4px 10px', borderRadius: '8px' }}><span style={{ color: '#4D148C', fontWeight: 900 }}>Fed</span><span style={{ color: '#FF6600', fontWeight: 900 }}>Ex</span></div>
                     <div style={{ fontSize: '9px', fontWeight: 900 }}>{request.trackingStatus || 'EN ROUTE'}</div>
                  </div>
                  <div style={{ padding: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '24px' }}>
                     <p style={{ fontSize: '14px', fontWeight: 900 }}>{request.lastLocation || 'Scan Hub...'}</p>
                     <p style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>{request.lastUpdateDate || 'Chargement...'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                     <button onClick={() => setShowEmailImport(true)} style={{ flex: 1, padding: '14px', borderRadius: '16px', background: 'transparent', border: '1px solid #fff', color: '#fff', fontSize: '11px', fontWeight: 900 }}>IMPORT EMAIL</button>
                     <button onClick={() => syncTracking()} disabled={isSyncing} style={{ flex: 1, padding: '14px', borderRadius: '16px', background: '#fff', color: '#4D148C', border: 'none', fontWeight: 900 }}>{isSyncing ? '...' : 'REFRESH'}</button>
                  </div>
               </div>
            </div>
         )}

         <div style={{ marginBottom: '64px', paddingLeft: '8px' }}>
            <span className="cyber-label">LOGISTICS PIPELINE</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
               {steps.map(step => {
                  const currentIdx = statusOrder.indexOf(request.status);
                  const stepIdx = Math.max(...step.statusMatch.map(s => statusOrder.indexOf(s)));
                  const isCompleted = currentIdx > stepIdx;
                  const isActive = step.statusMatch.includes(request.status);
                  return (
                    <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '20px', opacity: (isActive || isCompleted) ? 1 : 0.15 }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '4px', background: (isActive || isCompleted) ? 'var(--accent)' : '#000' }} />
                      <div style={{ flex: 1 }}><span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', color: isActive ? 'var(--accent)' : '#000' }}>{step.label}</span></div>
                      {step.date && <span style={{ fontSize: '10px', fontWeight: 800, opacity: 0.4 }}>{step.date.toUpperCase()}</span>}
                    </div>
                  );
               })}
            </div>
         </div>
      </div>

      <VisionPill width="calc(100% - 64px)">
         <div style={{ display: 'flex', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '12px', gap: '8px' }}>
            <motion.button whileTap={{ scale: 0.85 }} className="vision-action" onClick={() => router.push('/')} title="Retour Dashboard">
               <LayoutGrid size={20} />
            </motion.button>
            {statusOrder.indexOf(request.status) > 0 && (
               <motion.button 
                 whileTap={{ scale: 0.85 }} 
                 className="vision-action" 
                 onClick={() => {
                   const prev = statusOrder[statusOrder.indexOf(request.status) - 1];
                   setPrevStageName(prev.replace(/_/g, ' '));
                   setShowBackModal(true);
                 }}
                 title="Étape Précédente"
               >
                 <RotateCcw size={18} style={{ color: '#FF3B30' }} />
               </motion.button>
            )}
         </div>
         <div style={{ flex: 1, display: 'flex', gap: '8px', overflowX: 'auto', padding: '0 8px' }}>
            {['DRAFT', 'WAITING_FOR_QUOTE', 'QUOTED'].includes(request.status) && <motion.button whileTap={{ scale: 0.95 }} className="vision-action active primary" onClick={generateSupplierLink}><Plus size={18} /> NEW LINK</motion.button>}
            {request.status === 'MANAGER_REVIEW' && <motion.button whileTap={{ scale: 0.95 }} className="vision-action active primary" onClick={() => update(rtdbRef(rtdb, `requests/${params.id}`), { status: 'WAITING_FOR_DEPOSIT' })}><Check size={18} /> VALIDATE</motion.button>}
            {request.status === 'WAITING_FOR_DEPOSIT' && <motion.button whileTap={{ scale: 0.95 }} className="vision-action active primary" onClick={handleDeposit}><Calculator size={18} /> DEPOSIT</motion.button>}
            {request.status === 'IN_PRODUCTION' && <motion.button whileTap={{ scale: 0.95 }} className="vision-action active primary" onClick={() => setShowQCModal(true)}><Package size={18} /> QC READY</motion.button>}
            {request.status === 'FINAL_PAYMENT' && <motion.button whileTap={{ scale: 0.95 }} className="vision-action active primary" onClick={() => handleBalancePayment()}><Calculator size={18} /> BALANCE</motion.button>}
            {request.status === 'SHIPPED' && <motion.button whileTap={{ scale: 0.95 }} className="vision-action active primary" onClick={() => update(rtdbRef(rtdb, `requests/${params.id}`), { status: 'DELIVERED' })}><Check size={18} /> DELIVERED</motion.button>}
         </div>
         <div style={{ display: 'flex', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '12px', gap: '8px' }}>
            <motion.button whileTap={{ scale: 0.85 }} className="vision-action" onClick={() => generatePDF('QUOTE')} title="PROFORMA DEVIS"><FileText size={20} /></motion.button>
            <motion.button whileTap={{ scale: 0.85 }} className="vision-action" onClick={() => generatePDF('INVOICE')} title="AUDIT FINANCE"><Calculator size={20} /></motion.button>
         </div>
      </VisionPill>

      <AnimatePresence>
        {showQCModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
             <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ width: '100%', maxWidth: '400px', background: '#fff', borderRadius: '40px', padding: '40px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 900 }}>QUALITY CONTROL</h2>
                <div style={{ marginTop: '24px' }}>
                   {uploadProgress > 0 ? (
                      <div style={{ width: '100%', height: '8px', background: '#F9F9F9', borderRadius: '4px', overflow: 'hidden' }}>
                         <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s ease' }} />
                      </div>
                   ) : (
                      <input type="file" accept="image/*,video/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                   )}
                </div>
                <button onClick={() => setShowQCModal(false)} style={{ width: '100%', marginTop: '24px', padding: '16px', borderRadius: '14px', border: 'none', background: '#F9F9F9', fontWeight: 900 }}>ANNULER</button>
             </motion.div>
          </motion.div>
        )}

        {showLinkModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ width: '100%', maxWidth: '400px', background: '#fff', borderRadius: '40px', padding: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '100px', background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Copy size={20} />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 900 }}>LIEN FOURNISSEUR</h2>
              </div>
              
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--faded)', marginBottom: '24px', lineHeight: 1.5 }}>
                Envoyez ce lien aux fournisseurs pour qu'ils puissent soumettre leurs devis techniques.
              </p>

              <div style={{ padding: '20px', background: '#F9F9F9', borderRadius: '20px', wordBreak: 'break-all', fontSize: '11px', fontWeight: 800, color: 'var(--accent)', marginBottom: '32px', border: '1px solid rgba(0,0,0,0.02)' }}>
                {generatedLink}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => { navigator.clipboard.writeText(generatedLink); toast.success("COPIÉ !"); }}
                  style={{ flex: 1, padding: '18px', borderRadius: '18px', border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 900, fontSize: '13px' }}
                >
                  COPIER LE LIEN
                </button>
                <button 
                  onClick={() => setShowLinkModal(false)}
                  style={{ padding: '18px 24px', borderRadius: '18px', border: 'none', background: '#F2F2F2', fontWeight: 900, fontSize: '13px' }}
                >
                  FERMER
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showBackModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
             <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ width: '100%', maxWidth: '400px', background: '#fff', borderRadius: '40px', padding: '40px', textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '32px', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
                   <ArrowLeft size={24} />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 900 }}>RETOUR EN ARRIÈRE ?</h2>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--faded)', marginTop: '12px', lineHeight: 1.5 }}>
                   Voulez-vous vraiment revenir à l'étape précédente : <br/>
                   <span style={{ color: 'var(--accent)', fontWeight: 900 }}>{prevStageName}</span> ?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
                   <button onClick={handleGoBack} style={{ padding: '18px', borderRadius: '18px', border: 'none', background: '#000', color: '#fff', fontWeight: 900, fontSize: '14px' }}>CONFIRMER LE RETOUR</button>
                   <button onClick={() => setShowBackModal(false)} style={{ padding: '18px', borderRadius: '18px', border: 'none', background: '#F9F9F9', fontWeight: 900, fontSize: '14px' }}>ANNULER</button>
                </div>
             </motion.div>
          </motion.div>
        )}

        {showDeleteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
             <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ width: '100%', maxWidth: '400px', background: '#fff', borderRadius: '40px', padding: '40px', textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '32px', background: 'rgba(255,59,48,0.1)', color: '#FF3B30', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
                   <Trash2 size={24} />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 900 }}>SUPPRIMER DÉFINITIVEMENT ?</h2>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--faded)', marginTop: '12px', lineHeight: 1.5 }}>
                   Cette action est irréversible. Toutes les données de cette commande seront perdues.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
                   <button onClick={handleDelete} style={{ padding: '18px', borderRadius: '18px', border: 'none', background: '#FF3B30', color: '#fff', fontWeight: 900, fontSize: '14px' }}>OUI, SUPPRIMER</button>
                   <button onClick={() => setShowDeleteModal(false)} style={{ padding: '18px', borderRadius: '18px', border: 'none', background: '#F9F9F9', fontWeight: 900, fontSize: '14px' }}>ANNULER</button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
