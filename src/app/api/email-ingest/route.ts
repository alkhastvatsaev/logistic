import { NextResponse } from 'next/server';
import { rtdb, rtdbRef, update, get } from '@/lib/firebase';

export async function POST(req: Request) {
  try {
    const ingestSecret = process.env.EMAIL_INGEST_SECRET;
    if (!ingestSecret) {
      return NextResponse.json({ error: "Email ingest is not configured" }, { status: 503 });
    }

    if (req.headers.get("authorization") !== `Bearer ${ingestSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const body = data.plain || data.html || "";

    if (typeof body !== "string" || body.length > 250_000) {
      return NextResponse.json({ error: "Invalid email body" }, { status: 400 });
    }

    // 1. Extract Tracking Number (FedEx format)
    // Matches 12 or 15 digit numbers common for FedEx
    const trackingMatch = body.match(/\b\d{12,15}\b/);
    if (!trackingMatch) {
      return NextResponse.json({ error: "No tracking number found in email body" }, { status: 400 });
    }
    const trackingNumber = trackingMatch[0];

    // 2. Parse basic info (Location / Event)
    // Looking for pattern: "Activity/Location" then lines
    let lastLocation = "Hub FedEx";
    let lastEvent = "Mise à jour via Email";
    
    if (body.includes("HONG KONG")) lastLocation = "HONG KONG, HK";
    if (body.includes("Label created")) lastEvent = "Label created";
    if (body.includes("Shipment information sent")) lastEvent = "Shipment information sent";
    if (body.includes("In transit")) lastEvent = "In transit";
    if (body.includes("International Priority")) lastEvent = "Direct Flight Hub";

    // 3. Find the request in RTDB
    const requestsRef = rtdbRef(rtdb, 'requests');
    const snapshot = await get(requestsRef);
    const requests = snapshot.val();
    
    let targetRequestId = null;
    if (requests) {
      for (const id in requests) {
        if (requests[id].trackingNumber === trackingNumber) {
          targetRequestId = id;
          break;
        }
      }
    }

    if (!targetRequestId) {
      return NextResponse.json({ error: `Request with tracking ${trackingNumber} not found` }, { status: 404 });
    }

    // 4. Update the request
    await update(rtdbRef(rtdb, `requests/${targetRequestId}`), {
      trackingStatus: "EN ROUTE",
      lastLocation,
      lastEvent,
      lastUpdateDate: new Date().toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      lastSyncAt: Date.now()
    });

    return NextResponse.json({ success: true, trackingNumber, requestId: targetRequestId });
  } catch (error: any) {
    console.error("Email Ingest Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
