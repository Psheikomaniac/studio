# PRD-17: Server-Side Aggregation

## 1. Context
The application currently calculates the account balance for *all* players on the client side by fetching *all* transactions (fines, payments, dues, etc.). This `O(n)` operation (where n is total transactions history) is not scalable.

## 2. Problem Statement
- **Performance:** As history grows, the "Players" page will become slower to render.
- **Data Usage:** Fetching full history for every page load is inefficient.
- **Consistency:** Client-side logic might differ from other views if duplicated.

## 3. Goals
- Move the heavy lifting of balance calculation to the server side (Cloud Functions) or use an incremental update strategy.
- Ensure the `User` document contains an up-to-date `balance` field.

## 4. Scope

### 4.1. Architecture Change
- **Option A (Cloud Functions):** Trigger on `onCreate`/`onUpdate` of any financial document (Fine, Payment, etc.) to update the user's balance.
- **Option B (Write-time Aggregation):** The Service layer updates the user's balance atomicaly in a transaction when creating a fine/payment.

### 4.2. Implementation Steps
1.  Add `balance` field to `User` (Player) model (already seems to exist in types, but needs to be the source of truth).
2.  Implement the aggregation logic (preferably Cloud Functions for reliability).
3.  Update Frontend to read `player.balance` directly instead of calculating it.

## 5. Technical Requirements
- **Idempotency:** The aggregation must be robust against retries.
- **Real-time:** The balance on the UI should update almost instantly.

## 6. Acceptance Criteria
- `PlayersPage` no longer fetches all historical transactions.
- `PlayersPage` displays the balance directly from the player document.
- Adding a fine or payment updates the player's balance automatically.
