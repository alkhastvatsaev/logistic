"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface VisionPillProps {
  children: React.ReactNode;
  width?: string;
}

export const VisionPill = ({ children, width = "auto" }: VisionPillProps) => {
  return (
    <div className="vision-pill-container" style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', padding: '40px 24px', pointerEvents: 'none', display: 'flex', justifyContent: 'center', zIndex: 1000 }}>
       <motion.div 
         initial={{ y: 100, opacity: 0 }} 
         animate={{ y: 0, opacity: 1 }} 
         transition={{ type: 'spring', damping: 28, stiffness: 220 }}
         className="vision-pill" 
         style={{ width, pointerEvents: 'auto' }}
       >
          {children}
       </motion.div>
    </div>
  );
};
