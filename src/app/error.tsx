"use client";

import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { GlassPanel } from "@/components/ui/GlassPanel";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="layout" style={{ background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '32px' }}>
      <GlassPanel style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '16px', color: '#000' }}>ERREUR SYSTÈME</h2>
        <p className="subtitle" style={{ marginBottom: '32px' }}>Un problème inattendu est survenu lors du chargement de cette page.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button onClick={() => reset()} className="btn-main">
            RÉESSAYER
          </button>
          <Link href="/" className="btn-main" style={{ background: 'transparent', color: '#000', border: '1px solid var(--glass-border)' }}>
            RETOUR À L&apos;ACCUEIL
          </Link>
        </div>
      </GlassPanel>
    </div>
  );
}
