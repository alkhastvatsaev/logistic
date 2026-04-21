"use client";

import { useEffect, useState } from "react";
import { rtdb, rtdbRef, get, update } from "@/lib/firebase";
import { motion } from "framer-motion";
import { CheckCircle, XCircle } from "lucide-react";

export default function MirzaReview({ params }: { params: { id: string } }) {
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | null>(null);

  useEffect(() => {
    const fetchRequest = async () => {
      const snap = await get(rtdbRef(rtdb, `requests/${params.id}`));
      if (snap.exists()) {
        setRequest(snap.val());
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
        updatedAt: Date.now()
      });
      setDecision(status);
    } catch (e) {
      alert("Erreur réseau. Recommencez.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="layout py-20 text-center font-bold">Chargement...</div>;
  if (!request) return <div className="layout py-20 text-center">Lien expiré ou invalide.</div>;

  if (decision) {
    return (
      <div className="layout py-20 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          {decision === "APPROVED" ? (
            <CheckCircle size={80} className="text-green-500 mx-auto mb-6" />
          ) : (
            <XCircle size={80} className="text-red-500 mx-auto mb-6" />
          )}
          <h1 className="title">{decision === "APPROVED" ? "Validé avec succès" : "Refusé"}</h1>
          <p className="subtitle mt-4">Merci Mirza. Votre décision a été transmise.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="layout" style={{ background: '#fff', padding: '0 24px' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '40px 0' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px', textAlign: 'center' }}>Validation</h1>
        <p style={{ textAlign: 'center', color: '#888', marginBottom: '32px' }}>Veuillez vérifier cette pièce</p>

        {request.imageUrl && (
          <div style={{ marginBottom: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', borderRadius: '24px', overflow: 'hidden' }}>
            <img src={request.imageUrl} alt="Bijou" style={{ width: '100%', display: 'block' }} />
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>{request.title}</h2>
          <div style={{ display: 'inline-block', padding: '8px 20px', background: '#F2F2F7', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 600 }}>
             Taille: {request.size || "Standard"}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button 
            onClick={() => handleDecision("APPROVED")}
            style={{ 
              width: '100%', 
              padding: '24px', 
              borderRadius: '20px', 
              background: '#34c759', 
              color: '#fff', 
              fontSize: '1.3rem', 
              fontWeight: 700, 
              border: 'none',
              boxShadow: '0 10px 20px rgba(52, 199, 89, 0.3)'
            }}
          >
            VALIDER ✅
          </button>
          
          <button 
            onClick={() => handleDecision("REJECTED")}
            style={{ 
              width: '100%', 
              padding: '20px', 
              borderRadius: '20px', 
              background: '#fff', 
              color: '#ff3b30', 
              fontSize: '1.1rem', 
              fontWeight: 600, 
              border: '2px solid #ff3b30',
              marginTop: '8px'
            }}
          >
            REFUSER ❌
          </button>
        </div>
      </motion.div>
    </div>
  );
}
