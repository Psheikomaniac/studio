# PRD-11: Dokumentationsstandards – Finalisierung & Qualitätssicherung

## Überblick
Dieses PRD schließt die offenen Punkte aus `docs/PRD-06-Documentation-Standards.md`. Es vereinheitlicht Struktur, Inhalte und Qualitätssicherung der Projektdokumentation. Ziel ist eine konsistente, aktuelle und überprüfbare Doku-Landschaft für Onboarding, Betrieb und Entwicklung.

---

## 🐝 HIVE MIND ANALYSIS: Good Foundation, Needs Expansion

### ✅ EXISTING DOCUMENTATION (Good Quality!)

**Root Level**:
- ✅ `README.md` - German, well-structured, good Quick Start
- ✅ `AGENTS.md` - Comprehensive (425 lines!), excellent developer guide

**Docs Folder**:
- ✅ PRD-07 through PRD-11 (untracked, now with Hive Mind solutions!)
- ⚠️ No PRD-01 through PRD-06 found (referenced but missing)

### ⚠️ GAPS IDENTIFIED

**Missing Files**:
- ❌ `CONTRIBUTING.md` (mentioned in PRD-08, should exist)
- ❌ CI badges in README
- ❌ `docs/templates/` directory
- ❌ `markdownlint` configuration
- ❌ Individual READMEs in subdirectories

**Missing Templates**:
- ❌ `PRD-TEMPLATE.md`
- ❌ `IMPLEMENTATION-COMPLETE-TEMPLATE.md`
- ❌ `REPORT-TEMPLATE.md`

---

## 🎯 REVISED Implementation Plan (Straightforward)

### Task 1: Create Templates (2-3 hours)

**File**: `docs/templates/PRD-TEMPLATE.md`
```markdown
# PRD-XX: [Title]

## Überblick
[1-2 Absätze: Was wird gemacht und warum?]

## Ziele
- [Messbares Ziel 1]
- [Messbares Ziel 2]

## Nicht-Ziele
- [Explizit ausgeschlossen]

## Scope
- [Bereich 1]
- [Bereich 2]

## Technischer Plan
1. [Schritt 1]
2. [Schritt 2]

## Testplan
- [Testkriterium 1]
- [Testkriterium 2]

## Akzeptanzkriterien
- [ ] [Kriterium 1]
- [ ] [Kriterium 2]

## Metriken
- [Messbare Metrik]: [Zielwert]

## Risiken
- [Risiko]: [Mitigation]

## Deliverables
- [Deliverable 1]
- [Deliverable 2]

## Zeitplan
- [Phase 1]: X Stunden/Tage
- [Phase 2]: Y Stunden/Tage
```

**File**: `docs/templates/IMPLEMENTATION-COMPLETE-TEMPLATE.md`
```markdown
# PRD-XX Implementation Complete Report

## Summary
[1 Absatz: Was wurde umgesetzt?]

## Acceptance Criteria Status

| Criterion | Status | Evidence |
|-----------|--------|----------|
| [Criterion 1] | ✅/⚠️/❌ | [Link/Screenshot/Test ID] |
| [Criterion 2] | ✅/⚠️/❌ | [Link/Screenshot/Test ID] |

## Deliverables Completed

- ✅ [Deliverable 1] - [Location/Link]
- ✅ [Deliverable 2] - [Location/Link]
- ⚠️ [Partial] - [Reason]

## Test Results

- Unit Tests: X/Y passing
- Integration Tests: X/Y passing
- Coverage: X%

## Known Limitations

- [Limitation 1]
- [Limitation 2]

## Next Steps

- [Follow-up task 1]
- [Follow-up task 2]

## Sign-Off

- Implementer: [Name], [Date]
- Reviewer: [Name], [Date]
```

**File**: `docs/templates/REPORT-TEMPLATE.md`
```markdown
# [Report Title] - [Date]

## Context
[Warum wurde dieser Report erstellt?]

## Methodology
[Wie wurden die Daten gesammelt/analysiert?]

## Results

### Finding 1
[Details]

### Finding 2
[Details]

## Recommendations

1. [Recommendation with priority]
2. [Recommendation with priority]

## Conclusion
[Zusammenfassung]

## Appendix
[Raw data, screenshots, etc.]
```

