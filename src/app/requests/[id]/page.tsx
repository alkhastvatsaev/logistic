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
    // Media is optional only if explicitly skipped via empty string or user confirmed
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
    console.log("Starting upload for:", file.name);

    try {
      // Ensure we have a valid storage instance
      if (!storage) throw new Error("Firebase Storage non configuré.");

      const fileRef = storageRef(storage, `qc/${params.id}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
          console.log(`Upload progress: ${progress.toFixed(2)}%`);
        }, 
        (error) => {
          console.error("Upload Task Error:", error);
          toast.error("Erreur Firebase : " + error.code);
          setUploadProgress(0);
        }, 
        async () => {
          console.log("Upload finished, getting URL...");
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          await handleQC(downloadURL);
          setUploadProgress(0);
        }
      );
    } catch (err: any) {
      console.error("HandleUpload Error:", err);
      toast.error(err.message || "Erreur critique d'envoi.");
    }
  };

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSlipUrl, setPaymentSlipUrl] = useState("");

  const handlePaymentProof = async (url: string) => {
    try {
      await update(rtdbRef(rtdb, `requests/${params.id}`), { 
        paymentSlipUrl: url || null,
        status: 'SHIPPED',
        paidAt: Date.now()
      });
      setShowPaymentModal(false);
      setShowTrackingInput(true); // Open tracking after payment
      toast.success("PAIEMENT CONFIRMÉ : ACTIVATION TRACKING.");
    } catch (err) {
      toast.error("Erreur de validation paiement.");
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
      navigator.clipboard.writeText(url);
      toast.success("LIEN FOURNISSEUR COPIÉ !");
      
      if (request?.status === 'DRAFT') {
        await update(rtdbRef(rtdb, `requests/${params.id}`), { status: 'WAITING_FOR_QUOTE' });
      }
    } catch (e) {
      toast.error("Erreur génération lien.");
    }
  };

  const [showTrackingInput, setShowTrackingInput] = useState(false);
  const [showEmailImport, setShowEmailImport] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [isEditingTracking, setIsEditingTracking] = useState(false);
  const [manualTracking, setManualTracking] = useState({ location: "", event: "", status: "" });
  const [isSyncing, setIsSyncing] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingData, setTrackingData] = useState<any>(null);

  const handleShipment = async (num: string) => {
    if (!num) return;
    toast.info("Synchronisation avec le hub FedEx...");
    
    // Status update
    await update(rtdbRef(rtdb, `requests/${params.id}`), { 
      status: 'SHIPPED', 
      trackingNumber: num,
      shippedAt: Date.now()
    });
    
    setTrackingNumber(num);
    setShowTrackingInput(false);
    toast.success("Expédition activée. Flux temps réel connecté.");
    
    // Explicit sync after shipment
    syncTracking(num);
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
      } else {
        toast.error("Données FedEx indisponibles pour le moment.");
      }
    } catch (e) {
      console.error("Sync Error:", e);
      toast.error("Erreur de connexion au hub FedEx.");
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
      toast.success("Statut mis à jour manuellement.");
    } catch (e) {
      toast.error("Erreur de sauvegarde.");
    }
  };

  const handleEmailImport = async () => {
    if (!emailText) return;
    const lines = emailText.split('\n');
    let lastUpdateDate = "";
    let lastLocation = "";
    let lastEvent = "";

    const activityIdx = lines.findIndex(l => l.toLowerCase().includes('activity/location'));
    if (activityIdx !== -1 && lines[activityIdx + 1]) {
      const parts = lines[activityIdx + 1].trim().split(/\t| {2,}/);
      if (parts.length >= 2) {
        lastUpdateDate = parts[0];
        const statusParts = parts[1].split(' - ');
        lastEvent = statusParts[0];
        lastLocation = statusParts[1] || "HUB FEDEX";
      }
    } else {
      if (emailText.includes("HONG KONG")) lastLocation = "HONG KONG, HK";
      if (emailText.includes("Label created")) lastEvent = "Label created";
    }

    try {
      await update(rtdbRef(rtdb, `requests/${params.id}`), {
        trackingStatus: "EN ROUTE",
        lastLocation: lastLocation || "HUB LOGISTIQUE",
        lastEvent: lastEvent || "Information reçue par mail",
        lastUpdateDate: lastUpdateDate || "Dernier scan",
        lastSyncAt: Date.now()
      });
      setShowEmailImport(false);
      setEmailText("");
      toast.success("Données extraites avec succès !");
    } catch (e) {
      toast.error("Échec de l'import email.");
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
    await set(push(rtdbRef(rtdb, `payments/${params.id}`)), { 
      amount, 
      note: "Acompte 30%", 
      createdAt: Date.now() 
    });
    
    await update(rtdbRef(rtdb, `requests/${params.id}`), { status: 'IN_PRODUCTION' });
    toast.success(`Acompte de ${amount.toFixed(0)}€ encaissé. En production !`);
  };

  const handleBalancePayment = async (url?: string) => {
    const sPrice = parseFloat(sellingPrice);
    if (!sPrice || sPrice <= 0) return;
    
    // Calculate total already paid
    const totalPaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const amount = sPrice - totalPaid;
    
    if (amount <= 0) {
        toast.info("Déjà payé en totalité.");
    } else {
        await set(push(rtdbRef(rtdb, `payments/${params.id}`)), { 
          amount, 
          note: "Solde Final (Automatique)", 
          createdAt: Date.now() 
        });
    }
    
    await update(rtdbRef(rtdb, `requests/${params.id}`), { 
      status: 'SHIPPED',
      paymentSlipUrl: url || request?.paymentSlipUrl || null,
      paidAt: Date.now()
    });
    
    setShowPaymentModal(false);
    setShowTrackingInput(true);
    toast.success(`Solde encaissé. Prêt pour expédition !`, {
      action: {
        label: "TÉLÉCHARGER AUDIT",
        onClick: () => generatePDF('INVOICE')
      }
    });
  };

  const handleAcceptQuote = async (quote: any) => {
    const dates = calculateDeliveryDates(quote.productionTimeDays);
    await update(rtdbRef(rtdb, `requests/${params.id}`), {
      acceptedQuoteId: quote.id,
      status: 'MANAGER_REVIEW',
      productionDeadline: dates.productionDeadline,
      deliveryEstimation: dates.deliveryEstimation
    });
  };

  const generatePDF = (t: 'QUOTE' | 'INVOICE') => {
    if (!totals || !request) return;
    const data = { 
      id: request.id, title: request.title, size: request.size, 
      sellingPrice: totals.sPrice, totals, status: request.status,
      imageUrl: request.imageUrl, goldColor: request.goldColor 
    };
    if (t === 'QUOTE') generateQuotePDF(data); else generateInternalInvoicePDF(data);
  };

  if (loading) return <TitaneLoader />;
  if (!request) return <div className="layout">Request not found</div>;

  return (
    <div className="layout" style={{ background: '#fff', paddingBottom: '160px' }}>
      
      {/* IMMERSIVE HERO EDGE-TO-EDGE */}
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
         
         {/* TITLE & CATEGORY (EDITABLE) */}
         <div style={{ marginBottom: '32px' }}>
            {isEditing ? (
              <input 
                value={title} 
                onChange={(e) => {
                  setTitle(e.target.value);
                  saveField('title', e.target.value);
                }}
                style={{ fontSize: '32px', fontWeight: 900, width: '100%', border: 'none', background: '#F9F9F9', padding: '12px 20px', borderRadius: '16px', letterSpacing: '-0.04em' }}
              />
            ) : (
              <h1 style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-0.06em', margin: 0 }}>{request.title.toUpperCase()}</h1>
            )}
            <p className="cyber-label" style={{ marginTop: '8px', color: 'var(--accent)' }}></p>
            
            {/* SPECIFICATIONS GRID (COMPACT FOR MOBILE) */}
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', margin: '32px 0' }}>
            {/* HOUSE */}
            <div style={{ padding: '16px 8px', borderRadius: '20px', background: '#F9F9F9', border: '1px solid rgba(0,0,0,0.02)', textAlign: 'center' }}>
               <span className="cyber-label" style={{ fontSize: '8px', opacity: 0.5, display: 'block' }}>HOUSE</span>
               {isEditing ? (
                 <select 
                   value={brand}
                   onChange={(e) => {
                     setBrand(e.target.value);
                     saveField('brand', e.target.value);
                   }}
                   style={{ fontWeight: 900, fontSize: '11px', marginTop: '8px', width: '100%', border: 'none', background: 'transparent', padding: 0, textAlign: 'center' }}
                 >
                   {["Cartier", "Van Cleef", "Bulgari", "Messika", "Tiffany", "Boucheron", "Custom Atelier"].map(h => <option key={h} value={h}>{h.toUpperCase()}</option>)}
                 </select>
               ) : (
                 <p style={{ fontWeight: 900, fontSize: '12px', marginTop: '8px', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{request.brand?.toUpperCase() || '...'}</p>
               )}
            </div>

            {/* SIZE */}
            <div style={{ padding: '16px 8px', borderRadius: '20px', background: '#F9F9F9', border: '1px solid rgba(0,0,0,0.02)', textAlign: 'center' }}>
               <span className="cyber-label" style={{ fontSize: '8px', opacity: 0.5, display: 'block' }}>SIZE</span>
               {isEditing ? (
                 <select 
                   value={size}
                   onChange={(e) => {
                     setSize(e.target.value);
                     saveField('size', e.target.value);
                   }}
                   style={{ fontWeight: 900, fontSize: '11px', marginTop: '8px', width: '100%', border: 'none', background: 'transparent', padding: 0, color: 'var(--accent)', textAlign: 'center' }}
                 >
                   {category === "Bague" && Array.from({ length: 27 }, (_, i) => (44 + i).toString()).map(s => <option key={s} value={s}>{s}</option>)}
                   {(category === "Bracelet") && ["15 CM", "16 CM", "17 CM", "18 CM", "19 CM", "20 CM", "21 CM"].map(s => <option key={s} value={s}>{s}</option>)}
                   {(category === "Collier" || category === "Pendentif") && ["40 CM", "42 CM", "45 CM", "50 CM", "60 CM"].map(s => <option key={s} value={s}>{s}</option>)}
                   {["Boucles d'oreilles", "Montre"].includes(category) && <option value="STD">STD</option>}
                 </select>
               ) : (
                 <p style={{ fontWeight: 900, fontSize: '12px', marginTop: '8px', color: 'var(--accent)' }}>{request.size || 'STD'}</p>
               )}
            </div>

            {/* WEIGHT */}
            <div style={{ padding: '16px 8px', borderRadius: '20px', background: '#F9F9F9', border: '1px solid rgba(0,0,0,0.02)', textAlign: 'center' }}>
               <span className="cyber-label" style={{ fontSize: '8px', opacity: 0.5, display: 'block' }}>WEIGHT</span>
               {isEditing ? (
                 <input 
                   placeholder="4.85g"
                   value={weight} 
                   onChange={(e) => {
                     setWeight(e.target.value);
                     saveField('estimatedWeight', e.target.value);
                   }}
                   style={{ fontWeight: 900, fontSize: '11px', marginTop: '8px', width: '100%', border: 'none', background: 'transparent', padding: 0, textAlign: 'center' }}
                 />
               ) : (
                 <p style={{ fontWeight: 900, fontSize: '12px', marginTop: '8px' }}>{request.estimatedWeight || '...'}</p>
               )}
            </div>
         </div>

         {/* GOLD COLOR SELECTOR (MIRROR FROM NEW REQUEST) */}
         <div style={{ marginBottom: '48px' }}>
            <p className="cyber-label" style={{ fontSize: '7px', opacity: 0.5, marginBottom: '16px', paddingLeft: '8px' }}>METALS / 金属颜色</p>
            <div style={{ display: 'flex', gap: '8px' }}>
               {[
                 { id: "Or Jaune", label: "JAUNE", color: "#F5D061" },
                 { id: "Or Blanc", label: "BLANC", color: "#E5E5E5" },
                 { id: "Or Rose", label: "ROSE", color: "#E7A78B" }
               ].map(g => (
                  <motion.button 
                    key={g.id} 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => isEditing && saveField('goldColor', g.id)}
                    style={{ 
                      flex: 1, padding: '18px 8px', borderRadius: '24px', 
                      background: request.goldColor === g.id ? g.color : '#F9F9F9',
                      color: request.goldColor === g.id ? '#000' : 'rgba(0,0,0,0.4)',
                      border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center',
                      opacity: isEditing ? 1 : (request.goldColor === g.id ? 1 : 0.4),
                      boxShadow: request.goldColor === g.id ? `0 10px 30px ${g.color}66` : 'none',
                      cursor: isEditing ? 'pointer' : 'default',
                      transition: 'all 0.4s ease'
                    }}
                  >
                     <span style={{ fontSize: '10px', fontWeight: 900 }}>{g.label}</span>
                  </motion.button>
               ))}
            </div>

          {/* STONES SELECTOR */}
          <div style={{ marginBottom: '48px' }}>
             <p className="cyber-label" style={{ fontSize: '7px', opacity: 0.5, marginBottom: '16px', paddingLeft: '8px' }}>PIERRES / 宝石类型</p>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { id: "Sans Pierre", label: "SANS", color: "#F9F9F9" },
                  { id: "Diamants", label: "DIAMANTS", color: "#FFFFFF" },
                  { id: "Rubis", label: "RUBIS", color: "#E0115F" },
                  { id: "Saphir", label: "SAPHIR", color: "#0F52BA" },
                  { id: "Émeraude", label: "ÉMERAUDE", color: "#50C878" },
                  { id: "Perles", label: "PERLES", color: "#F0EAD6" }
                ].map(s => (
                   <motion.button 
                     key={s.id} 
                     whileTap={{ scale: 0.95 }}
                     onClick={() => isEditing && saveField('stoneType', s.id)}
                     style={{ 
                       padding: '14px 4px', borderRadius: '20px', 
                       background: request.stoneType === s.id ? s.color : '#F9F9F9',
                       color: request.stoneType === s.id ? (['Diamants', 'Perles', 'Sans Pierre'].includes(s.id) ? '#000' : '#fff') : 'rgba(0,0,0,0.4)',
                       border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center',
                       opacity: isEditing ? 1 : (request.stoneType === s.id ? 1 : 0.4),
                       boxShadow: request.stoneType === s.id ? `0 8px 15px ${s.color}44` : 'none',
                       cursor: isEditing ? 'pointer' : 'default',
                       transition: 'all 0.4s ease'
                     }}
                   >
                      <span style={{ fontSize: '9px', fontWeight: 900 }}>{s.label}</span>
                   </motion.button>
                ))}
             </div>
          </div>
         </div>       </div>

         {/* FINANCE MODULE (TITANE WHITE) */}
         <div style={{ padding: '32px', background: '#fff', borderRadius: '40px', border: '1px solid rgba(0,0,0,0.04)', marginBottom: '48px', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
            <span className="cyber-label" style={{ opacity: 0.5, color: !sellingPrice || sellingPrice === "0" ? '#FF3B30' : 'inherit' }}>
               PRIX DE VENTE TOTAL (TTC) {!sellingPrice || sellingPrice === "0" ? "⚠️ MANQUANT" : ""}
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
               <input 
                type="number"
                placeholder="0"
                value={sellingPrice}
                onChange={(e) => {
                   setSellingPrice(e.target.value);
                   saveField('sellingPrice', parseFloat(e.target.value) || 0);
                }}
                style={{ 
                  fontSize: '48px', 
                  fontWeight: 900, 
                  background: !sellingPrice || sellingPrice === "0" ? 'rgba(255,59,48,0.05)' : '#F9F9F9', 
                  border: !sellingPrice || sellingPrice === "0" ? '1px dashed #FF3B30' : 'none', 
                  width: '100%',
                  maxWidth: '220px', 
                  padding: '8px 16px', 
                  borderRadius: '16px', 
                  letterSpacing: '-0.05em',
                  color: '#000'
                }}
               />
               <span style={{ fontSize: '24px', fontWeight: 900 }}>€</span>
            </div>

            {sellingPrice && Number(sellingPrice) > 0 && request.status === 'WAITING_FOR_DEPOSIT' && (
              <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(52, 199, 89, 0.1)', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                 <div style={{ width: '6px', height: '6px', borderRadius: '3px', background: '#34C759' }} />
                 <span style={{ fontSize: '11px', fontWeight: 900, color: '#34C759' }}>
                    ACOMPTE À ENCAISSER (30%) : {(Number(sellingPrice) * 0.3).toLocaleString()} €
                 </span>
              </div>
            )}

            {totals && (
               <div style={{ marginTop: '32px', paddingTop: '32px', borderTop: '1px dotted rgba(0,0,0,0.1)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div>
                     <span className="cyber-label">PROFIT ADAM (50%)</span>
                     <div style={{ fontSize: '24px', fontWeight: 900, marginTop: '4px' }}>{totals.adamPart.toFixed(0)}€</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                     <span className="cyber-label">PROFIT MIRZA (50%)</span>
                     <div style={{ fontSize: '24px', fontWeight: 900, marginTop: '4px' }}>{totals.mirzaPart.toFixed(0)}€</div>
                  </div>
               </div>
            )}
            {totals && <div style={{ marginTop: '24px', opacity: 0.4, fontSize: '9px', fontWeight: 800 }}>TAUX ESTIMÉ : 1 RMB = {totals.rateUsed} €</div>}
         </div>

         {/* INCLUSIONS BAR */}
         <div style={{ marginBottom: '48px', padding: '20px', background: 'var(--accent-glow)', borderRadius: '24px', textAlign: 'center' }}>
            <p className="cyber-label" style={{ fontSize: '8px', color: 'var(--accent)' }}>PACKAGING</p>
            <p style={{ fontWeight: 900, fontSize: '13px', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>BOITE INCLUS</p>
         </div>

         {/* QUOTES SECTION */}
         {quotes.length > 0 && (
           <div style={{ marginBottom: '64px' }}>
             <span className="cyber-label" style={{ marginBottom: '20px', display: 'block' }}>SUPPLIER OFFERS ({quotes.length})</span>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
               {quotes.map(q => (
                 <motion.div 
                    key={q.id} whileTap={{ scale: 0.98 }}
                    onClick={() => !request.acceptedQuoteId && handleAcceptQuote(q)}
                    style={{ 
                      padding: '24px', borderRadius: '32px', 
                      background: request.acceptedQuoteId === q.id ? 'var(--accent)' : '#fff',
                      border: '1px solid rgba(0,0,0,0.05)',
                      color: request.acceptedQuoteId === q.id ? '#fff' : '#000',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                 >
                    <div>
                      <div style={{ fontSize: '22px', fontWeight: 900 }}>{q.priceRMB} ¥ <span style={{ fontSize: '14px', opacity: 0.6 }}>(~{(q.priceRMB * liveRate).toFixed(0)}€)</span></div>
                      <div style={{ fontSize: '10px', opacity: 0.5, fontWeight: 800, marginTop: '6px' }}>LEAD TIME: {q.productionTimeDays + 7} DAYS</div>
                    </div>
                    {request.acceptedQuoteId === q.id ? <Check size={20} strokeWidth={3} /> : <Plus size={20} strokeWidth={3} style={{ opacity: 0.2 }} />}
                 </motion.div>
               ))}
             </div>
           </div>
         )}

         {/* QC & PAYMENT PROOF GALLERY */}
         <div style={{ display: 'grid', gridTemplateColumns: request.qcMediaUrl && request.paymentSlipUrl ? '1fr 1fr' : '1fr', gap: '20px', marginBottom: '48px' }}>
           {request.qcMediaUrl && (
              <div>
                 <span className="cyber-label" style={{ display: 'block', marginBottom: '16px' }}>QUALITY CONTROL FEED</span>
                 <div style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: '32px', overflow: 'hidden', background: '#000' }}>
                    {request.qcMediaUrl.match(/\.(mp4|mov|webm)$/i) || request.qcMediaUrl.includes('cloudup') ? (
                      <video src={request.qcMediaUrl} controls autoPlay muted loop style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <img src={request.qcMediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="QC" />
                    )}
                 </div>
              </div>
           )}
           {request.paymentSlipUrl && (
              <div>
                 <span className="cyber-label" style={{ display: 'block', marginBottom: '16px' }}>PAYMENT SLIP (RIA/ALIPAY)</span>
                 <div style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: '32px', overflow: 'hidden', background: '#000', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <img src={request.paymentSlipUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Payment Slip" />
                 </div>
              </div>
           )}
         </div>

         {/* FEDEX LIVE TERMINAL (REAL DATA) */}
         {request.status === 'SHIPPED' && request.trackingNumber && (
           <div style={{ marginBottom: '48px', padding: '32px', background: '#4D148C', borderRadius: '40px', color: '#fff', boxShadow: '0 20px 50px rgba(77,20,140,0.2)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '300px', height: '300px', background: 'rgba(255,102,0,0.15)', borderRadius: '150px', filter: 'blur(60px)' }} />
              
              <div style={{ position: 'relative', zIndex: 2 }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <div style={{ background: '#fff', padding: '4px 10px', borderRadius: '8px' }}>
                          <span style={{ color: '#4D148C', fontWeight: 900, fontSize: '14px' }}>Fed</span>
                          <span style={{ color: '#FF6600', fontWeight: 900, fontSize: '14px' }}>Ex</span>
                       </div>
                       <span style={{ fontSize: '10px', fontWeight: 900, opacity: 0.6 }}>LIVE HUB FEED</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '100px', fontSize: '9px', fontWeight: 900 }}>
                       STATUS: <span style={{ color: '#FF6600' }}>{request.trackingStatus || 'EN ROUTE'}</span>
                    </div>
                 </div>

                 <div style={{ padding: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                     {isEditingTracking ? (
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <input 
                            placeholder="LIEU (ex: STRASBOURG, FR)"
                            value={manualTracking.location}
                            onChange={(e) => setManualTracking({ ...manualTracking, location: e.target.value })}
                            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '12px', borderRadius: '12px', color: '#fff', fontSize: '13px', fontWeight: 600 }}
                          />
                          <input 
                            placeholder="ÉVÉNEMENT (ex: EN DOUANE)"
                            value={manualTracking.event}
                            onChange={(e) => setManualTracking({ ...manualTracking, event: e.target.value })}
                            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '12px', borderRadius: '12px', color: '#fff', fontSize: '13px', fontWeight: 600 }}
                          />
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                             <button onClick={handleManualTrackingSave} style={{ flex: 1, height: '40px', background: '#FF6600', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 900, fontSize: '11px' }}>SAUVEGARDER</button>
                             <button onClick={() => setIsEditingTracking(false)} style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', color: '#fff', fontWeight: 900, fontSize: '11px' }}>ANNULER</button>
                          </div>
                       </div>
                     ) : (
                       <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }} onClick={() => {
                          setManualTracking({ location: request.lastLocation || "", event: request.lastEvent || "", status: request.trackingStatus || "" });
                          setIsEditingTracking(true);
                       }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '20px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <Plane size={20} />
                          </div>
                          <div style={{ flex: 1 }}>
                             <p style={{ fontSize: '14px', fontWeight: 900 }}>
                               {isSyncing ? 'Mise à jour...' : (request.lastLocation || 'Vérification du dernier scan...')}
                             </p>
                             <p style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>
                               {isSyncing ? 'Synchronisation avec les serveurs FedEx' : (request.lastUpdateDate || 'Chargement des données temps réel...')}
                             </p>
                             {request.lastEvent && (
                               <div style={{ marginTop: '12px', padding: '6px 12px', background: '#FF6600', borderRadius: '8px', display: 'inline-block' }}>
                                  <span style={{ fontSize: '9px', fontWeight: 900 }}>{request.lastEvent.toUpperCase()}</span>
                               </div>
                             )}
                          </div>
                          <div style={{ opacity: 0.3 }}><Plus size={16} /></div>
                       </div>
                     )}
                  </div>
                 <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                    <button 
                       onClick={() => setShowEmailImport(true)} 
                       style={{ flex: 1, height: '48px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '11px', fontWeight: 900 }}
                     >
                        IMPORT EMAIL
                     </button>
                     <button 
                       onClick={() => syncTracking()} 
                       disabled={isSyncing} 
                       style={{ flex: 1, height: '48px', borderRadius: '16px', background: '#fff', border: 'none', color: '#4D148C', fontSize: '11px', fontWeight: 900, cursor: 'pointer' }}
                     >
                        {isSyncing ? 'SYNCING...' : 'REFRESH DATA'}
                     </button>
                    <a 
                      href={`https://www.fedex.com/fedextrack/?trknbr=${request.trackingNumber}`} 
                      target="_blank" 
                      style={{ flex: 1, height: '48px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '11px', fontWeight: 900 }}
                    >
                       FULL TRACKING ↗
                    </a>
                 </div>
              </div>
              <div style={{ position: 'absolute', right: '-20px', bottom: '-40px', fontSize: '120px', fontWeight: 900, opacity: 0.03, pointerEvents: 'none' }}>Ex</div>
           </div>
         )}

         {/* TIMELINE */}
         <div style={{ marginBottom: '64px', paddingLeft: '8px' }}>
            <span className="cyber-label" style={{ marginBottom: '24px', display: 'block' }}>LOGISTICS PIPELINE</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               {[
                 { id: 1, label: "Sourcing", statusMatch: ['DRAFT', 'WAITING_FOR_QUOTE'], date: request.createdAt ? new Date(request.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : null },
                 { id: 2, label: "Review", statusMatch: ['QUOTED', 'MANAGER_REVIEW'] },
                 { id: 3, label: "Deposit", statusMatch: ['WAITING_FOR_DEPOSIT'] },
                 { id: 4, label: "Production", statusMatch: ['IN_PRODUCTION'] },
                 { id: 5, label: "Payment", statusMatch: ['FINAL_PAYMENT'] },
                 { id: 6, label: "Transit", statusMatch: ['SHIPPED'] },
                 { id: 7, label: "Delivered", statusMatch: ['DELIVERED'], date: request.deliveryEstimation ? new Date(request.deliveryEstimation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : (request.createdAt ? new Date(request.createdAt + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : null), isEstimate: !request.deliveryEstimation }
               ].map((step: any) => {
                 const statusOrder = ["DRAFT", "WAITING_FOR_QUOTE", "QUOTED", "MANAGER_REVIEW", "WAITING_FOR_DEPOSIT", "IN_PRODUCTION", "FINAL_PAYMENT", "SHIPPED", "DELIVERED"];
                 const currentStatusIdx = statusOrder.indexOf(request.status);
                 const stepMaxIdx = Math.max(...step.statusMatch.map((s: string) => statusOrder.indexOf(s)));
                 const isCompleted = currentStatusIdx > stepMaxIdx;
                 const isActive = step.statusMatch.includes(request.status);

                 return (
                   <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '20px', opacity: (isActive || isCompleted) ? 1 : 0.15 }}>
                     <div style={{ width: '8px', height: '8px', borderRadius: '4px', background: (isActive || isCompleted) ? 'var(--accent)' : '#000' }} />
                     <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: (isActive || isCompleted) ? 900 : 500, textTransform: 'uppercase', color: isActive ? 'var(--accent)' : '#000', letterSpacing: '0.02em' }}>{step.label}</span>
                        {isActive && <div style={{ fontSize: '9px', fontWeight: 900, color: 'var(--accent)' }}>●</div>}
                     </div>
                     {step.date && (
                        <span style={{ fontSize: '10px', fontWeight: 800, opacity: 0.4, fontVariantNumeric: 'tabular-nums' }}>
                           {step.isEstimate ? 'EST. ' : ''}{step.date.toUpperCase()}
                        </span>
                     )}
                   </div>
                 );
               })}
            </div>
         </div>
      </div>

      <VisionPill width="calc(100% - 64px)">
         {/* NAVIGATION (LEFT) */}
         <div style={{ display: 'flex', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '8px', marginRight: '4px' }}>
            <motion.button whileTap={{ scale: 0.85 }} className="vision-action" onClick={() => {
               const stages = ["DRAFT", "WAITING_FOR_QUOTE", "QUOTED", "MANAGER_REVIEW", "WAITING_FOR_DEPOSIT", "IN_PRODUCTION", "FINAL_PAYMENT", "SHIPPED", "DELIVERED"];
               const currentIdx = stages.indexOf(request.status);
               const prevStatus = stages[currentIdx - 1];
               if (prevStatus) {
                 setPrevStageName(prevStatus);
                 setShowBackModal(true);
               }
            }} style={{ width: '44px', flex: 'none' }}><ArrowLeft size={20} strokeWidth={2.5} /></motion.button>
         </div>

         {/* MAIN PROGRESSION (CENTER) */}
         <div style={{ flex: 1, display: 'flex' }}>
            {request.status === 'DRAFT' && (
              <button className="vision-action accent" onClick={generateSupplierLink}>GENERATE LINK</button>
            )}
            {request.status === 'WAITING_FOR_QUOTE' && (
              <button className="vision-action accent" style={{ background: '#FF9500' }} onClick={generateSupplierLink}>COPY QUOTE LINK</button>
            )}
            {request.status === 'QUOTED' && (
              <button className="vision-action accent" onClick={() => saveField('status', 'MANAGER_REVIEW')}>REVIEW QUOTE</button>
            )}
            {request.status === 'MANAGER_REVIEW' && (
              <button className="vision-action accent" onClick={() => saveField('status', 'WAITING_FOR_DEPOSIT')}>VALIDATE & DEPOSIT</button>
            )}
            {request.status === 'WAITING_FOR_DEPOSIT' && (
              <button className="vision-action accent" onClick={handleDeposit}>ENCAISSER 30%</button>
            )}
            {request.status === 'IN_PRODUCTION' && (
              <button className="vision-action accent" onClick={() => setShowQCModal(true)}>PROD. FINISHED</button>
            )}
            {request.status === 'FINAL_PAYMENT' && (
              <button className="vision-action accent" onClick={() => setShowPaymentModal(true)}>CONFIRM PAYMENT</button>
            )}
            {request.status === 'SHIPPED' && (
              <button className="vision-action accent" onClick={() => saveField('status', 'DELIVERED')}>MARK AS DELIVERED</button>
            )}
            {request.status === 'DELIVERED' && (
              <button className="vision-action" style={{ background: '#34C759', color: '#fff' }}><Check size={18} /> ORDER COMPLETED</button>
            )}
         </div>

         {/* DOCUMENTS (RIGHT) */}
         <div style={{ display: 'flex', gap: '4px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '8px', marginLeft: '4px' }}>
            <motion.button whileTap={{ scale: 0.85 }} className="vision-action" onClick={() => generatePDF('QUOTE')} style={{ width: '44px', flex: 'none' }}><FileText size={20} strokeWidth={2.5} /></motion.button>
            <motion.button whileTap={{ scale: 0.85 }} className="vision-action" onClick={() => generatePDF('INVOICE')} style={{ width: '44px', flex: 'none' }}><Calculator size={20} strokeWidth={2.5} /></motion.button>
         </div>
      </VisionPill>

      <AnimatePresence>
        {showPaymentModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(30px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div style={{ textAlign: 'center', maxWidth: '400px', width: '100%' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '32px', background: '#34C759', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', color: '#fff' }}>
                {uploadProgress > 0 ? <Loader2 className="animate-spin" /> : <Calculator size={32} />}
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.04em' }}>SOLDE FINAL</h2>
              <p style={{ marginTop: '12px', color: 'var(--faded)', fontWeight: 600, fontSize: '12px' }}>PREUVE DE PAIEMENT (RIA/ALIPAY)</p>
              
              <div style={{ marginTop: '32px' }}>
                <label className="btn-main" style={{ cursor: 'pointer', background: '#34C759', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                   <UploadCloud size={20} />
                   {uploadProgress > 0 ? `UPLOAD ${uploadProgress.toFixed(0)}%` : "MONTER LE REÇU"}
                   <input 
                     type="file" 
                     accept="image/*" 
                     style={{ display: 'none' }} 
                     onChange={(e) => {
                       if (e.target.files) {
                         const file = e.target.files[0];
                         const fileRef = storageRef(storage, `payments/${params.id}/${Date.now()}_${file.name}`);
                         const uploadTask = uploadBytesResumable(fileRef, file);
                         uploadTask.on('state_changed', 
                            s => setUploadProgress((s.bytesTransferred / s.totalBytes) * 100),
                            err => toast.error(err.message),
                            () => getDownloadURL(uploadTask.snapshot.ref).then(url => handleBalancePayment(url))
                         );
                       }
                     }} 
                     disabled={uploadProgress > 0}
                   />
                </label>
              </div>

              <button onClick={() => handleBalancePayment("")} style={{ background: 'none', border: 'none', marginTop: '24px', fontWeight: 800, color: '#34C759', fontSize: '11px', textDecoration: 'underline', opacity: 0.7 }}>PASSER (MODE DÉVELOPPEMENT)</button>
              <button onClick={() => setShowPaymentModal(false)} style={{ background: 'none', border: 'none', marginTop: '16px', fontWeight: 800, color: 'var(--faded)', fontSize: '13px' }}>ANNULER</button>
            </div>
          </motion.div>
        )}

        {showQCModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(30px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div style={{ textAlign: 'center', maxWidth: '400px', width: '100%' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '32px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', color: '#fff' }}>
                {uploadProgress > 0 ? <Loader2 className="animate-spin" /> : <Check size={32} />}
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.04em' }}>CONTRÔLE QUALITÉ</h2>
              <p style={{ marginTop: '12px', color: 'var(--faded)', fontWeight: 600, fontSize: '12px' }}>PARTAGER LA VIDÉO DE L&apos;USINE</p>
              
              <div style={{ marginTop: '32px' }}>
                <label className="btn-main" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                   <UploadCloud size={20} />
                   {uploadProgress > 0 ? `CHARGEMENT ${uploadProgress.toFixed(0)}%` : "SÉLECTIONNER FICHIER"}
                   <input 
                     type="file" 
                     accept="video/*,image/*" 
                     style={{ display: 'none' }} 
                     onChange={(e) => e.target.files && handleUpload(e.target.files[0])} 
                     disabled={uploadProgress > 0}
                   />
                </label>
                
                {uploadProgress > 0 && (
                  <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.05)', borderRadius: '2px', marginTop: '16px', overflow: 'hidden' }}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      style={{ height: '100%', background: 'var(--accent)' }}
                    />
                  </div>
                )}
              </div>

              <button onClick={() => handleQC("")} style={{ background: 'none', border: 'none', marginTop: '24px', fontWeight: 800, color: 'var(--accent)', fontSize: '11px', textDecoration: 'underline', opacity: 0.7 }}>PASSER LE QC (MODE DÉVELOPPEMENT)</button>
             <button onClick={() => setShowQCModal(false)} style={{ background: 'none', border: 'none', marginTop: '16px', fontWeight: 800, color: 'var(--faded)', fontSize: '13px' }}>ANNULER</button>
            </div>
          </motion.div>
        )}

        {showBackModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(40px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div style={{ textAlign: 'center', maxWidth: '320px', width: '100%' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '32px', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
                <ArrowLeft size={32} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.04em' }}>RETOUR EN ARRIÈRE</h2>
              <p style={{ marginTop: '12px', color: 'var(--faded)', fontWeight: 600, fontSize: '12px', lineHeight: 1.5 }}>Voulez-vous vraiment revenir à l&apos;étape précédente : <span style={{ color: '#000' }}>{prevStageName.replace(/_/g, ' ')}</span> ?</p>
              
              <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 <button onClick={() => { saveField('status', prevStageName); setShowBackModal(false); }} className="btn-main" style={{ background: '#000', color: '#fff' }}>CONFIRMER LE RETOUR</button>
                 <button onClick={() => setShowBackModal(false)} style={{ background: 'none', border: 'none', marginTop: '8px', fontWeight: 800, color: 'var(--faded)', fontSize: '13px' }}>ANNULER</button>
              </div>
            </div>
          </motion.div>
        )}

        {showTrackingInput && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(30px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div style={{ textAlign: 'center', maxWidth: '400px', width: '100%' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '32px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', color: '#fff' }}><Truck /></div>
              <h2 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.04em' }}>TRACKING SYNC</h2>
              <p style={{ marginTop: '12px', color: 'var(--faded)', fontWeight: 600, fontSize: '12px' }}>ENTER FEDEX OR DHL NUMBER</p>
              
              <input 
                autoFocus
                placeholder="0000 0000 0000"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                style={{ width: '100%', padding: '20px', background: '#F9F9F9', borderRadius: '20px', fontSize: '18px', fontWeight: 900, textAlign: 'center', marginTop: '32px', border: '1px solid rgba(0,0,0,0.05)' }}
              />

              <button onClick={() => handleShipment(trackingNumber)} className="btn-main" style={{ marginTop: '24px' }}>ACTIVATE TRACKING</button>
              <button onClick={() => setShowTrackingInput(false)} style={{ background: 'none', border: 'none', marginTop: '20px', fontWeight: 800, color: 'var(--faded)', fontSize: '13px' }}>CANCEL</button>
            </div>
          </motion.div>
        )}

        {showDeleteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(30px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div style={{ textAlign: 'center', maxWidth: '400px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '32px', background: '#FF3B30', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', color: '#fff', boxShadow: '0 10px 30px rgba(255,59,48,0.3)' }}><Trash2 /></div>
              <h2 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.04em' }}>DELETE RECORD?</h2>
              <p style={{ marginTop: '12px', color: 'var(--faded)', fontWeight: 600, fontSize: '14px' }}>This cannot be undone.</p>
              <button onClick={() => { remove(rtdbRef(rtdb, `requests/${params.id}`)); router.push('/'); }} className="btn-main" style={{ background: '#FF3B30', marginTop: '40px' }}>CONFIRM</button>
              <button onClick={() => setShowDeleteModal(false)} style={{ background: 'none', border: 'none', marginTop: '20px', fontWeight: 800, color: 'var(--faded)', fontSize: '13px' }}>CANCEL</button>
            </div>
          </motion.div>
        )}
        {showEmailImport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(30px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div style={{ textAlign: 'center', maxWidth: '400px', width: '100%' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '32px', background: '#4D148C', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', color: '#fff' }}><FileText /></div>
              <h2 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.04em' }}>IMPORT EMAIL</h2>
              <p style={{ marginTop: '12px', color: 'var(--faded)', fontWeight: 600, fontSize: '12px' }}>COLLEZ LE TEXTE DU MAIL FEDEX</p>
              
              <textarea 
                placeholder="Copiez tout le mail ici..."
                value={emailText}
                onChange={(e) => setEmailText(e.target.value)}
                style={{ width: '100%', height: '200px', padding: '20px', background: '#F9F9F9', borderRadius: '20px', fontSize: '13px', fontWeight: 500, marginTop: '32px', border: '1px solid rgba(0,0,0,0.05)', resize: 'none' }}
              />

              <button onClick={handleEmailImport} className="btn-main" style={{ background: '#4D148C', marginTop: '24px' }}>EXTRAIRE INFO</button>
              <button onClick={() => setShowEmailImport(false)} style={{ background: 'none', border: 'none', marginTop: '20px', fontWeight: 800, color: 'var(--faded)', fontSize: '13px' }}>ANNULER</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
