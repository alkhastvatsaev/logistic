import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";

interface GlassPanelProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  borderActive?: boolean;
}

export function GlassPanel({ children, borderActive, style, ...props }: GlassPanelProps) {
  return (
    <motion.div
      style={{
        padding: '32px',
        borderRadius: '32px',
        background: 'var(--background)',
        boxShadow: borderActive ? '0 0 0 2px var(--accent), var(--shadow-float)' : 'var(--shadow-float)',
        ...style
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