### Task 2: Add CI Badges to README (30 minutes)

**Update `README.md`** (add after title):
```markdown
# balanceUp – Club Finance Studio

[![Test](https://github.com/[username]/[repo]/workflows/Test/badge.svg)](https://github.com/[username]/[repo]/actions)
[![codecov](https://codecov.io/gh/[username]/[repo]/branch/main/graph/badge.svg)](https://codecov.io/gh/[username]/[repo])
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.0-black)](https://nextjs.org/)
```

### Task 3: Create CONTRIBUTING.md (1 hour)

**File**: `CONTRIBUTING.md`
```markdown
# Contributing Guidelines

## Pre-Commit Checklist

Before submitting a PR, ensure:

1. ✅ `npm run typecheck` passes (zero TypeScript errors)
2. ✅ `npm run lint` passes (zero ESLint errors)
3. ✅ `npm test` passes (all tests green)
4. ✅ Coverage maintained or improved
5. ✅ Documentation updated (if needed)

## Running Quality Checks Locally

```bash
# Full CI simulation
npm run ci

# Individual checks
npm run typecheck
npm run lint
npm test
npm run test:coverage
```

## Code Style

- **TypeScript**: Strict mode enabled
- **Imports**: Use `@/` alias for absolute paths
- **Services**: All Firestore operations via service layer
- **Components**: Functional components with hooks
- **Testing**: Aim for 80%+ coverage on new code

## Commit Messages

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `test:` Adding/updating tests
- `refactor:` Code change without behavior change
- `chore:` Build/dependency updates

## Pull Request Process

1. Create feature branch: `feature/description` or `fix/description`
2. Make changes with tests
3. Run `npm run ci` locally
4. Push and create PR
5. Address review comments
6. Squash merge after approval

## Documentation Standards

- Update README if adding scripts/features
- Create PRD for significant features
- Add completion reports for PRDs
- Keep AGENTS.md current with architecture changes

## Getting Help

- Check `AGENTS.md` for project architecture
- Review `docs/` for PRDs and reports
- Ask in PR comments for clarification
```

### Task 4: Setup Markdownlint (1 hour)

**Install**:
```bash
npm install --save-dev markdownlint-cli
```

**Create `.markdownlint.json`**:
```json
{
  "default": true,
  "MD013": false,
  "MD033": { "allowed_elements": ["br", "details", "summary"] },
  "MD041": false
}
```

**Add Script**:
```json
"scripts": {
  "docs:lint": "markdownlint '**/*.md' --ignore node_modules"
}
```

### Task 5: Create Missing README Files (2-3 hours)

**File**: `src/services/README.md` (enhance existing)
**File**: `src/components/README.md` (new)
**File**: `src/hooks/README.md` (new)
**File**: `tests/README.md` (new)

Each should include:
- Purpose of directory
- Key files and their responsibilities
- Usage examples
- Testing guidelines

---

## Deliverables (Complete List)

**Templates**:
- ✅ `docs/templates/PRD-TEMPLATE.md`
- ✅ `docs/templates/IMPLEMENTATION-COMPLETE-TEMPLATE.md`
- ✅ `docs/templates/REPORT-TEMPLATE.md`

**Root Files**:
- ✅ `CONTRIBUTING.md`
- ✅ Updated `README.md` with badges

**Documentation**:
- ✅ `src/services/README.md` (enhanced)
- ✅ `src/components/README.md` (new)
- ✅ `src/hooks/README.md` (new)
- ✅ `tests/README.md` (new)

**Config**:
- ✅ `.markdownlint.json`
- ✅ `package.json` scripts updated

**Validation**:
- ✅ `npm run docs:lint` passes

---

## Zeitplan (REVISED)

**ORIGINAL**: 1-2 Tage
**REVISED**: 1 Tag (8 hours)

**Breakdown**:
- Templates creation: 2-3 hours
- CI badges: 30 minutes
- CONTRIBUTING.md: 1 hour
- Markdownlint setup: 1 hour
- README files: 2-3 hours
- Validation: 30 minutes

**Total**: ~8 hours (1 working day)

