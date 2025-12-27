# PRD-13: Lighthouse CI & verbindliche Performance-Budgets im CI

## Kontext
In PRD-05 und PRD-10 werden Performance-Optimierung, Messungen und Budgets gefordert. Aktuell fehlt jedoch ein automatisierter Lighthouse-Workflow im CI sowie klar durchgesetzte Budgets.

## Zielsetzung
- Einrichtung eines reproduzierbaren Lighthouse-Workflows im CI (Pull Requests, main).
- Definition und Durchsetzung verbindlicher Performance-Budgets (z. B. LCP, TBT, CLS, JS-Bundlegröße).
- Artefakt-Generierung (Berichte) zur Nachvollziehbarkeit der Messergebnisse.

## Scope
- CI-Workflow mit Lighthouse CI (Headless, gegen Preview/Build/Static Export – je nach Projektsetup).
- Budgets und Thresholds als Konfiguration (JSON/YAML) versioniert im Repo.
- Reports als Build-Artefakte speichern.

## Out of Scope
- Tiefe Performance-Optimierungen am Code (separat in PRD-05/10 abzubilden).
- E2E-Lasttests oder Synthetics außerhalb Lighthouse.

## Deliverables
1. Workflow-Datei:
   - `.github/workflows/lighthouse.yml`
     - läuft auf PRs und `main` (push)
     - erzeugt Lighthouse-Reports (HTML/JSON) als Artefakte
     - bricht bei Budget-Verletzung ab (non-zero exit)
2. Budgets/Config:
   - `docs/performance-budgets.json` (oder `lighthouserc.js` ergänzt) mit u. a.:
     - LCP ≤ 2.5s (Mobile)
     - TBT ≤ 200ms (Mobile)
     - CLS ≤ 0.1 (Mobile)
     - JS ≤ 170KB (transfer, initial)
3. Dokumentation:
   - Abschnitt in `docs/PERFORMANCE-TESTING-GUIDE.md` oder `docs/README-PERFORMANCE.md` zur Nutzung und Interpretation

## Acceptance Criteria
- AC1: CI-Workflow existiert und wird auf PR und main ausgeführt.
- AC2: Bei Budget-Überschreitung schlägt der Workflow fehl.
- AC3: Reports werden als Artefakte verfügbar gemacht.
- AC4: Budgets sind versioniert und im Repo dokumentiert.

## Abhängigkeiten
- PRD-05: Performance Optimization Strategy
- PRD-10: Performance-Optimierung – Abschluss & Budgets

## Risiken / Annahmen
- Messumgebung (Preview-URL vs. lokal statischer Build) kann Messergebnisse beeinflussen.
- Budgetwerte müssen ggf. iterativ kalibriert werden, basierend auf realen Messungen.

## Umsetzungshinweise
- Start mit konservativen Budgets (siehe Deliverables) und iterative Verschärfung nach Messdatenerhebung.
- Optional: GitHub Pages/Artifacts zur leichten Einsicht der Reports.
- Ergänzend: Bundle-Analyse mit `@next/bundle-analyzer` (separater CI-Schritt optional) zur Ursachenanalyse.

## Definition of Done
- Workflow und Budgets vorhanden; erste Pipeline-Läufe dokumentiert.
- Verlinkung der Reports/Artefakte in PR-Kommentaren oder Build-Logs nachvollziehbar.
