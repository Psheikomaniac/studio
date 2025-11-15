# AGENTS.md - Firebase Studio Project

## Project Overview

This is a **club management application** built with Next.js 16 for managing players, fines, payments, dues, and beverage consumption. The application is designed for sports club treasurers and administrators.

### Tech Stack
- **Framework**: Next.js 16.0.0 with Turbopack
- **Runtime**: React 19.2.0
- **Language**: TypeScript 5 (strict mode enabled)
- **Database**: Firebase Firestore
- **AI**: Google Genkit for AI flows
- **UI**: Tailwind CSS + shadcn/ui components
- **Testing**: Vitest with happy-dom
- **Package Manager**: npm

---

## Setup Commands

```bash
# Install dependencies
npm install

# Start development server (runs on port 9002, NOT 3000!)
npm run dev

# Start Genkit AI dev server (for testing AI flows)
npm run genkit:dev

# Watch mode for Genkit (auto-reloads on changes)
npm run genkit:watch

# Production build
npm run build

# Start production server
npm start
```

---

## Testing & Validation

```bash
# Run all tests
npm test

# Run tests with UI (opens Vitest UI)
npm test:ui

# Run tests with coverage report
npm test:coverage

# Type checking (strict mode - IMPORTANT!)
npm run typecheck

# Linting
npm run lint
```

### Coverage Thresholds
- Lines: 7.5%
- Functions: 7.5%
- Branches: 12%
- Statements: 7.5%

### Test Environment
- Uses `happy-dom` for DOM simulation
- Setup file: `tests/setup.ts`
- Excludes: components, app directory, AI flows

---

## Code Style Guidelines

### TypeScript
- **Strict mode**: ALWAYS enabled (`strict: true`)
- **Target**: ES2017
- **Module resolution**: bundler
- **JSX**: react-jsx (React 19)
- **Note**: `ignoreBuildErrors: true` in next.config.ts (but still run `npm run typecheck` manually!)

### Imports
- Use **absolute imports** via `@/` path alias
- Example: `import { Player } from '@/lib/types'`
- Example: `import { PlayersService } from '@/services/players.service'`

