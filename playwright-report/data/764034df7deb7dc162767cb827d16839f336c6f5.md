# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workflow.spec.ts >> Workflow Logistique 2030 >> devrait afficher la structure Dynamic Island
- Location: e2e/workflow.spec.ts:29:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.floating-pill')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.floating-pill')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - banner [ref=e3]:
    - generic [ref=e4] [cursor=pointer]:
      - generic [ref=e5]: MAISON
      - generic [ref=e6]: "7"
  - generic [ref=e7]:
    - generic [ref=e8]:
      - img "Cartier"
    - generic [ref=e10]:
      - img "VCA"
    - generic [ref=e12]:
      - img "Bulgari"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Workflow Logistique 2030', () => {
  4  |   test('devrait permettre de créer un nouveau projet', async ({ page }) => {
  5  |     // 1. Navigation vers l'accueil
  6  |     await page.goto('/');
  7  |     
  8  |     // 2. Clic sur "NEW" dans la Floating Pill
  9  |     await page.getByRole('link', { name: 'NEW' }).click();
  10 |     await expect(page).toHaveURL(/\/requests\/new/);
  11 |     
  12 |     // 3. Remplissage du formulaire
  13 |     const projectTitle = `Test Cyber ${Date.now()}`;
  14 |     await page.getByPlaceholder('NAME THE ART...').fill(projectTitle);
  15 |     
  16 |     // 4. Soumission
  17 |     await page.getByRole('button', { name: 'CONFIRM PROTOCOL' }).click();
  18 |     
  19 |     // 5. Vérification de la redirection vers la page détail
  20 |     await expect(page).toHaveURL(/\/requests\/-O/);
  21 |     await expect(page.locator('h1.title')).toContainText(projectTitle.toUpperCase()); // text-transform CSS makes it look uppercase but text content might be original, let's just match ignore case or actual.
  22 |     
  23 |     // 6. Retour à l'accueil et vérification de la présence
  24 |     await page.getByRole('button', { name: 'CANCEL' }).click(); // Note: Back button acts as cancel in UI
  25 |     await page.goto('/'); 
  26 |     await expect(page.locator('.layout')).toContainText(projectTitle);
  27 |   });
  28 | 
  29 |   test('devrait afficher la structure Dynamic Island', async ({ page }) => {
  30 |     await page.goto('/');
  31 |     const floatingPill = page.locator('.floating-pill');
> 32 |     await expect(floatingPill).toBeVisible();
     |                                ^ Error: expect(locator).toBeVisible() failed
  33 |     await expect(floatingPill).toContainText('ALL');
  34 |     await expect(floatingPill).toContainText('NEW');
  35 |   });
  36 | });
  37 | 
```