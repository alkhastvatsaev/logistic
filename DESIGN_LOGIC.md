# Reach Apple Design Logic (HIG)

## 1. Structure Spatiale
- **Layout** : Toujours centré sur mobile (max 430px).
- **Marges** : Pas de bordures de cartes inutiles. Utilisation de l'espace négatif.
- **Groupes** : Utilisation de "Inset Groups" (sections avec fond gris très clair `#F2F2F7` ou sombre `#1C1C1E`) pour regrouper les données.

## 2. Couleurs (iOS Standard)
- **Background** : Pur blanc `#FFFFFF` ou Pur noir `#000000`.
- **Secondary Background** : `#F2F2F7` (Light) / `#1C1C1E` (Dark).
- **Separator** : `#C6C6C8` (Subtil).
- **Accent** : Noir pur ou Bleu iOS `#007AFF`.

## 3. Typographie
- **Titres** : SF Pro Text / Inter. Gras (`600`) mais raffiné.
- **Description** : Taille plus petite (`13px-15px`) en gris `#8E8E93`.

## 4. Composants
- **Inputs** : Pas de bordures sur 4 côtés. Intégrés dans les lignes de liste ou très discrets.
- **Boutons** : Format "Pill" ou rectangle avec arrondis de 12px. Pas d'ombres portées agressives.

## 5. Workflow Étendu
- WAITING_FOR_QUOTE : Attente des prix usine.
- MANAGER_REVIEW : Mirza doit valider le prix et la qualité.
- WAITING_FOR_DEPOSIT : Attente du paiement de l'acompte client.
- IN_PRODUCTION : Validation usine et début fabrication.
- FINAL_PAYMENT : Production finie, attente du reste du paiement.
- SHIPPED : Expédié via FedEx.
- DELIVERED : Livraison confirmée.
