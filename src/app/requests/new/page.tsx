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
  const [loading, setLoading] = useState(false);

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

      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Jewelry Name / Reference
            </label>
            <input 
              type="text" 
              placeholder="e.g. 18k Rose Gold Diamond Tennis Bracelet" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Reference Photo
            </label>
            <label style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: file ? '1.5px solid var(--accent)' : '1px dashed var(--faded)', 
              borderRadius: 'var(--radius)', 
              padding: file ? '12px' : '48px',
              cursor: 'pointer',
              overflow: 'hidden',
              transition: 'all 0.2s ease',
              backgroundColor: 'rgba(255,255,255,0.02)',
              position: 'relative'
            }}>
              {file ? (
                <div style={{ width: '100%', textAlign: 'center' }}>
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt="Preview" 
                    style={{ 
                      width: '100%', 
                      height: 'auto', 
                      maxHeight: '300px', 
                      objectFit: 'cover', 
                      borderRadius: '8px',
                      display: 'block'
                    }} 
                  />
                  <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--faded)' }}>
                    {file.name} (Click to change)
                  </div>
                </div>
              ) : (
                <>
                  <UploadCloud size={32} color="var(--faded)" style={{ marginBottom: '12px' }}/>
                  <span style={{ color: 'var(--faded)' }}>
                    Click to upload a reference photo
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

          <button 
            type="submit" 
            className="btn" 
            disabled={loading || !title}
            style={{ width: '100%', marginTop: '16px' }}
          >
            {loading ? "Creating System Record..." : "Initialize Request"}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
