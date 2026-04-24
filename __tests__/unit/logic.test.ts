import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateFinancialTotals, calculateDeliveryDates, getRelativeTime, EUR_RMB_RATE_DEFAULT } from '@/lib/logic';

describe('Financial & Logistical Logic', () => {
  
  describe('calculateFinancialTotals', () => {
    const mockQuote = { priceRMB: 1000, shippingCostRMB: 100 };
    const payments = [{ amount: 50 }];

    it('returns null if no quote is provided', () => {
      expect(calculateFinancialTotals(undefined, "200", [])).toBeNull();
    });

    it('calculates totals correctly with default rate', () => {
      const totals = calculateFinancialTotals(mockQuote, "300", payments);
      expect(totals).not.toBeNull();
      if (!totals) return;

      // Rate = 0.135
      // itemCostEUR = 1000 * 0.135 = 135
      // shippingEUR = 100 * 0.135 = 13.5
      // costEUR = 148.5
      // profit = 300 - 148.5 = 151.5
      // adamPart = 75.75
      
      expect(totals.itemCostEUR).toBe(135);
      expect(totals.shippingEUR).toBe(13.5);
      expect(totals.costEUR).toBe(148.5);
      expect(totals.sPrice).toBe(300);
      expect(totals.profit).toBe(151.5);
      expect(totals.paid).toBe(50);
      expect(totals.balance).toBe(250);
      expect(totals.adamPart).toBe(75.75);
    });

    it('handles custom exchange rates', () => {
      const totals = calculateFinancialTotals(mockQuote, "300", [], 0.2);
      expect(totals?.itemCostEUR).toBe(200);
      expect(totals?.shippingEUR).toBe(20);
      expect(totals?.costEUR).toBe(220);
    });

    it('handles invalid selling price strings gracefully', () => {
      const totals = calculateFinancialTotals(mockQuote, "abc", []);
      expect(totals?.sPrice).toBe(0);
      expect(totals?.profit).toBeLessThan(0);
    });
  });

  describe('calculateDeliveryDates', () => {
    it('calculates proper deadlines based on production time', () => {
      const fixedNow = new Date(2026, 3, 21, 12, 0, 0).getTime();
      const dates = calculateDeliveryDates(10, fixedNow);

      // Production deadline = 10 days later
      const expectedProd = fixedNow + (10 * 24 * 60 * 60 * 1000);
      // Delivery (incl 7 days shipping) = 17 days total
      const expectedDel = fixedNow + (17 * 24 * 60 * 60 * 1000);

      expect(dates.productionDeadline).toBe(expectedProd);
      expect(dates.deliveryEstimation).toBe(expectedDel);
    });

    it('uses default 7 days if productionTimeDays is invalid', () => {
        const dates = calculateDeliveryDates(0, 1000);
        expect(dates.productionDeadline).toBe(1000 + (7 * 24 * 60 * 60 * 1000));
    });
  });

  describe('getRelativeTime', () => {
    const now = new Date(2026, 3, 21, 12, 0, 0).getTime();

    it('returns "Aujourd\'hui" for current day', () => {
      expect(getRelativeTime(now, now)).toBe("Aujourd'hui");
    });

    it('returns days diff for past dates', () => {
      const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000);
      expect(getRelativeTime(twoDaysAgo, now)).toBe("Il y a 2j");
    });
  });
});
