# 🧪 Testing Architecture Plan: Logistique PWA

Establishing a robust testing framework is critical for a solo-dev project where AI agents (like Antigravity) are frequent contributors. This ensures that every logic change or UI update is verified against "Ground Truth" requirements.

## 🏗️ Architecture Layers

### 1. Unit & Logic Tests (Vitest)
**Purpose:** Verify pure functions, financial calculations, and data transformations.
- **Tools:** Vitest, JSDOM, React Testing Library.
- **Priority Specs:** 
  - `calculateFinancialTotals`: Ensure profit splits and exchange rates are accurate.
  - `calculateDeliveryDates`: Verify production/shipping math.
  - `fetchLiveRate`: Mock API responses to handle volatility.

### 2. End-to-End (E2E) Workflow Tests (Playwright)
**Purpose:** Verify that a user (Admin or Supplier) can complete a full business lifecycle without friction.
- **Tools:** Playwright.
- **Critical Paths (Smoke Tests):**
  - **Sourcing Flow:** Creating a request -> Generating Link -> Supplier submitting quote.
  - **Payment Flow:** Accepting quote -> Recording Deposit -> Recording Balance.
  - **Tracking Flow:** Shipping an order -> FedEx API status update.

### 3. AI-Agent Protocol (The "CODEX")
To allow AI agents to maintain tests effectively:
- **Test-First Generation:** For every new feature, the agent must generate a matching test file before or alongside the implementation.
- **Regression Check:** Run `npm test` before pushing any critical logic change.
- **Mock-Driven Development:** Standardized mocks for Firebase and external APIs are stored in `@/__mocks__`.

---

## 🗓️ Implementation Phases

### Phase 1: Logic Fortification (Current Session)
- [ ] Add comprehensive tests for `src/lib/logic.ts`.
- [ ] Standardize `vitest.config.ts` for Next.js App Router.
- [ ] Create `src/lib/__mocks__/firebase.ts` to allow testing components without hitting the network.

### Phase 2: E2E Critical Path (Immediate Priority)
- [ ] Implement a "Smoke Test" for the Supplier Portal (`/q/[token]`).
- [ ] Implement an Admin "Order Creation" flow test.

### Phase 3: CI/CD Guardrails (Maintenance)
- [ ] Configure GitHub Actions to block merges if tests fail.
- [ ] Automated coverage reports.

---

## 🚀 Execution Start

I will now start by implementing the **Unit Tests** for our core business logic in `src/lib/logic.ts` to ensure our financial calculations are bulletproof.
