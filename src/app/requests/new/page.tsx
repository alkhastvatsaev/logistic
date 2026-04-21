"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

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
      console.log("Starting submission for:", title);
      let imageUrl = "";
      
      if (file) {
        console.log("Uploading file...");
        try {
          // Upload photo to Firebase Storage with 15s timeout
          const storageRef = ref(storage, `requests/${Date.now()}_${file.name}`);
          const uploadPromise = uploadBytes(storageRef, file);
          const snapshot: any = await Promise.race([uploadPromise, timeout(15000)]);
          imageUrl = await getDownloadURL(snapshot.ref);
          console.log("File uploaded, URL:", imageUrl);
        } catch (storageErr: any) {
          console.error("STORAGE ERROR:", storageErr);
          let extraMsg = "";
          if (storageErr.message?.includes("Timeout")) {
            extraMsg = " (Connection timed out)";
          } else if (storageErr.code === "storage/unauthorized") {
            extraMsg = " -> Check Firebase Console: Enable Anonymous Auth and set Storage Rules to allow authenticated users.";
          }
          alert(`Firebase Storage Error: ${storageErr.message}${extraMsg}`);
          setLoading(false);
          return;
        }
      }

      // 1. Create a global request with 10s timeout
      console.log("Adding document to Firestore...");
      try {
        const addDocPromise = addDoc(collection(db, "requests"), {
          title,
          imageUrl,
          status: "WAITING_FOR_QUOTE",
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        const docRef: any = await Promise.race([addDocPromise, timeout(10000)]);
        console.log("Document added with ID:", docRef.id);
        router.push(`/requests/${docRef.id}`);
      } catch (dbErr: any) {
        console.error("DATABASE ERROR:", dbErr);
        alert(`Firestore Error: ${dbErr.message}`);
      }

    } catch (outerError: any) {
      console.error("CRITICAL ERROR during flow:", outerError);
      alert(`Critical Error: ${outerError.message}`);
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
              border: '1px dashed var(--faded)', 
              borderRadius: 'var(--radius)', 
              padding: '48px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: file ? 'rgba(255,255,255,0.05)' : 'transparent'
            }}>
              <UploadCloud size={32} color={file ? "var(--foreground)" : "var(--faded)"} style={{ marginBottom: '12px' }}/>
              <span style={{ color: file ? 'var(--foreground)' : 'var(--faded)' }}>
                {file ? file.name : "Click to upload an image"}
              </span>
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
