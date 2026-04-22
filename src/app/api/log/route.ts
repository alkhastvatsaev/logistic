import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Add metadata for AI context
    const logEntry = {
      timestamp: new Date().toISOString(),
      source: 'logistics_pwa_v2030',
      payload: data
    };

    const filePath = path.join(process.cwd(), 'data', 'training_set.jsonl');
    
    // Append the entry as a single line (JSONL format)
    fs.appendFileSync(filePath, JSON.stringify(logEntry) + '\n');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Logging Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
