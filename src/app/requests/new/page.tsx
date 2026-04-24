"use client";

import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, UploadCloud, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { rtdb, rtdbRef, push, set } from "@/lib/firebase";
import { SmartImage } from "@/components/ui/SmartImage";
import { VisionPill } from "@/components/ui/VisionPill";

export default function NewRequest() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("Cartier");
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<"Ring" | "Bracelet" | "Necklace">("Ring");
  const [size, setSize] = useState("52");
  const [goldColor, setGoldColor] = useState("Or Jaune");
  const [stoneType, setStoneType] = useState("Sans Pierre");
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
        category: category === 'Ring' ? 'Bague' : (category === 'Bracelet' ? 'Bracelet' : 'Collier'),
        imageUrl, 
        status: "WAITING_FOR_QUOTE", 
        createdAt: Date.now(), 
        updatedAt: Date.now() 
      });

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '56px' }}>
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
             <p className="cyber-label" style={{ marginBottom: '16px' }}>TITLE / 名称</p>
             <input 
               autoFocus type="text" placeholder="Design Name..." value={title}
               onChange={(e) => setTitle(e.target.value)}
               style={{ width: '100%', fontSize: '32px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.04em', background: 'transparent' }}
             />
             <div style={{ height: '3px', background: 'var(--accent)', width: title ? '100%' : '40px', transition: 'width 0.4s ease', marginTop: '12px' }} />
          </motion.div>

          {/* BRAND SELECTION */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
             <p className="cyber-label" style={{ marginBottom: '16px' }}>MAISON / 品牌</p>
             <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }} className="hide-scrollbar">
                {["Cartier", "Van Cleef", "Bulgari", "Autre"].map(b => (
                   <button 
                     key={b} onClick={() => setBrand(b)}
                     style={{ 
                       padding: '14px 24px', borderRadius: '24px', border: 'none',
                       background: brand === b ? '#000' : '#F9F9F9',
                       color: brand === b ? '#fff' : '#000',
                       fontSize: '12px', fontWeight: 900, cursor: 'pointer',
                       transition: 'all 0.3s ease', flexShrink: 0
                     }}
                   >
                     {b.toUpperCase()}
                   </button>
                ))}
             </div>
          </motion.div>

          {/* GOLD COLOR SELECTION */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
             <p className="cyber-label" style={{ marginBottom: '16px' }}>METALS / 金属颜色</p>
             <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { id: "Or Jaune", label: "JAUNE", color: "#F5D061" },
                  { id: "Or Blanc", label: "BLANC", color: "#E5E5E5" },
                  { id: "Or Rose", label: "ROSE", color: "#E7A78B" }
                ].map(g => (
                   <button 
                     key={g.id} onClick={() => setGoldColor(g.id)}
                     style={{ 
                       flex: 1, padding: '18px 8px', borderRadius: '24px', border: 'none',
                       background: goldColor === g.id ? g.color : '#F9F9F9',
                       color: goldColor === g.id ? '#000' : 'rgba(0,0,0,0.4)',
                       display: 'flex', justifyContent: 'center', alignItems: 'center',
                       boxShadow: goldColor === g.id ? `0 10px 25px ${g.color}66` : 'none',
                       transition: 'all 0.3s ease'
                     }}
                   >
                      <span style={{ fontSize: '10px', fontWeight: 900 }}>{g.label}</span>
                   </button>
                ))}
             </div>
          </motion.div>

          {/* STONES SELECTION */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
             <p className="cyber-label" style={{ marginBottom: '16px' }}>PIERRES / 宝石类型</p>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {stones.map(s => (
                   <button 
                     key={s.id} onClick={() => setStoneType(s.id)}
                     style={{ 
                       padding: '14px 4px', borderRadius: '20px', border: 'none',
                       background: stoneType === s.id ? s.color : '#F9F9F9',
                       color: stoneType === s.id ? (['Diamants', 'Perles', 'Sans Pierre'].includes(s.id) ? '#000' : '#fff') : 'rgba(0,0,0,0.4)',
                       display: 'flex', justifyContent: 'center', alignItems: 'center',
                       boxShadow: stoneType === s.id ? `0 8px 15px ${s.color}44` : 'none',
                       transition: 'all 0.3s ease'
                     }}
                   >
                      <span style={{ fontSize: '9px', fontWeight: 900 }}>{s.label}</span>
                   </button>
                ))}
             </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
             <p className="cyber-label" style={{ marginBottom: '20px', paddingLeft: '8px' }}>SPECIFICATIONS / 规格</p>
             <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div style={{ padding: '24px', borderRadius: '28px', background: '#F9F9F9', border: '1px solid rgba(0,0,0,0.02)' }}>
                   <span className="cyber-label" style={{ fontSize: '7px', opacity: 0.5 }}>CATEGORY</span>
                   <select 
                     value={category} 
                     onChange={(e) => { const t = e.target.value as any; setCategory(t); setSize(sizeOptions[t as keyof typeof sizeOptions][0]); }}
                     style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '15px', fontWeight: 900, marginTop: '10px' }}
                   >
                     <option value="Ring">Bague</option>
                     <option value="Bracelet">Bracelet</option>
                     <option value="Necklace">Collier</option>
                   </select>
                </div>
                <div style={{ padding: '24px', borderRadius: '28px', background: '#F9F9F9', border: '1px solid rgba(0,0,0,0.02)' }}>
                   <span className="cyber-label" style={{ fontSize: '7px', opacity: 0.5 }}>SIZE / 规格</span>
                   <select 
                     value={size} onChange={(e) => setSize(e.target.value)}
                     style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '15px', fontWeight: 900, marginTop: '10px', color: 'var(--accent)' }}
                   >
                     {sizeOptions[category as keyof typeof sizeOptions].map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>
             </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
             <p className="cyber-label" style={{ marginBottom: '20px' }}>VISUAL REFERENCE / 参考图片</p>
             <label style={{ display: 'block', width: '100%', minHeight: '300px', borderRadius: '32px', background: '#F9F9F9', overflow: 'hidden', position: 'relative', cursor: 'pointer', transition: 'all 0.4s ease' }}>
                {file ? (
                  <SmartImage src={URL.createObjectURL(file)} style={{ width: '100%', height: '300px' }} />
                ) : (
                  <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.1)', gap: '16px' }}>
                    <UploadCloud size={48} strokeWidth={1.5} />
                    <span style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em' }}>UPLOAD IMAGE</span>
                  </div>
                )}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => e.target.files && setFile(e.target.files[0])} />
             </label>
          </motion.div>

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
