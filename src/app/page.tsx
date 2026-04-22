"use client";

import { motion } from "framer-motion";
import { Plus, Package, Clock, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { rtdb, rtdbRef, onValue } from "@/lib/firebase";
import { getRelativeTime } from "@/lib/logic";
export const dynamic = "force-dynamic";

export type RequestStatus = "DRAFT" | "WAITING_FOR_QUOTE" | "QUOTED" | "MANAGER_REVIEW" | "WAITING_FOR_DEPOSIT" | "IN_PRODUCTION" | "FINAL_PAYMENT" | "SHIPPED" | "DELIVERED";

export interface SupplierRequest {
  id: string;
  title: string;
  status: RequestStatus;
  createdAt: number;
  productionDeadline?: number;
  deliveryEstimation?: number;
  size?: string;
  imageUrl?: string;
}

export default function Dashboard() {
  const [requests, setRequests] = useState<SupplierRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RequestStatus | "ALL">("ALL");

  const filterOptions: { label: string, value: RequestStatus | "ALL" }[] = [
    { label: "All", value: "ALL" },
    { label: "Quotes", value: "WAITING_FOR_QUOTE" },
    { label: "Review", value: "MANAGER_REVIEW" },
    { label: "Deposit", value: "WAITING_FOR_DEPOSIT" },
    { label: "Factory", value: "IN_PRODUCTION" },
    { label: "Shipped", value: "SHIPPED" },
  ];

  useEffect(() => {
    const requestsRef = rtdbRef(rtdb, "requests");
    const unsubscribe = onValue(requestsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert object to array and sort by createdAt
        const list = Object.keys(data).map(key => ({
          ...data[key],
          id: key
        })).sort((a, b) => b.createdAt - a.createdAt);
        setRequests(list);
      } else {
        setRequests([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getStatusIcon = (status: RequestStatus) => {
    switch(status) {
      case "WAITING_FOR_QUOTE": return <Clock size={16} className="text-faded" />;
      case "QUOTED": return <div className="w-4 h-4 rounded-full bg-blue-500" />;
      case "IN_PRODUCTION": return <Package size={16} className="text-faded" />;
      case "SHIPPED": return <Truck size={16} className="text-green-500" />;
      case "DELIVERED": return <ShieldCheck size={16} className="text-green-500" />;
      default: return <div className="w-4 h-4 rounded-full border border-border" />;
    }
  };

  const renderTimeline = (req: any) => {
    if (req.deliveryEstimation && req.status !== 'DELIVERED') {
      const date = new Date(req.deliveryEstimation);
      return (
        <span style={{ color: 'var(--success)', fontWeight: 600 }}>
          Livraison: {date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
        </span>
      );
    }
    return getRelativeTime(req.createdAt);
  };

  return (
    <div className="layout" style={{ backgroundColor: 'var(--background)' }}>
      {/* HEADER 2030 */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ padding: '64px 24px 32px 24px', position: 'sticky', top: 0, zIndex: 10, background: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)' }}
      >
        <h1 className="title">LOGIS<br/><span style={{ color: 'var(--accent)' }}>TIQUE</span></h1>
      </motion.div>

      {/* FEED INFINI */}
      <div style={{ padding: '0 24px 140px 24px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
             {[1, 2].map(i => <div key={i} className="animate-pulse" style={{ height: '300px', borderRadius: '24px', background: 'var(--secondary-bg)' }} />)}
          </div>
        ) : requests.filter(r => filter === 'ALL' || r.status === filter).length === 0 ? (
          <div style={{ padding: '100px 0', textAlign: 'center', color: 'var(--faded)' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <Package size={48} strokeWidth={1} style={{ opacity: 0.5 }} />
              Vide Absolute.
            </h2>
          </div>
        ) : (
          requests.filter(r => filter === 'ALL' || r.status === filter).map((req, i) => (
            <motion.div 
              key={req.id}
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: i * 0.1, type: "spring", bounce: 0.4 }}
            >
              <Link href={`/requests/${req.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ 
                  position: 'relative', 
                  height: '350px', 
                  borderRadius: '32px', 
                  overflow: 'hidden',
                  background: 'var(--secondary-bg)',
                  boxShadow: '0 30px 60px rgba(0,0,0,0.8)'
                }}>
                  {req.imageUrl && (
                    <img 
                      src={req.imageUrl} 
                      alt={req.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} 
                    />
                  )}
                  {/* Gradient Overlay pour lisibilité */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0) 100%)' }} />
                  
                  {/* Contenu Superposé */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <h3 style={{ fontSize: '32px', fontWeight: 800, margin: 0, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>{req.title}</h3>
                      <span style={{ color: 'var(--accent)', fontSize: '14px', fontWeight: 700, letterSpacing: '0.1em' }}>{req.size ? `T.${req.size}` : 'STD'}</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '100px', backdropFilter: 'blur(10px)' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent)' }} />
                        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: '#fff', textTransform: 'uppercase' }}>
                          {req.status === 'WAITING_FOR_QUOTE' ? 'DEVIS REQUIS' : req.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span style={{ fontSize: '13px', color: 'var(--faded)', fontWeight: 500 }}>
                        {renderTimeline(req)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>

      {/* DYNAMIC ISLAND NAVIGATION */}
      <div className="floating-pill-container">
        <div className="floating-pill">
          <button 
            onClick={() => setFilter('ALL')}
            className={`pill-item ${filter === 'ALL' ? 'active' : ''}`}
          >
            <Clock size={20} />
            {filter === 'ALL' && <span>ALL</span>}
          </button>
          
          <div style={{ position: 'relative' }}>
             <select 
               value={filter} 
               onChange={(e) => setFilter(e.target.value as any)}
               className={`pill-item ${filter !== 'ALL' ? 'active' : ''}`}
               style={{ appearance: 'none', paddingLeft: '40px', background: filter !== 'ALL' ? 'var(--accent)' : 'transparent' }}
             >
               <option value="ALL">FILTER</option>
               {filterOptions.filter(o => o.value !== 'ALL').map(opt => (
                 <option key={opt.value} value={opt.value}>{opt.label}</option>
               ))}
             </select>
             <Package size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: filter !== 'ALL' ? '#000' : 'var(--faded)' }} />
          </div>

          <Link href="/requests/new" className="pill-item" style={{ background: 'var(--foreground)', color: 'var(--background)' }}>
            <Plus size={20} />
            <span>NEW</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
