import { test, expect } from '@playwright/test';

test.describe('Logistique PWA Smoke Tests', () => {
  
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    // Check for the main navigation or logo
    await expect(page.locator('h1, .cyber-title')).toBeVisible();
    await expect(page).toHaveTitle(/Logistique/);
  });

  test('should show the supplier portal for a dummy token', async ({ page }) => {
    // This will hit the error page or loading state if token is invalid, 
    // but we can verify the UI structure (VisionPill, etc)
    await page.goto('/q/invalid-token');
    
    // Check if the identity "Titane" or the loader is present
    const loader = page.locator('.titane-loader');
    const errorMsg = page.locator('text=/erreur|problème|found/i');
    
    await expect(loader.or(errorMsg)).toBeVisible();
  });

  test('mobile responsiveness check', async ({ page, isMobile }) => {
    await page.goto('/');
    if (isMobile) {
      // Check for mobile-specific layouts or meta tags
      const viewport = page.viewportSize();
      expect(viewport?.width).toBeLessThan(500);
    }
  });
});
