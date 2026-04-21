"use client";

import { useEffect, useState } from "react";

export default function DebugTerminal() {
  const [logs, setLogs] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Save original console functions
    const originalLog = console.log;
    const originalError = console.error;

    // Patch console.log
    console.log = (...args) => {
      setLogs((prev) => [...prev.slice(-10), `[LOG] ${args.join(" ")}`]);
      originalLog(...args);
    };

    // Patch console.error
    console.error = (...args) => {
      setLogs((prev) => [...prev.slice(-10), `[ERR] ${args.join(" ")}`]);
      originalError(...args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  if (!visible) {
    return (
      <button 
        onClick={() => setVisible(true)}
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          zIndex: 9999,
          background: 'rgba(0,0,0,0.5)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '30px',
          height: '30px',
          fontSize: '10px',
          cursor: 'pointer',
          opacity: 0.3
        }}
      >
        ⚙️
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      height: '250px',
      background: '#111',
      color: '#0f0',
      padding: '10px',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 9999,
      overflowY: 'auto',
      borderTop: '2px solid #333'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #333', paddingBottom: '5px' }}>
        <span>Reach Debug Console</span>
        <button onClick={() => setVisible(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>Close [x]</button>
      </div>
      {logs.map((log, i) => (
        <div key={i} style={{ marginBottom: '4px', whiteSpace: 'pre-wrap', color: log.startsWith('[ERR]') ? '#ff5f56' : '#0f0' }}>
          {log}
        </div>
      ))}
      {logs.length === 0 && <div style={{ color: '#666' }}>Waiting for logs...</div>}
    </div>
  );
}
