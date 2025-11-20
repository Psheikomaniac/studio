# PRD-15: Refactoring PlayersPage

## 1. Context
The file `src/app/(app)/players/page.tsx` has grown too large (over 700 lines). It handles data fetching, business logic (balance calculation), table rendering, and dialog management all in one component. This makes maintenance, testing, and readability difficult.

## 2. Problem Statement
- **Monolithic Component:** Hard to read and maintain.
- **Mixed Concerns:** UI rendering mixed with complex business logic.
- **Reusability:** Sub-components (like the player table) cannot be easily reused.

## 3. Goals
- Decompose `PlayersPage` into smaller, focused components.
- Separate UI from business logic (custom hooks).
- Improve code maintainability and testability.

## 4. Scope

### 4.1. Component Extraction
Extract the following components:
- `PlayersTable`: Handles the rendering of the player list (can be reused for active/inactive).
- `PlayerStats`: Visualizes the sparkline/payment history.
- `BalanceTooltip`: Shows the detailed breakdown of the balance.
- `PlayerActionMenu` (optional): Encapsulates the edit/delete/status actions.

### 4.2. Logic Extraction
- Move the complex `balanceBreakdownByUser` calculation into a dedicated hook (e.g., `usePlayerBalances` or `useFinancialStats`).
- Move the filtering logic (active/inactive) to a utility or memoized selector.

## 5. Technical Requirements
- **No logic changes:** The functionality must remain exactly the same; this is a pure refactoring.
- **Props:** Define clear interfaces for the new components.
- **File Structure:** Place new components in `src/components/players/`.

## 6. Acceptance Criteria
- `src/app/(app)/players/page.tsx` should be significantly smaller (< 200 lines ideal).
- All features (rendering, tooltips, actions) work as before.
- Tests (if any) pass.
