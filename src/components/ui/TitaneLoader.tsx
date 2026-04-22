"use client";

import { motion } from "framer-motion";

export const TitaneLoader = () => {
  return (
    <div className="layout" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#fff' }}>
      <div style={{ position: 'relative', width: '40px', height: '40px' }}>
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{ 
            width: '100%', height: '100%', 
            borderRadius: '50%', 
            border: '3px solid rgba(0,0,0,0.03)',
            borderTopColor: 'var(--accent)'
          }}
        />
      </div>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ marginTop: '24px', fontSize: '10px', fontWeight: 900, color: 'var(--accent)', letterSpacing: '0.2em' }}
      >
        SYNCING DATA
      </motion.p>
    </div>
  );
};
