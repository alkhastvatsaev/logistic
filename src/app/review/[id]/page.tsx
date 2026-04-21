"use client";

import { useEffect, useState } from "react";
import { rtdb, rtdbRef, get, update } from "@/lib/firebase";
import { motion } from "framer-motion";
import { CheckCircle, XCircle } from "lucide-react";

export default function MirzaReview({ params }: { params: { id: string } }) {
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [goldColor, setGoldColor] = useState("Or Blanc");
  const [size, setSize] = useState("");
  const [category, setCategory] = useState<"Bague" | "Bracelet" | "Collier">("Bague");

  const sizeOptions = {
    Bague: Array.from({ length: 15 }, (_, i) => (49 + i).toString()),
    Bracelet: Array.from({ length: 9 }, (_, i) => (14 + i).toString() + " cm"),
    Collier: ["38 cm", "40 cm", "42 cm", "45 cm", "50 cm", "55 cm", "60 cm", "70 cm", "80 cm"]
  };

  const goldColors = [
    { label: "OR JAUNE", value: "Or Jaune" },
    { label: "OR BLANC", value: "Or Blanc" },
    { label: "OR ROSE", value: "Or Rose" }
  ];

  useEffect(() => {
    const fetchRequest = async () => {
      const snap = await get(rtdbRef(rtdb, `requests/${params.id}`));
      if (snap.exists()) {
        const val = snap.val();
        setRequest(val);
        setSize(val.size || "52");
        const detectedCat = val.size?.includes('cm') ? 'Bracelet' : val.size && parseInt(val.size) > 30 ? 'Collier' : 'Bague';
        setCategory(detectedCat as any);
        if (val.goldColor) setGoldColor(val.goldColor);
      }
      setLoading(false);
    };
    fetchRequest();
  }, [params.id]);

  const handleDecision = async (status: "APPROVED" | "REJECTED") => {
    setLoading(true);
    try {
      const nextStatus = status === "APPROVED" ? "WAITING_FOR_DEPOSIT" : "WAITING_FOR_QUOTE";
      
      const updates: any = {
        status: nextStatus,
        mirzaDecision: status,
        goldColor,
        size, // Nouvelle taille (peut être la même ou modifiée)
        updatedAt: Date.now()
      };

      // TRACE DE SÉCURITÉ : Si la taille est différente de l'originale
      if (status === "APPROVED" && request.size !== size) {
        updates.originalSizeBeforeMirza = request.size;
        updates.sizeChangedByMirza = true;
      }

      await update(rtdbRef(rtdb, `requests/${params.id}`), updates);
      setDecision(status);
    } catch (e) {
      alert("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="layout py-20 text-center font-bold">CHARGEMENT...</div>;
  if (!request) return <div className="layout py-20 text-center">LIEN INVALIDE</div>;

  if (decision) {
    return (
      <div className="layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center' }}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <h1 className="title" style={{ color: decision === "APPROVED" ? '#34c759' : '#ff3b30', fontSize: '1.8rem' }}>
            {decision === "APPROVED" ? "VALIDÉ ✅" : "REFUSÉ ❌"}
          </h1>
          <p className="subtitle mt-2">DÉCISION ENREGISTRÉE DANS LE SYSTÈME</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="layout" style={{ 
      height: '100vh', 
      overflow: 'hidden', 
      display: 'flex', 
      flexDirection: 'column',
      padding: '24px',
      background: '#fff'
    }}>
      <header style={{ textAlign: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', color: '#8E8E93', fontWeight: 600 }}>VÉRIFICATION ADMINISTRATIVE</p>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '4px 0' }}>{request.title.toUpperCase()}</h1>
      </header>

      <div style={{ flex: 1, position: 'relative', borderRadius: '20px', overflow: 'hidden', background: '#F2F2F7', marginBottom: '24px' }}>
        {request.imageUrl && (
          <img src={request.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        )}
      </div>

      <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
           <div style={{ flex: 1 }}>
             <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#8E8E93', marginBottom: '6px', display: 'block', fontWeight: 600 }}>CATÉGORIE</label>
             <select 
               value={category} 
               onChange={(e) => {
                 const cat = e.target.value as any;
                 setCategory(cat);
                 setSize(sizeOptions[cat as keyof typeof sizeOptions][0]);
               }}
               style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#F2F2F7', border: 'none', fontWeight: 700, fontSize: '0.9rem', appearance: 'none' }}
             >
               <option value="Bague">BAGUE</option>
               <option value="Bracelet">BRACELET</option>
               <option value="Collier">COLLIER</option>
             </select>
           </div>
           <div style={{ flex: 1 }}>
             <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#8E8E93', marginBottom: '6px', display: 'block', fontWeight: 600 }}>TAILLE / LONGUEUR</label>
             <select 
               value={size} 
               onChange={(e) => setSize(e.target.value)}
               style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#F2F2F7', border: 'none', fontWeight: 700, fontSize: '0.9rem', appearance: 'none' }}
             >
               {sizeOptions[category as keyof typeof sizeOptions].map(s => <option key={s} value={s}>{s}</option>)}
             </select>
           </div>
        </div>

        <div>
          <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#8E8E93', marginBottom: '6px', display: 'block', fontWeight: 600 }}>COULEUR DE L'OR</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {goldColors.map(color => (
              <button 
                key={color.value}
                onClick={() => setGoldColor(color.value)}
                style={{ 
                  flex: 1, 
                  padding: '12px 4px', 
                  borderRadius: '12px', 
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  border: goldColor === color.value ? '2px solid #007AFF' : '1px solid #E5E5EA',
                  background: goldColor === color.value ? '#007AFF' : '#fff',
                  color: goldColor === color.value ? '#fff' : '#000',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {color.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
        <button 
          onClick={() => handleDecision("REJECTED")}
          style={{ flex: 1, padding: '22px', borderRadius: '16px', background: '#FF3B30', color: '#fff', fontSize: '1rem', fontWeight: 800, border: 'none', boxShadow: '0 4px 12px rgba(255, 59, 48, 0.2)' }}
        >
          REFUSER
        </button>
        <button 
          onClick={() => handleDecision("APPROVED")}
          style={{ flex: 1, padding: '22px', borderRadius: '16px', background: '#34C759', color: '#fff', fontSize: '1rem', fontWeight: 800, border: 'none', boxShadow: '0 4px 12px rgba(52, 199, 89, 0.2)' }}
        >
          VALIDER
        </button>
      </div>
    </div>
  );
}
