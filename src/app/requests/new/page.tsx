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
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link href="/" className="btn btn-ghost mb-8" style={{ padding: "8px 16px" }}>
        <ArrowLeft size={16} />
        Back
      </Link>

      <header>
        <div>
          <h1 className="title">New Specification</h1>
          <p className="subtitle">Start a new quote request to send to suppliers.</p>
        </div>
      </header>

      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          <div className="list-group">
            <div className="row-item">
              <label>Jewelry Reference</label>
              <input 
                type="text" 
                placeholder="e.g. Bracelet Tennis Diamants 18k" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="row-item">
              <label>Jewelry Type</label>
              <select 
                value={category}
                onChange={(e) => {
                  const cat = e.target.value as any;
                  setCategory(cat);
                  setSize(sizeOptions[cat as keyof typeof sizeOptions][0]);
                }}
              >
                <option value="Ring">Ring (Bague)</option>
                <option value="Bracelet">Bracelet</option>
                <option value="Necklace">Necklace (Collier)</option>
              </select>
            </div>
            <div className="row-item">
              <label>Size / Dimensions</label>
              <select 
                value={size}
                onChange={(e) => setSize(e.target.value)}
              >
                {sizeOptions[category].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="list-group">
            <div className="row-item" style={{ padding: '0' }}>
              <label style={{ padding: '12px 16px 4px 16px' }}>Reference Photo</label>
              <label style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: file ? '12px' : '48px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}>
                {file ? (
                  <div style={{ width: '100%', textAlign: 'center' }}>
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt="Preview" 
                      style={{ 
                        width: '100%', 
                        maxHeight: '300px', 
                        objectFit: 'cover', 
                        borderRadius: '8px'
                      }} 
                    />
                    <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--faded)' }}>
                      Click to change photo
                    </div>
                  </div>
                ) : (
                  <>
                    <UploadCloud size={32} color="var(--accent)" style={{ marginBottom: '12px' }}/>
                    <span style={{ color: 'var(--accent)', fontWeight: 500 }}>
                      Add Photo
                    </span>
                  </>
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

          <button 
            type="submit" 
            className="btn" 
            disabled={loading || !title}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {loading ? "Processing..." : "Create Specification"}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
