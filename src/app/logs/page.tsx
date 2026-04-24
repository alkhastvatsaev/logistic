"use client";

import { useEffect, useState } from "react";
import { rtdb, rtdbRef, onValue } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, Activity, DollarSign, Truck, Package, ShieldCheck, Database } from "lucide-react";
import { useRouter } from "next/navigation";
import { getRelativeTime } from "@/lib/logic";
import { TitaneLoader } from "@/components/ui/TitaneLoader";

export default function ArchivesHub() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const logsRef = rtdbRef(rtdb, 'logs');
    return onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.values(data).sort((a: any, b: any) => b.timestamp - a.timestamp);
        setLogs(list);
      }
      setLoading(false);
    });
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'FINANCE': return <DollarSign size={16} />;
      case 'WORKFLOW': return <Activity size={16} />;
      case 'SUPPLIER': return <Package size={16} />;
      case 'SECURITY': return <ShieldCheck size={16} />;
      default: return <Database size={16} />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'FINANCE': return '#34C759';
      case 'WORKFLOW': return 'var(--accent)';
      case 'SUPPLIER': return '#FF9500';
      case 'SECURITY': return '#5856D6';
      default: return '#8E8E93';
    }
  };

  if (loading) return <TitaneLoader />;

  return (
    <div className="layout" style={{ background: '#fff', paddingBottom: '120px' }}>
      
      <header style={{ padding: '64px 32px 32px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', zIndex: 100 }}>
        <button onClick={() => router.back()} style={{ width: '44px', height: '44px', borderRadius: '22px', border: 'none', background: '#F9F9F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={18} strokeWidth={3} />
        </button>
        <span className="cyber-label" style={{ letterSpacing: '0.2em' }}>HUB ARCHIVES</span>
        <div style={{ width: '44px' }} />
      </header>

      <div style={{ padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px', padding: '24px', background: 'linear-gradient(90deg, #F9F9F9 0%, #fff 100%)', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.02)' }}>
           <div style={{ width: '10px', height: '10px', borderRadius: '5px', background: '#34C759', boxShadow: '0 0 10px rgba(52,199,89,0.4)', animation: 'pulse 2s infinite' }} />
           <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.1em' }}>TELEMETRY STREAM ACTIVE</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {logs.map((log, i) => (
            <motion.div 
              key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              style={{ display: 'flex', gap: '24px' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                 <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#fff', boxShadow: '0 10px 20px rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.03)', color: getColor(log.type), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {getIcon(log.type)}
                 </div>
                 {i !== logs.length - 1 && <div style={{ width: '2px', flex: 1, background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, transparent 100%)', marginTop: '12px' }} />}
              </div>

              <div style={{ flex: 1, paddingBottom: '32px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', textTransform: 'capitalize' }}>{log.action.replace(/_/g, ' ').toLowerCase()}</h3>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--faded)', opacity: 0.5 }}>{getRelativeTime(log.timestamp)}</span>
                 </div>
                 
                 <div style={{ padding: '24px', background: '#F9F9F9', borderRadius: '32px', border: '1px solid rgba(0,0,0,0.01)' }}>
                    {log.requestId && <div style={{ fontSize: '9px', fontWeight: 900, color: 'var(--accent)', marginBottom: '12px', letterSpacing: '0.1em' }}>PROJECT: {log.requestId.toUpperCase().substring(0, 8)}</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                       {Object.entries(log.details || {}).map(([k, v]: any) => (
                         <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600 }}>
                            <span style={{ opacity: 0.4, fontSize: '9px' }}>{k.toUpperCase()}</span>
                            <span style={{ color: '#000', fontWeight: 900 }}>{String(v)}</span>
                         </div>
                       ))}
                    </div>
                 </div>
                 <div style={{ marginTop: '12px', fontSize: '8px', fontWeight: 800, opacity: 0.15, letterSpacing: '0.1em' }}>{log.iso}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
