# PRD-18: Type-Safety Improvements

## 1. Context
The code review identified the use of `any` casting in `src/services/players.service.ts` (and possibly others). This bypasses TypeScript's safety checks and can lead to runtime errors.

## 2. Problem Statement
- **Unsafe Code:** `as any` hides potential type mismatches.
- **Maintenance Risk:** Future refactorings might break functionality without compilation errors.
- **Examples:** `(playerData as any).active`, `this.update(playerId, playerData as any, options)`.

## 3. Goals
- Remove all instances of `any` in the Service layer.
- Define strict types for operation options (`CreateOptions`, `UpdateOptions`).

## 4. Scope

### 4.1. Refactoring `PlayersService`
- Define interfaces for `CreatePlayerDto` and `UpdatePlayerDto` if the partial models aren't sufficient.
- Update `CreateOptions` and `UpdateOptions` in `src/services/types.ts` (or locally) to include specific fields if necessary, rather than being generic bags.
- Ensure `BaseFirebaseService` generic types are correctly propagated.

### 4.2. General Cleanup
- Scan other services (`FinesService`, etc.) for similar patterns and fix them.

## 5. Technical Requirements
- **Strict Mode:** The code must pass `tsc` with `strict: true`.
- **No `any`:** Use `unknown` with type guards if absolutely necessary, but prefer specific types.

## 6. Acceptance Criteria
- No `as any` casts in `players.service.ts`.
- `npm run typecheck` passes cleanly.
- Function signatures explicitly state what they accept and return.
