# PRD-21: Club Hierarchy Implementation

## 1. Introduction
Currently, `Team` is the top-level entity in the application. To support larger organizations, a `Club` (Verein) entity must be introduced as the root container, allowing a single Club to manage multiple Teams (e.g., "1. Men", "2. Men", "Youth").

## 2. Problem Statement
- **No Club Entity:** There is no representation of a "Club" in the database.
- **Flat Hierarchy:** Teams exist independently. There is no way to group them or share administration across them.
- **Limited Onboarding:** The onboarding flow only supports creating/joining a single Team.

## 3. Objectives
1.  **Data Modeling:** Create the `Club` entity and establish the `Club -> Team` relationship.
2.  **UI/UX:** Implement flows for creating a Club and creating Teams within a Club.
3.  **Tenancy:** Update the application context to understand `Club` scope in addition to `Team` scope.

## 4. Implementation Details

### 4.1. Data Model Changes

**New Collection: `clubs`**
```typescript
interface Club {
  id: string;
  name: string;
  ownerUid: string;
  createdAt: string;
  updatedAt: string;
}
```

**New Collection: `clubs/{clubId}/clubMembers`**
```typescript
interface ClubMember {
  uid: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}
```

**Updates to `Team`**
- Add `clubId: string` field to `Team` interface.
- Ensure new teams created in a club context receive this ID.

### 4.2. Onboarding & Management UI
- **Club Onboarding:**
    - New step 1: Create Club or Join Club (via invite/link).
    - Step 2: Create Team or Select Team within Club.
- **Team Management:**
    - Add UI to "Add new Team" inside an existing Club.
    - Implement a "Team Switcher" for users who are members of multiple teams within the same club (or across clubs).

### 4.3. Security & Rules
- Update `firestore.rules`:
    - Define access for `/clubs/{clubId}`.
    - Allow club admins to administer all teams within the club (cascading permissions).
    - `match /clubs/{clubId} { ... match /teams/{teamId} { ... } }` (Physical nesting or logical reference).
    - *Note:* Keeping `teams` as a root collection (referenced by `clubId`) is often more flexible for queries than deep nesting, but permissions must check `clubId`.

## 5. Migration Strategy (Phased)
1.  **Phase 1 (Data):** Create `Club` models and manually link existing teams to new placeholder clubs if needed.
2.  **Phase 2 (UI):** Update Onboarding to support the Club flow.
3.  **Phase 3 (Switching):** Enable users to switch between teams.

## 6. Acceptance Criteria
- [ ] `Club` entity exists in Firestore.
- [ ] `Team` entity contains `clubId`.
- [ ] User can create a new Club.
- [ ] User can create a new Team assigned to that Club.
- [ ] Club Admins have administrative access to their Teams.
