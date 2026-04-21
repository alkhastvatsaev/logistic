"use client";

import { useEffect, useState } from "react";
import { rtdb, rtdbRef, get, set, push, update } from "@/lib/firebase";
import { motion } from "framer-motion";
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
      alert("Error submitting. Please try again.");
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
      alert("Error updating tracking");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="layout py-20 text-center">Loading portal...</div>;
  if (!request) return <div className="layout py-20 text-center">Invalid or expired link.</div>;

  // SCENARIO 3: SHIPPED
  if (shippingSubmitted) {
    return (
      <div className="layout">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-20 text-center flex flex-col items-center">
          <PackageCheck size={64} className="text-green-500 mb-6" />
          <h1 className="title mb-2">Shipment Confirmed</h1>
          <p className="subtitle">The buyer has been notified of the FedEx tracking number.</p>
          <div style={{ marginTop: '24px', padding: '12px 24px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', borderRadius: '8px', fontWeight: 600}}>
            {request.trackingNumber || trackingNumber}
          </div>
        </motion.div>
      </div>
    );
  }

  // SCENARIO 2: IN PRODUCTION -> Ask for tracking
  if (request.status === "IN_PRODUCTION" && request.acceptedTokenId === params.token) {
    return (
      <div className="layout">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '0px 0 48px 0', maxWidth: '100%', margin: '0 auto' }}>
          <header style={{ padding: '32px 0 16px 0', border: 'none', marginBottom: 0, textAlign: 'center' }}>
            <Truck size={48} color="var(--foreground)" style={{ margin: '0 auto 16px auto' }} />
            <h1 className="title" style={{ fontSize: '1.5rem' }}>Production Phase Active</h1>
            <p className="subtitle mt-2">When production is finished and packaged, please provide the FedEx Tracking Number below.</p>
          </header>

          <form onSubmit={handleShippingSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>FedEx Tracking Number</label>
              <input 
                required 
                type="text" 
                value={trackingNumber} 
                onChange={e => setTrackingNumber(e.target.value)} 
                placeholder="e.g. 123456789012" 
                style={{ fontSize: '1.1rem', letterSpacing: '1px' }}
              />
            </div>
            <button type="submit" className="btn" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}>
              Confirm Shipment
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // SCENARIO 1.5: QUOTE ALREADY SUBMITTED & NOT ACCEPTED YET
  if (submitted) {
    return (
      <div className="layout">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-20 text-center flex flex-col items-center">
          <CheckCircle size={64} className="text-green-500 mb-6" />
          <h1 className="title mb-2">Quote Submitted</h1>
          <p className="subtitle">Thank you. The buyer will review your price and contact you shortly.</p>
          <p className="text-sm text-faded mt-4 max-w-sm">If your quote is accepted, you will be able to return to this exact same link to provide the FedEx tracking number later.</p>
        </motion.div>
      </div>
    );
  }

  // SCENARIO 1: FIRST TIME QUOTE FORM
  return (
    <div className="layout">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '0 0 48px 0' }}>
        <header style={{ paddingBottom: '32px', border: 'none', textAlign: 'center', marginBottom: 0 }}>
          <h1 className="title" style={{ fontSize: '1.6rem', marginBottom: '8px' }}>{request.title}</h1>
          <p className="subtitle" style={{ fontSize: '0.9rem' }}>Factory Quote Submission</p>
        </header>

        {request.imageUrl && (
          <div style={{ marginBottom: '24px' }}>
            <img 
              src={request.imageUrl} 
              alt="Reference" 
              style={{ width: '100%', borderRadius: 'var(--radius)', aspectRatio: '1/1', objectFit: 'cover' }} 
            />
          </div>
        )}

        <form onSubmit={handleSubmitQuote}>
          <div className="list-group">
            <div className="row-item">
              <label>Supplier Name</label>
              <input required type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Factory A" />
            </div>
          </div>

          <div className="list-group">
            <div className="row-item">
              <label>Jewelry Price (¥)</label>
              <input required type="number" step="0.01" value={priceRMB} onChange={e => setPriceRMB(e.target.value)} placeholder="0.00" />
            </div>
            <div className="row-item">
              <label>FedEx Cost (¥)</label>
              <input required type="number" step="0.01" value={shippingCostRMB} onChange={e => setShippingCostRMB(e.target.value)} placeholder="0.00" />
            </div>
            <div className="row-item">
              <label>Lead Time (Days)</label>
              <input required type="number" value={productionTimeDays} onChange={e => setProductionTimeDays(e.target.value)} placeholder="7" />
            </div>
          </div>

          <div className="list-group">
            <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)' }}>
              <div className="row-item" style={{ flex: 1, borderBottom: 'none', borderRight: '0.5px solid var(--border)' }}>
                <label>Total Weight (g)</label>
                <input required type="number" step="0.01" value={totalWeight} onChange={e => setTotalWeight(e.target.value)} placeholder="0.00" />
              </div>
              <div className="row-item" style={{ flex: 1, borderBottom: 'none' }}>
                <label>Gold Weight (g)</label>
                <input required type="number" step="0.01" value={goldWeight} onChange={e => setGoldWeight(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)' }}>
              <div className="row-item" style={{ flex: 1, borderBottom: 'none', borderRight: '0.5px solid var(--border)' }}>
                <label>Diamond Count</label>
                <input required type="number" value={diamondCount} onChange={e => setDiamondCount(e.target.value)} placeholder="0" />
              </div>
              <div className="row-item" style={{ flex: 1, borderBottom: 'none' }}>
                <label>Total Carat (ct)</label>
                <input required type="number" step="0.01" value={totalCarat} onChange={e => setTotalCarat(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="row-item">
              <label>Diamond Type</label>
              <select value={diamondType} onChange={e => setDiamondType(e.target.value)}>
                <option value="Lab Grown">Lab Grown (CVD/HPHT)</option>
                <option value="Natural">Natural / Mined</option>
                <option value="Moissanite">Moissanite</option>
                <option value="None">No Diamonds</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn" style={{ width: '100%', marginTop: '8px' }}>
            Submit Quote
          </button>
        </form>
      </motion.div>
    </div>
  );
;
}
