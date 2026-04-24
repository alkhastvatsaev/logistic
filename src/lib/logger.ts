/**
 * Telemetric Logging System for LOGIS.
 * Keeps a persistent trace of every business action.
 */

export type LogType = 'WORKFLOW' | 'FINANCE' | 'SUPPLIER' | 'SYSTEM' | 'SECURITY';

export async function logEvent(data: {
  type: LogType;
  action: string;
  requestId?: string;
  details?: any;
}) {
  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.error("Critical: Telemetry Failed", e);
  }
}
