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
      
      try {
        await navigator.clipboard.writeText(url);
        toast.success("LIEN COPIÉ DANS LE PRESSE-PAPIER");
      } catch (err) {
        setShowLinkModal(true);
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
  };

  const generatePDF = (t: 'QUOTE' | 'INVOICE') => {
    if (!totals || !request) return;
    const data = { 
      id: request.id, title: title || request.title, size: size || request.size, 
      sellingPrice: totals.sPrice, totals, status: request.status,
      imageUrl: request.imageUrl, goldColor: request.goldColor,
      stoneType: request.stoneType, weight: weight || request.estimatedWeight 
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
              <h1 style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-0.06em', margin: 0 }}>{request.title?.toUpperCase()}</h1>
            )}
          </div>
            
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', margin: '32px 0' }}>
            <div style={{ padding: '16px 8px', borderRadius: '20px', background: '#F9F9F9', border: '1px solid rgba(0,0,0,0.02)', textAlign: 'center' }}>
               <span className="cyber-label" style={{ fontSize: '8px', opacity: 0.5, display: 'block' }}>HOUSE</span>
               {isEditing ? (
                 <select value={brand} onChange={(e) => { setBrand(e.target.value); saveField('brand', e.target.value); }} style={{ fontWeight: 900, fontSize: '11px', marginTop: '8px', width: '100%', border: 'none', background: 'transparent', padding: 0, textAlign: 'center' }}>
                   {["Cartier", "Van Cleef", "Bulgari", "Messika", "Tiffany", "Boucheron", "Custom Atelier"].map(h => <option key={h} value={h}>{h.toUpperCase()}</option>)}
                 </select>
               ) : (
                 <p style={{ fontWeight: 900, fontSize: '12px', marginTop: '8px', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{request.brand?.toUpperCase() || '...'}</p>
               )}
            </div>

            <div style={{ padding: '16px 8px', borderRadius: '20px', background: '#F9F9F9', border: '1px solid rgba(0,0,0,0.02)', textAlign: 'center' }}>
               <span className="cyber-label" style={{ fontSize: '8px', opacity: 0.5, display: 'block' }}>SIZE</span>
               {isEditing ? (
                 <input value={size} onChange={(e) => { setSize(e.target.value); saveField('size', e.target.value); }} style={{ fontWeight: 900, fontSize: '11px', marginTop: '8px', width: '100%', border: 'none', background: 'transparent', textAlign: 'center' }} />
               ) : (
                 <p style={{ fontWeight: 900, fontSize: '12px', marginTop: '8px', color: 'var(--accent)' }}>{request.size || 'STD'}</p>
               )}
            </div>

            <div style={{ padding: '16px 8px', borderRadius: '20px', background: '#F9F9F9', border: '1px solid rgba(0,0,0,0.02)', textAlign: 'center' }}>
               <span className="cyber-label" style={{ fontSize: '8px', opacity: 0.5, display: 'block' }}>WEIGHT</span>
               {isEditing ? (
                 <input value={weight} onChange={(e) => { setWeight(e.target.value); saveField('estimatedWeight', e.target.value); }} style={{ fontWeight: 900, fontSize: '11px', marginTop: '8px', width: '100%', border: 'none', background: 'transparent', textAlign: 'center' }} />
               ) : (
                 <p style={{ fontWeight: 900, fontSize: '12px', marginTop: '8px' }}>{request.estimatedWeight || '...'}</p>
               )}
            </div>
         </div>

         <div style={{ marginBottom: '48px' }}>
            <p className="cyber-label" style={{ fontSize: '7px', opacity: 0.5, marginBottom: '16px', paddingLeft: '8px' }}>METALS / 金属颜色</p>
            <div style={{ display: 'flex', gap: '8px' }}>
               {[
                 { id: "Or Jaune", label: "JAUNE", color: "#F5D061" },
                 { id: "Or Blanc", label: "BLANC", color: "#E5E5E5" },
                 { id: "Or Rose", label: "ROSE", color: "#E7A78B" }
               ].map(g => (
                  <motion.button key={g.id} whileTap={{ scale: 0.95 }} onClick={() => isEditing && saveField('goldColor', g.id)}
                    style={{ flex: 1, padding: '18px 8px', borderRadius: '24px', background: request.goldColor === g.id ? g.color : '#F9F9F9', color: request.goldColor === g.id ? '#000' : 'rgba(0,0,0,0.4)', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: isEditing ? 1 : (request.goldColor === g.id ? 1 : 0.4), transition: 'all 0.4s ease' }}>
                     <span style={{ fontSize: '10px', fontWeight: 900 }}>{g.label}</span>
                  </motion.button>
               ))}
            </div>

          <div style={{ marginBottom: '48px', marginTop: '32px' }}>
             <p className="cyber-label" style={{ fontSize: '7px', opacity: 0.5, marginBottom: '16px', paddingLeft: '8px' }}>PIERRES / 宝石类型</p>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { id: "Sans Pierre", label: "SANS", color: "#F9F9F9" },
                  { id: "Diamants", label: "DIAMANTS", color: "#FFFFFF" },
                  { id: "Rubis", label: "RUBIS", color: "#E0115F" },
                  { id: "Saphir", label: "SAPHIR", color: "#0F52BA" },
                  { id: "Émeraude", label: "ÉMERAUDE", color: "#50C878" },
                  { id: "Perles", label: "PERLES", color: "#F0EAD6" }
                ].map(s => {
                   const isSelected = request.stoneType === s.id;
                   let stoneBg = isSelected ? s.color : '#F9F9F9';
                   let textColor = isSelected ? (['Diamants', 'Perles', 'Sans Pierre'].includes(s.id) ? '#000' : '#fff') : 'rgba(0,0,0,0.4)';
                   if (isSelected) {
                      if (s.id === 'Diamants') stoneBg = 'linear-gradient(135deg, #fff 0%, #e0f2fe 40%, #bae6fd 60%, #fff 100%)';
                      if (s.id === 'Rubis') stoneBg = 'radial-gradient(circle at 30% 30%, #ff5e9c 0%, #E0115F 60%, #8b0000 100%)';
                      if (s.id === 'Saphir') stoneBg = 'radial-gradient(circle at 30% 30%, #4ea5ff 0%, #0F52BA 60%, #002366 100%)';
                      if (s.id === 'Émeraude') stoneBg = 'radial-gradient(circle at 30% 30%, #94fbba 0%, #50C878 60%, #065535 100%)';
                      if (s.id === 'Perles') stoneBg = 'radial-gradient(circle at 30% 30%, #ffffff 0%, #F0EAD6 50%, #dcd4b8 100%)';
                      if (s.id === 'Sans Pierre') stoneBg = '#000';
                   }
                   return (
                     <motion.button key={s.id} whileTap={{ scale: 0.95 }} onClick={() => isEditing && saveField('stoneType', s.id)}
                       style={{ padding: '14px 4px', borderRadius: '20px', background: stoneBg, color: textColor, border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: isEditing ? 1 : (request.stoneType === s.id ? 1 : 0.4), position: 'relative', overflow: 'hidden' }}>
                        {isSelected && s.id !== 'Sans Pierre' && <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'linear-gradient(45deg, transparent 45%, rgba(255,255,255,0.4) 50%, transparent 55%)', animation: 'shine 3s infinite' }} />}
                        <span style={{ fontSize: '9px', fontWeight: 900, position: 'relative', zIndex: 1, letterSpacing: '0.02em' }}>{s.label}</span>
                     </motion.button>
                   );
                })}
             </div>
          </div>
        </div>

         {/* FINANCE MODULE */}
         <div style={{ padding: '32px', background: '#fff', borderRadius: '40px', border: '1px solid rgba(0,0,0,0.04)', marginBottom: '48px', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
            <span className="cyber-label" style={{ opacity: 0.5, color: !sellingPrice || sellingPrice === "0" ? '#FF3B30' : 'inherit' }}>PRIX DE VENTE TOTAL (TTC)</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
               <input type="number" placeholder="0" value={sellingPrice} onChange={(e) => { setSellingPrice(e.target.value); saveField('sellingPrice', parseFloat(e.target.value) || 0); }} style={{ fontSize: '48px', fontWeight: 900, background: '#F9F9F9', border: 'none', width: '100%', maxWidth: '220px', padding: '8px 16px', borderRadius: '16px' }} />
               <span style={{ fontSize: '24px', fontWeight: 900 }}>€</span>
            </div>
            {totals && (
               <div style={{ marginTop: '32px', paddingTop: '32px', borderTop: '1px dotted rgba(0,0,0,0.1)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div><span className="cyber-label">PROFIT ADAM (50%)</span><div style={{ fontSize: '24px', fontWeight: 900, marginTop: '4px' }}>{totals.adamPart.toFixed(0)}€</div></div>
                  <div style={{ textAlign: 'right' }}><span className="cyber-label">PROFIT MIRZA (50%)</span><div style={{ fontSize: '24px', fontWeight: 900, marginTop: '4px' }}>{totals.mirzaPart.toFixed(0)}€</div></div>
               </div>
            )}
         </div>

         {/* QUOTES SECTION */}
         {quotes.length > 0 && (
           <div style={{ marginBottom: '64px' }}>
             <span className="cyber-label" style={{ marginBottom: '20px', display: 'block' }}>SUPPLIER OFFERS ({quotes.length})</span>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {quotes.map(q => (
                  <motion.div key={q.id} whileTap={{ scale: 0.98 }} onClick={() => request.acceptedQuoteId === q.id ? handleUnselectQuote() : handleAcceptQuote(q)}
                     style={{ padding: '24px', borderRadius: '32px', background: request.acceptedQuoteId === q.id ? 'var(--accent)' : '#fff', border: '1px solid rgba(0,0,0,0.05)', color: request.acceptedQuoteId === q.id ? '#fff' : '#000', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                       <p className="cyber-label" style={{ fontSize: '7px', marginBottom: '8px', opacity: 0.6, color: request.acceptedQuoteId === q.id ? '#fff' : 'inherit' }}>{q.supplierName || 'FACTORY'}</p>
                       <div style={{ fontSize: '22px', fontWeight: 900 }}>{q.priceRMB} ¥ <span style={{ fontSize: '14px', opacity: 0.6 }}>(~{(q.priceRMB * liveRate).toFixed(0)}€)</span></div>
                       <div style={{ fontSize: '10px', opacity: 0.5, fontWeight: 800, marginTop: '6px' }}>LEAD TIME: {q.productionTimeDays + 7} DAYS</div>
                       <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: `1px solid ${request.acceptedQuoteId === q.id ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`, paddingTop: '16px' }}>
                          <div><p className="cyber-label" style={{ fontSize: '6px', opacity: 0.4, color: request.acceptedQuoteId === q.id ? '#fff' : 'inherit' }}>WEIGHTS</p><p style={{ fontSize: '10px', fontWeight: 800 }}>OR: {q.goldWeight}g / TOT: {q.totalWeight}g</p></div>
                          <div><p className="cyber-label" style={{ fontSize: '6px', opacity: 0.4, color: request.acceptedQuoteId === q.id ? '#fff' : 'inherit' }}>STONES</p><p style={{ fontSize: '10px', fontWeight: 800 }}>{q.diamondCount}pcs ({q.totalCarat}ct)</p></div>
                       </div>
                    </div>
                    {request.acceptedQuoteId === q.id ? <Check size={20} strokeWidth={3} /> : <Plus size={20} strokeWidth={3} style={{ opacity: 0.2 }} />}
                  </motion.div>
                ))}
             </div>
           </div>
         )}

         {/* FEDEX LIVE TERMINAL */}
         {request.status === 'SHIPPED' && request.trackingNumber && (
           <div style={{ marginBottom: '48px', padding: '32px', background: '#4D148C', borderRadius: '40px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'relative', zIndex: 2 }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div style={{ background: '#fff', padding: '4px 10px', borderRadius: '8px' }}><span style={{ color: '#4D148C', fontWeight: 900, fontSize: '14px' }}>Fed</span><span style={{ color: '#FF6600', fontWeight: 900, fontSize: '14px' }}>Ex</span></div>
                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '100px', fontSize: '9px', fontWeight: 900 }}>STATUS: <span style={{ color: '#FF6600' }}>{request.trackingStatus || 'EN ROUTE'}</span></div>
                 </div>
                 <div style={{ padding: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                       <div style={{ width: '40px', height: '40px', borderRadius: '20px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plane size={20} /></div>
                       <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '14px', fontWeight: 900 }}>{request.lastLocation || 'Vérification...'}</p>
                          <p style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>{request.lastUpdateDate || 'Chargement...'}</p>
                       </div>
                    </div>
                  </div>
                 <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                    <button onClick={() => setShowEmailImport(true)} style={{ flex: 1, height: '48px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '11px', fontWeight: 900 }}>IMPORT EMAIL</button>
                    <button onClick={() => syncTracking()} disabled={isSyncing} style={{ flex: 1, height: '48px', borderRadius: '16px', background: '#fff', color: '#4D148C', border: 'none', fontWeight: 900 }}>{isSyncing ? 'SYNC...' : 'REFRESH'}</button>
                 </div>
              </div>
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
                 { id: 7, label: "Delivered", statusMatch: ['DELIVERED'], date: request.deliveryEstimation ? new Date(request.deliveryEstimation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : null }
               ].map((step: any) => {
                 const statusOrder = ["DRAFT", "WAITING_FOR_QUOTE", "QUOTED", "MANAGER_REVIEW", "WAITING_FOR_DEPOSIT", "IN_PRODUCTION", "FINAL_PAYMENT", "SHIPPED", "DELIVERED"];
                 const currentIdx = statusOrder.indexOf(request.status);
                 const stepIdx = Math.max(...step.statusMatch.map((s: string) => statusOrder.indexOf(s)));
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
         <div style={{ display: 'flex', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '12px' }}>
            <motion.button whileTap={{ scale: 0.85 }} className="vision-action" onClick={() => router.back()}><ArrowLeft size={20} /></motion.button>
         </div>
         <div style={{ flex: 1, display: 'flex', gap: '8px', overflowX: 'auto', padding: '0 8px' }} className="hide-scrollbar">
            {['DRAFT', 'WAITING_FOR_QUOTE', 'QUOTED'].includes(request.status) && <motion.button whileTap={{ scale: 0.95 }} className="vision-action active primary" onClick={generateSupplierLink}><Plus size={18} /> NEW LINK</motion.button>}
            {request.status === 'MANAGER_REVIEW' && <motion.button whileTap={{ scale: 0.95 }} className="vision-action active primary" onClick={() => update(rtdbRef(rtdb, `requests/${params.id}`), { status: 'WAITING_FOR_DEPOSIT' })}><Check size={18} /> VALIDATE</motion.button>}
            {request.status === 'WAITING_FOR_DEPOSIT' && <motion.button whileTap={{ scale: 0.95 }} className="vision-action active primary" onClick={handleDeposit}><Calculator size={18} /> DEPOSIT</motion.button>}
            {request.status === 'IN_PRODUCTION' && <motion.button whileTap={{ scale: 0.95 }} className="vision-action active primary" onClick={() => setShowQCModal(true)}><Package size={18} /> QC READY</motion.button>}
            {request.status === 'FINAL_PAYMENT' && <motion.button whileTap={{ scale: 0.95 }} className="vision-action active primary" onClick={() => handleBalancePayment()}><Calculator size={18} /> BALANCE</motion.button>}
            {request.status === 'SHIPPED' && <motion.button whileTap={{ scale: 0.95 }} className="vision-action active primary" onClick={() => update(rtdbRef(rtdb, `requests/${params.id}`), { status: 'DELIVERED' })}><Check size={18} /> DELIVERED</motion.button>}
         </div>
         <div style={{ display: 'flex', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '12px' }}>
            <motion.button whileTap={{ scale: 0.85 }} className="vision-action" onClick={() => generatePDF('QUOTE')}><FileText size={20} /></motion.button>
         </div>
      </VisionPill>

      <AnimatePresence>
        {showQCModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
             <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ width: '100%', maxWidth: '400px', background: '#fff', borderRadius: '40px', padding: '40px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 900 }}>QUALITY CONTROL</h2>
                <div style={{ marginTop: '24px' }}>
                   <input type="file" accept="image/*,video/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                   <button onClick={() => handleQC("")} style={{ width: '100%', marginTop: '16px' }}>PASSER</button>
                   <button onClick={() => setShowQCModal(false)} style={{ width: '100%', marginTop: '8px' }}>ANNULER</button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
