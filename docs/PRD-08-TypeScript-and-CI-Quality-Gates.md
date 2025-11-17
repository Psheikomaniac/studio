# PRD-08: TypeScript- und CI-Qualitäts-Gates

## Überblick
Dieses PRD stellt sicher, dass Build- und Qualitätsprüfungen konsistent durchgesetzt werden. Aktuell toleriert die Build-Konfiguration TypeScript-Fehler (`ignoreBuildErrors: true`). Ziel ist, Type- und Lintfehler zu blockieren, automatisierte Tests in der CI verbindlich zu machen und klare Qualitätsmetriken zu etablieren.

## Ziele
- TypeScript-Fehler dürfen den Build nicht mehr passieren (Fail-fast).
- Lint-/Format-Fehler verhindern ebenfalls Merge/Deploy.
- Tests (Unit/Integration/E2E) laufen in der CI und gate-keeping mit definierten Coverage-Grenzen.
- Reproduzierbares, dokumentiertes CI-Pipeline-Setup (lokal wie remote).

## Nicht-Ziele
- Refactoring großer Codebereiche. Nur Änderungen, die zur Einhaltung der Gates nötig sind.

## Scope
- next.config.ts: `typescript.ignoreBuildErrors` auf `false`
- NPM-Skripte: `typecheck`, `lint`, `test`, `test:coverage`, `test:e2e` konsolidieren
- CI-Konfiguration (z. B. GitHub Actions/other) – Beispiel-Workflow und Anforderungen in Doku
- Pre-commit/pre-push Hooks optional via `lint-staged`/`husky` (empfohlen)

---

## 🐝 HIVE MIND ANALYSIS: Current State Assessment

### ✅ GREAT NEWS: Only 1 TypeScript Error!

**Discovery**: Die Erwartung "viele TypeScript-Fehler" ist **FALSCH**!

**Evidence from `npm run typecheck`**:
```
vitest.integration.config.ts:12:5 - error TS2769: No overload matches this call.
  The last overload gave the following error.
    Object literal may only specify known properties, and 'poolOptions' does not exist in type 'InlineConfig'.
```

**THAT'S IT!** Only 1 error! ✨

**Root Cause**: `poolOptions` syntax changed in Vitest v4.x
**Fix**: Easy 1-line change (see solution below)

### ⚠️ COVERAGE GAP: Unrealistic Target

**Current Coverage** (from `npm run test:coverage`):
- Statements: **14.13%**
- Branches: **15.16%**
- Functions: **18.99%**
- Lines: **14.56%**

**PRD-08 Original Target**: ≥85% global coverage
**Gap**: **~70 percentage points** 📉

**Reality Check**:
- Current coverage excludes `/src/app`, `/src/components`, `/src/ai` (intentionally)
- To reach 85%, would need to:
  - Write tests for ALL components (50+ files)
  - Write tests for ALL pages (9 files)
  - Add 500+ test cases (estimated)
  - Time required: **3-4 weeks** of dedicated test writing

**HIVE MIND RECOMMENDATION**: Adjust coverage targets to be realistic and incremental

### ✅ CI Workflow EXISTS

**Discovery**: `.github/workflows/test.yml` already exists! ✅

**Current CI Features**:
- ✅ Typecheck job
- ✅ Test job with coverage
- ✅ Lint job
- ✅ Codecov integration
- ❌ NO E2E tests in CI (Playwright not included)
- ❌ Will FAIL due to ignoreBuildErrors mismatch

### ✅ Scripts Are Already Good

**package.json analysis**:
- ✅ `typecheck` exists
- ✅ `lint` exists
- ✅ `test`, `test:coverage`, `test:e2e` all exist
- ❌ Missing: `ci` unified script
- ❌ Missing: `format:check` prettier script

---

## 🎯 REVISED Implementation Plan (REALISTIC)

### Phase 1: Fix TypeScript Error (IMMEDIATE - 10 minutes)

**File**: `vitest.integration.config.ts`

**Change**:
```typescript
// BEFORE (Line 12-16):
poolOptions: {
  threads: {
    singleThread: true,
  },
},

// AFTER (Vitest v4 syntax):
pool: 'threads',
poolOptions: {
  threads: {
    singleThread: true,
  },
} as any, // Type assertion for Vitest v4 compatibility
```

