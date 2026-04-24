"use client";

import { useEffect, useState } from "react";
import { rtdb, rtdbRef, get, set, push, update } from "@/lib/firebase";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle, Truck, PackageCheck, ArrowRight, User, MapPin } from "lucide-react";
import { TitaneLoader } from "@/components/ui/TitaneLoader";

export default function SupplierPortal({ params }: { params: { token: string } }) {
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<any>(null);
  const [tokenData, setTokenData] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const [shippingSubmitted, setShippingSubmitted] = useState(false);

  // Form State
  const [supplierName, setSupplierName] = useState("");
  const [priceRMB, setPriceRMB] = useState("");
  const [totalWeight, setTotalWeight] = useState("");
  const [goldWeight, setGoldWeight] = useState("");
  const [diamondCount, setDiamondCount] = useState("");
  const [diamondType, setDiamondType] = useState("Lab Grown");
  const [totalCarat, setTotalCarat] = useState("");
  const [shippingCostRMB, setShippingCostRMB] = useState("");
  const [productionTimeDays, setProductionTimeDays] = useState("");
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState("");
  const [triedToSubmit, setTriedToSubmit] = useState(false);

  // Tracking Form State
  const [trackingNumber, setTrackingNumber] = useState("");

  useEffect(() => {
    const fetchTokenAndRequest = async () => {
      try {
        const tokenSnap = await get(rtdbRef(rtdb, `shareTokens/${params.token}`));

        if (tokenSnap.exists()) {
          const tData = tokenSnap.val();
          setTokenData(tData);

          const reqSnap = await get(rtdbRef(rtdb, `requests/${tData.requestId}`));
          
          if (reqSnap.exists()) {
            const reqData = { id: reqSnap.key, ...reqSnap.val() } as any;
            setRequest(reqData);

            if (reqData.status === "SHIPPED" && reqData.acceptedTokenId === params.token) {
               setShippingSubmitted(true);
            }

            if (tData.used && reqData.status !== "IN_PRODUCTION") {
              setSubmitted(true);
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchTokenAndRequest();
  }, [params.token]);

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setTriedToSubmit(true);
    if (!supplierName || !priceRMB || !totalWeight || !goldWeight || !diamondCount || !totalCarat || !productionTimeDays || !shippingCostRMB || !estimatedDeliveryDate) {
       toast.error("VEUILLEZ REMPLIR TOUS LES CHAMPS OBLIGATOIRES / 请填写所有必填字段");
       return;
    }
    setLoading(true);

    try {
      const newQuoteRef = push(rtdbRef(rtdb, `quotes/${tokenData.requestId}`));
      await set(newQuoteRef, {
        shareTokenId: params.token,
        supplierName,
        priceRMB: Number(priceRMB),
        totalWeight: Number(totalWeight),
        goldWeight: Number(goldWeight),
        diamondCount: Number(diamondCount),
        diamondType,
        totalCarat: Number(totalCarat),
        shippingCostRMB: Number(shippingCostRMB),
        productionTimeDays: Number(productionTimeDays),
        estimatedDeliveryDate,
        createdAt: Date.now()
      });

      const updates: any = {};
      updates[`shareTokens/${params.token}/used`] = true;
      updates[`requests/${tokenData.requestId}/status`] = "QUOTED";
      
      await update(rtdbRef(rtdb), updates);
      setSubmitted(true);
      toast.success("DEMANDE ENVOYÉE AVEC SUCCÈS");
    } catch (error) {
      toast.error("ERREUR DE SYNCHRONISATION");
    } finally {
      setLoading(false);
    }
  };

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber) return;
    setLoading(true);
    try {
      const updates: any = {};
      updates[`requests/${tokenData.requestId}/status`] = "SHIPPED";
      updates[`requests/${tokenData.requestId}/trackingNumber`] = trackingNumber;
      updates[`requests/${tokenData.requestId}/shippedAt`] = Date.now();
      
      await update(rtdbRef(rtdb), updates);
      setShippingSubmitted(true);
      toast.success("EXPÉDITION CONFIRMÉE");
    } catch (error) {
      toast.error("ERREUR MISE À JOUR TRACKING");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <TitaneLoader />;
  if (!request) return <div className="layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center', fontWeight: 900 }}>Invalid or expired link.</div>;

  // SUCCESS STATE COMPONENTS
  const StatusHero = ({ icon: Icon, title, sub }: { icon: any, title: string, sub: string }) => (
    <div className="layout" style={{ background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '40px', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px auto', color: 'var(--accent)' }}>
          <Icon size={40} strokeWidth={2.5} />
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.05em', marginBottom: '12px' }}>{title.toUpperCase()}</h1>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--faded)', lineHeight: 1.6 }}>{sub}</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: '40px', background: 'transparent', border: 'none', color: 'var(--accent)', fontWeight: 900, fontSize: '12px' }}>REFRESH / 刷新状态</button>
      </motion.div>
    </div>
  );

  if (shippingSubmitted) {
    return <StatusHero icon={PackageCheck} title="Shipment Sent / 已发货" sub={`Tracking FedEx : ${request.trackingNumber || trackingNumber}`} />;
  }

  if (submitted) {
    return <StatusHero icon={CheckCircle} title="Quote Submitted / 已提交" sub="Votre proposition a été transmise / 您的报价已提交。" />;
  }

  return (
    <div className="layout" style={{ background: '#fff', paddingBottom: '120px' }}>
      
      {/* BRAND HEADER */}
      <header style={{ padding: '48px 32px 32px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '-0.05em' }}>LOGIS.</h2>
        <span className="cyber-label" style={{ letterSpacing: '0.1em', fontSize: '8px' }}>SUPPLIER PORTAL</span>
      </header>

      {/* REQUEST OVERVIEW */}
      <div style={{ padding: '0 32px' }}>
         <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ marginBottom: '48px' }}>
            <span className="cyber-label" style={{ marginBottom: '8px', display: 'block' }}>DESIGN REVIEW / 设计审查</span>
            <h1 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.06em', margin: 0, textTransform: 'uppercase' }}>{request.title}</h1>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
               <div style={{ padding: '6px 12px', background: '#F9F9F9', borderRadius: '8px', fontSize: '10px', fontWeight: 900 }}>{request.size || 'STD'}</div>
               <div style={{ padding: '6px 12px', background: 'var(--accent-glow)', borderRadius: '8px', fontSize: '10px', fontWeight: 900, color: 'var(--accent)' }}>{request.goldColor?.toUpperCase()}</div>
            </div>
         </motion.div>

         {request.imageUrl && (
            <div style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: '40px', overflow: 'hidden', background: '#F9F9F9', marginBottom: '48px', border: '1px solid rgba(0,0,0,0.02)' }}>
               <img src={request.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Reference" />
            </div>
         )}

         {/* FORM INTERFACE */}
         {request.status === "IN_PRODUCTION" && request.acceptedTokenId === params.token ? (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ padding: '32px', background: '#F9F9F9', borderRadius: '32px', marginBottom: '32px' }}>
                 <p className="cyber-label" style={{ marginBottom: '20px' }}>LOGISTICS / 物流信息</p>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '24px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.02)' }}>
                       <Truck size={20} />
                    </div>
                    <div>
                       <p style={{ fontSize: '11px', fontWeight: 900, color: '#000' }}>SHIP TO FRANCE</p>
                       <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--faded)', marginTop: '2px' }}>SACHA BENSADOUN, GEISPOLSHEIM</p>
                    </div>
                 </div>
                 
                 <label className="cyber-label" style={{ fontSize: '7px', opacity: 0.5 }}>TRACKING NUMBER / 运单号</label>
                 <input 
                   required
                   value={trackingNumber}
                   onChange={e => setTrackingNumber(e.target.value)}
                   placeholder="Enter FedEx ID..."
                   style={{ width: '100%', background: 'transparent', fontSize: '24px', fontWeight: 900, marginTop: '8px', letterSpacing: '0.05em' }}
                 />
              </div>
              <button onClick={handleShippingSubmit} className="btn-main" style={{ background: 'var(--accent)', color: '#fff' }}>
                 CONFIRM SHIPMENT <ArrowRight size={18} />
              </button>
           </motion.div>
         ) : (
           <form onSubmit={handleSubmitQuote} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              
              <div className={triedToSubmit && !supplierName ? 'shake' : ''} style={{ padding: '32px', background: triedToSubmit && !supplierName ? 'rgba(255,59,48,0.05)' : '#F9F9F9', borderRadius: '32px', border: triedToSubmit && !supplierName ? '1px dashed #FF3B30' : '1px solid transparent', transition: 'all 0.3s ease' }}>
                 <p className="cyber-label" style={{ marginBottom: '24px', color: triedToSubmit && !supplierName ? '#FF3B30' : 'inherit' }}>IDENTIFICATION / 标识</p>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '20px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.02)' }}>
                       <User size={18} color={triedToSubmit && !supplierName ? '#FF3B30' : 'inherit'} />
                    </div>
                    <input 
                      value={supplierName}
                      onChange={e => setSupplierName(e.target.value)}
                      placeholder="Factory Code..."
                      style={{ flex: 1, background: 'transparent', fontSize: '18px', fontWeight: 900 }}
                    />
                 </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                 <div className={triedToSubmit && !priceRMB ? 'shake' : ''} style={{ padding: '24px', background: triedToSubmit && !priceRMB ? 'rgba(255,59,48,0.05)' : '#F9F9F9', borderRadius: '28px', border: triedToSubmit && !priceRMB ? '1px dashed #FF3B30' : '1px solid transparent' }}>
                    <p className="cyber-label" style={{ fontSize: '7px', marginBottom: '8px', opacity: 0.5, color: triedToSubmit && !priceRMB ? '#FF3B30' : 'inherit' }}>PRICE (RMB ¥)</p>
                    <input type="number" step="0.01" value={priceRMB} onChange={e => setPriceRMB(e.target.value)} placeholder="0.00" style={{ width: '100%', background: 'transparent', fontSize: '20px', fontWeight: 900 }} />
                 </div>
                 <div className={triedToSubmit && !productionTimeDays ? 'shake' : ''} style={{ padding: '24px', background: triedToSubmit && !productionTimeDays ? 'rgba(255,59,48,0.05)' : '#F9F9F9', borderRadius: '28px', border: triedToSubmit && !productionTimeDays ? '1px dashed #FF3B30' : '1px solid transparent' }}>
                    <p className="cyber-label" style={{ fontSize: '7px', marginBottom: '8px', opacity: 0.5, color: triedToSubmit && !productionTimeDays ? '#FF3B30' : 'inherit' }}>TIME (DAYS)</p>
                    <input type="number" value={productionTimeDays} onChange={e => setProductionTimeDays(e.target.value)} placeholder="0" style={{ width: '100%', background: 'transparent', fontSize: '20px', fontWeight: 900 }} />
                 </div>
              </div>

              <div className={triedToSubmit && (!totalWeight || !goldWeight || !diamondCount || !totalCarat) ? 'shake' : ''} style={{ padding: '32px', background: (triedToSubmit && (!totalWeight || !goldWeight || !diamondCount || !totalCarat)) ? 'rgba(255,59,48,0.05)' : '#F9F9F9', borderRadius: '32px', border: (triedToSubmit && (!totalWeight || !goldWeight || !diamondCount || !totalCarat)) ? '1px dashed #FF3B30' : '1px solid transparent' }}>
                 <p className="cyber-label" style={{ marginBottom: '24px', color: (triedToSubmit && (!totalWeight || !goldWeight || !diamondCount || !totalCarat)) ? '#FF3B30' : 'inherit' }}>MANUFACTURING DATA / 制造数据</p>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                    <div>
                       <label className="cyber-label" style={{ fontSize: '7px', opacity: 0.5 }}>TOTAL WEIGHT (G)</label>
                       <input type="number" step="0.01" value={totalWeight} onChange={e => setTotalWeight(e.target.value)} placeholder="0.0" style={{ width: '100%', background: 'transparent', fontSize: '16px', fontWeight: 900, marginTop: '8px', color: triedToSubmit && !totalWeight ? '#FF3B30' : 'inherit' }} />
                    </div>
                    <div>
                       <label className="cyber-label" style={{ fontSize: '7px', opacity: 0.5 }}>GOLD WEIGHT (G)</label>
                       <input type="number" step="0.01" value={goldWeight} onChange={e => setGoldWeight(e.target.value)} placeholder="0.0" style={{ width: '100%', background: 'transparent', fontSize: '16px', fontWeight: 900, marginTop: '8px', color: triedToSubmit && !goldWeight ? '#FF3B30' : 'inherit' }} />
                    </div>
                    <div>
                       <label className="cyber-label" style={{ fontSize: '7px', opacity: 0.5 }}>DIAMOND COUNT</label>
                       <input type="number" value={diamondCount} onChange={e => setDiamondCount(e.target.value)} placeholder="0" style={{ width: '100%', background: 'transparent', fontSize: '16px', fontWeight: 900, marginTop: '8px', color: triedToSubmit && !diamondCount ? '#FF3B30' : 'inherit' }} />
                    </div>
                    <div>
                       <label className="cyber-label" style={{ fontSize: '7px', opacity: 0.5 }}>TOTAL CARAT (CT)</label>
                       <input type="number" step="0.01" value={totalCarat} onChange={e => setTotalCarat(e.target.value)} placeholder="0.00" style={{ width: '100%', background: 'transparent', fontSize: '16px', fontWeight: 900, marginTop: '8px', color: triedToSubmit && !totalCarat ? '#FF3B30' : 'inherit' }} />
                    </div>
                 </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                 <div className={triedToSubmit && !shippingCostRMB ? 'shake' : ''} style={{ padding: '24px', background: triedToSubmit && !shippingCostRMB ? 'rgba(255,59,48,0.05)' : '#F9F9F9', borderRadius: '28px', border: triedToSubmit && !shippingCostRMB ? '1px dashed #FF3B30' : '1px solid transparent' }}>
                    <p className="cyber-label" style={{ fontSize: '7px', marginBottom: '8px', opacity: 0.5, color: triedToSubmit && !shippingCostRMB ? '#FF3B30' : 'inherit' }}>SHIPPING (RMB ¥) / 运费</p>
                    <input type="number" step="0.01" value={shippingCostRMB} onChange={e => setShippingCostRMB(e.target.value)} placeholder="0.00" style={{ width: '100%', background: 'transparent', fontSize: '20px', fontWeight: 900, color: triedToSubmit && !shippingCostRMB ? '#FF3B30' : 'inherit' }} />
                 </div>
                 <div className={triedToSubmit && !estimatedDeliveryDate ? 'shake' : ''} style={{ padding: '24px', background: triedToSubmit && !estimatedDeliveryDate ? 'rgba(255,59,48,0.05)' : '#F9F9F9', borderRadius: '28px', border: triedToSubmit && !estimatedDeliveryDate ? '1px dashed #FF3B30' : '1px solid transparent' }}>
                    <p className="cyber-label" style={{ fontSize: '7px', marginBottom: '8px', opacity: 0.5, color: triedToSubmit && !estimatedDeliveryDate ? '#FF3B30' : 'inherit' }}>DELIVERY / 预计送达</p>
                    <input 
                      type="date" 
                      value={estimatedDeliveryDate} 
                      onChange={e => setEstimatedDeliveryDate(e.target.value)} 
                      onClick={(e) => (e.target as any).showPicker?.()}
                      style={{ 
                        width: '100%', 
                        background: 'transparent', 
                        fontSize: '13px', 
                        fontWeight: 900, 
                        color: triedToSubmit && !estimatedDeliveryDate ? '#FF3B30' : 'inherit', 
                        border: 'none', 
                        padding: '4px 0',
                        minHeight: '24px',
                        cursor: 'pointer',
                        appearance: 'none',
                        WebkitAppearance: 'none'
                      }} 
                    />
                 </div>
              </div>

              <button type="submit" className="btn-main" style={{ background: '#000', color: '#fff' }}>
                 SUBMIT QUOTE / 提交报价 <ArrowRight size={18} />
              </button>

           </form>
         )}
      </div>

    </div>
  );
}
