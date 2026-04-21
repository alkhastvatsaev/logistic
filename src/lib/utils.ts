export function calculateRemainingDays(deadlineMs: number): number {
  const remainingMs = deadlineMs - Date.now();
  return Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
}

// Convert mock RMB to EUR at a static 0.13 rate
export function convertRMBtoEUR(rmb: number, rate: number = 0.13): number {
  return rmb * rate;
}
