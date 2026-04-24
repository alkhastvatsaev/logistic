"use client";

import { motion } from "framer-motion";
import { Plus, ChevronRight, Package, AlertCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useAllRequests } from "@/hooks/useFirebase";
import { getRelativeTime } from "@/lib/logic";
import { VisionPill } from "@/components/ui/VisionPill";
import { TitaneLoader } from "@/components/ui/TitaneLoader";
export const dynamic = "force-dynamic";

export type RequestStatus = "DRAFT" | "WAITING_FOR_QUOTE" | "QUOTED" | "MANAGER_REVIEW" | "WAITING_FOR_DEPOSIT" | "IN_PRODUCTION" | "FINAL_PAYMENT" | "SHIPPED" | "DELIVERED";

export default function Dashboard() {
  const { requests, loading } = useAllRequests();
  const prevStatuses = useRef<Record<string, string>>({});

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
          // Play a subtle sound if possible or vibrate
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
      
      {/* 2030 SPATIAL HEADER (COMPACT TOP-LEFT) */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: 'sticky', top: 0, zIndex: 100, padding: '20px 32px 10px 32px', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', pointerEvents: 'none' }}
      >
        <h1 className="cyber-title" style={{ fontSize: '16px', letterSpacing: '-0.08em', textAlign: 'left' }}>
          LOG<span style={{ color: 'var(--accent)' }}>IS.</span>
        </h1>
      </motion.div>

      {/* ACTIVE LIST STREAM */}
      <div style={{ padding: '0 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeRequests.map((r, i) => (
             <motion.div 
               key={r.id} 
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }} 
               whileTap={{ scale: 0.97 }}
               transition={{ duration: 0.8, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }} 
             >
               <Link href={`/requests/${r.id}`} style={{ textDecoration: 'none' }}>
                 <div style={{ 
                   padding: '16px', borderRadius: '32px', background: '#fff', border: '1px solid rgba(0,0,0,0.04)',
                   display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.015)'
                 }}>
                    {r.imageUrl ? (
                      <div style={{ width: '80px', height: '80px', borderRadius: '22px', overflow: 'hidden', flexShrink: 0, background: '#F9F9F9' }}>
                        <img src={r.imageUrl} alt={r.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{ width: '80px', height: '80px', borderRadius: '22px', background: '#F9F9F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Package size={28} color="rgba(0,0,0,0.1)" strokeWidth={1.5} />
                      </div>
                    )}
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ 
                              width: '8px', height: '8px', borderRadius: '4px', 
                              background: r.goldColor === "Or Jaune" ? "#F5D061" : (r.goldColor === "Or Rose" ? "#E7A78B" : "#E5E5E5"),
                              boxShadow: '0 0 10px rgba(0,0,0,0.05)'
                            }} />
                            <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#000', margin: 0, letterSpacing: '-0.05em', textTransform: 'uppercase' }}>
                              {r.title}
                            </h3>
                            {['QUOTED', 'FINAL_PAYMENT'].includes(r.status) && (
                                <motion.div 
                                    animate={{ opacity: [0.4, 1, 0.4] }} 
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    style={{ marginLeft: 'auto', background: 'var(--accent)', color: '#fff', padding: '4px 8px', borderRadius: '8px', fontSize: '8px', fontWeight: 900, letterSpacing: '0.05em' }}
                                >
                                    ACTION REQUIRED
                                </motion.div>
                            )}
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--accent)', background: 'var(--accent-glow)', padding: '4px 10px', borderRadius: '100px', boxShadow: ['QUOTED', 'FINAL_PAYMENT'].includes(r.status) ? '0 0 15px var(--accent)' : 'none' }}>{r.category?.toUpperCase() || 'INFO'}</span>
                            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--faded)' }}>{r.size || 'STD'}</span>
                            {r.estimatedWeight && <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--faded)' }}>• {r.estimatedWeight}</span>}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '3px', background: r.status === 'WAITING_FOR_QUOTE' ? '#FF9500' : (['QUOTED', 'FINAL_PAYMENT'].includes(r.status) ? 'var(--accent)' : 'var(--faded)'), opacity: 1 }} />
                            <span style={{ fontSize: '9px', fontWeight: 900, color: ['QUOTED', 'FINAL_PAYMENT'].includes(r.status) ? 'var(--accent)' : 'var(--faded)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{r.status.replace(/_/g, ' ')}</span>
                            <span style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(0,0,0,0.1)', marginLeft: 'auto' }}>{getRelativeTime(r.createdAt)}</span>
                        </div>
                    </div>
                 </div>
                </Link>
             </motion.div>
          ))}
      </div>

      {/* COMPLETED SECTION (GREEN ZONE) */}
      {completedRequests.length > 0 && (
         <div style={{ marginTop: '64px', padding: '0 32px', paddingBottom: '160px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingLeft: '12px' }}>
               <div style={{ width: '20px', height: '4px', borderRadius: '2px', background: '#34C759' }} />
               <span style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.2em', color: '#177132', textTransform: 'uppercase' }}>ARCHIVES</span>
               <div style={{ marginLeft: 'auto', background: 'rgba(52, 199, 89, 0.1)', color: '#177132', padding: '6px 12px', borderRadius: '100px', fontSize: '10px', fontWeight: 900 }}>{completedRequests.length}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
               {completedRequests.map((r) => (
                  <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileTap={{ scale: 0.98 }}>
                     <Link href={`/requests/${r.id}`} style={{ textDecoration: 'none' }}>
                        <div style={{ 
                          padding: '16px', borderRadius: '28px', background: '#F2FBF4', border: '1px solid rgba(52, 199, 89, 0.05)',
                          display: 'flex', alignItems: 'center', gap: '16px', opacity: 0.7
                        }}>
                           {r.imageUrl ? (
                             <img src={r.imageUrl} style={{ width: '56px', height: '56px', borderRadius: '16px', objectFit: 'cover' }} alt="" />
                           ) : (
                             <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={18} opacity={0.2} /></div>
                           )}
                           <div style={{ flex: 1 }}>
                              <h4 style={{ fontSize: '15px', fontWeight: 900, color: '#177132', margin: 0, letterSpacing: '-0.04em' }}>{r.title.toUpperCase()}</h4>
                              <p style={{ fontSize: '9px', fontWeight: 800, color: '#177132', opacity: 0.4, marginTop: '4px', textTransform: 'uppercase' }}>ARCHIVED {new Date(r.deliveredAt || r.updatedAt).toLocaleDateString()}</p>
                           </div>
                           <div style={{ color: '#34C759', marginRight: '8px' }}><Package size={16} /></div>
                        </div>
                     </Link>
                  </motion.div>
               ))}
            </div>
         </div>
      )}

      <VisionPill width="calc(100% - 64px)">
         <Link href="/radar" className="vision-action" style={{ textDecoration: 'none' }}>CALENDAR</Link>
         <Link href="/requests/new" className="vision-action accent" style={{ textDecoration: 'none' }}>
            <Plus size={18} strokeWidth={3} /> NEW
         </Link>
      </VisionPill>

    </div>
  );
}
