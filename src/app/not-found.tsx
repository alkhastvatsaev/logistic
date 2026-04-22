import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="layout" style={{ background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '32px' }}>
      <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <h2 style={{ fontSize: '120px', fontWeight: 900, marginBottom: '0', color: '#000', lineHeight: 0.8, letterSpacing: '-0.08em' }}>404</h2>
        <h3 style={{ fontSize: '12px', fontWeight: 900, marginTop: '24px', marginBottom: '16px', color: 'var(--faded)', letterSpacing: '0.2em' }}>LOST IN SPACE</h3>
        <p style={{ marginBottom: '48px', fontWeight: 600, color: 'var(--foreground)', opacity: 0.6 }}>This order or link does not exist anymore.</p>
        <Link href="/" className="btn-main" style={{ textDecoration: 'none' }}>
           BACK TO DASHBOARD
        </Link>
      </div>
    </div>
  );
}
