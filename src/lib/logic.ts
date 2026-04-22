/**
 * Logic constants and pure functions for financial and logistical calculations.
 * Extracted for testability and consistency.
 */

export const EUR_RMB_RATE_DEFAULT = 0.135;
export const SHIPPING_DAYS_TO_FRANCE = 7;

/**
 * Fetches the live exchange rate from CNY to EUR.
 * Includes a safety buffer for banking and transfer fees.
 */
export async function fetchLiveRate(): Promise<number> {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=CNY&to=EUR');
    const data = await res.json();
    const marketRate = data.rates.EUR;
    // Add 3.5% buffer for Wise/Bank fees and volatility
    return parseFloat((marketRate * 1.035).toFixed(4));
  } catch (e) {
    console.error("FX API Error, using safety default", e);
    return EUR_RMB_RATE_DEFAULT;
  }
}

export interface FinancialTotals {
  itemCostEUR: number;
  shippingEUR: number;
  costEUR: number;
  sPrice: number;
  profit: number;
  paid: number;
  balance: number;
  adamPart: number;
  mirzaPart: number;
  rateUsed: number;
}

/**
 * Calculates the financial summary of a project.
 */
export function calculateFinancialTotals(
  acceptedQuote: { priceRMB: number; shippingCostRMB: number } | undefined,
  sellingPriceStr: string,
  payments: { amount: string | number }[],
  customRate?: number
): FinancialTotals | null {
  if (!acceptedQuote) return null;

  // We use a predefined rate if no custom rate is provided (Market + Safety Buffer)
  // Current average is ~0.128, using 0.135 to cover fees & volatility
  const rate = customRate || 0.135; 

  const itemCostRMB = Number(acceptedQuote.priceRMB) || 0;
  const shippingRMB = Number(acceptedQuote.shippingCostRMB) || 0;
  
  const itemCostEUR = itemCostRMB * rate;
  const shippingEUR = shippingRMB * rate;
  const costEUR = itemCostEUR + shippingEUR;
  
  const sPrice = parseFloat(sellingPriceStr) || 0;
  const profit = sPrice - costEUR;
  const paid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const balance = sPrice - paid;

  const adamPart = profit / 2;
  const mirzaPart = profit / 2;

  return { itemCostEUR, shippingEUR, costEUR, sPrice, profit, paid, balance, adamPart, mirzaPart, rateUsed: rate };
}

/**
 * Calculates production and delivery deadlines based on production time.
 */
export function calculateDeliveryDates(productionTimeDays: number, startDate: number = Date.now()) {
  const prodDays = Number(productionTimeDays) || 7;
  const totalDays = prodDays + SHIPPING_DAYS_TO_FRANCE;
  
  const productionDeadline = startDate + (prodDays * 24 * 60 * 60 * 1000);
  const deliveryEstimation = startDate + (totalDays * 24 * 60 * 60 * 1000);

  return { productionDeadline, deliveryEstimation };
}

/**
 * Returns a human-readable relative time string.
 */
export function getRelativeTime(timestamp: number, now: number = Date.now()) {
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Aujourd'hui";
  return `Il y a ${days}j`;
}