## Ziele
- Vollständige README-Abdeckung: Root, Services, Tests, E2E, Reviews, Docs-Übersichten, ggf. weitere Verzeichnisse.
- Sichtbare Projekt-Badges (Build, Tests, Coverage, Lint, Typecheck) im Root-README.
- Standardisierte Templates (PRD, Reports, CHANGELOG, CONTRIBUTING) und Doc-Lint.
- Prozesse für Pflege & Review der Doku (Owner, Review-Checkliste, Aktualisierungspflicht in PRs).

## Nicht-Ziele
- Inhaltliche Erweiterung der Fachkonzepte über Konsolidierung und Vereinheitlichung hinaus.

## Scope
- README-Standards (Abschnitte, Tonalität, Sprache DE, Links, Quick Start, Tech Stack, Pfade, häufige Tasks)
- Badge-Setup (CI, Coverage, Lint/Typecheck)
- Templates (PRD, IMPLEMENTATION-COMPLETE, REPORT, ADR optional)
- Doc-Lint (Markdownlint/Remark), Link-Checker
- Pflegeprozess (OWNERS, PR-Checkliste)

## Standards (Soll-Zustand)
Jede README enthält mindestens:
- Projekt-/Verzeichniszweck in 1–2 Sätzen
- Quick Start / Befehle
- Struktur/Verweise (wichtige Dateien, Pfade)
- Qualitäts-/Testhinweise (falls relevant)
- Status/Badges (sofern sinnvoll)

Root-README ergänzt um:
- Badges: Build, Tests (E2E/Unit), Coverage, Lint, Typecheck
- Versions-/Lizenzhinweis
- Architektur-Überblick (1 Schaubild-Link)

## Technischer Plan
1. Badges
   - Platzhalter- oder reale Badge-Links für: CI Build, Unit/Int/E2E, Coverage, Lint, Typecheck.
   - Integration in `README.md`, Abschnitt „Status & Badges“.

2. Templates in `docs/templates/`
   - `PRD-TEMPLATE.md` (Ziele, Scope, Nicht-Ziele, Architektur, Plan, Tests, Acceptance, Risiken, Deliverables)
   - `IMPLEMENTATION-COMPLETE-TEMPLATE.md` (Checkliste, Metriken, Belege, offene Punkte)
   - `REPORT-TEMPLATE.md` (Kontext, Methode, Ergebnisse, Fazit)

3. Doc-Lint & Link-Check
   - `markdownlint`/`remark-lint` Konfiguration vorbereiten (`.markdownlint.json` oder `.remarkrc`), Anleitung dokumentieren.
   - `npm run docs:lint` und `npm run docs:links` Skripte definieren (Check-Only, kein Build-Impact).

4. Pflegeprozess
   - `CONTRIBUTING.md` Abschnitt „Doku-Pflichten“ (README-Update Pflicht bei Änderungen; PR-Checkliste).
   - OWNERS/Maintainer-Tabelle in `JUNIE.md` oder `AGENTS.md` ergänzen.

## Testplan
- `npm run docs:lint` gegen Repo – keine Errors.
- Link-Checker: keine toten internen Links; externe Links optional gewhitelistet.
- Manuelle Review: READMEs vollständig, konsistent; Badges sichtbar.

## Akzeptanzkriterien
- Alle priorisierten Verzeichnisse haben eine aktuelle README mit Mindestinhalten.
- Root-README enthält die Badges und aktualisierte Verweise.
- Templates liegen unter `docs/templates/` und werden verlinkt.
- Doc-Lint und Link-Checker laufen lokal erfolgreich.

## Metriken
- Anzahl Doc-Lint Fehler = 0
- Anzahl toter Links = 0
- Onboarding-Zeit (subjektive Metrik, optional Survey)

## Risiken
- Badge-Quellen variieren je CI-Anbieter → Platzhalter/Provider-agnostische Hinweise bereitstellen.
- Doku-Drift → Pflegeprozess und PR-Checkliste verbindlich anwenden.

## Deliverables
- Ergänzte `README.md` (Root) mit Badges
- `docs/templates/*` Templates
- Skripte/Config für Doc-Lint/Link-Checker (dokumentiert)
- Kurzreport „Documentation Standards Complete“
