# Lint Report

**Date:** 2026-02-14
**Total:** 74 problems (1 error, 73 warnings)
**Auto-fixed:** 4 warnings were resolved by `npm run lint -- --fix`

---

## Errors (1)

| File | Line:Col | Rule | Description |
|------|----------|------|-------------|
| `src/services/clubs.service.ts` | 199:23 | `no-unreachable` | Unreachable code |

---

## Warnings by Category

### Unused Variables / Imports (`@typescript-eslint/no-unused-vars`) — 69

#### `e2e/`

| File | Line:Col | Symbol |
|------|----------|--------|
| `e2e/dashboard-analytics.spec.ts` | 37:56 | `page` (unused arg) |
| `e2e/dashboard-analytics.spec.ts` | 59:54 | `page` (unused arg) |
| `e2e/dashboard-analytics.spec.ts` | 223:58 | `page` (unused arg) |
| `e2e/page-objects/BasePage.ts` | 1:16 | `Locator` (unused import) |

#### `scripts/`

| File | Line:Col | Symbol |
|------|----------|--------|
| `scripts/check-firestore-data.ts` | 21:3 | `orderBy` (unused import) |
| `scripts/check-firestore-data.ts` | 22:3 | `limit` (unused import) |
| `scripts/check-firestore-data.ts` | 321:11 | `totalUsers` (assigned, never used) |
| `scripts/check-firestore-data.ts` | 330:7 | `totalTransactions` (assigned, never used) |
| `scripts/check-firestore-data.ts` | 333:9 | `hasIndexErrors` (assigned, never used) |
| `scripts/compare-data-sources.ts` | 139:9 | `diff3` (assigned, never used) |
| `scripts/migrate-balances.ts` | 8:3 | `updateDoc` (unused import) |

#### `src/app/`

| File | Line:Col | Symbol |
|------|----------|--------|
| `src/app/(app)/dashboard/page.tsx` | 12:15 | `Player` (unused type import) |
| `src/app/(app)/dashboard/page.tsx` | 12:23 | `Fine` (unused type import) |
| `src/app/(app)/dashboard/page.tsx` | 12:29 | `Payment` (unused type import) |
| `src/app/(app)/dashboard/page.tsx` | 12:43 | `DuePayment` (unused type import) |
| `src/app/(app)/dashboard/page.tsx` | 12:55 | `BeverageConsumption` (unused type import) |
| `src/app/(app)/dashboard/page.tsx` | 93:11 | `toast` (assigned, never used) |
| `src/app/(app)/money/page.tsx` | 13:15 | `Player` (unused type import) |
| `src/app/(app)/money/page.tsx` | 13:23 | `Fine` (unused type import) |
| `src/app/(app)/money/page.tsx` | 13:29 | `Payment` (unused type import) |
| `src/app/(app)/money/page.tsx` | 13:43 | `DuePayment` (unused type import) |
| `src/app/(app)/money/page.tsx` | 13:55 | `BeverageConsumption` (unused type import) |
| `src/app/(app)/money/page.tsx` | 183:13 | `due` (assigned, never used) |
| `src/app/(app)/profile/page.tsx` | 14:46 | `CardFooter` (unused import) |
| `src/app/(app)/profile/page.tsx` | 17:25 | `User` (unused type import) |
| `src/app/(app)/settings/page.tsx` | 13:58 | `X` (unused import) |
| `src/app/login/page.tsx` | 6:10 | `useAuth` (unused import) |
| `src/app/login/page.tsx` | 8:10 | `doc` (unused import) |
| `src/app/login/page.tsx` | 8:15 | `setDoc` (unused import) |
| `src/app/login/page.tsx` | 8:23 | `getDoc` (unused import) |
| `src/app/login/page.tsx` | 9:10 | `useRouter` (unused import) |
| `src/app/login/page.tsx` | 13:10 | `db` (unused import) |
| `src/app/login/page.tsx` | 58:11 | `router` (assigned, never used) |
| `src/app/login/page.tsx` | 92:11 | `handleAnonymousLogin` (assigned, never used) |
| `src/app/login/page.tsx` | 109:13 | `userCredential` (assigned, never used) |
| `src/app/onboarding/page.tsx` | 11:10 | `useAuth` (unused import) |

#### `src/components/`

| File | Line:Col | Symbol |
|------|----------|--------|
| `src/components/dashboard/add-beverage-consumption-dialog.tsx` | 14:10 | `Input` (unused import) |
| `src/components/dashboard/add-due-dialog.tsx` | 40:10 | `useAuth` (unused import) |
| `src/components/dashboard/add-due-dialog.tsx` | 42:12 | `DuesService` (unused import) |
| `src/components/dashboard/add-due-payment-dialog.tsx` | 16:10 | `FormDescription` (unused import) |
| `src/components/dashboard/add-due-payment-dialog.tsx` | 17:10 | `FormMessage` (unused import) |
| `src/components/dashboard/add-edit-payment-dialog.tsx` | 29:10 | `useAuth` (unused import) |

