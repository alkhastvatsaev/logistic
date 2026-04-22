# LOGISTIQUE : AGENT OPERATIONAL PROTOCOL (VISION 2030)

Ce document définit la logique métier et les protocoles d'exécution de l'assistant IA pour la gestion logistique Maison 7.

## 1. PIPELINE LOGISTIQUE (CHINE ➔ STRASBOURG)

L'agent doit maintenir la cohérence entre les statuts Firebase et la timeline visuelle :

| ID | ÉTAPE TIMELINE | STATUTS MATCH | ACTION REQUIS |
|:---|:---|:---|:---|
| 1 | Sourcing & Recherche | `DRAFT`, `WAITING_FOR_QUOTE` | Générer Lien Usine |
| 2 | Devis Reçu / Analyse | `QUOTED`, `MANAGER_REVIEW` | Définir Prix Vente & Marge |
| 3 | Acompte & Validation | `WAITING_FOR_DEPOSIT` | Encaisser 30% |
| 4 | En Production (Shenzhen) | `IN_PRODUCTION` | Suivi délai usine |
| 5 | QC & Solde Fournisseur | `FINAL_PAYMENT` | Vérifier photos QC |
| 6 | Transit & Douane | `SHIPPED` | Saisie Numéro Suivi (FedEx) |
| 7 | Livré Strasbourg | `DELIVERED` | Clôture dossier |

## 2. LOGIQUE FINANCIÈRE (SMART MATHS)

L'agent calcule automatiquement les indicateurs suivants via `lib/logic.ts` :

- **Coût Total (EUR)** : `(Prix RMB + Port RMB) * Taux Change (0.13)`
- **Bénéfice Brut** : `Prix Vente - Coût Total`
- **Répartition Parts (50/50)** :
    - **Adam** : `Bénéfice / 2`
    - **Mirza** : `Bénéfice / 2`
- **Acompte (Deposit)** : `Prix Vente * 0.30`

## 3. DESIGN SYSTEM "2030 TITANE"

Toute modification de l'UI doit respecter les codes édictés :
- **Backgrounds** : Blanc pur `#FFFFFF` ou Liquid Glass (Glassmorphism).
- **Typographie** : Massive, condensée, lettrage resserré (`letter-spacing: -0.04em`).
- **Composants** :
    - `SmartImage` : Gestion automatique du ratio, flou d'arrière-plan, centrage.
    - `Vision Pill` : Barre d'action flottante contextualisée.
    - `GlassPanel` : Cartes avec backdrop-blur (20px) et bordures subtiles.

## 4. PROTOCOLE FOURNISSEUR (SHENZHEN HUB)

Le portal fournisseur (`/quote/[id]`) doit TOUJOURS être bilingue (Anglais/Chinois) :
- Ne jamais afficher d'infos sur le client final.
- Afficher les prix exclusivement en **RMB (¥)**.
- Collecter : Prix Usine, Port, Délai (Lead Time).

## 5. GÉNÉRATION DOCUMENTS (PDF A4)

- **Devis Client** : Doit être confidentiel. **INTERDICTION** de mentionner "Chine" ou "Shenzhen". Origine affichée : "Maison 7 | Strasbourg".
- **Récap Interne** : Détail complet incluant les marges et les parts de chacun.

---
*Document synchronisé avec le Core Logic v2.0*
