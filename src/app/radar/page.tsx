"use client";

import { useState, useMemo, useEffect } from "react";
import { useAllRequests } from "@/hooks/useFirebase";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Package, Clock } from "lucide-react";
import Link from "next/link";
import { TitaneLoader } from "@/components/ui/TitaneLoader";
import { VisionPill } from "@/components/ui/VisionPill";
import { useRouter } from "next/navigation";

export default function DeliveryRadar() {
  const { requests, loading } = useAllRequests();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    setMounted(true);
  }, []);

  // CALENDAR LOGIC
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    // Padding for first week (Mon-based)
    let startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    for (let i = 0; i < startPadding; i++) days.push(null);
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push(new Date(year, month, i));
    }
    return days;
  }, [currentMonth]);

  const changeMonth = (offset: number) => {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    setCurrentMonth(next);
  };

  const isSameDay = (d1: Date, d2: number | undefined) => {
    if (!d2) return false;
    const date2 = new Date(d2);
    return (
      d1.getDate() === date2.getDate() &&
      d1.getMonth() === date2.getMonth() &&
      d1.getFullYear() === date2.getFullYear()
    );
  };

  const ordersForDate = (date: Date) => {
    return requests.filter(r => 
      isSameDay(date, r.deliveryEstimation) || 
      isSameDay(date, r.productionDeadline) ||
      isSameDay(date, r.qcValidatedAt) ||
      isSameDay(date, r.shippedAt)
    );
  };

  const selectedOrders = useMemo(() => ordersForDate(selectedDate), [requests, selectedDate]);

  const resetToToday = () => {
    const now = new Date();
    setCurrentMonth(now);
    setSelectedDate(now);
  };

  if (!mounted || loading) return <TitaneLoader />;

  return (
    <div className="layout" style={{ background: '#fff', minHeight: '100vh', paddingBottom: '160px' }}>
      
      <header style={{ padding: '32px 32px 16px 32px', textAlign: 'left' }}>
        <h1 className="cyber-title" style={{ fontSize: '16px', letterSpacing: '-0.08em', marginBottom: '4px' }}>
          CALENDAR<span style={{ color: 'var(--accent)' }}>.</span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
           <button onClick={() => changeMonth(-1)} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9F9F9', border: 'none', borderRadius: '12px' }}><ChevronLeft size={16}/></button>
           <div onClick={resetToToday} style={{ textAlign: 'center', cursor: 'pointer' }}>
              <p style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </p>
              <p style={{ fontSize: '7px', fontWeight: 900, color: 'var(--accent)', marginTop: '2px', letterSpacing: '0.1em' }}>AUJOURD'HUI</p>
           </div>
           <button onClick={() => changeMonth(1)} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9F9F9', border: 'none', borderRadius: '12px' }}><ChevronRight size={16}/></button>
        </div>
      </header>

      {/* MONTHLY GRID */}
      <div style={{ padding: '0 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '16px' }}>
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, idx) => (
            <div key={`${d}-${idx}`} style={{ textAlign: 'center', fontSize: '9px', fontWeight: 900, color: 'var(--faded)', opacity: 0.3, padding: '10px 0' }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          {daysInMonth.map((day, i) => {
            if (!day) return <div key={`pad-${i}`} />;
            
            const events = ordersForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();
            const isSelected = day.toDateString() === selectedDate.toDateString();

            return (
              <motion.div 
                key={i} whileTap={{ scale: 0.95 }} onClick={() => setSelectedDate(day)}
                style={{
                  height: '60px', borderRadius: '18px',
                   background: isSelected ? 'var(--accent)' : (isToday ? 'var(--accent-glow)' : '#F9F9F9'),
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', position: 'relative', transition: 'all 0.3s ease',
                  border: isToday && !isSelected ? '1.5px solid var(--accent)' : 'none'
                }}
              >
                <span style={{ fontSize: '15px', fontWeight: 900, color: isSelected ? '#fff' : (isToday ? 'var(--accent)' : '#000') }}>
                  {day.getDate()}
                </span>
                
                {events.length > 0 && (
                   <div style={{ 
                     width: '4px', height: '4px', borderRadius: '2px', 
                     background: isSelected ? '#fff' : 'var(--accent)', 
                     marginTop: '4px' 
                   }} />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* SELECTED DAY PANEL */}
      <motion.div layout style={{ padding: '64px 32px 0 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
           <h2 style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
             {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
           </h2>
           <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--accent)', background: 'var(--accent-glow)', padding: '6px 12px', borderRadius: '10px' }}>{selectedOrders.length} ÉVÉNEMENTS</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <AnimatePresence mode="popLayout">
            {selectedOrders.length > 0 ? (
              selectedOrders.map(r => (
                <motion.div 
                  key={r.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link href={`/requests/${r.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ padding: '24px', borderRadius: '32px', background: '#F9F9F9', display: 'flex', alignItems: 'center', gap: '20px', border: '1px solid rgba(0,0,0,0.02)' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: isSameDay(selectedDate, r.shippedAt) ? '#4D148C' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 5px 15px rgba(0,0,0,0.02)' }}>
                          <Package size={20} color={isSameDay(selectedDate, r.shippedAt) ? '#fff' : "var(--accent)"} strokeWidth={2.5} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#000', margin: 0, letterSpacing: '-0.02em' }}>{r.title}</h3>
                          <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--faded)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {isSameDay(selectedDate, r.deliveryEstimation) && 'LIVRAISON CLIENT'}
                            {isSameDay(selectedDate, r.productionDeadline) && 'LIMITE PRODUCTION'}
                            {isSameDay(selectedDate, r.qcValidatedAt) && 'CONTRÔLE QUALITÉ'}
                            {isSameDay(selectedDate, r.shippedAt) && 'TRANSIT INTERNATIONAL'}
                          </p>
                      </div>
                      <ChevronRight size={18} opacity={0.15} />
                    </div>
                  </Link>
                </motion.div>
              ))
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '64px 0', textAlign: 'center', opacity: 0.1 }}>
                 <Clock size={32} strokeWidth={1} style={{ margin: '0 auto 16px auto' }} />
                 <p style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.2em' }}>CALME PLAT</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* PENDING DEADLINES SECTION */}
      {requests.filter(r => !r.deliveryEstimation && r.status !== 'DELIVERED' && r.status !== 'DRAFT').length > 0 && (
        <div style={{ padding: '40px 32px 0 32px' }}>
           <div style={{ padding: '24px', background: 'rgba(255,149,0,0.05)', borderRadius: '32px', border: '1px solid rgba(255,149,0,0.2)' }}>
              <p className="cyber-label" style={{ color: '#FF9500', marginBottom: '8px' }}>MISSING SCHEDULING / CALENDRIER À DÉFINIR</p>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#000', opacity: 0.6 }}>These items are active but have no delivery date yet.</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px', overflowX: 'auto' }} className="hide-scrollbar">
                 {requests.filter(r => !r.deliveryEstimation && r.status !== 'DELIVERED' && r.status !== 'DRAFT').map(r => (
                   <Link key={r.id} href={`/requests/${r.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ padding: '10px 16px', background: '#fff', borderRadius: '16px', fontSize: '11px', fontWeight: 900, whiteSpace: 'nowrap', border: '1px solid rgba(0,0,0,0.05)' }}>
                        {r.title}
                      </div>
                   </Link>
                 ))}
              </div>
           </div>
        </div>
      )}

      <VisionPill width="140px">
         <button onClick={() => router.push('/')} className="vision-action">DASHBOARD</button>
      </VisionPill>

    </div>
  );
}
