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
    <div className="layout" style={{ paddingTop: '24px', paddingBottom: '140px' }}>
      <header style={{ marginBottom: '16px', padding: '0 16px' }}>
        <h1 className="title">Logistique</h1>
      </header>

      {loading ? (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="list-group animate-pulse" style={{ height: '70px', opacity: 0.3, margin: 0 }}></div>
          ))}
        </div>
      ) : requests.filter(r => filter === 'ALL' || r.status === filter).length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--faded)' }}>
          <Package size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
          <p style={{ fontSize: '15px' }}>Aucun projet en cours.</p>
        </div>
      ) : (
        <div className="list-group">
          {requests
            .filter(r => filter === 'ALL' || r.status === filter)
            .map((req, i) => (
              <motion.div 
                key={req.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Link 
                  href={`/requests/${req.id}`} 
                  className="row-item"
                  style={{ 
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: '12px 16px',
                    gap: '12px',
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    {req.imageUrl ? (
                      <img 
                        src={req.imageUrl} 
                        alt={req.title} 
                        style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} 
                      />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(120, 120, 128, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={20} color="var(--faded)" />
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                       <h3 style={{ fontWeight: 600, fontSize: '17px', margin: 0, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                         {req.title}
                       </h3>
                       <div style={{ fontSize: '13px', color: 'var(--faded)', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                          {renderTimeline(req)}
                       </div>
                    </div>
                    
                    <div style={{ marginTop: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <p style={{ fontSize: '14px', margin: 0, color: 'var(--faded)' }}>{req.size ? `Taille ${req.size}` : 'Standard'}</p>
                       <p style={{ fontSize: '13px', margin: 0, color: 'var(--faded)' }}>{req.status.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
        </div>
      )}

      {/* NATIVE APPLE TAB BAR */}
      <nav className="tab-bar">
        <button 
          onClick={() => { setFilter('ALL'); }}
          className={`tab-item ${filter === 'ALL' ? 'active' : ''}`}
          style={{ background: 'transparent', border: 'none' }}
        >
          <Clock size={24} />
          <span>Projets</span>
        </button>
        
        <Link href="/requests/new" className="tab-item">
          <Plus size={24} />
          <span>Nouveau</span>
        </Link>

        {/* This effectively replaces the generic filters with a cleaner interaction */}
        <div style={{ position: 'relative', flex: 1, display: 'flex', justifyContent: 'center' }}>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as any)}
            className="tab-item"
            style={{ 
              background: 'transparent', 
              border: 'none', 
              appearance: 'none',
              textAlign: 'center',
              width: '100%',
              padding: 0,
              margin: 0,
              color: filter !== 'ALL' ? 'var(--accent)' : 'var(--faded)'
            }}
          >
            <option value="ALL">Filtres</option>
            {filterOptions.filter(o => o.value !== 'ALL').map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div style={{ position: 'absolute', pointerEvents: 'none', top: '8px' }}>
             <Package size={24} color={filter !== 'ALL' ? 'var(--accent)' : 'var(--faded)'} />
          </div>
          <span style={{ 
            position: 'absolute', 
            bottom: '0px', 
            fontSize: '10px', 
            fontWeight: 500, 
            color: filter !== 'ALL' ? 'var(--accent)' : 'var(--faded)' 
          }}>
            {filter === 'ALL' ? 'Catégories' : filter.replace(/_/g, ' ')}
          </span>
        </div>
      </nav>
    </div>
  );
}