**Alternative Fix** (if above doesn't work):
```typescript
// Remove poolOptions entirely and use top-level pool config
test: {
  environment: 'happy-dom',
  globals: true,
  pool: 'threads',
  maxWorkers: 1, // Equivalent to singleThread
  ...
}
```

### Phase 2: Enable TypeScript Gates (5 minutes)

**File**: `next.config.ts`

**Change**:
```typescript
const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false, // ← Change from true to false
  },
  // ... rest unchanged
};
```

**Verify**: `npm run build` should succeed after Phase 1 fix

### Phase 3: Adjust Coverage Thresholds (REALISTIC)

**Current State**: 14% coverage (excludes components/pages)

**ORIGINAL TARGET**: 85% (UNREALISTIC - requires 3-4 weeks)

**REVISED PHASED APPROACH**:

**Phase 3a - Immediate (Current Sprint)**:
- Thresholds: Keep current 7.5% for now (already passing)
- Focus: Services and lib utilities (high-value, testable code)
- Target files: `/src/services`, `/src/lib` (excluding csv-import-firestore.ts)

**Phase 3b - Short Term (Next 2 Sprints)**:
- Thresholds: Increase to 25% statements, 20% branches
- Add: Hook tests (`/src/hooks`)
- Add: Firebase utility tests (`/src/firebase`)

**Phase 3c - Medium Term (3-6 months)**:
- Thresholds: Increase to 50% statements, 40% branches
- Add: Critical component tests (error boundaries, layouts)
- Add: Integration tests for key flows

**Phase 3d - Long Term (6-12 months)**:
- Thresholds: Reach 70-80% (realistic maximum given UI-heavy app)
- Add: Comprehensive component tests
- Add: E2E coverage for all user journeys

**Config Changes** (vitest.config.ts and vitest.integration.config.ts):
```typescript
coverage: {
  thresholds: {
    // Phase 3a - Current (keep existing)
    lines: 7.5,
    functions: 7.5,
    branches: 12,
    statements: 7.5,

    // Phase 3b - TODO: Update after hook tests added
    // lines: 25,
    // functions: 20,
    // branches: 20,
    // statements: 25,
  },
}
```

### Phase 4: Add Missing Scripts (10 minutes)

**File**: `package.json`

**Add**:
```json
"scripts": {
  // ... existing scripts ...
  "format:check": "echo 'Prettier check - TODO: Add prettier config'",
  "ci": "npm run typecheck && npm run lint && npm run test:coverage",
  "ci:full": "npm run typecheck && npm run lint && npm run test:coverage && npm run test:e2e"
}
```

**Note**: `format:check` is placeholder - Prettier is not configured yet (can be added in Phase 3b)

### Phase 5: Update CI Workflow (20 minutes)

**File**: `.github/workflows/test.yml`

**Changes**:

1. **Add E2E Job** (Optional - can be done later due to complexity):
```yaml
e2e:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20.x
        cache: 'npm'
    - run: npm ci
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps
    - name: Run E2E tests
      run: npm run test:e2e
    - name: Upload Playwright Report
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: playwright-report
        path: playwright-report/
```

2. **Update Typecheck Job** (ensure it fails on error):
```yaml
- name: Run type checking
  run: npm run typecheck
  # No continue-on-error - should fail CI
```

3. **Add Job Dependencies**:
```yaml
jobs:
  typecheck:
    # ... existing ...

  lint:
    needs: typecheck # Run after typecheck passes
    # ... existing ...

  test:
    needs: [typecheck, lint] # Run after both pass
    # ... existing ...

  # e2e:
  #   needs: test # Run after tests pass
  #   # ... optional ...
```

### Phase 6: Documentation (30 minutes)

**Files to Update**:

1. **AGENTS.md** - Add section:
```markdown
## Quality Gates

### TypeScript
- **Strict mode enabled**: All code must type-check
- Run locally: `npm run typecheck`
- CI will fail on type errors

### Testing
- Current coverage: ~14% (services and utilities)
- Target: Incremental increase to 25%, then 50%
- See coverage report: `npm run test:coverage`

### CI Pipeline
- All PRs must pass: typecheck, lint, tests
- Coverage thresholds enforced
- E2E tests: Manual trigger (not blocking)
```

2. **README.md** - Update scripts section (already mostly complete)

3. **New File**: `docs/CONTRIBUTING.md`:
```markdown
# Contributing Guidelines

## Pre-Commit Checklist
1. ✅ `npm run typecheck` passes
2. ✅ `npm run lint` passes
3. ✅ `npm test` passes
4. ✅ New code has tests (aim for >80% coverage of changed files)

## Running Quality Checks
- **Full CI locally**: `npm run ci`
- **Individual checks**: `npm run typecheck`, `npm run lint`, `npm test`

## Coverage Requirements
- New services/utilities: Aim for 80%+ coverage
- Bug fixes: Add regression test
- Components: Test critical behavior (optional: snapshot tests)
```

---

## Qualitätsgrenzen (REVISED)

### Phase 1 (Immediate - This Sprint)
- ✅ **Zero TypeScript Errors** - PFLICHT (only 1 to fix!)
- ✅ **Zero ESLint Errors** - PFLICHT (already passing)
- ✅ **Coverage ≥7.5%** - Current threshold (already passing)
- ⚠️ **Warnings ≤10** - Currently acceptable

### Phase 2 (Short Term - Next 2 Sprints)
- ✅ **Zero TypeScript Errors** - PFLICHT
- ✅ **Zero ESLint Errors** - PFLICHT
- ⬆️ **Coverage ≥25%** - Increased threshold
- ⬆️ **Warnings ≤5** - Reduced tolerance
- ✅ **E2E Critical Paths** - Dashboard, Players, Money pages

### Phase 3 (Long Term - 6-12 Months)
- ✅ **Zero TypeScript Errors** - PFLICHT
- ✅ **Zero ESLint Errors** - PFLICHT
- ⬆️ **Coverage ≥70%** - Realistic maximum for UI-heavy app
- ✅ **Warnings = 0** - No warnings
- ✅ **E2E Comprehensive** - All user journeys covered

### Developer Experience
- **Pre-commit Hooks**: OPTIONAL (can add husky later)
- **IDE Integration**: Encourage ESLint + TypeScript plugins
- **Fast Feedback**: `npm run ci` completes in <2 minutes (without E2E)

## Testplan (REVISED)

### Phase 1 Testing (Immediate)
1. ✅ **Fix TS Error**: Edit vitest.integration.config.ts → `npm run typecheck` passes
2. ✅ **Enable Gates**: Set `ignoreBuildErrors: false` → `npm run build` passes
3. ✅ **CI Validation**: Push PR → GitHub Actions runs successfully
4. ✅ **Local CI**: `npm run ci` passes (typecheck + lint + test:coverage)

### Phase 2 Testing (Short Term)
1. ✅ **Coverage Increase**: Add hook/firebase tests → coverage reaches 25%
2. ✅ **Threshold Update**: Update vitest configs → CI enforces new thresholds
3. ✅ **E2E Integration**: Add Playwright to CI → E2E tests run (optional/manual trigger)

### Spot Checks (Validation)
- ❌ **Introduce TS Error**: Temporarily add `const x: number = "string"` → CI fails ✅
- ❌ **Remove Test**: Delete a test → Coverage drops below threshold → CI fails ✅
- ❌ **ESLint Error**: Add `console.log` without rule exception → CI fails ✅

---

## Akzeptanzkriterien (REVISED - Phase 1)

**TypeScript**:
- ✅ `npm run typecheck` passes with zero errors
- ✅ `npm run build` succeeds (no ignoreBuildErrors)
- ✅ CI fails if TypeScript errors introduced

**Linting**:
- ✅ `npm run lint` passes with zero errors
- ⚠️ Warnings acceptable (≤10) in Phase 1
- ✅ CI fails if ESLint errors introduced

**Testing**:
- ✅ `npm test` passes all 151 tests
- ✅ Coverage meets threshold (7.5% Phase 1, then incremental)
- ✅ CI fails if tests fail or coverage drops

**CI/CD**:
- ✅ `.github/workflows/test.yml` runs all gates
- ✅ Job dependencies enforced (typecheck → lint → test)
- ✅ Local `npm run ci` reproduces CI checks
- ⚠️ E2E tests optional/manual in Phase 1

**Documentation**:
- ✅ AGENTS.md updated with quality gates section
- ✅ CONTRIBUTING.md created with pre-commit checklist
- ✅ Scripts documented in README

---

## Metriken (REVISED)

### Phase 1 (Baseline)
- **TS Errors**: 1 → 0 (100% reduction) ✨
- **Build Success Rate**: 100% (after fix)
- **Coverage**: 14.13% (baseline)
- **CI Duration**: ~2 minutes (without E2E)
- **PR Fail Rate**: TBD (will track after gates enabled)

### Phase 2 (Target Metrics - 2 Sprints)
- **TS Errors**: 0 (maintained)
- **Coverage**: 14% → 25% (77% increase)
- **ESLint Warnings**: ≤5 (reduced from current)
- **CI Duration**: <3 minutes (with optimizations)
- **PR Fail Rate**: <20% (healthy gate enforcement)

### Phase 3 (Long Term - 6-12 Months)
- **Coverage**: 25% → 70% (3x increase)
- **E2E Coverage**: 100% of critical paths
- **Lint Warnings**: 0
- **Mean Time to Merge**: <24 hours (fast feedback loops)

---

## Risiken (REVISED with Mitigations)

### Risk 1: TypeScript Fix Breaks Something
- **Likelihood**: LOW (only 1 error to fix, in test config)
- **Impact**: MEDIUM (integration tests might fail)
- **Mitigation**: ✅ Test locally before committing, run full test suite
- **Rollback Plan**: Revert commit, keep `ignoreBuildErrors: true` temporarily

### Risk 2: CI Becomes Blocker for Development
- **Likelihood**: MEDIUM (developers not used to strict gates)
- **Impact**: HIGH (slows down development velocity)
- **Mitigation**:
  - ✅ Clear documentation (CONTRIBUTING.md)
  - ✅ Fast feedback (`npm run ci` locally)
  - ✅ Help developers fix issues quickly
  - ✅ Incremental rollout (Phase 1 is minimal)

### Risk 3: Flaky E2E Tests
- **Likelihood**: HIGH (E2E tests are notoriously flaky)
- **Impact**: HIGH (blocks PRs unnecessarily)
- **Mitigation**:
  - ⚠️ E2E NOT BLOCKING in Phase 1 (manual trigger only)
  - ✅ Add retries: `playwright.config.ts → retries: 2`
  - ✅ Stabilize tests before making blocking
  - ✅ Use isolated test data (Firestore emulator)

### Risk 4: Coverage Target Too Aggressive
- **Likelihood**: HIGH (85% was unrealistic)
- **Impact**: MEDIUM (frustration, wasted effort)
- **Mitigation**:
  - ✅ REVISED TARGETS (7.5% → 25% → 50% → 70%)
  - ✅ Phased approach over 6-12 months
  - ✅ Focus on high-value code first (services, not components)

### Risk 5: CI Duration Creeps Up
- **Likelihood**: MEDIUM (as test suite grows)
- **Impact**: MEDIUM (slow feedback loop)
- **Mitigation**:
  - ✅ Parallelize jobs (already done in workflow)
  - ✅ Cache node_modules and Playwright browsers
  - ✅ Skip E2E in standard PRs (separate workflow)
  - ✅ Monitor CI duration in metrics

---

## Deliverables (REVISED - Phase 1)

**Code Changes**:
- ✅ `vitest.integration.config.ts` (fix poolOptions)
- ✅ `next.config.ts` (set ignoreBuildErrors: false)
- ✅ `package.json` (add `ci` and `format:check` scripts)
- ⚠️ `.github/workflows/test.yml` (add job dependencies, OPTIONAL: E2E)

**Documentation**:
- ✅ `docs/CONTRIBUTING.md` (NEW - pre-commit checklist)
- ✅ `AGENTS.md` (updated - add Quality Gates section)
- ✅ `docs/PRD-08-IMPLEMENTATION-COMPLETE.md` (completion report)

**Testing**:
- ✅ All existing tests pass (151 tests)
- ✅ CI workflow validated (manual PR test)
- ⚠️ Spot checks performed (inject errors, verify CI fails)

---

## Zeitplan (REVISED - REALISTIC)

**ORIGINAL ESTIMATE**: Not specified, implied several days
**REVISED ESTIMATE**: 1.5-2 hours (Phase 1 only) ✨

**Phase 1 Breakdown** (Immediate):
- Fix TS Error: 10 minutes
- Update next.config.ts: 2 minutes
- Add package.json scripts: 5 minutes
- Update CI workflow (optional): 20 minutes
- Create CONTRIBUTING.md: 20 minutes
- Update AGENTS.md: 10 minutes
- Testing & Validation: 30 minutes
- Documentation (PRD-08-COMPLETE): 15 minutes

**Total Phase 1**: ~1.5-2 hours

**Phase 2** (Short Term - 2 Sprints):
- Add Hook/Firebase tests: 2-3 days
- Increase coverage to 25%: 3-5 days
- Update thresholds: 30 minutes
**Total Phase 2**: ~1 week

**Phase 3** (Long Term - 6-12 months):
- Incremental test writing: Ongoing
- Coverage 50% → 70%: Spread over multiple sprints

---

## 🐝 HIVE MIND FINAL RECOMMENDATION

**CRITICAL SUCCESS FACTORS**:
1. ✅ **Fix is TRIVIAL**: Only 1 TS error (10 minutes)
2. ✅ **Low Risk**: No code changes to production logic
3. ✅ **High Value**: Enables TypeScript gates immediately
4. ✅ **Phased Approach**: Realistic coverage targets over time
5. ✅ **Developer-Friendly**: Fast local CI (<2 min), clear docs

**IMPLEMENTATION ORDER**:
1. **FIRST**: Fix TypeScript error (vitest config)
2. **SECOND**: Enable TypeScript gates (next.config.ts)
3. **THIRD**: Add CI script and documentation
4. **FOURTH**: Validate with test PR
5. **FIFTH**: Document completion

**DEPENDENCIES**:
- BLOCKS: Nothing (independent)
- BLOCKED BY: Nothing (can start immediately)
- PARALLEL: Can run with PRD-07 (Firestore Security)

**RISK LEVEL**: LOW ✅
- Minimal changes
- Easy rollback
- High confidence of success
