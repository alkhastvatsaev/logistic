"use client";

import React, { useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';

const ITEM_HEIGHT = 56;

interface WheelItemProps {
  label: string | number;
  index: number;
  scrollY: MotionValue<number>;
  rowHeight: number;
  isSelected: boolean;
}

const WheelItem = ({ label, index, scrollY, rowHeight, isSelected }: WheelItemProps) => {
  const rotateX = useTransform(
    scrollY,
    [ (index - 1) * rowHeight, index * rowHeight, (index + 1) * rowHeight ],
    [ -45, 0, 45 ] 
  );
  const opacity = useTransform(
    scrollY,
    [ (index - 1) * rowHeight, index * rowHeight, (index + 1) * rowHeight ],
    [ 0.15, 1, 0.15 ]
  );
  const scale = useTransform(
    scrollY,
    [ (index - 1) * rowHeight, index * rowHeight, (index + 1) * rowHeight ],
    [ 0.85, 1.15, 0.85 ]
  );
  const z = useTransform(
    scrollY,
    [ (index - 1) * rowHeight, index * rowHeight, (index + 1) * rowHeight ],
    [ -50, 0, -50 ]
  );

  return (
    <motion.div 
      style={{ 
        height: rowHeight, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontSize: isSelected ? '22px' : '18px',
        fontWeight: isSelected ? 900 : 700,
        scrollSnapAlign: 'center',
        rotateX,
        opacity,
        scale,
        translateZ: z,
        color: isSelected ? 'var(--accent)' : 'var(--foreground)',
        transition: 'color 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {label}
    </motion.div>
  );
};

const WheelDrum = ({ options, value, onChange, height = 168 }: { options: string[] | number[], value: any, onChange: (val: any) => void, height?: number }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: containerRef });
  const rowHeight = height / 3;
  
  const handleScroll = () => {
    if (!containerRef.current) return;
    const index = Math.round(containerRef.current.scrollTop / rowHeight);
    if (index >= 0 && index < options.length) {
      if (options[index] !== value) {
        onChange(options[index]);
      }
    }
  };

  useEffect(() => {
    if (containerRef.current) {
      const index = options.indexOf(value);
      if (index !== -1) {
        containerRef.current.scrollTop = index * rowHeight;
      }
    }
  }, [value, options, rowHeight]);

  return (
    <div style={{ 
      position: 'relative', 
      height: `${height}px`, 
      width: '100%', 
      overflow: 'hidden',
      perspective: '1000px'
    }}>
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="hide-scrollbar"
        style={{ 
          height: '100%', 
          overflowY: 'scroll', 
          scrollSnapType: 'y mandatory',
          padding: `${rowHeight}px 0`,
          boxSizing: 'border-box'
        }}
      >
        {options.map((opt, i) => (
          <WheelItem 
            key={`${opt}-${i}`} 
            label={opt} 
            index={i} 
            scrollY={scrollY} 
            rowHeight={rowHeight} 
            isSelected={value === opt} 
          />
        ))}
      </div>
      
      {/* 2026 LIQUID GLASS OVERLAYS */}
      <div style={{ 
         position: 'absolute', 
         top: 0, left: 0, right: 0, 
         height: `${rowHeight}px`, 
         background: 'linear-gradient(to bottom, rgba(255,255,255,0.9) 20%, rgba(255,255,255,0.4) 100%)', 
         backdropFilter: 'blur(8px)',
         WebkitBackdropFilter: 'blur(8px)',
         pointerEvents: 'none', 
         zIndex: 10 
      }} />
      <div style={{ 
         position: 'absolute', 
         bottom: 0, left: 0, right: 0, 
         height: `${rowHeight}px`, 
         background: 'linear-gradient(to top, rgba(255,255,255,0.9) 20%, rgba(255,255,255,0.4) 100%)', 
         backdropFilter: 'blur(8px)',
         WebkitBackdropFilter: 'blur(8px)',
         pointerEvents: 'none', 
         zIndex: 10 
      }} />
      
      <div style={{ 
         position: 'absolute', 
         top: `${rowHeight}px`, 
         height: `${rowHeight}px`, 
         left: '8px', right: '8px', 
         background: 'rgba(255,255,255,0.5)',
         border: '1px solid rgba(255,255,255,0.8)',
         borderRadius: '20px', 
         boxShadow: '0 8px 32px rgba(0,0,0,0.03), inset 0 0 0 1px rgba(255,255,255,0.5)',
         pointerEvents: 'none', 
         zIndex: 5 
      }} />
    </div>
  );
};

export const WheelPicker = ({ options, value, onChange, height = 168 }: { options: string[], value: string, onChange: (val: string) => void, height?: number }) => (
  <div style={{ 
    background: 'rgba(255,255,255,0.4)', 
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '32px', 
    padding: '4px', 
    border: '1px solid rgba(255,255,255,0.8)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
    overflow: 'hidden' 
  }}>
    <WheelDrum options={options} value={value} onChange={onChange} height={height} />
  </div>
);

export const PriceWheel = ({ value, onChange }: { value: number, onChange: (val: number) => void }) => {
  const vStr = Math.min(99999, Math.max(0, value)).toString().padStart(5, '0');
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  const updatePrice = (index: number, newVal: number) => {
    const chars = vStr.split('');
    chars[index] = newVal.toString();
    onChange(parseInt(chars.join('')));
  };

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '2px', 
      background: 'rgba(255,255,255,0.4)', 
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      padding: '8px', 
      borderRadius: '32px', 
      border: '1px solid rgba(255,255,255,0.8)',
      boxShadow: '0 20px 50px rgba(0,0,0,0.08)' 
    }}>
      {[0, 1, 2, 3, 4].map(idx => (
        <div key={idx} style={{ width: '44px' }}>
          <WheelDrum 
            options={digits} 
            value={parseInt(vStr[idx])} 
            onChange={(v) => updatePrice(idx, v)} 
            height={168}
          />
        </div>
      ))}
      <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--accent)', marginLeft: '12px', marginRight: '8px' }}>€</div>
    </div>
  );
};
