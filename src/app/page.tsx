"use client";

import { motion } from "framer-motion";
import { Plus, Package, Clock, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { rtdb, rtdbRef, onValue } from "@/lib/firebase";

export type RequestStatus = "DRAFT" | "WAITING_FOR_QUOTE" | "QUOTED" | "MANAGER_REVIEW" | "WAITING_FOR_DEPOSIT" | "IN_PRODUCTION" | "FINAL_PAYMENT" | "SHIPPED" | "DELIVERED";

export interface SupplierRequest {
  id: string;
  title: string;
  status: RequestStatus;
  createdAt: number;
  productionDeadline?: number;
  size?: string;
}

export default function Dashboard() {
  const [requests, setRequests] = useState<SupplierRequest[]>([]);
  const [loading, setLoading] = useState(true);

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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <header style={{ paddingBottom: '20px', marginBottom: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="title" style={{ fontSize: '1.8rem', lineHeight: '1.1' }}>Reach</h1>
          <p className="subtitle" style={{ fontSize: '0.85rem', marginTop: '4px' }}>Logistic Hub</p>
        </div>
        <Link href="/requests/new" className="btn" style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
          <Plus size={18} />
          <span>New</span>
        </Link>
      </header>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card animate-pulse" style={{ height: '80px', opacity: 0.5 }}></div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="card text-center py-20" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', borderStyle: 'dashed' }}>
          <Package size={48} color="var(--faded)" style={{ opacity: 0.5 }} />
          <div>
            <h3 style={{ fontWeight: 500, fontSize: '1.1rem', marginBottom: '8px' }}>No active requests</h3>
            <p className="subtitle" style={{ fontSize: '0.9rem' }}>Start by creating a new jewelry specification.</p>
          </div>
          <Link href="/requests/new" className="btn btn-ghost mt-4">
            Create First
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {requests.map((req, i) => (
            <motion.div 
              key={req.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{ width: '100%' }}
            >
              <Link 
                href={`/requests/${req.id}`} 
                className="card block" 
                style={{ 
                  padding: '16px', 
                  textDecoration: 'none',
                  display: 'block',
                  width: '100%'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>{req.title}</h3>
                  {getStatusIcon(req.status)}
                </div>
                <div style={{ marginTop: '8px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ 
                      color: 'var(--faded)',
                      fontWeight: 500
                    }}>
                      {req.status === 'WAITING_FOR_QUOTE' ? 'Waiting' : req.status.replace(/_/g, ' ')}
                    </span>
                    {req.size && (
                      <span style={{ color: 'var(--faded)', opacity: 0.6 }}>• {req.size}</span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {renderTimer(req)}
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
