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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', padding: '16px', background: '#F9F9F9', borderRadius: '20px' }}>
           <div style={{ width: '8px', height: '8px', borderRadius: '4px', background: '#34C759', animation: 'pulse 2s infinite' }} />
           <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.05em' }}>TELEMETRY STREAM ACTIVE</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {logs.map((log, i) => (
            <motion.div 
              key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              style={{ display: 'flex', gap: '16px' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                 <div style={{ width: '32px', height: '32px', borderRadius: '12px', background: getColor(log.type) + '15', color: getColor(log.type), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {getIcon(log.type)}
                 </div>
                 {i !== logs.length - 1 && <div style={{ width: '1px', flex: 1, background: 'rgba(0,0,0,0.05)', marginTop: '8px' }} />}
              </div>

              <div style={{ flex: 1, paddingBottom: '24px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 900, margin: 0, letterSpacing: '0.02em' }}>{log.action.replace(/_/g, ' ')}</h3>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--faded)' }}>{getRelativeTime(log.timestamp)}</span>
                 </div>
                 
                 <div style={{ marginTop: '8px', padding: '16px', background: '#F9F9F9', borderRadius: '18px', border: '1px solid rgba(0,0,0,0.02)' }}>
                    {log.requestId && <div style={{ fontSize: '9px', fontWeight: 900, color: 'var(--accent)', marginBottom: '8px' }}>REQ: {log.requestId.toUpperCase().substring(0, 8)}</div>}
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(0,0,0,0.6)', lineHeight: 1.5 }}>
                       {Object.entries(log.details || {}).map(([k, v]: any) => (
                         <div key={k}>{k.toUpperCase()}: <span style={{ color: '#000', fontWeight: 800 }}>{String(v)}</span></div>
                       ))}
                    </div>
                 </div>
                 <div style={{ marginTop: '6px', fontSize: '9px', fontWeight: 900, opacity: 0.2, letterSpacing: '0.05em' }}>{log.iso}</div>
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
