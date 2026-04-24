import { NextResponse } from 'next/server';
import { rtdb, rtdbRef, push, set } from '@/lib/firebase';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    const logEntry = {
      timestamp: Date.now(),
      iso: new Date().toISOString(),
      type: data.type || 'SYSTEM',
      action: data.action || 'GENERIC_ACTION',
      requestId: data.requestId || null,
      user: data.user || 'ADMIN',
      details: data.details || {},
    };

    const newLogRef = push(rtdbRef(rtdb, 'logs'));
    await set(newLogRef, logEntry);

    return NextResponse.json({ success: true, id: newLogRef.key });
  } catch (error: any) {
    console.error('Telemetric Logging Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