### Naming Conventions
- **Services**: `*.service.ts` (e.g., `players.service.ts`)
- **Types/Interfaces**: PascalCase (e.g., `Player`, `Fine`, `Transaction`)
- **Components**: PascalCase (e.g., `PlayerCard`, `FinesList`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAllTransactions`, `useToast`)
- **Utilities**: camelCase (e.g., `csvUtils`, `calculateBalance`)

### Responsive Design Guidelines
- Always include meta viewport in `src/app/layout.tsx` with `width=device-width, initial-scale=1, viewport-fit=cover`.
- Tables must be horizontally scrollable on small screens:
  - Use the shared `Table` component from `src/components/ui/table.tsx` which wraps tables in `overflow-x-auto` with iOS momentum scrolling enabled.
  - For wide content tables, add a `min-w-[720px]` (or appropriate) class on the `<Table>` to force overflow on mobile.
  - Use `whitespace-nowrap` only for critical columns (date, amount, status) to reduce wrapping issues while allowing descriptions to wrap.
- Toolbars with multiple buttons must wrap on mobile:
  - Prefer `flex flex-wrap gap-2` and stack header sections with `flex-col` on small screens, then switch to rows with `sm:flex-row`.
- Grid layouts should collapse to one column on mobile and expand at `md:` or `lg:` breakpoints (e.g., `grid gap-4 md:grid-cols-2`).
- Use sticky headers sparingly and ensure sufficient z-index and backdrop blur for readability (`bg-background/80 backdrop-blur-sm`).

### File Organization
```
src/
├── app/                    # Next.js app router pages
├── components/             # Reusable UI components
│   ├── ui/                # shadcn/ui base components
│   └── [feature]/         # Feature-specific components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities, types, helpers
│   ├── types.ts          # Core TypeScript interfaces
│   ├── utils.ts          # General utilities
│   ├── csv-*.ts          # CSV import logic
│   └── stats.ts          # Statistics calculations
├── services/              # Firestore data access layer
│   ├── base.service.ts   # Abstract base class
│   ├── players.service.ts
│   ├── fines.service.ts
│   ├── payments.service.ts
│   ├── dues.service.ts
│   ├── beverages.service.ts
│   └── balance.service.ts
├── ai/                    # Google Genkit AI flows
│   ├── genkit.ts         # Genkit initialization
│   └── flows/            # AI flow definitions
└── firebase/              # Firebase configuration
    ├── config.ts         # Firebase app initialization
    ├── errors.ts         # Custom error classes
    └── error-emitter.ts  # Error handling utilities
```

---

## Architecture Patterns

### Service Layer Pattern
**CRITICAL**: ALL Firestore operations MUST go through service classes in `src/services/`.

- Services extend `BaseService<T>` from `base.service.ts`
- Services handle CRUD operations, queries, and data transformations
- Components should NEVER directly import Firebase or Firestore
- Example services: `PlayersService`, `FinesService`, `PaymentsService`, `DuesService`, `BeveragesService`, `BalanceService`

**Good Example:**
```typescript
import { playersService } from '@/services';
const players = await playersService.getAll();
```

**Bad Example (DON'T DO THIS):**
```typescript
import { db } from '@/firebase/config';
const players = await getDocs(collection(db, 'players'));
```

### Error Handling
- Use custom error classes from `src/firebase/errors.ts`
- Use `errorEmitter` from `src/firebase/error-emitter.ts` for centralized error handling
- Errors are typed: `FirestoreError`, `ValidationError`, etc.

### State Management
- Use React hooks (`useState`, `useEffect`, `useContext`)
- Custom hooks in `src/hooks/` (e.g., `useAllTransactions`)
- No external state management library (Redux, Zustand, etc.)

---

## Core Data Models

Located in `src/lib/types.ts`:

### Main Entities
- **Player**: Club members with balance, penalties, active status
- **Fine**: Penalties assigned to players (can be paid/unpaid, partial payments)
- **Payment**: Credit transactions for players
- **Due**: Membership fees or seasonal charges (e.g., "Saison2526")
- **DuePayment**: Links dues to players with payment status
- **Beverage**: Available drinks with prices
- **BeverageConsumption**: Beverage purchases by players
- **Transaction**: Generic transaction record (positive = credit, negative = debit)
- **AuditLog**: Audit trail for admin actions

### Important Fields
- All dates are **ISO strings** (e.g., `"2025-11-02T14:30:00.000Z"`)
- Amounts are in **EUR** (not cents)
- `paid: boolean` indicates payment status
- `paidAt?: string | null` tracks when payment was made
- `amountPaid?: number | null` for partial payments

---

## Important Rules

### Security & Secrets
1. **NEVER commit secrets**: `.env.local` and `.env.production` contain Firebase credentials
2. Both files are in `.gitignore` - keep it that way!
3. Firebase service account credentials are sensitive

### Code Quality
1. **ALWAYS run `npm run typecheck`** before committing
2. **Run tests** before pushing (`npm test`)
3. **Check coverage** if adding new utilities (`npm test:coverage`)
4. Follow the service layer pattern (no direct Firestore access outside services)

### Data Integrity
1. Use existing types from `src/lib/types.ts`
2. Don't create duplicate type definitions
3. Balance calculations should use `BalanceService`
4. All Firestore writes should update `updatedAt` timestamps

### AI Flows
1. Keep AI logic in `src/ai/flows/` directory
2. AI flows are separate from the main Next.js app
3. Use Genkit dev server for testing (`npm run genkit:dev`)
4. Example flow: `suggest-fines-from-description.ts`

---

## Database Operations

### Firestore Structure
```
collections:
├── players/
├── fines/
├── payments/
├── dues/
├── duePayments/
├── beverages/
├── beverageConsumptions/
└── auditLogs/
```

### Database Utilities
```bash
# Check Firestore data (reads and displays data)
npm run check:db

# Wipe ALL Firestore data (DANGEROUS! Use with caution!)
npm run wipe:db
```

### Firestore Rules
- Rules defined in `firestore.rules`
- Indexes defined in `firestore.indexes.json`
- Rules are deployed via Firebase CLI

---

## CSV Import Functionality

The application supports CSV imports for bulk data entry.

### Import Logic
- Main logic: `src/lib/csv-import-firestore.ts`
- Utilities: `src/lib/csv-utils.ts`
- Example CSVs: `example-csv/` directory

### Supported Imports
- Players
- Fines
- Payments
- Dues
- Due Payments
- Beverages

### CSV Requirements
- Must match schema in `src/lib/types.ts`
- Dates in ISO format
- Amounts in EUR (numbers, not strings)

---

## Firebase Configuration

### Environment Files
- **Development**: `.env.local` (used by `npm run dev`)
- **Production**: `.env.production` (used by `npm run build`)

### Required Environment Variables
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
GOOGLE_GENAI_API_KEY=
```

### Firebase Services Used
- **Firestore**: Database
- **Storage**: (configured, may not be actively used)
- **App Hosting**: Deployment target (see `apphosting.yaml`)

---

## Deployment

### Build Process
```bash
# Production build
npm run build

# Note: TypeScript errors are ignored in build (ignoreBuildErrors: true)
# But you should still fix them!
```

### Deployment Target
- **Firebase App Hosting** (config: `apphosting.yaml`)
- Auto-deploys via GitHub Actions (see `.github/workflows/`)
- Environment: Firebase Project (check `.firebaserc`)

### Pre-Deployment Checklist
1. Run `npm run typecheck` - fix all type errors
2. Run `npm test` - ensure tests pass
3. Run `npm run lint` - fix linting issues
4. Test locally with `npm run build && npm start`

---

## Common Gotchas & Tips

### Port Configuration
- Development server runs on **port 9002**, NOT 3000!
- Local URL: `http://localhost:9002`
- Genkit dev server runs on a different port

### TypeScript
- Build process ignores TypeScript errors (`ignoreBuildErrors: true`)
- **Still run `npm run typecheck` manually!** Don't rely on build to catch errors
- Strict mode is enabled - be careful with null/undefined

### Firebase
- Genkit flows need separate dev server (`npm run genkit:dev`)
- Service account may be needed for admin operations
- Firestore rules are security-critical - test carefully

### Image Handling
- Next.js Image component configured for:
  - `placehold.co`
  - `images.unsplash.com`
  - `picsum.photos`
  - `ui-avatars.com`
- SVGs are allowed (dangerouslyAllowSVG: true)

### Testing
- Components and app directory are excluded from coverage
- AI flows are excluded from coverage
- Setup file runs before all tests: `tests/setup.ts`

### CSV Imports
- Must match exact schema in types
- Date format is critical (ISO strings)
- Amount format matters (EUR, not cents)

---

## Git Workflow & Commits

### Commit Guidelines
- Use conventional commits format (e.g., `feat:`, `fix:`, `chore:`)
- Reference file paths in commit messages when possible
- Always run `npm run typecheck` before committing
- Ensure tests pass before pushing

### Branch Strategy
- Main branch: `main`
- Feature branches: `feature/description`
- Bug fixes: `fix/description`

---

## Useful Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 9002 with Turbopack |
| `npm run genkit:dev` | Start Genkit AI dev server |
| `npm run genkit:watch` | Start Genkit with auto-reload |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type check without emitting files |
| `npm test` | Run tests with Vitest |
| `npm test:ui` | Run tests with UI |
| `npm test:coverage` | Run tests with coverage report |
| `npm run check:db` | Check Firestore data |
| `npm run wipe:db` | Wipe Firestore data (DANGEROUS!) |

---

## Additional Resources

### Documentation Files
- `README.md` - Basic project info
- `SETUP-ADMIN.md` - Admin setup instructions
- `PRD-01-IMPLEMENTATION-COMPLETE.md` - Product requirements
- `TEST_IMPLEMENTATION_REPORT.md` - Testing documentation
- `JUNIE.md` - (Unknown, check content)

### Review Process
- Reviews stored in `reviews/` directory
- Implementation docs in `docs/` directory

---

## Support & Questions

If you encounter issues:
1. Check existing documentation in `docs/`
2. Review test implementation in `tests/`
3. Check Firebase console for database state
4. Use `npm run check:db` to inspect data
5. Review Firestore rules if permission errors occur

---

**Last Updated**: 2025-11-02
**Project Status**: Active Development
**Main Branch**: `main`
**Node Version**: 20+
**Package Manager**: npm
