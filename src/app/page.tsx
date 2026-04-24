"use client";

import { motion } from "framer-motion";
import { Plus, ChevronRight, Package, AlertCircle, Quote } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useAllRequests, useAllQuotes } from "@/hooks/useFirebase";
import { getRelativeTime } from "@/lib/logic";
import { VisionPill } from "@/components/ui/VisionPill";
import { TitaneLoader } from "@/components/ui/TitaneLoader";
export const dynamic = "force-dynamic";

export type RequestStatus = "DRAFT" | "WAITING_FOR_QUOTE" | "QUOTED" | "MANAGER_REVIEW" | "WAITING_FOR_DEPOSIT" | "IN_PRODUCTION" | "FINAL_PAYMENT" | "SHIPPED" | "DELIVERED";

export default function Dashboard() {
  const { requests, loading } = useAllRequests();
  const allQuotes = useAllQuotes();
  const [liveRate, setLiveRate] = useState(0.135);
  const prevStatuses = useRef<Record<string, string>>({});

  useEffect(() => {
    import("@/lib/logic").then(logic => logic.fetchLiveRate().then(setLiveRate));
  }, []);

  useEffect(() => {
    if (!loading && requests.length > 0) {
      requests.forEach(r => {
        const prev = prevStatuses.current[r.id];
        if (prev && prev !== 'QUOTED' && r.status === 'QUOTED') {
          toast.success(`DEVIS REÇU : ${r.title}`, {
            description: "Un fournisseur a soumis un prix. En attente de revue.",
            icon: <AlertCircle />,
            duration: 5000
          });
          if (navigator.vibrate) navigator.vibrate(200);
        }
        prevStatuses.current[r.id] = r.status;
      });
    }
  }, [requests, loading]);

  if (loading) return <TitaneLoader />;

  const activeRequests = requests.filter(r => r.status !== 'DELIVERED');
  const completedRequests = requests.filter(r => r.status === 'DELIVERED');

  return (
    <div className="layout" style={{ background: '#fff' }}>
      
      {/* SPATIAL HEADER */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
        style={{ position: 'sticky', top: 0, zIndex: 100, padding: '24px 32px', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(30px)', borderBottom: '1px solid rgba(0,0,0,0.02)' }}
      >
        <h1 className="cyber-title" style={{ fontSize: '18px', letterSpacing: '-0.08em' }}>
          LOG<span style={{ color: 'var(--accent)' }}>IS.</span>
        </h1>
      </motion.div>

      {/* ACTIVE LIST STREAM */}
      <div style={{ padding: '0 32px', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '32px' }}>
          {activeRequests.map((r, i) => {
             const quotesForReq = allQuotes[r.id] ? Object.values(allQuotes[r.id]) : [];
             const bestPrice = quotesForReq.length > 0 ? Math.min(...quotesForReq.map((q: any) => q.priceRMB)) : null;
             
             return (
              <motion.div 
                key={r.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.8, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }} 
              >
                <Link href={`/requests/${r.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ 
                    padding: '24px', borderRadius: '40px', background: '#fff', border: '1px solid rgba(0,0,0,0.04)',
                    display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                       <div style={{ width: '64px', height: '64px', borderRadius: '24px', overflow: 'hidden', flexShrink: 0, background: '#F9F9F9' }}>
                          {r.imageUrl ? <img src={r.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <Package size={24} color="rgba(0,0,0,0.1)" />}
                       </div>
                       <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#000', margin: 0, letterSpacing: '-0.04em', textTransform: 'uppercase' }}>{r.title}</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                             <div style={{ width: '8px', height: '8px', borderRadius: '4px', background: r.goldColor === "Or Jaune" ? "#F5D061" : (r.goldColor === "Or Rose" ? "#E7A78B" : "#E5E5E5") }} />
                             <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--faded)' }}>{r.brand?.toUpperCase()} • {r.size}</span>
                          </div>
                       </div>
                       <ChevronRight size={18} color="rgba(0,0,0,0.1)" />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.03)', paddingTop: '16px' }}>
                       <div style={{ display: 'flex', gap: '12px' }}>
                          <span style={{ fontSize: '9px', fontWeight: 900, color: 'var(--accent)', background: 'var(--accent-glow)', padding: '5px 10px', borderRadius: '100px' }}>{r.status.replace(/_/g, ' ')}</span>
                          {quotesForReq.length > 0 && (
                             <span style={{ fontSize: '9px', fontWeight: 900, color: '#000', background: '#F9F9F9', padding: '5px 10px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Quote size={10} /> {quotesForReq.length}
                             </span>
                          )}
                       </div>
                       {bestPrice && (
                          <div style={{ textAlign: 'right' }}>
                             <div style={{ fontSize: '12px', fontWeight: 900 }}>{bestPrice} ¥</div>
                             <div style={{ fontSize: '10px', fontWeight: 900, color: 'var(--accent)', marginTop: '2px' }}>~{(bestPrice * liveRate).toFixed(0)}€</div>
                          </div>
                       )}
                    </div>
                  </div>
                </Link>
              </motion.div>
             );
          })}
      </div>

      {/* ARCHIVES */}
      {completedRequests.length > 0 && (
         <div style={{ marginTop: '64px', padding: '0 32px', paddingBottom: '160px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingLeft: '12px' }}>
               <div style={{ width: '20px', height: '4px', borderRadius: '2px', background: '#34C759' }} />
               <span className="cyber-label" style={{ color: '#177132' }}>ARCHIVES / HISTORIQUE ({completedRequests.length})</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
               {completedRequests.map((r) => (
                  <Link key={r.id} href={`/requests/${r.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ padding: '16px', borderRadius: '28px', background: '#F2FBF4', display: 'flex', alignItems: 'center', gap: '16px', opacity: 0.7 }}>
                       {r.imageUrl ? <img src={r.imageUrl} style={{ width: '48px', height: '48px', borderRadius: '16px', objectFit: 'cover' }} alt="" /> : <Package size={18} opacity={0.2} />}
                       <h4 style={{ fontSize: '14px', fontWeight: 900, color: '#177132', margin: 0 }}>{r.title.toUpperCase()}</h4>
                       <Check size={14} color="#34C759" style={{ marginLeft: 'auto' }} />
                    </div>
                  </Link>
               ))}
            </div>
         </div>
      )}

      <VisionPill width="calc(100% - 64px)">
         <Link href="/radar" className="vision-action" style={{ textDecoration: 'none' }}>RADAR</Link>
         <Link href="/requests/new" className="vision-action accent" style={{ textDecoration: 'none' }}>
            <Plus size={18} strokeWidth={3} /> NEW
         </Link>
      </VisionPill>

    </div>
  );
}

function Check({ size, color, style }: any) {
   return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={style}><polyline points="20 6 9 17 4 12" /></svg>;
}
