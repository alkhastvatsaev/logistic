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
    <div style={{ padding: '20px 0' }}>
      <header style={{ marginBottom: '32px', padding: '0 4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
           <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '17px', padding: 0 }}>
             Cancel
           </button>
           <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--foreground)' }}>New Order</h2>
           <button 
             onClick={handleSubmit} 
             disabled={loading || !title} 
             style={{ background: 'transparent', border: 'none', color: title ? 'var(--accent)' : 'var(--faded)', fontSize: '17px', fontWeight: 600, padding: 0 }}
           >
             {loading ? '...' : 'Done'}
           </button>
        </div>
      </header>

      <form onSubmit={handleSubmit} style={{ maxWidth: '100%' }}>
        <div className="list-group">
          <div className="row-item">
            <label>Name</label>
            <input 
              required
              type="text" 
              placeholder="Clash Ring, etc." 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="list-group">
          <div className="row-item">
            <label>Category</label>
            <select 
              value={category}
              onChange={(e) => {
                const cat = e.target.value as any;
                setCategory(cat);
                setSize(sizeOptions[cat as keyof typeof sizeOptions][0]);
              }}
            >
              <option value="Ring">Ring</option>
              <option value="Bracelet">Bracelet</option>
              <option value="Necklace">Necklace</option>
            </select>
          </div>
          <div className="row-item">
            <label>Size</label>
            <select 
              value={size}
              onChange={(e) => setSize(e.target.value)}
            >
              {sizeOptions[category as keyof typeof sizeOptions].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="list-group">
          <div className="row-item" style={{ padding: 0 }}>
            <label style={{ padding: '12px 16px 4px 16px' }}>Photo Evidence</label>
            <label style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: file ? '12px' : '32px',
              cursor: 'pointer',
              background: 'var(--secondary-bg)',
            }}>
              {file ? (
                <div style={{ width: '100%', textAlign: 'center' }}>
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt="Preview" 
                    style={{ 
                      width: '100%', 
                      maxHeight: '200px', 
                      objectFit: 'contain', 
                      borderRadius: '8px'
                    }} 
                  />
                  <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--accent)' }}>
                    Tap to change
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--accent)', fontSize: '17px', fontWeight: 500 }}>
                  Add Reference Photo
                </div>
              )}
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFile(e.target.files[0]);
                  }
                }}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        <p style={{ margin: '32px 0', fontSize: '13px', color: 'var(--faded)', textAlign: 'center', padding: '0 20px' }}>
          This data will be synchronized with our supplier matrix for immediate manufacturing review.
        </p>
      </form>
    </div>
  );
}