#### `src/hooks/`

| File | Line:Col | Symbol |
|------|----------|--------|
| `src/hooks/use-all-transactions.ts` | 18:3 | `Firestore` (unused import) |
| `src/hooks/use-all-transactions.ts` | 19:5 | `QueryConstraint` (unused import) |
| `src/hooks/use-toast.ts` | 21:7 | `actionTypes` (assigned, only used as type) |

#### `src/lib/`

| File | Line:Col | Symbol |
|------|----------|--------|
| `src/lib/csv-examples.ts` | 15:16 | `exampleImportPlayers` (assigned, never used) |
| `src/lib/csv-examples.ts` | 48:16 | `exampleImportPunishments` (assigned, never used) |
| `src/lib/csv-examples.ts` | 81:16 | `exampleImportTransactions` (assigned, never used) |
| `src/lib/csv-examples.ts` | 114:16 | `exampleImportGeneric` (assigned, never used) |
| `src/lib/csv-import-firestore.ts` | 715:19 | `dueName` (assigned, never used) |

#### `src/services/`

| File | Line:Col | Symbol |
|------|----------|--------|
| `src/services/base.service.ts` | 34:3 | `serverTimestamp` (unused import) |
| `src/services/base.service.ts` | 356:14 | `error` (unused catch binding) |
| `src/services/base.service.ts` | 370:14 | `error` (unused catch binding) |
| `src/services/base.service.ts` | 413:14 | `error` (unused catch binding) |
| `src/services/beverages.service.ts` | 342:11 | `now` (assigned, never used) |
| `src/services/beverages.service.ts` | 361:5 | `options` (unused arg) |
| `src/services/clubs.service.ts` | 182:22 | `uid` (unused arg) |
| `src/services/payments.service.ts` | 211:5 | `options` (unused arg) |
| `src/services/types.ts` | 6:15 | `Firestore` (unused import) |
| `src/services/types.ts` | 6:26 | `QueryConstraint` (unused import) |

#### `tests/`

| File | Line:Col | Symbol |
|------|----------|--------|
| `tests/integration/ai-fine-suggestions.test.ts` | 6:32 | `beforeEach` (unused import) |
| `tests/integration/helpers/seed-data.ts` | 7:3 | `collection` (unused import) |
| `tests/integration/real-time-sync.test.ts` | 12:10 | `FinesService` (unused import) |
| `tests/integration/transaction-workflows.test.ts` | 11:10 | `BeveragesService` (unused import) |
| `tests/integration/transaction-workflows.test.ts` | 317:17 | `fineDoc` (assigned, never used) |
| `tests/integration/transaction-workflows.test.ts` | 325:16 | `error` (unused catch binding) |
| `tests/mocks/firestore-mock.ts` | 24:11 | `QueryDescriptor` (unused type) |
| `tests/mocks/firestore-mock.ts` | 469:22 | `firestore` (unused arg) |
| `tests/unit/csv-parse-punishments.test.ts` | 3:15 | `ParsedPunishmentRow` (unused type import) |
| `tests/unit/payments-service.test.ts` | 4:5 | `doc` (unused import) |
| `tests/unit/payments-service.test.ts` | 6:5 | `increment` (unused import) |
| `tests/unit/services/payments.service.test.ts` | 17:3 | `createMockDocumentSnapshot` (unused import) |

---

### Unused ESLint Disable Directives — ~~4~~ 0 (auto-fixed)

All 4 stale `eslint-disable` directives were removed by `npm run lint -- --fix`:
- `next.config.ts` — 2 directives removed (`@typescript-eslint/no-var-requires`, `no-console`)
- `src/lib/web-vitals.ts` — 2 directives removed (`no-console` x2)

### Remaining `next.config.ts` Warning

| File | Line:Col | Rule | Symbol |
|------|----------|------|--------|
| `next.config.ts` | 11:12 | `@typescript-eslint/no-unused-vars` | `err` (unused variable) |

---

## Summary by Directory

| Directory | Errors | Warnings |
|-----------|--------|----------|
| `e2e/` | 0 | 4 |
| `next.config.ts` | 0 | 1 |
| `scripts/` | 0 | 7 |
| `src/app/` | 0 | 25 |
| `src/components/` | 0 | 6 |
| `src/hooks/` | 0 | 3 |
| `src/lib/` | 0 | 5 |
| `src/services/` | 1 | 11 |
| `tests/` | 0 | 12 |
| **Total** | **1** | **73** |

## Notes

- All 4 auto-fixable issues (stale `eslint-disable` directives) have been resolved
- The remaining 74 issues require manual fixes (removing unused imports/variables)
- All warnings are `@typescript-eslint/no-unused-vars` — safe to remove the unused symbols
- The single error (`no-unreachable` in `clubs.service.ts:199`) indicates dead code after a return statement
