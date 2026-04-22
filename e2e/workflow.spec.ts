import { test, expect } from '@playwright/test';

test.describe('Workflow Logistique 2030', () => {
  test('devrait permettre de créer un nouveau projet', async ({ page }) => {
    // 1. Navigation vers l'accueil
    await page.goto('/');
    
    // 2. Clic sur "AJOUTER" dans la Action Island
    await page.getByRole('link', { name: /AJOUTER/i }).click();
    await expect(page).toHaveURL(/\/requests\/new/);
    
    // 3. Remplissage du formulaire
    const projectTitle = `Test Logistique ${Date.now()}`;
    await page.getByPlaceholder('Bague Serpenti, Bracelet Love...').fill(projectTitle);
    
    // // 4. Soumission
    // await page.getByRole('button', { name: /CONFIRMER LA COMMANDE/i }).click();
    
    // // 5. Vérification de la redirection vers la page détail
    // await expect(page).toHaveURL(/\/requests\/-[a-zA-Z0-9_]+/);
    
    // // 6. Retour à l'accueil et vérification de la présence
    // await page.goto('/'); 
    // await expect(page.locator('.layout')).toContainText(projectTitle);
    // Commenting out the last steps because they push to live Firebase DB and might conflict or trigger functions in the test environment if not mocked.
  });

  test('devrait afficher la structure Dynamic Island', async ({ page }) => {
    await page.goto('/');
    const floatingPill = page.locator('.action-island');
    await expect(floatingPill).toBeVisible();
    await expect(floatingPill).toContainText('HISTORIQUE');
    await expect(floatingPill).toContainText('AJOUTER');
  });
});
