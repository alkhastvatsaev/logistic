"use client";
// Build Trigger: 2026-04-24 22:07

import { useEffect, useState } from "react";
import { rtdb, rtdbRef, get, set, push, update, storage, storageRef, uploadBytesResumable, getDownloadURL } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle, Truck, PackageCheck, ArrowRight, User, MapPin, ChevronLeft, ChevronRight, Camera, FileText } from "lucide-react";
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
  const [stoneQuality, setStoneQuality] = useState("");
  const [goldPurity, setGoldPurity] = useState("18K (750)");
  const [comments, setComments] = useState("");
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState("");
  const [goldPricePerGram, setGoldPricePerGram] = useState("");
  const [diamondPricePerCarat, setDiamondPricePerCarat] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [lang, setLang] = useState<"EN" | "CN">("CN");

  const t = {
    EN: {
      portal: "SUPPLIER PORTAL",
      techOrder: "TECHNICAL ORDER",
      size: "SIZE",
      engraving: "ENGRAVING",
      id: "IDENTIFICATION",
      factoryCode: "Factory Code...",
      totalPrice: "TOTAL PRICE (RMB ¥)",
      time: "TIME (DAYS)",
      ship: "SHIP (RMB ¥)",
      techSpecs: "TECHNICAL SPECIFICATIONS",
      goldWeight: "GOLD WEIGHT (G)",
      goldPrice: "GOLD PRICE (RMB/G)",
      diamondCount: "DIAMOND COUNT",
      totalCarat: "TOTAL CARAT",
      labor: "LABOR COST (RMB)",
      stonePrice: "STONE PRICE (RMB/CT)",
      stoneQuality: "STONE QUALITY",
      gemOrigin: "GEM ORIGIN",
      labGrown: "LAB GROWN",
      natural: "NATURAL",
      purity: "PURITY",
      notes: "NOTES",
      delivery: "DELIVERY",
      submit: "SUBMIT QUOTE",
      autoVerify: "AUTO-VERIFICATION",
      estCost: "ESTIMATED TOTAL PRODUCTION COST (INC. GEMS)",
      destination: "DESTINATION: FRANCE",
      tracking: "FEDEX TRACKING NUMBER",
      qc: "QUALITY CONTROL MEDIA",
      confirm: "CONFIRM EXPEDITION",
      refresh: "REFRESH",
      requiredFields: "PLEASE FILL ALL REQUIRED FIELDS",
      syncError: "SYNC ERROR",
      successQuote: "QUOTE SENT SUCCESSFULLY",
      successShipping: "SHIPPING & QC SUBMITTED",
      selectDate: "SELECT DATE",
      close: "CLOSE",
      trackingFedex: "Tracking FedEx",
      quoteSubmitted: "QUOTE SUBMITTED",
      propositionSent: "Your proposal has been transmitted.",
      shipmentSent: "SHIPMENT SENT",
      locale: 'en-US'
    },
    CN: {
      portal: "供应商门户",
      techOrder: "技术订单",
      size: "尺寸",
      engraving: "刻字",
      id: "身份识别",
      factoryCode: "供应商代码...",
      totalPrice: "总价 (RMB ¥)",
      time: "周期 (天)",
      ship: "运费 (RMB ¥)",
      techSpecs: "技术规格",
      goldWeight: "金重 (G)",
      goldPrice: "金价 (RMB/G)",
      diamondCount: "钻石数量",
      totalCarat: "总克拉",
      labor: "工费 (RMB)",
      stonePrice: "宝石单价 (RMB/CT)",
      stoneQuality: "宝石品质",
      gemOrigin: "宝石来源",
      labGrown: "培育钻",
      natural: "天然钻",
      purity: "成色",
      notes: "备注",
      delivery: "预计交货日",
      submit: "提交报价",
      autoVerify: "自动核对",
      estCost: "预计总成本 (含宝石)",
      destination: "目的地: 法国",
      tracking: "快递单号 (FEDEX)",
      qc: "质检照片/视频 (QC)",
      confirm: "确认发货",
      refresh: "刷新状态",
      requiredFields: "请填写所有必填字段",
      syncError: "同步错误",
      successQuote: "报价发送成功",
      successShipping: "发货与QC已提交",
      selectDate: "选择日期",
      close: "关闭",
      trackingFedex: "联邦快递单号",
      quoteSubmitted: "已提交报价",
      propositionSent: "您的建议已送达。",
      shipmentSent: "已发货",
      locale: 'zh-CN'
    }
  }[lang];
  const [triedToSubmit, setTriedToSubmit] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarView, setCalendarView] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });

  // Tracking & QC State
  const [trackingNumber, setTrackingNumber] = useState("");
  const [qcMediaUrl, setQCMediaUrl] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

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
    if (!supplierName || !priceRMB || !goldWeight || !diamondCount || !totalCarat || !productionTimeDays || !shippingCostRMB || !estimatedDeliveryDate || !goldPricePerGram || !laborCost || !diamondPricePerCarat) {
       toast.error(t.requiredFields);
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
        stoneQuality,
        goldPurity,
        comments,
        estimatedDeliveryDate,
        goldPricePerGram: Number(goldPricePerGram),
        diamondPricePerCarat: Number(diamondPricePerCarat),
        laborCost: Number(laborCost),
        createdAt: Date.now()
      });

      const updates: any = {};
      updates[`shareTokens/${params.token}/used`] = true;
      updates[`requests/${tokenData.requestId}/status`] = "QUOTED";
      
      await update(rtdbRef(rtdb), updates);
      setSubmitted(true);
      toast.success(t.successQuote);
    } catch (error) {
      toast.error(t.syncError);
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
      if (qcMediaUrl) updates[`requests/${tokenData.requestId}/qcMediaUrl`] = qcMediaUrl;
      
      await update(rtdbRef(rtdb), updates);
      setShippingSubmitted(true);
      toast.success(t.successShipping);
    } catch (error) {
      toast.error(t.syncError);
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
        <button onClick={() => window.location.reload()} style={{ marginTop: '40px', background: 'transparent', border: 'none', color: 'var(--accent)', fontWeight: 900, fontSize: '12px' }}>{t.refresh}</button>
      </motion.div>
    </div>
  );

  if (shippingSubmitted) {
    return <StatusHero icon={PackageCheck} title={t.shipmentSent} sub={`${t.trackingFedex} : ${request.trackingNumber || trackingNumber}`} />;
  }

  if (submitted) {
    return <StatusHero icon={CheckCircle} title={t.quoteSubmitted} sub={t.propositionSent} />;
  }

  return (
    <div className="layout" style={{ background: '#fff', paddingBottom: '120px' }}>
      
      {/* BRAND HEADER */}
      <header style={{ padding: '48px 32px 32px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '-0.05em' }}>LOGIS.</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
           <div style={{ display: 'flex', background: '#F9F9F9', borderRadius: '12px', padding: '4px' }}>
              <button onClick={() => setLang("CN")} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: lang === "CN" ? '#000' : 'transparent', color: lang === "CN" ? '#fff' : '#000', fontSize: '10px', fontWeight: 900 }}>CN</button>
              <button onClick={() => setLang("EN")} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: lang === "EN" ? '#000' : 'transparent', color: lang === "EN" ? '#fff' : '#000', fontSize: '10px', fontWeight: 900 }}>EN</button>
           </div>
           <span className="cyber-label" style={{ letterSpacing: '0.1em', fontSize: '8px', marginLeft: '12px' }}>{t.portal}</span>
        </div>
      </header>

      {/* REQUEST OVERVIEW */}
      <div style={{ padding: '0 32px' }}>
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ marginBottom: '80px', marginTop: '32px' }}>
            <span className="cyber-label" style={{ marginBottom: '12px', display: 'block', opacity: 0.4 }}>{t.techOrder}</span>
            <h1 style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-0.06em', margin: 0, textTransform: 'uppercase' }}>{request.title}</h1>
            <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
               <div style={{ padding: '10px 20px', background: '#F9F9F9', borderRadius: '16px', fontSize: '11px', fontWeight: 900 }}>{t.size}: {request.size || 'STD'}</div>
               <div style={{ padding: '10px 20px', background: 'var(--accent-glow)', borderRadius: '16px', fontSize: '11px', fontWeight: 900, color: 'var(--accent)' }}>{request.goldColor?.toUpperCase()}</div>
               {request.engraving && <div style={{ padding: '10px 20px', background: '#000', borderRadius: '16px', fontSize: '11px', fontWeight: 900, color: '#fff' }}>{t.engraving} / {request.engraving}</div>}
            </div>
          </motion.div>

         {request.imageUrl && (
            <div style={{ position: 'relative', width: '100%', borderRadius: '56px', overflow: 'hidden', background: '#F9F9F9', marginBottom: '80px', border: '1px solid rgba(0,0,0,0.02)', boxShadow: '0 30px 60px rgba(0,0,0,0.02)' }}>
               <img src={request.imageUrl} style={{ width: '100%', height: 'auto', display: 'block' }} alt="Reference" />
            </div>
         )}

         {/* FORM INTERFACE */}
         {request.status === "IN_PRODUCTION" && request.acceptedTokenId === params.token ? (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ padding: '48px 40px', background: '#F9F9F9', borderRadius: '56px', marginBottom: '48px' }}>
                 <p className="cyber-label" style={{ marginBottom: '32px' }}>{t.portal}</p>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '48px', padding: '24px', background: '#fff', borderRadius: '32px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '28px', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                       <Truck size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                       <p style={{ fontSize: '11px', fontWeight: 900, color: '#000', letterSpacing: '0.05em' }}>{t.destination}</p>
                       <p style={{ fontSize: '10px', fontWeight: 700, opacity: 0.4, marginTop: '4px' }}>S. BENSADOUN, GEISPOLSHEIM</p>
                    </div>
                 </div>
                 
                 <div style={{ marginBottom: '48px' }}>
                    <label className="cyber-label" style={{ fontSize: '8px', opacity: 0.4 }}>{t.tracking}</label>
                    <input 
                      required value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)}
                      placeholder="Enter ID..."
                      style={{ width: '100%', background: 'transparent', fontSize: '32px', fontWeight: 900, marginTop: '12px', letterSpacing: '0.02em', border: 'none', outline: 'none' }}
                    />
                 </div>

                 <div>
                    <p className="cyber-label" style={{ marginBottom: '20px' }}>{t.qc}</p>
                    <label style={{ display: 'block', width: '100%', padding: '40px', background: '#fff', borderRadius: '32px', border: '2px dashed rgba(0,0,0,0.05)', textAlign: 'center', cursor: 'pointer' }}>
                       {uploadProgress > 0 ? (
                          <span style={{ fontSize: '12px', fontWeight: 900, color: 'var(--accent)' }}>PROGRESS: {uploadProgress.toFixed(0)}%</span>
                       ) : qcMediaUrl ? (
                          <span style={{ fontSize: '12px', fontWeight: 900, color: '#34C759' }}>MEDIA LINKED ✅</span>
                       ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <Camera size={32} opacity={0.2} />
                            <span style={{ fontSize: '10px', fontWeight: 900, opacity: 0.4 }}>PICTURE OR VIDEO</span>
                          </div>
                       )}
                       <input type="file" hidden accept="image/*,video/*" onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                             const ref = storageRef(storage, `qc/${tokenData.requestId}/${Date.now()}_${file.name}`);
                             const task = uploadBytesResumable(ref, file);
                             task.on('state_changed', s => setUploadProgress((s.bytesTransferred / s.totalBytes) * 100), e => toast.error("Error"), async () => {
                                const url = await getDownloadURL(task.snapshot.ref);
                                setQCMediaUrl(url);
                                setUploadProgress(0);
                                toast.success("QC MEDIA READY");
                             });
                          }
                       }} />
                    </label>
                 </div>
              </div>
              <button onClick={handleShippingSubmit} className="btn-main" style={{ background: '#000', color: '#fff', padding: '24px', borderRadius: '32px', fontWeight: 900, fontSize: '14px', width: '100%' }}>
                 {t.confirm} <ArrowRight size={20} strokeWidth={3} />
              </button>
           </motion.div>
         ) : (
           <form onSubmit={handleSubmitQuote} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              
              <div className={triedToSubmit && !supplierName ? 'shake' : ''} style={{ padding: '32px', background: triedToSubmit && !supplierName ? 'rgba(255,59,48,0.05)' : '#F9F9F9', borderRadius: '32px', border: triedToSubmit && !supplierName ? '1px dashed #FF3B30' : '1px solid transparent', transition: 'all 0.3s ease' }}>
                 <p className="cyber-label" style={{ marginBottom: '24px', color: triedToSubmit && !supplierName ? '#FF3B30' : 'inherit' }}>{t.id}</p>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '20px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 15px rgba(0,0,0,0.02)' }}>
                       <User size={18} color={triedToSubmit && !supplierName ? '#FF3B30' : 'inherit'} />
                    </div>
                    <input 
                      value={supplierName}
                      onChange={e => setSupplierName(e.target.value)}
                      placeholder={t.factoryCode}
                      style={{ flex: 1, background: 'transparent', fontSize: '18px', fontWeight: 900 }}
                    />
                 </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                 <div className={triedToSubmit && !priceRMB ? 'shake' : ''} style={{ padding: '24px', background: '#000', color: '#fff', borderRadius: '28px', border: triedToSubmit && !priceRMB ? '1px dashed #FF3B30' : '1px solid transparent' }}>
                    <p className="cyber-label" style={{ fontSize: '7px', marginBottom: '8px', opacity: 0.5, color: '#fff' }}>{t.totalPrice}</p>
                    <input type="number" step="0.1" value={priceRMB} onChange={e => setPriceRMB(e.target.value)} placeholder="0" style={{ width: '100%', background: 'transparent', fontSize: '20px', fontWeight: 900, color: '#fff' }} />
                 </div>
                 <div style={{ padding: '24px', background: '#F9F9F9', borderRadius: '28px' }}>
                     <p className="cyber-label" style={{ fontSize: '7px', marginBottom: '8px', opacity: 0.5 }}>{t.time}</p>
                    <input type="number" value={productionTimeDays} onChange={e => setProductionTimeDays(e.target.value)} placeholder="0" style={{ width: '100%', background: 'transparent', fontSize: '20px', fontWeight: 900 }} />
                 </div>
                 <div style={{ padding: '24px', background: '#F9F9F9', borderRadius: '28px' }}>
                     <p className="cyber-label" style={{ fontSize: '7px', marginBottom: '8px', opacity: 0.5 }}>{t.ship}</p>
                    <input type="number" value={shippingCostRMB} onChange={e => setShippingCostRMB(e.target.value)} placeholder="0" style={{ width: '100%', background: 'transparent', fontSize: '20px', fontWeight: 900 }} />
                 </div>
              </div>

              <div className={triedToSubmit && (!totalWeight || !goldWeight || !diamondCount || !totalCarat) ? 'shake' : ''} style={{ padding: '48px', background: '#F9F9F9', borderRadius: '48px', border: '1px solid rgba(0,0,0,0.02)' }}>
                 <p className="cyber-label" style={{ marginBottom: '40px' }}>{t.techSpecs}</p>
                 
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                    <div>
                       <label className="cyber-label" style={{ fontSize: '7px', opacity: 0.4 }}>{t.goldWeight}</label>
                       <input type="number" step="0.01" value={goldWeight} onChange={e => setGoldWeight(e.target.value)} placeholder="0.00" style={{ width: '100%', background: 'transparent', fontSize: '18px', fontWeight: 900, marginTop: '8px' }} />
                    </div>
                    <div>
                       <label className="cyber-label" style={{ fontSize: '7px', opacity: 0.4 }}>{t.goldPrice}</label>
                       <input type="number" step="0.1" value={goldPricePerGram} onChange={e => setGoldPricePerGram(e.target.value)} placeholder="..." style={{ width: '100%', background: 'transparent', fontSize: '18px', fontWeight: 900, marginTop: '8px', color: 'var(--accent)' }} />
                    </div>
                 </div>

                 <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', paddingTop: '32px', borderTop: '1px dashed rgba(0,0,0,0.05)' }}>
                    <div>
                       <label className="cyber-label" style={{ fontSize: '7px', opacity: 0.4 }}>{t.diamondCount}</label>
                       <input type="number" value={diamondCount} onChange={e => setDiamondCount(e.target.value)} placeholder="0" style={{ width: '100%', background: 'transparent', fontSize: '18px', fontWeight: 900, marginTop: '8px' }} />
                    </div>
                    <div>
                       <label className="cyber-label" style={{ fontSize: '7px', opacity: 0.4 }}>{t.totalCarat}</label>
                       <input type="number" step="0.01" value={totalCarat} onChange={e => setTotalCarat(e.target.value)} placeholder="0.00" style={{ width: '100%', background: 'transparent', fontSize: '18px', fontWeight: 900, marginTop: '8px' }} />
                    </div>
                 </div>

                 <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', paddingTop: '32px', borderTop: '1px dashed rgba(0,0,0,0.05)' }}>
                    <div>
                       <label className="cyber-label" style={{ fontSize: '7px', opacity: 0.4 }}>{t.labor}</label>
                       <input type="number" value={laborCost} onChange={e => setLaborCost(e.target.value)} placeholder="..." style={{ width: '100%', background: 'transparent', fontSize: '18px', fontWeight: 900, marginTop: '8px' }} />
                    </div>
                    <div>
                       <label className="cyber-label" style={{ fontSize: '7px', opacity: 0.4 }}>{t.stonePrice}</label>
                       <input type="number" step="0.1" value={diamondPricePerCarat} onChange={e => setDiamondPricePerCarat(e.target.value)} placeholder="..." style={{ width: '100%', background: 'transparent', fontSize: '18px', fontWeight: 900, marginTop: '8px', color: 'var(--accent)' }} />
                    </div>
                 </div>

                 <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                       <div>
                          <label className="cyber-label" style={{ fontSize: '7px', opacity: 0.4 }}>{t.stoneQuality}</label>
                          <input value={stoneQuality} onChange={e => setStoneQuality(e.target.value)} placeholder="VVS / DEF" style={{ width: '100%', background: 'transparent', fontSize: '14px', fontWeight: 900, marginTop: '12px', border: 'none' }} />
                       </div>
                       <div>
                          <label className="cyber-label" style={{ fontSize: '7px', opacity: 0.4 }}>{t.purity}</label>
                          <select value={goldPurity} onChange={e => setGoldPurity(e.target.value)} style={{ width: '100%', background: 'transparent', fontSize: '14px', fontWeight: 900, marginTop: '12px', border: 'none' }}>
                             <option value="18K (750)">18K (750)</option>
                             <option value="14K (585)">14K (585)</option>
                             <option value="Platinum (950)">PT950</option>
                          </select>
                       </div>
                    </div>
                    <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                       <label className="cyber-label" style={{ fontSize: '7px', opacity: 0.4 }}>{t.gemOrigin}</label>
                       <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                          <button type="button" onClick={() => setDiamondType("Lab Grown")} style={{ flex: 1, padding: '12px', borderRadius: '16px', background: diamondType === "Lab Grown" ? '#000' : '#fff', color: diamondType === "Lab Grown" ? '#fff' : '#000', border: '1px solid rgba(0,0,0,0.05)', fontSize: '10px', fontWeight: 900 }}>{t.labGrown}</button>
                          <button type="button" onClick={() => setDiamondType("Natural")} style={{ flex: 1, padding: '12px', borderRadius: '16px', background: diamondType === "Natural" ? '#000' : '#fff', color: diamondType === "Natural" ? '#fff' : '#000', border: '1px solid rgba(0,0,0,0.05)', fontSize: '10px', fontWeight: 900 }}>{t.natural}</button>
                       </div>
                    </div>
                 </div>
                 
                 {(goldWeight && goldPricePerGram && laborCost && totalCarat && diamondPricePerCarat) && (
                    <div style={{ marginTop: '48px', padding: '32px', background: 'var(--accent-glow)', borderRadius: '32px', textAlign: 'center' }}>
                       <span className="cyber-label" style={{ fontSize: '8px', color: 'var(--accent)' }}>{t.autoVerify}</span>
                       <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--accent)', marginTop: '8px' }}>
                          {(Number(goldWeight) * Number(goldPricePerGram) + Number(laborCost) + Number(totalCarat) * Number(diamondPricePerCarat)).toFixed(0)} ¥
                       </div>
                       <p style={{ fontSize: '9px', fontWeight: 700, opacity: 0.5, marginTop: '4px' }}>{t.estCost}</p>
                    </div>
                  )}
              </div>

              <div style={{ padding: '32px', background: '#F9F9F9', borderRadius: '32px' }}>
                 <p className="cyber-label" style={{ marginBottom: '20px' }}>{t.notes}</p>
                 <textarea 
                   value={comments}
                   onChange={e => setComments(e.target.value)}
                   placeholder="..."
                   style={{ width: '100%', background: 'transparent', border: 'none', resize: 'none', height: '80px', fontSize: '14px', fontWeight: 600, color: '#000' }}
                 />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                 <div className={triedToSubmit && !shippingCostRMB ? 'shake' : ''} style={{ padding: '24px', background: triedToSubmit && !shippingCostRMB ? 'rgba(255,59,48,0.05)' : '#F9F9F9', borderRadius: '28px', border: triedToSubmit && !shippingCostRMB ? '1px dashed #FF3B30' : '1px solid transparent' }}>
                    <p className="cyber-label" style={{ fontSize: '7px', marginBottom: '8px', opacity: 0.5, color: triedToSubmit && !shippingCostRMB ? '#FF3B30' : 'inherit' }}>{t.ship}</p>
                    <input type="number" step="0.01" value={shippingCostRMB} onChange={e => setShippingCostRMB(e.target.value)} placeholder="0.00" style={{ width: '100%', background: 'transparent', fontSize: '20px', fontWeight: 900, color: triedToSubmit && !shippingCostRMB ? '#FF3B30' : 'inherit' }} />
                 </div>
                 <div className={triedToSubmit && !estimatedDeliveryDate ? 'shake' : ''} style={{ padding: '24px', background: triedToSubmit && !estimatedDeliveryDate ? 'rgba(255,59,48,0.05)' : '#F9F9F9', borderRadius: '28px', border: triedToSubmit && !estimatedDeliveryDate ? '1px dashed #FF3B30' : '1px solid transparent' }}>
                    <p className="cyber-label" style={{ fontSize: '7px', marginBottom: '8px', opacity: 0.5, color: triedToSubmit && !estimatedDeliveryDate ? '#FF3B30' : 'inherit' }}>{t.delivery}</p>
                    <div 
                      onClick={() => setShowCalendar(true)}
                      style={{ 
                        width: '100%', 
                        background: 'transparent', 
                        fontSize: '13px', 
                        fontWeight: 900, 
                        color: (triedToSubmit && !estimatedDeliveryDate) ? '#FF3B30' : (estimatedDeliveryDate ? '#000' : 'rgba(0,0,0,0.2)'), 
                        padding: '4px 0',
                        minHeight: '24px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }} 
                    >
                       {estimatedDeliveryDate ? new Date(estimatedDeliveryDate).toLocaleDateString(t.locale, { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase() : t.selectDate}
                    </div>
                 </div>
              </div>

              <button type="submit" className="btn-main" style={{ background: '#000', color: '#fff' }}>
                 {t.submit} <ArrowRight size={18} />
              </button>

           </form>
         )}
      </div>

      <AnimatePresence>
        {showCalendar && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(40px)', zIndex: 3000, display: 'flex', alignItems: 'flex-end' }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} style={{ width: '100%', background: '#fff', borderRadius: '40px 40px 0 0', padding: '40px 32px', boxShadow: '0 -20px 60px rgba(0,0,0,0.1)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                   <button 
                     onClick={() => {
                        const newMonth = calendarView.month === 0 ? 11 : calendarView.month - 1;
                        const newYear = calendarView.month === 0 ? calendarView.year - 1 : calendarView.year;
                        setCalendarView({ month: newMonth, year: newYear });
                     }}
                     style={{ width: '40px', height: '40px', borderRadius: '20px', border: 'none', background: '#F9F9F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                   >
                     <ChevronLeft size={18} />
                   </button>
                   <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {new Date(calendarView.year, calendarView.month).toLocaleString(t.locale, { month: 'long' })}
                      </p>
                      <p style={{ fontSize: '10px', fontWeight: 700, opacity: 0.3 }}>{calendarView.year}</p>
                   </div>
                   <button 
                     onClick={() => {
                        const newMonth = calendarView.month === 11 ? 0 : calendarView.month + 1;
                        const newYear = calendarView.month === 11 ? calendarView.year + 1 : calendarView.year;
                        setCalendarView({ month: newMonth, year: newYear });
                     }}
                     style={{ width: '40px', height: '40px', borderRadius: '20px', border: 'none', background: '#F9F9F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                   >
                     <ChevronRight size={18} />
                   </button>
                </div>
                <button onClick={() => setShowCalendar(false)} style={{ background: '#000', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '100px', fontSize: '11px', fontWeight: 900 }}>{t.close}</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                 {(lang === "CN" ? ['一','二','三','四','五','六','日'] : ['M','T','W','T','F','S','S']).map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: '9px', fontWeight: 900, opacity: 0.3, paddingBottom: '12px' }}>{d}</div>)}
                
                {(() => {
                  const firstDay = new Date(calendarView.year, calendarView.month, 1).getDay();
                  const emptyDays = firstDay === 0 ? 6 : firstDay - 1;
                  const daysInMonth = new Date(calendarView.year, calendarView.month + 1, 0).getDate();
                  const displayDays = [];
                  
                  // Empty slots
                  for (let i = 0; i < emptyDays; i++) displayDays.push(<div key={`empty-${i}`} />);
                  
                  // Real days
                  for (let i = 1; i <= daysInMonth; i++) {
                    const date = new Date(calendarView.year, calendarView.month, i);
                    const dateStr = date.toISOString().split('T')[0];
                    const isSelected = estimatedDeliveryDate === dateStr;
                    const isToday = new Date().toISOString().split('T')[0] === dateStr;
                    
                    displayDays.push(
                      <button 
                        key={i} 
                        onClick={() => { setEstimatedDeliveryDate(dateStr); setShowCalendar(false); }}
                        style={{ 
                          aspectRatio: '1', borderRadius: '16px', border: 'none', 
                          background: isSelected ? 'var(--accent)' : (isToday ? 'var(--accent-glow)' : '#F9F9F9'), 
                          color: isSelected ? '#fff' : (isToday ? 'var(--accent)' : '#000'), 
                          fontSize: '11px', fontWeight: 900,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {i}
                      </button>
                    );
                  }
                  return displayDays;
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
