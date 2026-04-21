"use client";

import { useEffect, useState } from "react";
import { rtdb, rtdbRef, get, update } from "@/lib/firebase";
import { motion } from "framer-motion";
import { CheckCircle, XCircle } from "lucide-react";

export default function MirzaReview({ params }: { params: { id: string } }) {
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [goldColor, setGoldColor] = useState("White Gold");
  const [size, setSize] = useState("");
  const [category, setCategory] = useState<"Ring" | "Bracelet" | "Necklace">("Ring");

  const sizeOptions = {
    Ring: Array.from({ length: 15 }, (_, i) => (49 + i).toString()),
    Bracelet: Array.from({ length: 9 }, (_, i) => (14 + i).toString() + " cm"),
    Necklace: ["38 cm", "40 cm", "42 cm", "45 cm", "50 cm", "55 cm", "60 cm", "70 cm", "80 cm"]
  };

  useEffect(() => {
    const fetchRequest = async () => {
      const snap = await get(rtdbRef(rtdb, `requests/${params.id}`));
      if (snap.exists()) {
        const val = snap.val();
        setRequest(val);
        setSize(val.size || "52");
        setCategory(val.size?.includes('cm') ? 'Bracelet' : val.size && parseInt(val.size) > 30 ? 'Necklace' : 'Ring');
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
      await update(rtdbRef(rtdb, `requests/${params.id}`), { 
        status: nextStatus,
        mirzaDecision: status,
        goldColor,
        size,
        updatedAt: Date.now()
      });
      setDecision(status);
    } catch (e) {
      alert("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="layout py-20 text-center">CHARGEMENT...</div>;
  if (!request) return <div className="layout py-20 text-center">LIEN INVALIDE</div>;

  if (decision) {
    return (
      <div className="layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center' }}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <h1 className="title" style={{ color: decision === "APPROVED" ? '#34c759' : '#ff3b30' }}>
            {decision === "APPROVED" ? "COMMANDE VALIDÉE" : "COMMANDE REFUSÉE"}
          </h1>
          <p className="subtitle mt-2">DÉCISION ENREGISTRÉE</p>
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
      padding: '20px'
    }}>
      <header style={{ textAlign: 'center', marginBottom: '10px' }}>
        <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', color: '#888' }}>VÉRIFICATION ADMINISTRATIVE</p>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{request.title}</h1>
      </header>

      <div style={{ flex: 1, position: 'relative', borderRadius: '16px', overflow: 'hidden', background: '#f5f5f7', marginBottom: '20px' }}>
        {request.imageUrl && (
          <img src={request.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        )}
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
           <div style={{ flex: 1 }}>
             <label style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#888', marginBottom: '4px', display: 'block' }}>TYPE</label>
             <select 
               value={category} 
               onChange={(e) => {
                 const cat = e.target.value as any;
                 setCategory(cat);
                 setSize(sizeOptions[cat as keyof typeof sizeOptions][0]);
               }}
               style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#f5f5f7', border: 'none', fontWeight: 600 }}
             >
               <option value="Ring">BAGUE</option>
               <option value="Bracelet">BRACELET</option>
               <option value="Necklace">COLLIER</option>
             </select>
           </div>
           <div style={{ flex: 1 }}>
             <label style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#888', marginBottom: '4px', display: 'block' }}>TAILLE / LONGUEUR</label>
             <select 
               value={size} 
               onChange={(e) => setSize(e.target.value)}
               style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#f5f5f7', border: 'none', fontWeight: 600 }}
             >
               {sizeOptions[category].map(s => <option key={s} value={s}>{s}</option>)}
             </select>
           </div>
        </div>

        <div>
          <label style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#888', marginBottom: '4px', display: 'block' }}>COULEUR DE L'OR</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {["Yellow Gold", "White Gold", "Rose Gold"].map(color => (
              <button 
                key={color}
                onClick={() => setGoldColor(color)}
                style={{ 
                  flex: 1, 
                  padding: '10px', 
                  borderRadius: '10px', 
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: goldColor === color ? '2px solid #000' : '1px solid #ddd',
                  background: goldColor === color ? '#000' : 'transparent',
                  color: goldColor === color ? '#fff' : '#000',
                  transition: '0.2s'
                }}
              >
                {color.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
        <button 
          onClick={() => handleDecision("APPROVED")}
          style={{ flex: 1, padding: '20px', borderRadius: '14px', background: '#34c759', color: '#fff', fontSize: '1rem', fontWeight: 800, border: 'none' }}
        >
          VALIDER
        </button>
        <button 
          onClick={() => handleDecision("REJECTED")}
          style={{ flex: 1, padding: '20px', borderRadius: '14px', background: '#ff3b30', color: '#fff', fontSize: '1rem', fontWeight: 800, border: 'none' }}
        >
          REJECT
        </button>
      </div>
    </div>
  );
}
