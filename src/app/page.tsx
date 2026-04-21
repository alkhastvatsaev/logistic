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

  const renderTimer = (req: SupplierRequest) => {
    if (req.status === 'IN_PRODUCTION' && req.productionDeadline) {
      const remainingMs = req.productionDeadline - Date.now();
      const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
      
      if (remainingDays < 0) {
        return <span style={{ color: 'red', fontWeight: 600 }}>Delayed</span>;
      }
      return <span style={{ fontWeight: 600 }}>{remainingDays} day{remainingDays > 1 ? 's' : ''} left</span>;
    }
    return <span style={{ color: 'var(--faded)' }}>{new Date(req.createdAt).toLocaleDateString()}</span>;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ padding: '20px 0' }}
    >
      <header style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
          <h1 className="title">Logistics</h1>
          <Link href="/requests/new" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, fontSize: '17px' }}>
            New
          </Link>
        </div>
        <p className="subtitle">Overview</p>
      </header>

      {/* FILTER BAR: PURE APPLE PILLS */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        overflowX: 'auto', 
        paddingBottom: '20px',
        scrollbarWidth: 'none',
      }}>
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              background: filter === opt.value ? 'var(--foreground)' : 'var(--secondary-bg)',
              color: filter === opt.value ? 'var(--secondary-bg)' : 'var(--faded)',
              transition: 'all 0.2s ease'
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card animate-pulse" style={{ height: '80px', opacity: 0.5 }}></div>
          ))}
        </div>
      ) : requests.filter(r => filter === 'ALL' || r.status === filter).length === 0 ? (
        <div className="card text-center py-20" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', borderStyle: 'dashed' }}>
          <Package size={48} color="var(--faded)" style={{ opacity: 0.5 }} />
          <div>
            <h3 style={{ fontWeight: 500, fontSize: '1.1rem', marginBottom: '8px' }}>Empty stage</h3>
            <p className="subtitle" style={{ fontSize: '0.9rem' }}>No projects currently at this step.</p>
          </div>
        </div>
      ) : (
        <div className="list-group">
          {requests
            .filter(r => filter === 'ALL' || r.status === filter)
            .map((req, i) => (
              <motion.div 
                key={req.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                style={{ width: '100%' }}
              >
                <Link 
                  href={`/requests/${req.id}`} 
                  className="row-item" 
                  style={{ 
                    textDecoration: 'none',
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'var(--secondary-bg)'
                  }}
                >
                  {req.imageUrl ? (
                    <img 
                      src={req.imageUrl} 
                      alt={req.title} 
                      style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} 
                    />
                  ) : (
                    <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={24} color="var(--border)" />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontWeight: 600, fontSize: '17px', margin: 0, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {req.title}
                      </h3>
                      <div style={{ transform: 'scale(0.8)', opacity: 0.8 }}>
                        {getStatusIcon(req.status)}
                      </div>
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--faded)' }}>
                        <span>
                          {req.status === 'WAITING_FOR_QUOTE' ? 'Waiting' : req.status.replace(/_/g, ' ')}
                        </span>
                        {req.size && (
                          <span style={{ opacity: 0.5 }}>• {req.size}</span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--faded)' }}>
                        {renderTimer(req)}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
        </div>
      )}
    </motion.div>
  );
}
