"use client";

import { motion } from "framer-motion";
import { Plus, Package, Clock, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type RequestStatus = "DRAFT" | "WAITING_FOR_QUOTE" | "QUOTED" | "IN_PRODUCTION" | "SHIPPED" | "DELIVERED";

export interface SupplierRequest {
  id: string;
  title: string;
  status: RequestStatus;
  createdAt: number;
  productionDeadline?: number;
}

export default function Dashboard() {
  const [requests, setRequests] = useState<SupplierRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const q = query(collection(db, "requests"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SupplierRequest[];
        setRequests(data);
      } catch (error) {
        console.error("Error fetching requests:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
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
      <header style={{ padding: '16px 0', marginBottom: '24px' }}>
        <div>
          <h1 className="title" style={{ fontSize: '1.5rem' }}>Reach</h1>
          <p className="subtitle" style={{ fontSize: '0.8rem' }}>Supplier & Logistics Core</p>
        </div>
        <Link href="/requests/new" className="btn" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
          <Plus size={18} />
          <span>New</span>
        </Link>
      </header>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card animate-pulse" style={{ height: '100px' }}></div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="card text-center py-20" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <Package size={48} color="var(--border)" />
          <div>
            <h3 style={{ fontWeight: 500, fontSize: '1.1rem', marginBottom: '8px' }}>No active requests</h3>
            <p className="subtitle">Start by creating a new supplier request.</p>
          </div>
          <Link href="/requests/new" className="btn btn-ghost mt-4">
            Create First Request
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {requests.map((req, i) => (
            <motion.div 
              key={req.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/requests/${req.id}`} className="card hover:border-[var(--foreground)] transition-colors block" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>{req.title}</h3>
                  {getStatusIcon(req.status)}
                </div>
                <div style={{ marginTop: '12px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ 
                    padding: '2px 8px', 
                    borderRadius: '4px', 
                    background: req.status === 'IN_PRODUCTION' ? 'rgba(0,0,0,0.1)' : 'transparent',
                    color: req.status === 'IN_PRODUCTION' ? 'var(--foreground)' : 'var(--faded)'
                  }}>
                    {req.status === 'WAITING_FOR_QUOTE' ? 'Waiting setup' : req.status.replace(/_/g, ' ')}
                  </span>
                  {renderTimer(req)}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
