# PRD-16: Business Logic Hardening (Transaction Classification)

## 1. Context
Currently, the system identifies "Credit" (Guthaben) transactions purely based on string matching in the `reason` field (e.g., `reason.includes('guthaben')`). This is fragile and error-prone (typos, language changes).

## 2. Problem Statement
- **Fragile Logic:** "Magic strings" determine financial calculations.
- **Inconsistent Data:** No clear distinction between different types of payments (e.g., "Fine Payment" vs. "Account Deposit").
- **Risk:** A typo in the reason field could lead to incorrect balance calculations.

## 3. Goals
- Introduce explicit typing for financial transactions.
- Remove reliance on string matching for core business logic.

## 4. Scope

### 4.1. Data Model Update
- Update `Payment` (and potentially `Transaction`) interface in `src/lib/types.ts`.
- Add a `category` or `type` field.
  - Enum: `PAYMENT` (Paying a fine/due), `DEPOSIT` (Adding credit), `TRANSFER`, etc.
  - OR a boolean flag `isDeposit`.

### 4.2. Code Update
- Update `balanceBreakdownByUser` logic in `PlayersPage` (or its new hook) to use the new field.
- Update `PlayersService` / `PaymentsService` to support the new field.
- Update the "Add Payment" UI to allow selecting the category (or infer it correctly).

### 4.3. Data Migration (Optional/Planned)
- Create a script to update existing Firestore documents, setting the new field based on the old string matching logic one last time.

## 5. Technical Requirements
- **Backward Compatibility:** Handle old records gracefully (fallback to string matching if the new field is missing) until migration is complete.
- **Strict Typing:** Use TypeScript Enums.

## 6. Acceptance Criteria
- New payments have a structured type/category.
- Balance calculation uses the type/category instead of string parsing.
- "Guthaben" logic is robust and explicit.
