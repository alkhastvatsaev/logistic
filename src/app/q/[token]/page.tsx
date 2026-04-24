"use client";

import { useEffect, useState } from "react";
import { rtdb, rtdbRef, get, set, push, update } from "@/lib/firebase";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle, Truck, PackageCheck } from "lucide-react";

export default function SupplierPortal({ params }: { params: { token: string } }) {
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<any>(null);
  const [tokenData, setTokenData] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const [shippingSubmitted, setShippingSubmitted] = useState(false);

  // Form State
  const [supplierName, setSupplierName] = useState("");
  const [priceRMB, setPriceRMB] = useState("");
  const [totalWeight, setTotalWeight] = useState("");
  const [goldWeight, setGoldWeight] = useState("");
  const [diamondCount, setDiamondCount] = useState("");
  const [diamondType, setDiamondType] = useState("Lab Grown");
  const [totalCarat, setTotalCarat] = useState("");
  const [shippingCostRMB, setShippingCostRMB] = useState("");
  const [productionTimeDays, setProductionTimeDays] = useState("");

  // Tracking Form State
  const [trackingNumber, setTrackingNumber] = useState("");

  useEffect(() => {
    const fetchTokenAndRequest = async () => {
      try {
        const tokenSnap = await get(rtdbRef(rtdb, `shareTokens/${params.token}`));

        if (tokenSnap.exists()) {
          const tData = tokenSnap.val();
          setTokenData(tData);

          const reqSnap = await get(rtdbRef(rtdb, `requests/${tData.requestId}`));
          
          if (reqSnap.exists()) {
            const reqData = { id: reqSnap.key, ...reqSnap.val() } as any;
            setRequest(reqData);

            if (reqData.status === "SHIPPED" && reqData.acceptedTokenId === params.token) {
               setShippingSubmitted(true);
            }

            if (tData.used && reqData.status !== "IN_PRODUCTION") {
              setSubmitted(true);
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchTokenAndRequest();
  }, [params.token]);

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newQuoteRef = push(rtdbRef(rtdb, `quotes/${tokenData.requestId}`));
      await set(newQuoteRef, {
        shareTokenId: params.token,
        supplierName,
        priceRMB: Number(priceRMB),
        totalWeight: Number(totalWeight),
        goldWeight: Number(goldWeight),
        diamondCount: Number(diamondCount),
        diamondType,
        totalCarat: Number(totalCarat),
        shippingCostRMB: Number(shippingCostRMB),
        productionTimeDays: Number(productionTimeDays),
        createdAt: Date.now()
      });

      const updates: any = {};
      updates[`shareTokens/${params.token}/used`] = true;
      updates[`requests/${tokenData.requestId}/status`] = "QUOTED";
      
      await update(rtdbRef(rtdb), updates);
      setSubmitted(true);
    } catch (error) {
      toast.error("Error submitting. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber) return;
    setLoading(true);
    try {
      const updates: any = {};
      updates[`requests/${tokenData.requestId}/status`] = "SHIPPED";
      updates[`requests/${tokenData.requestId}/trackingNumber`] = trackingNumber;
      updates[`requests/${tokenData.requestId}/shippedAt`] = Date.now();
      
      await update(rtdbRef(rtdb), updates);
      setShippingSubmitted(true);
    } catch (error) {
      toast.error("Error updating tracking");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="layout py-20 text-center">Loading portal...</div>;
  if (!request) return <div className="layout py-20 text-center">Invalid or expired link.</div>;

  // SCENARIO 3: SHIPPED
  if (shippingSubmitted) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <CheckCircle size={64} className="text-green-500" style={{ margin: '0 auto 24px auto' }} />
          <h1 className="title" style={{ fontSize: '24px', marginBottom: '8px' }}>Shipment Confirmed</h1>
          <p className="subtitle">FedEx Tracking: {request.trackingNumber || trackingNumber}</p>
        </motion.div>
      </div>
    );
  }

  // SCENARIO 2: IN PRODUCTION -> Ask for tracking
  if (request.status === "IN_PRODUCTION" && request.acceptedTokenId === params.token) {
    return (
      <div style={{ padding: '40px 20px' }}>
        <header style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Truck size={48} color="var(--accent)" style={{ margin: '0 auto 16px auto' }} />
          <h1 className="title" style={{ fontSize: '24px' }}>Production Active</h1>
          <p className="subtitle">Enter FedEx tracking number once shipped</p>
        </header>

        <form onSubmit={handleShippingSubmit}>
          <div className="list-group">
            <div className="row-item">
              <label>FedEx Tracking Number</label>
              <input 
                required 
                type="text" 
                value={trackingNumber} 
                onChange={e => setTrackingNumber(e.target.value)} 
                placeholder="1234 5678 9012" 
                style={{ fontSize: '24px', fontWeight: 600, textAlign: 'center', letterSpacing: '1px' }}
              />
            </div>
          </div>
          <button type="submit" className="btn" style={{ width: '100%', padding: '18px' }}>
            Confirm Shipment
          </button>
        </form>
      </div>
    );
  }

  // SCENARIO 1.5: QUOTE ALREADY SUBMITTED
  if (submitted) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <CheckCircle size={64} style={{ color: 'var(--success)', margin: '0 auto 24px auto' }} />
          <h1 className="title" style={{ fontSize: '24px', marginBottom: '8px' }}>Quote Submitted</h1>
          <p className="subtitle">Waiting for buyer review</p>
        </motion.div>
      </div>
    );
  }

  // SCENARIO 1: FIRST TIME QUOTE FORM
  return (
    <div style={{ padding: '40px 0' }}>
      <header style={{ textAlign: 'center', marginBottom: '32px', padding: '0 20px' }}>
        <p style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--faded)', fontWeight: 600, letterSpacing: '1px' }}>MANUFACTURING REVIEW</p>
        <h1 className="title" style={{ fontSize: '28px', marginTop: '4px' }}>{request.title}</h1>
      </header>

      <div style={{ padding: '0 20px' }}>
        <div className="list-group" style={{ background: 'rgba(0, 122, 255, 0.05)', border: '1px solid rgba(0, 122, 255, 0.1)' }}>
          <div style={{ padding: '12px 16px 4px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--accent)' }}>SHIP TO DESTINATION (FRANCE)</div>
          <div className="row-item" style={{ border: 'none', background: 'transparent', paddingBottom: '16px' }}>
            <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--foreground)', fontWeight: 500 }}>
              <strong>SACHA BENSADOUN</strong><br />
              FedEx Express – Geispolsheim<br />
              4 Rue des Imprimeurs, 67118 Geispolsheim<br />
              France
            </p>
          </div>
        </div>

        {request.imageUrl && (
          <div style={{ marginBottom: '32px', borderRadius: '16px', overflow: 'hidden', background: '#fff', border: '0.5px solid var(--separator)' }}>
            <img 
              src={request.imageUrl} 
              alt="Reference" 
              style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain' }} 
            />
          </div>
        )}

        <form onSubmit={handleSubmitQuote}>
          <div className="list-group">
            <div className="row-item">
              <label>Factory Name</label>
              <input required type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Enter factory ID" />
            </div>
          </div>

          <div className="list-group">
            <div className="row-item">
              <label>Jewelry Price (RMB ¥)</label>
              <input required type="number" step="0.01" value={priceRMB} onChange={e => setPriceRMB(e.target.value)} placeholder="0.00" style={{ fontWeight: 600 }} />
            </div>
            <div className="row-item">
              <label>Shipping Cost (RMB ¥)</label>
              <input required type="number" step="0.01" value={shippingCostRMB} onChange={e => setShippingCostRMB(e.target.value)} placeholder="0.00" />
            </div>
            <div className="row-item">
              <label>Lead Time (Days)</label>
              <input required type="number" value={productionTimeDays} onChange={e => setProductionTimeDays(e.target.value)} placeholder="7" />
            </div>
          </div>

          <div className="list-group">
            <div style={{ display: 'flex' }}>
              <div className="row-item" style={{ flex: 1, borderRight: '0.5px solid var(--separator)' }}>
                <label>Total Weight (g)</label>
                <input required type="number" step="0.1" value={totalWeight} onChange={e => setTotalWeight(e.target.value)} placeholder="0.0" />
              </div>
              <div className="row-item" style={{ flex: 1 }}>
                <label>Gold Weight (g)</label>
                <input required type="number" step="0.1" value={goldWeight} onChange={e => setGoldWeight(e.target.value)} placeholder="0.0" />
              </div>
            </div>
            <div style={{ display: 'flex', borderTop: '0.5px solid var(--separator)' }}>
              <div className="row-item" style={{ flex: 1, borderRight: '0.5px solid var(--separator)' }}>
                <label>Diamond Count</label>
                <input required type="number" value={diamondCount} onChange={e => setDiamondCount(e.target.value)} placeholder="0" />
              </div>
              <div className="row-item" style={{ flex: 1 }}>
                <label>Total Carat (ct)</label>
                <input required type="number" step="0.01" value={totalCarat} onChange={e => setTotalCarat(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="row-item" style={{ borderTop: '0.5px solid var(--separator)' }}>
              <label>Diamond Quality</label>
              <select value={diamondType} onChange={e => setDiamondType(e.target.value)}>
                <option value="Lab Grown">Lab Grown (CVD/HPHT)</option>
                <option value="Natural">Natural / Mined</option>
                <option value="Moissanite">Moissanite</option>
                <option value="None">No Diamonds</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn" style={{ width: '100%', padding: '18px', fontSize: '18px', marginBottom: '40px' }}>
            Submit Performance Data
          </button>
        </form>
      </div>
    </div>
  );
}
