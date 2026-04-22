"use client";

import { useEffect, useState } from "react";
import { rtdb, rtdbRef, get, update } from "@/lib/firebase";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle, XCircle, ChevronRight } from "lucide-react";
import { SmartImage } from "@/components/ui/SmartImage";

export default function MirzaReview({ params }: { params: { id: string } }) {
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [goldColor, setGoldColor] = useState("Or Blanc");
  const [size, setSize] = useState("");
  const [category, setCategory] = useState<"Bague" | "Bracelet" | "Collier">("Bague");

  const sizeOptions = {
    Bague: Array.from({ length: 15 }, (_, i) => (49 + i).toString()),
    Bracelet: Array.from({ length: 9 }, (_, i) => (14 + i).toString() + " cm"),
    Collier: ["38 cm", "40 cm", "42 cm", "45 cm", "50 cm", "55 cm", "60 cm", "70 cm", "80 cm"]
  };

  const goldColors = [
    { label: "OR JAUNE", value: "Or Jaune" },
    { label: "OR BLANC", value: "Or Blanc" },
    { label: "OR ROSE", value: "Or Rose" }
  ];

  useEffect(() => {
    const fetchRequest = async () => {
      const snap = await get(rtdbRef(rtdb, `requests/${params.id}`));
      if (snap.exists()) {
        const val = snap.val();
        setRequest(val);
        setSize(val.size || "52");
        const detectedCat = val.size?.includes('cm') ? 'Bracelet' : val.size && parseInt(val.size) > 30 ? 'Collier' : 'Bague';
        setCategory(detectedCat as any);
        if (val.goldColor) setGoldColor(val.goldColor);
      }
      setLoading(false);
    };
    fetchRequest();
  }, [params.id]);

  const handleDecision = async (status: "APPROVED" | "REJECTED") => {
    setLoading(true);
    try {
      const nextStatus = status === "APPROVED" ? "WAITING_FOR_DEPOSIT" : "WAITING_FOR_QUOTE";
      const updates: any = { status: nextStatus, mirzaDecision: status, goldColor, size, updatedAt: Date.now() };
      if (status === "APPROVED" && request.size !== size) {
        updates.originalSizeBeforeMirza = request.size;
        updates.sizeChangedByMirza = true;
      }
      await update(rtdbRef(rtdb, `requests/${params.id}`), updates);
      setDecision(status);
    } catch (e) {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontWeight: 900 }}>CHARGEMENT...</div>;
  if (!request) return <div className="layout">LIEN INVALIDE</div>;

  if (decision) {
    return (
      <div className="layout" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', background: '#fff' }}>
        <header style={{ position: 'absolute', top: '64px', width: '100%' }}>
          <h1 className="cyber-title" style={{ fontSize: '24px', letterSpacing: '-0.08em' }}>
            LOG<span style={{ color: 'var(--accent)' }}>IS.</span>
          </h1>
        </header>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '40px', background: decision === "APPROVED" ? 'var(--accent)' : '#FF3B30', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }}>
            {decision === "APPROVED" ? <CheckCircle color="#fff" size={40} /> : <XCircle color="#fff" size={40} />}
          </div>
          <h1 style={{ fontWeight: 900, fontSize: '24px' }}>DECISION SYNCED</h1>
          <p style={{ marginTop: '12px', color: 'var(--faded)', fontWeight: 600 }}>Action updated in system.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="layout" style={{ background: '#fff', minHeight: '100vh', paddingBottom: '160px' }}>
      
      {/* IMMERSIVE PRODUCT HERO */}
      <div style={{ position: 'relative', height: '400px', backgroundColor: '#fff', overflow: 'hidden', borderRadius: '0 0 40px 40px', boxShadow: '0 20px 40px rgba(0,0,0,0.02)' }}>
         {request.imageUrl && <SmartImage src={request.imageUrl} style={{ width: '100%', height: '100%' }} />}
      </div>

      <header style={{ padding: '32px 32px 8px 32px' }}>
        <p className="cyber-label" style={{ color: 'var(--accent)', marginBottom: '4px' }}>ADMINISTRATIVE REVIEW</p>
        <h1 style={{ fontWeight: 900, fontSize: '32px', letterSpacing: '-0.04em', textTransform: 'uppercase' }}>{request.title}</h1>
      </header>

      <div style={{ padding: '32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: '#F9F9F9', padding: '20px', borderRadius: '28px' }}>
               <span className="cyber-label" style={{ fontSize: '8px' }}>CATEGORY</span>
               <select 
                 value={category} 
                 onChange={(e) => { const cat = e.target.value as any; setCategory(cat); setSize(sizeOptions[cat as keyof typeof sizeOptions][0]); }}
                 style={{ width: '100%', background: 'transparent', fontSize: '18px', fontWeight: 900, marginTop: '8px' }}
               >
                 <option value="Bague">Bagué</option>
                 <option value="Bracelet">Bracelet</option>
                 <option value="Collier">Collier</option>
               </select>
            </div>
            <div style={{ background: '#F9F9F9', padding: '20px', borderRadius: '28px' }}>
               <span className="cyber-label" style={{ fontSize: '8px' }}>FINAL SIZE</span>
               <select 
                 value={size} onChange={(e) => setSize(e.target.value)}
                 style={{ width: '100%', background: 'transparent', fontSize: '18px', fontWeight: 900, marginTop: '8px', color: 'var(--accent)' }}
               >
                 {sizeOptions[category as keyof typeof sizeOptions].map(s => <option key={s} value={s}>{s}</option>)}
               </select>
            </div>
          </div>

          <div>
             <p className="cyber-label" style={{ marginBottom: '16px' }}>GOLD COLOR / 黄金颜色</p>
             <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }} className="hide-scrollbar">
                {goldColors.map(c => (
                   <button 
                     key={c.value} onClick={() => setGoldColor(c.value)}
                     style={{ 
                       padding: '14px 24px', borderRadius: '24px', border: 'none',
                       background: goldColor === c.value ? '#000' : '#F9F9F9',
                       color: goldColor === c.value ? '#fff' : '#000',
                       fontSize: '12px', fontWeight: 900, cursor: 'pointer',
                       transition: 'all 0.3s ease', flexShrink: 0
                     }}
                   >
                     {c.label}
                   </button>
                ))}
             </div>
          </div>
        </div>
      </div>

      <div className="vision-pill-container" style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', padding: '40px 24px', pointerEvents: 'none' }}>
         <div className="vision-pill" style={{ width: '280px', pointerEvents: 'auto' }}>
            <button onClick={() => handleDecision("REJECTED")} className="vision-action" style={{ color: '#FF3B30' }}>REJECT</button>
            <button onClick={() => handleDecision("APPROVED")} className="vision-action accent" style={{ width: '100%' }}>
               APPROVE <ChevronRight size={18} strokeWidth={3} />
            </button>
         </div>
      </div>

    </div>
  );
}
