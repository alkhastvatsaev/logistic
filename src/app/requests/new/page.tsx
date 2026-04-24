"use client";

import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, UploadCloud, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { rtdb, rtdbRef, push, set } from "@/lib/firebase";
import { SmartImage } from "@/components/ui/SmartImage";
import { VisionPill } from "@/components/ui/VisionPill";
import { logEvent } from "@/lib/logger";

export default function NewRequest() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("Cartier");
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<"Ring" | "Bracelet" | "Necklace">("Ring");
  const [size, setSize] = useState("52");
  const [goldColor, setGoldColor] = useState("Or Jaune");
  const [stoneType, setStoneType] = useState("Sans Pierre");
  const [mainStoneCarat, setMainStoneCarat] = useState("");
  const [engraving, setEngraving] = useState("");
  const [loading, setLoading] = useState(false);

  const stones = [
    { id: "Sans Pierre", label: "SANS", color: "#F9F9F9" },
    { id: "Diamants", label: "DIAMANTS", color: "#FFFFFF" },
    { id: "Rubis", label: "RUBIS", color: "#E0115F" },
    { id: "Saphir", label: "SAPHIR", color: "#0F52BA" },
    { id: "Émeraude", label: "ÉMERAUDE", color: "#50C878" },
    { id: "Perles", label: "PERLES", color: "#F0EAD6" }
  ];

  const sizeOptions = {
    Ring: Array.from({ length: 15 }, (_, i) => (49 + i).toString()),
    Bracelet: Array.from({ length: 9 }, (_, i) => (14 + i).toString() + " cm"),
    Necklace: ["38 cm", "40 cm", "42 cm", "45 cm", "50 cm", "55 cm", "60 cm", "70 cm", "80 cm"]
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setLoading(true);
    try {
      let imageUrl = "";
      if (file) {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const MAX_WIDTH = 1200;
        const scale = Math.min(1, MAX_WIDTH / bitmap.width);
        canvas.width = bitmap.width * scale;
        canvas.height = bitmap.height * scale;
        ctx?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        imageUrl = canvas.toDataURL('image/jpeg', 0.7);
      }
      const newRef = push(rtdbRef(rtdb, "requests"));
      await set(newRef, { 
        id: newRef.key, 
        title, 
        brand,
        size, 
        goldColor,
        stoneType,
        mainStoneCarat: stoneType !== "Sans Pierre" ? mainStoneCarat : null,
        category: category === 'Ring' ? 'Bague' : (category === 'Bracelet' ? 'Bracelet' : 'Collier'),
        engraving: engraving || null,
        imageUrl, 
        status: "WAITING_FOR_QUOTE", 
        createdAt: Date.now(), 
        updatedAt: Date.now() 
      });

      await logEvent({ type: 'WORKFLOW', action: 'NEW_REQUEST', requestId: newRef.key || undefined, details: { title, brand, category } });
      router.push(`/requests/${newRef.key}`);
    } catch (err: any) { 
      toast.error("ERREUR DE SYNCHRONISATION"); 
    } finally { setLoading(false); }
  };

  return (
    <div className="layout" style={{ background: '#fff', paddingBottom: '160px' }}>
      
      <header style={{ padding: '64px 32px 32px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => router.back()} style={{ width: '44px', height: '44px', borderRadius: '22px', border: 'none', background: '#F9F9F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={18} strokeWidth={3} />
        </button>
        <span className="cyber-label" style={{ letterSpacing: '0.2em' }}>NEW REQUEST</span>
        <div style={{ width: '44px' }} />
      </header>

      <div style={{ padding: '0 32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '80px', marginTop: '48px' }}>
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
             <p className="cyber-label" style={{ marginBottom: '24px' }}>IDENTIFICATION / 品牌</p>
             <input 
               autoFocus type="text" placeholder="Design Name..." value={title}
               onChange={(e) => setTitle(e.target.value)}
               style={{ width: '100%', fontSize: '36px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.06em', background: 'transparent', outline: 'none' }}
             />
             <div style={{ height: '4px', background: 'var(--accent)', width: title ? '100%' : '60px', transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)', marginTop: '16px' }} />
             
             <div style={{ marginTop: '48px' }}>
                <span className="cyber-label" style={{ fontSize: '8px', opacity: 0.4 }}>MAISON RÉFÉRENTE</span>
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '12px', marginTop: '16px' }} className="hide-scrollbar">
                   {["Cartier", "Van Cleef", "Bulgari", "Autre"].map(b => (
                      <button 
                        key={b} onClick={() => setBrand(b)}
                        style={{ 
                          padding: '16px 32px', borderRadius: '32px', border: 'none',
                          background: brand === b ? '#000' : '#F9F9F9',
                          color: brand === b ? '#fff' : 'rgba(0,0,0,0.5)',
                          fontSize: '12px', fontWeight: 900, cursor: 'pointer',
                          transition: 'all 0.3s ease', flexShrink: 0
                        }}
                      >
                        {b.toUpperCase()}
                      </button>
                   ))}
                </div>
             </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
             <p className="cyber-label" style={{ marginBottom: '24px' }}>CONFIGURATION MATÉRIAUX</p>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
                <div>
                   <span className="cyber-label" style={{ fontSize: '8px', opacity: 0.4 }}>MÉTAL PRÉCIEUX</span>
                   <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                      {[
                        { id: "Or Jaune", label: "JAUNE", color: "#F5D061" },
                        { id: "Or Blanc", label: "BLANC", color: "#E5E5E5" },
                        { id: "Or Rose", label: "ROSE", color: "#E7A78B" }
                      ].map(g => (
                        <button 
                          key={g.id} onClick={() => setGoldColor(g.id)}
                          style={{ 
                            flex: 1, padding: '20px 8px', borderRadius: '28px', border: 'none',
                            background: goldColor === g.id ? g.color : '#F9F9F9',
                            color: goldColor === g.id ? '#000' : 'rgba(0,0,0,0.3)',
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            transition: 'all 0.4s ease', fontWeight: 900, fontSize: '10px'
                          }}
                        >
                           {g.label}
                        </button>
                      ))}
                   </div>
                </div>

                <div>
                   <span className="cyber-label" style={{ fontSize: '8px', opacity: 0.4 }}>PIERRE PRINCIPALE</span>
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '16px' }}>
                      {stones.map(s => {
                         const isSelected = stoneType === s.id;
                         return (
                           <button 
                             key={s.id} onClick={() => setStoneType(s.id)}
                             style={{ 
                               padding: '16px 4px', borderRadius: '24px', border: 'none',
                               background: isSelected ? (s.id === 'Sans Pierre' ? '#000' : s.color) : '#F9F9F9',
                               color: isSelected ? (['Diamants', 'Sans Pierre'].includes(s.id) ? '#fff' : '#000') : 'rgba(0,0,0,0.3)',
                               fontWeight: 900, fontSize: '9px', transition: 'all 0.4s ease'
                             }}
                           >
                              {s.label}
                           </button>
                         );
                      })}
                   </div>
                </div>
             </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
             <p className="cyber-label" style={{ marginBottom: '24px' }}>DIMENSIONS & PERSONNALISATION</p>
             <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div style={{ padding: '32px 24px', borderRadius: '32px', background: '#F9F9F9' }}>
                   <span className="cyber-label" style={{ fontSize: '7px', opacity: 0.4 }}>CATÉGORIE</span>
                   <select 
                     value={category} onChange={(e) => { const t = e.target.value as any; setCategory(t); setSize(sizeOptions[t as keyof typeof sizeOptions][0]); }}
                     style={{ width: '100%', background: 'transparent', border: 'none', fontSize: '16px', fontWeight: 900, marginTop: '12px' }}
                   >
                     <option value="Ring">Bague</option>
                     <option value="Bracelet">Bracelet</option>
                     <option value="Necklace">Collier</option>
                   </select>
                </div>
                <div style={{ padding: '32px 24px', borderRadius: '32px', background: '#F9F9F9' }}>
                   <span className="cyber-label" style={{ fontSize: '7px', opacity: 0.4 }}>TAILLE</span>
                   <select 
                     value={size} onChange={(e) => setSize(e.target.value)}
                     style={{ width: '100%', background: 'transparent', border: 'none', fontSize: '16px', fontWeight: 900, marginTop: '12px', color: 'var(--accent)' }}
                   >
                     {sizeOptions[category as keyof typeof sizeOptions].map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>
             </div>
             
             <div style={{ marginTop: '12px', padding: '32px', borderRadius: '32px', background: '#000', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="cyber-label" style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)' }}>GRAVURE CRÉATION</span>
                <input 
                  type="text" value={engraving} onChange={(e) => setEngraving(e.target.value)} 
                  placeholder="Texte..."
                  style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 900, textAlign: 'right', outline: 'none' }}
                />
             </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
             <p className="cyber-label" style={{ marginBottom: '24px' }}>RÉFÉRENCE VISUELLE / 参考图片</p>
             <label style={{ display: 'block', width: '100%', minHeight: '400px', borderRadius: '48px', background: '#F9F9F9', overflow: 'hidden', position: 'relative', cursor: 'pointer' }}>
                {file ? (
                  <SmartImage src={URL.createObjectURL(file)} style={{ width: '100%', height: '400px' }} />
                ) : (
                  <div style={{ height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.1)', gap: '20px' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '40px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                      <UploadCloud size={32} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.1em' }}>SÉLECTIONNER IMAGE</span>
                  </div>
                )}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => e.target.files && setFile(e.target.files[0])} />
             </label>
          </motion.div>
        </div>
      </div>

        </div>
      </div>

      {/* VISION NAVIGATION PILL */}
      <VisionPill width="calc(100% - 64px)">
        <button className="vision-action accent" disabled={loading || !title} onClick={handleSubmit} style={{ width: '100%' }}>
           {loading ? 'CREATING...' : 'CONFIRMER LA CRÉATION'}
           {!loading && <ChevronRight size={18} strokeWidth={3} />}
        </button>
      </VisionPill>

    </div>
  );
}
