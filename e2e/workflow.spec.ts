import { test, expect } from '@playwright/test';

test.describe('Workflow Logistique 2030', () => {
  test('devrait permettre de créer un nouveau projet', async ({ page }) => {
    // 1. Navigation vers l'accueil
    await page.goto('/');
    
    // 2. Clic sur "NEW" dans la Floating Pill
    await page.getByRole('link', { name: 'NEW' }).click();
    await expect(page).toHaveURL(/\/requests\/new/);
    
    // 3. Remplissage du formulaire
    const projectTitle = `Test Cyber ${Date.now()}`;
    await page.getByPlaceholder('NAME THE ART...').fill(projectTitle);
    
    // 4. Soumission
    await page.getByRole('button', { name: 'CONFIRM PROTOCOL' }).click();
    
    // 5. Vérification de la redirection vers la page détail
    await expect(page).toHaveURL(/\/requests\/-O/);
    await expect(page.locator('h1.title')).toContainText(projectTitle.toUpperCase()); // text-transform CSS makes it look uppercase but text content might be original, let's just match ignore case or actual.
    
    // 6. Retour à l'accueil et vérification de la présence
    await page.getByRole('button', { name: 'CANCEL' }).click(); // Note: Back button acts as cancel in UI
    await page.goto('/'); 
    await expect(page.locator('.layout')).toContainText(projectTitle);
  });

  test('devrait afficher la structure Dynamic Island', async ({ page }) => {
    await page.goto('/');
    const floatingPill = page.locator('.floating-pill');
    await expect(floatingPill).toBeVisible();
    await expect(floatingPill).toContainText('ALL');
    await expect(floatingPill).toContainText('NEW');
  });
});
