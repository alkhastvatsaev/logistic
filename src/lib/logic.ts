/**
 * Logic constants and pure functions for financial and logistical calculations.
 * Extracted for testability and consistency.
 */

export const EUR_RMB_RATE = 0.13;
export const SHIPPING_DAYS_TO_FRANCE = 7;

export interface FinancialTotals {
  costEUR: number;
  sPrice: number;
  profit: number;
  paid: number;
  balance: number;
}

/**
 * Calculates the financial summary of a project.
 */
export function calculateFinancialTotals(
  acceptedQuote: { priceRMB: number; shippingCostRMB: number } | undefined,
  sellingPriceStr: string,
  payments: { amount: string | number }[]
): FinancialTotals | null {
  if (!acceptedQuote) return null;

  const costRMB = (Number(acceptedQuote.priceRMB) || 0) + (Number(acceptedQuote.shippingCostRMB) || 0);
  const costEUR = costRMB * EUR_RMB_RATE;
  const sPrice = parseFloat(sellingPriceStr) || 0;
  const profit = sPrice - costEUR;
  const paid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const balance = sPrice - paid;

  return { costEUR, sPrice, profit, paid, balance };
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
