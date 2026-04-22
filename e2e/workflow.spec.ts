import { test, expect } from '@playwright/test';

test.describe('Workflow Logistique', () => {
  test('devrait permettre de créer un nouveau projet', async ({ page }) => {
    // 1. Navigation vers l'accueil
    await page.goto('/');
    
    // 2. Clic sur "Nouveau" dans la Tab Bar
    await page.getByRole('link', { name: 'Nouveau' }).click();
    await expect(page).toHaveURL(/\/requests\/new/);
    
    // 3. Remplissage du formulaire
    const projectTitle = `Test Bijou ${Date.now()}`;
    await page.getByPlaceholder('Clash Ring, etc.').fill(projectTitle);
    
    // 4. Soumission
    await page.getByRole('button', { name: 'Done' }).click();
    
    // 5. Vérification de la redirection vers la page détail
    await expect(page).toHaveURL(/\/requests\/-O/); // Firebase keys usually start with -O
    await expect(page.locator('h1.title')).toContainText(projectTitle);
    
    // 6. Retour à l'accueil et vérification de la présence dans la liste
    await page.getByRole('button', { name: 'Retour' }).click();
    await page.goto('/'); // Just to be sure
    await expect(page.locator('.list-group')).toContainText(projectTitle);
  });

  test('devrait afficher la Tab Bar native', async ({ page }) => {
    await page.goto('/');
    const tabBar = page.locator('.tab-bar');
    await expect(tabBar).toBeVisible();
    await expect(tabBar).toContainText('Projets');
    await expect(tabBar).toContainText('Nouveau');
  });
});
