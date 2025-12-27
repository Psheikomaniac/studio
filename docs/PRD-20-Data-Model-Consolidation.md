# PRD-20: Data Model Consolidation & Hardening

## 1. Introduction
The application has shifted towards a multi-tenant architecture where `Team` is the central scope. While most services (Players, Fines, Payments, Beverages) have been migrated to `teams/{teamId}/players/...`, critical infrastructure components like `firestore.rules` and the `DuesService` still rely on legacy patterns. This PRD aims to eliminate these inconsistencies to prepare the ground for the `Club` hierarchy.

## 2. Problem Statement
- **Inconsistent Security Rules:** `firestore.rules` defines rules for global `users/{userId}` paths but lacks specific rules for the active `teams/{teamId}/players/...` structure. This leaves the actual production paths unsecured or relying on default behaviors, while protecting unused legacy paths.
- **Legacy Dues Service:** `DuesService` reads and writes to `users/{userId}/duePayments`, ignoring the team-scoped architecture used by other services. This creates a schema split that complicates queries and permissions.
- **Optional Team IDs:** The `teamId` field is optional in many entities and not rigorously enforced, leading to potential data orphans in a multi-team environment.

## 3. Objectives
1.  **Update Firestore Rules:** Implement comprehensive security rules for the `teams/{teamId}` hierarchy, including all subcollections (`players`, `fines`, `payments`, `dues`, `beverageConsumptions`).
2.  **Migrate Dues Service:** Refactor `DuesService` to operate within the `teams/{teamId}/players/{playerId}/duePayments` path.
3.  **Standardize Team ID:** Ensure `teamId` is consistently written and validated across all entities.

## 4. Implementation Details

### 4.1. Firestore Rules Updates
- Remove or deprecate legacy rules for global `users/{userId}/fines`, `payments`, etc.
- Add nested rules for:
  ```
  match /teams/{teamId} {
    allow read: if isTeamMember(teamId);
    
    match /players/{playerId} {
      allow read: if isTeamMember(teamId);
      allow write: if isTeamAdmin(teamId);
      
      match /fines/{fineId} { ... }
      match /payments/{paymentId} { ... }
      match /duePayments/{paymentId} { ... }
      match /beverageConsumptions/{consumptionId} { ... }
    }
  }
  ```
- Define helper functions `isTeamMember(teamId)` and `isTeamAdmin(teamId)` based on `teams/{teamId}/teamMembers`.

### 4.2. DuesService Refactoring
- **Current Path:** `users/{userId}/duePayments`
- **Target Path:** `teams/{teamId}/players/{playerId}/duePayments`
- **Action:**
    - Update `DuesService` constructor and methods to accept `teamId`.
    - Update `useDuesService` and `usePlayerDuePayments` hooks to require `teamId`.
    - Create a migration script (optional but recommended) if preserving data is required.

### 4.3. Data Integrity
- Review `create` methods in all services (`FinesService`, `PaymentsService`, etc.) to ensure `teamId` is forcefully injected into the document data, even if redundant with the path.
- Update `Player` creation to ensure `teamId` is stored on the player document.

## 5. Acceptance Criteria
- [ ] `firestore.rules` successfully blocks unauthorized access to team data and allows legitimate team members/admins.
- [ ] `DuesService` correctly reads/writes to the team-scoped path.
- [ ] All new records (Fines, Payments, Players) contain a valid `teamId`.
- [ ] Existing functionality (Dashboard, Players List) continues to work without regression.
