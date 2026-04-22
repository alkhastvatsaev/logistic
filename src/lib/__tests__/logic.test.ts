import { describe, it, expect } from 'vitest';
import { calculateFinancialTotals, calculateDeliveryDates, EUR_RMB_RATE, SHIPPING_DAYS_TO_FRANCE, getRelativeTime } from '../logic';

describe('Logic Utilities', () => {
  
  describe('calculateFinancialTotals', () => {
    it('should return null if no quote is provided', () => {
      const result = calculateFinancialTotals(undefined, '1000', []);
      expect(result).toBeNull();
    });

    it('should calculate correct totals for valid inputs', () => {
      const quote = { priceRMB: 5000, shippingCostRMB: 200 };
      const sellingPrice = '1500';
      const payments = [{ amount: 500 }, { amount: '300' }];
      
      const result = calculateFinancialTotals(quote, sellingPrice, payments);
      
      const expectedCostEUR = (5000 + 200) * EUR_RMB_RATE; // 5200 * 0.13 = 676
      const expectedProfit = 1500 - expectedCostEUR; // 1500 - 676 = 824
      const expectedPaid = 500 + 300; // 800
      const expectedBalance = 1500 - 800; // 700

      expect(result?.costEUR).toBeCloseTo(expectedCostEUR);
      expect(result?.profit).toBeCloseTo(expectedProfit);
      expect(result?.paid).toBe(expectedPaid);
      expect(result?.balance).toBe(expectedBalance);
    });

    it('should handle empty payments and zero price', () => {
      const quote = { priceRMB: 1000, shippingCostRMB: 0 };
      const result = calculateFinancialTotals(quote, '0', []);
      expect(result?.paid).toBe(0);
      expect(result?.profit).toBeLessThan(0);
    });
  });

  describe('calculateDeliveryDates', () => {
    it('should calculate deadlines correctly', () => {
      const start = Date.now();
      const prodDays = 10;
      const { productionDeadline, deliveryEstimation } = calculateDeliveryDates(prodDays, start);
      
      const oneDayMs = 24 * 60 * 60 * 1000;
      expect(productionDeadline).toBe(start + (10 * oneDayMs));
      expect(deliveryEstimation).toBe(start + ((10 + SHIPPING_DAYS_TO_FRANCE) * oneDayMs));
    });
  });

  describe('getRelativeTime', () => {
    it('should return "Aujourd\'hui" for current time', () => {
      const now = Date.now();
      expect(getRelativeTime(now, now)).toBe("Aujourd'hui");
    });

    it('should return correct days for past dates', () => {
      const now = Date.now();
      const threeDaysAgo = now - (3 * 24 * 60 * 60 * 1000);
      expect(getRelativeTime(threeDaysAgo, now)).toBe("Il y a 3j");
    });
  });
});
