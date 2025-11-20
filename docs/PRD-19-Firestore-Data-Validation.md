# PRD-19: Firestore Data Validation

## 1. Context
The current `firestore.rules` focus heavily on authorization (who can do what) but lack validation (what data is allowed). This means an admin could technically write a string into a number field or a negative amount where only positive is expected.

## 2. Problem Statement
- **Data Integrity:** Invalid data can enter the database (e.g., `amount: "10"` instead of `amount: 10`).
- **Frontend Crashes:** The frontend expects specific types (e.g., numbers for calculations) and might crash if it encounters unexpected types.

## 3. Goals
- Enforce data schema at the database level.
- Prevent invalid data from being written.

## 4. Scope

### 4.1. Validation Rules
Implement validation logic in `firestore.rules` for all core collections (`fines`, `payments`, `users`, `dues`).

**Examples:**
- `amount` must be a `number`.
- `amount` must be `>= 0`.
- `date` must be a valid string (ISO format check is hard in rules, but we can check it's a string).
- `reason` must be a non-empty string.
- `active` must be a boolean.

### 4.2. Implementation
- Define helper functions in `firestore.rules` (e.g., `function isValidFine(data) { ... }`).
- Apply these checks on `create` and `update` operations.

## 5. Technical Requirements
- **Non-Breaking:** Ensure existing data logic (in the app) adheres to these rules before deploying them, to avoid blocking legitimate writes.
- **Performance:** Keep rules efficient.

## 6. Acceptance Criteria
- Writing a fine with a string amount fails with "Permission Denied".
- Writing a payment with a negative amount fails.
- Valid writes proceed normally.
