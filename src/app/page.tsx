"use client";

import { motion } from "framer-motion";
import { Plus, Package, Clock, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { rtdb, rtdbRef, onValue } from "@/lib/firebase";
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
    const diff = Date.now() - req.createdAt;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return days === 0 ? "Aujourd'hui" : `Il y a ${days}j`;
  };

  return (
    <div className="layout" style={{ paddingTop: '40px' }}>
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="title">Logistique</h1>
          <p className="subtitle">Aujourd'hui</p>
        </div>
        <Link href="/requests/new" style={{ 
          background: 'var(--accent)', 
          color: '#fff', 
          width: '50px', 
          height: '50px', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          boxShadow: '0 10px 20px rgba(0, 122, 255, 0.3)',
          textDecoration: 'none'
        }}>
          <Plus size={28} />
        </Link>
      </header>

      {/* FILTER BAR 2026 */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        overflowX: 'auto', 
        paddingBottom: '24px',
        scrollbarWidth: 'none',
      }}>
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            style={{
              padding: '10px 20px',
              borderRadius: '24px',
              border: 'none',
              fontSize: '15px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              background: filter === opt.value ? 'var(--foreground)' : 'var(--glass-bg)',
              color: filter === opt.value ? 'var(--background)' : 'var(--foreground)',
              backdropFilter: 'blur(10px)',
              boxShadow: filter === opt.value ? '0 8px 16px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {opt.label === 'All' ? 'Tous' : opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="list-group animate-pulse" style={{ height: '100px', opacity: 0.3 }}></div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {requests
            .filter(r => filter === 'ALL' || r.status === filter)
            .map((req, i) => (
              <motion.div 
                key={req.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, type: 'spring', damping: 20 }}
              >
                <Link 
                  href={`/requests/${req.id}`} 
                  className="list-group"
                  style={{ 
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '20px',
                    gap: '20px',
                    marginBottom: 0
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    {req.imageUrl ? (
                      <img 
                        src={req.imageUrl} 
                        alt={req.title} 
                        style={{ width: '80px', height: '80px', borderRadius: '18px', objectFit: 'cover', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }} 
                      />
                    ) : (
                      <div style={{ width: '80px', height: '80px', borderRadius: '18px', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={32} color="var(--separator)" />
                      </div>
                    )}
                    <div style={{ 
                      position: 'absolute', 
                      bottom: '-6px', 
                      right: '-6px', 
                      background: '#fff', 
                      borderRadius: '50%', 
                      padding: '4px',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                      display: 'flex'
                    }}>
                       {getStatusIcon(req.status)}
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontWeight: 700, fontSize: '19px', margin: 0, color: 'var(--foreground)', letterSpacing: '-0.4px' }}>
                      {req.title}
                    </h3>
                    <div style={{ marginTop: '6px', fontSize: '14px', fontWeight: 500, color: 'var(--faded)', display: 'flex', justifyContent: 'space-between' }}>
                       <span>{req.size ? `Taille ${req.size}` : 'Standard'}</span>
                       {renderTimeline(req)}
                    </div>
                    <div style={{ 
                      marginTop: '10px', 
                      fontSize: '11px', 
                      fontWeight: 800, 
                      textTransform: 'uppercase', 
                      color: 'var(--accent)',
                      letterSpacing: '0.5px'
                    }}>
                      {req.status.replace(/_/g, ' ')}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
        </div>
      )}
    </div>
  );
}
