"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rtdb, rtdbRef, push, set } from "@/lib/firebase";

export default function NewRequest() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<"Ring" | "Bracelet" | "Necklace">("Ring");
  const [size, setSize] = useState("52");
  const [loading, setLoading] = useState(false);

  const sizeOptions = {
    Ring: Array.from({ length: 15 }, (_, i) => (49 + i).toString()),
    Bracelet: Array.from({ length: 9 }, (_, i) => (14 + i).toString() + " cm"),
    Necklace: ["38 cm", "40 cm", "42 cm", "45 cm", "50 cm", "55 cm", "60 cm", "70 cm", "80 cm"]
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    
    setLoading(true);
    const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout: Firebase is taking too long to respond. Check your connection or Firebase rules.")), ms));

    try {
      console.log("Starting Realtime DB submission...");
      let imageUrl = "";
      
      if (file) {
        // Convert to Base64
        console.log("📸 Converting image to Base64...");
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
        imageUrl = await base64Promise;
      }

      // Save to Realtime Database
      const newRef = push(rtdbRef(rtdb, "requests"));
      const data = {
        id: newRef.key,
        title,
        size,
        imageUrl,
        status: "WAITING_FOR_QUOTE",
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      await set(newRef, data);
      console.log("✅ Saved to Realtime DB with ID:", newRef.key);
      router.push(`/requests/${newRef.key}`);

    } catch (outerError: any) {
      console.error("CRITICAL ERROR:", outerError);
      alert(`Error: ${outerError.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="layout" style={{ backgroundColor: 'var(--background)', padding: '24px 24px 140px 24px' }}>
      
      {/* HEADER 2030 */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
         <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--faded)', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
           <ArrowLeft size={24} /> 
           <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em' }}>CANCEL</span>
         </button>
      </header>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        
        {/* BIG TITLE INPUT */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', marginBottom: '8px', display: 'block' }}>PROJECT IDENTITY</label>
          <input 
            className="ghost-input"
            required
            type="text" 
            placeholder="NAME THE ART..." 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        {/* DIMENSIONS (Glass Widget) */}
        <div className="widget-glass" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', border: 'none' }}>
           <div>
             <label style={{ fontSize: '11px', color: 'var(--faded)', letterSpacing: '0.1em', marginBottom: '8px', display: 'block' }}>CATEGORY</label>
             <select 
               value={category}
               onChange={(e) => {
                 const cat = e.target.value as any;
                 setCategory(cat);
                 setSize(sizeOptions[cat as keyof typeof sizeOptions][0]);
               }}
               style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '24px', fontWeight: 800, width: '100%', padding: 0 }}
             >
               <option value="Ring" style={{ color: '#000' }}>Ring</option>
               <option value="Bracelet" style={{ color: '#000' }}>Bracelet</option>
               <option value="Necklace" style={{ color: '#000' }}>Necklace</option>
             </select>
           </div>
           
           <div>
             <label style={{ fontSize: '11px', color: 'var(--faded)', letterSpacing: '0.1em', marginBottom: '8px', display: 'block' }}>SPEC SIZING</label>
             <select 
               value={size}
               onChange={(e) => setSize(e.target.value)}
               style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '24px', fontWeight: 800, width: '100%', padding: 0 }}
             >
               {sizeOptions[category as keyof typeof sizeOptions].map(s => (
                 <option key={s} value={s} style={{ color: '#000' }}>{s}</option>
               ))}
             </select>
           </div>
        </div>

        {/* MASSIVE UPLOAD ZONE */}
        <div>
           <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', marginBottom: '16px', display: 'block' }}>BLUEPRINT UPLOAD</label>
           <label style={{ 
             display: 'block', 
             width: '100%', 
             height: file ? '400px' : '200px', 
             borderRadius: '32px', 
             background: 'var(--secondary-bg)',
             border: file ? 'none' : '1px dashed var(--separator)',
             overflow: 'hidden',
             position: 'relative',
             cursor: 'pointer',
             transition: 'all 0.3s ease'
           }}>
             {file ? (
               <>
                 <img src={URL.createObjectURL(file)} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                 <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s ease' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
                    <span style={{ color: '#fff', fontWeight: 700, letterSpacing: '0.1em' }}>TAP TO REPLACE</span>
                 </div>
               </>
             ) : (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--faded)' }}>
                 <UploadCloud size={48} strokeWidth={1} style={{ marginBottom: '16px' }} />
                 <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.1em' }}>INSERT REFERENCE IMAGE</span>
               </div>
             )}
             <input type="file" accept="image/*" onChange={(e) => { if (e.target.files && e.target.files[0]) setFile(e.target.files[0]); }} style={{ display: 'none' }} />
           </label>
        </div>

      </form>

      {/* DYNAMIC ISLAND : Submit Action */}
      <div className="floating-pill-container" style={{ bottom: '32px' }}>
        <div style={{ width: '100%' }}>
          <button 
             className="btn-cyber accent"
             onClick={handleSubmit} 
             disabled={loading || !title} 
             style={{ height: '64px', borderRadius: '32px', fontSize: '18px', boxShadow: '0 20px 40px rgba(224, 255, 0, 0.2)' }}
          >
             {loading ? 'INITIALIZING MATRIX...' : 'CONFIRM PROTOCOL'}
          </button>
        </div>
      </div>

    </div>
  );
}
