# 🏛️ LOGISTIQUE PWA : ECOSYSTEM & ARCHITECTURE

Ce document définit la logique globale et les interconnexions de l'application Titane 2030. Il sert de guide pour assurer l'harmonie entre le design, la finance et la logistique.

---

## 🎨 1. DESIGN SYSTEM : TITANE 2030
L'identité visuelle est basée sur le minimalisme de luxe et l'efficacité opérationnelle.
- **Grille Mobile** : Strictement bridée à **430px** (`max-width: 430px`) pour simuler une expérience native iPhone.
- **Couleurs** : 
  - `Base`: #FFFFFF (Pur)
  - `Accent`: #0044FF (Bleu Électrique / Titane)
  - `Faded`: rgba(0,0,0,0.4) (Gris technique)
- **Typographie** : "Inter", ultra-gras (900+) pour les titres, 800+ pour les labels numériques.

## 🧮 2. LOGIQUE FINANCIÈRE (Source unique)
Tous les calculs doivent transiter par `@/lib/logic.ts`.
- **Taux de Change (FX)** : 
  - Base : CNY vers EUR.
  - Formule : `(Market Rate * 1.035)` -> Sécurité de 3.5% incluse pour couvrir les frais de transfert (Wise/Bank).
- **Profit Split** : Répartition automatique 50/50 entre les partenaires (Adam/Mirza) après déduction du coût de fabrication et du transport.
- **Workflow de Paiement** : 
  1. `Acompte` (30%) : Déclenche la mise en production.
  2. `Solde` (70%) : Déclenche l'expédition et le suivi FedEx.

## 🚚 3. WORKFLOW LOGISTIQUE (Multi-Sourcing)
L'écosystème lie deux portails distincts via Firebase Realtime Database.

### A. Dashboard Admin (Interne)
- Pilotage central des demandes.
- Génération de **Share Tokens** uniques pour mettre en concurrence plusieurs fournisseurs.
- Cockpit de contrôle avec validation technique du QC (Quality Control).

### B. Portail Fournisseur (Externe - `/q/[token]`)
- Interface bilingue (FR/CN) optimisée pour les navigateurs mobiles chinois.
- Capture des données de fabrication : Poids d'or (g), décompte de pierres (pcs), carats (ct).
- Calcul automatique de la date de livraison estimée (Production + 7j Transit).

## 🧪 4. PROTOCOLE CODEX (Qualité)
L'application est protégée par un double système de tests :
- **Unitaires (Vitest)** : Validation de la logique mathématique dans `__tests__/unit`.
- **E2E (Playwright)** : Simulation de parcours utilisateur complets dans `/e2e`.

---
*L'harmonie de l'écosystème repose sur la séparation stricte entre les données brutes (Firebase) et la logique de calcul (logic.ts).*
