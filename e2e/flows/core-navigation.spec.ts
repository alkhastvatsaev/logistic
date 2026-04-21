import { test, expect } from '@playwright/test';

test.describe('Reach PWA - Core Flows', () => {
  
  test('Admin Dashboard loads and displays header', async ({ page }) => {
    await page.goto('/');
    
    // Verify the minimalist Apple style header
    const title = page.locator('h1.title');
    await expect(title).toHaveText('Reach');
    
    const subtitle = page.locator('p.subtitle');
    await expect(subtitle).toHaveText('Supplier & Logistics Core');
  });

  test('Navigation to New Request portal', async ({ page }) => {
    await page.goto('/');
    
    // Click the New Request button
    await page.click('text=New Request');
    
    // Ensure we navigated to /requests/new
    await expect(page).toHaveURL(/.*\/requests\/new/);
    
    // Check form presence
    await expect(page.locator('text=New Specification')).toBeVisible();
    await expect(page.getByRole('button', { name: /Initialize Request/i })).toBeVisible();
  });

});
