"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface SmartImageProps {
  src: string;
  alt?: string;
  style?: React.CSSProperties;
  className?: string;
}

export const SmartImage = ({ src, alt, style, className }: SmartImageProps) => {
  if (!src) return null;

  return (
    <div style={{ ...style, position: 'relative', overflow: 'hidden', backgroundColor: '#fff' }} className={className}>
      {/* BLURRED BACKGROUND LAYER */}
      <img 
        src={src} 
        alt="Background Blur"
        style={{ 
          position: 'absolute', 
          inset: 0, 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover', 
          filter: 'blur(60px) brightness(1.1) saturate(1.2)',
          opacity: 0.5,
          scale: 1.2
        }} 
      />
      
      {/* SHARP CENTERED IMAGE */}
      <motion.img 
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        src={src} 
        alt={alt || "Image"}
        style={{ 
          position: 'relative', 
          width: '100%', 
          height: '100%', 
          objectFit: 'contain',
          zIndex: 2
        }} 
      />

      {/* NO DARK OVERLAY */}
    </div>
  );
};
