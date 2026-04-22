"use client";

import { useEffect, useState } from "react";
import { rtdb, rtdbRef, get, update, push, set } from "@/lib/firebase";
import { motion } from "framer-motion";
import { CheckCircle, Truck, Package, ChevronRight, Calculator } from "lucide-react";
import { SmartImage } from "@/components/ui/SmartImage";
import { toast } from "sonner";

export default function SupplierQuotePortal({ params }: { params: { id: string } }) {
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  
  const [priceRMB, setPriceRMB] = useState("");
  const [shippingRMB, setShippingRMB] = useState("");
  const [productionDays, setProductionDays] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchRequest = async () => {
      const snap = await get(rtdbRef(rtdb, `requests/${params.id}`));
      if (snap.exists()) setRequest(snap.val());
      setLoading(false);
    };
    fetchRequest();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceRMB || !productionDays) return alert("Please fill the required fields.");
    
    setIsSubmitting(true);
    try {
      const newQuoteRef = push(rtdbRef(rtdb, `quotes/${params.id}`));
      await set(newQuoteRef, {
        id: newQuoteRef.key,
        priceRMB: parseFloat(priceRMB),
        shippingCostRMB: parseFloat(shippingRMB || "0"),
        productionTimeDays: parseInt(productionDays),
        createdAt: Date.now()
      });
      await update(rtdbRef(rtdb, `requests/${params.id}`), { 
        status: "QUOTED",
        updatedAt: Date.now()
      });
      setSubmitted(true);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="layout" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: 'var(--accent)' }}>LOADING...</div>;
  if (!request) return <div className="layout" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>INVALID LINK</div>;

  if (submitted) {
    return (
      <div className="layout" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', background: '#fff' }}>
        <header style={{ position: 'absolute', top: '64px', width: '100%' }}>
          <h1 className="cyber-title" style={{ fontSize: '24px', letterSpacing: '-0.08em' }}>
            LOG<span style={{ color: 'var(--accent)' }}>IS.</span>
          </h1>
        </header>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '40px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', boxShadow: '0 20px 40px var(--accent-glow)' }}>
            <CheckCircle color="#fff" size={40} />
          </div>
          <h1 style={{ fontWeight: 900, fontSize: '24px', letterSpacing: '-0.04em' }}>QUOTE SENT</h1>
          <p style={{ marginTop: '12px', color: 'var(--faded)', fontWeight: 600 }}>Thank you / 谢谢你</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="layout" style={{ background: '#fff', minHeight: '100vh', paddingBottom: '160px' }}>
      <header style={{ padding: '64px 32px 32px 32px', textAlign: 'center' }}>
        <h1 className="cyber-title" style={{ fontSize: '32px', letterSpacing: '-0.08em', marginBottom: '8px' }}>
          LOG<span style={{ color: 'var(--accent)' }}>IS.</span>
        </h1>
        <p className="cyber-label" style={{ fontSize: '8px', letterSpacing: '0.2em' }}>SUPPLIER PORTAL | 供应商门户</p>
      </header>
      
      {/* IMMERSIVE PRODUCT IMAGE */}
      <div style={{ position: 'relative', height: '400px', backgroundColor: '#fff', overflow: 'hidden', borderRadius: '0 0 40px 40px', boxShadow: '0 20px 40px rgba(0,0,0,0.02)' }}>
         {request.imageUrl && (
           <SmartImage src={request.imageUrl} style={{ width: '100%', height: '100%' }} />
         )}
      </div>

      <header style={{ padding: '32px 32px 8px 32px' }}>
        <h1 style={{ fontWeight: 900, fontSize: '32px', letterSpacing: '-0.04em', textTransform: 'uppercase' }}>{request.title}</h1>
        <div style={{ display: 'flex', gap: '32px', marginTop: '16px' }}>
           <div>
              <span className="cyber-label">SIZE / 尺寸</span>
              <p style={{ fontWeight: 900, fontSize: '18px', color: 'var(--accent)' }}>{request.size}</p>
           </div>
           {request.brand && (
              <div>
                <span className="cyber-label">HOUSE / 品牌</span>
                <p style={{ fontWeight: 900, fontSize: '18px' }}>{request.brand.toUpperCase()}</p>
              </div>
           )}
        </div>
      </header>

      {/* QUOTE FORM */}
      <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          <div style={{ background: '#F9F9F9', padding: '24px', borderRadius: '32px' }}>
            <span className="cyber-label">PRICE / 价格 (RMB)</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
              <input 
                type="number" required placeholder="0" value={priceRMB}
                onChange={(e) => setPriceRMB(e.target.value)}
                style={{ width: '100%', fontSize: '48px', fontWeight: 900, color: 'var(--foreground)', background: 'transparent', letterSpacing: '-0.05em' }}
              />
              <span style={{ fontSize: '24px', fontWeight: 900 }}>¥</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: '#F9F9F9', padding: '20px', borderRadius: '28px' }}>
              <span className="cyber-label" style={{ fontSize: '9px' }}>SHIPPING / 运费</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <input 
                  type="number" placeholder="0" value={shippingRMB}
                  onChange={(e) => setShippingRMB(e.target.value)}
                  style={{ width: '100%', background: 'transparent', fontWeight: 900, fontSize: '20px' }}
                />
                <span style={{ fontWeight: 900, opacity: 0.3 }}>¥</span>
              </div>
            </div>

            <div style={{ background: '#F9F9F9', padding: '20px', borderRadius: '28px' }}>
              <span className="cyber-label" style={{ fontSize: '9px' }}>DAYS / 周期</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <input 
                  type="number" required placeholder="7" value={productionDays}
                  onChange={(e) => setProductionDays(e.target.value)}
                  style={{ width: '100%', background: 'transparent', fontWeight: 900, fontSize: '20px' }}
                />
                <span style={{ fontWeight: 900, opacity: 0.3 }}>天</span>
              </div>
            </div>
          </div>
        </div>

        <div className="vision-pill-container" style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', padding: '40px 24px', pointerEvents: 'none' }}>
           <div className="vision-pill" style={{ width: '220px', pointerEvents: 'auto' }}>
              <button type="submit" className="vision-action accent" disabled={isSubmitting || !priceRMB} style={{ width: '100%' }}>
                 {isSubmitting ? 'SENDING...' : 'SUBMIT / 提交'}
                 {!isSubmitting && <ChevronRight size={18} strokeWidth={3} />}
              </button>
           </div>
        </div>
      </form>

    </div>
  );
}
