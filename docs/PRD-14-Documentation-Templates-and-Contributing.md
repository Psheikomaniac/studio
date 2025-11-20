# PRD-14: Dokumentations-Templates & CONTRIBUTING Leitfaden

## Kontext
PRD-06 und PRD-11 fordern verbindliche Dokumentationsstandards inkl. Vorlagen (PRD-, IMPLEMENTATION-COMPLETE-, REPORT-Templates) sowie einen `CONTRIBUTING.md` Leitfaden. Diese Artefakte fehlen aktuell im Repo.

## Zielsetzung
- Einheitliche Templates für neue PRDs, Abschlussberichte und Reports bereitstellen.
- Einen klaren CONTRIBUTING-Leitfaden etablieren, der Qualitäts-Gates (Typecheck, Lint, Tests, Doku) beschreibt.

## Scope
- Anlage des Verzeichnisses `docs/templates/` mit mindestens:
  - `PRD-TEMPLATE.md`
  - `IMPLEMENTATION-COMPLETE-TEMPLATE.md`
  - `REPORT-TEMPLATE.md`
- Erstellung von `CONTRIBUTING.md` im Repo-Root mit:
  - Commit-/PR-Checklisten
  - Anforderungen an Tests, Linting, Typechecks, Barrierefreiheit (wo relevant)
  - Doku-Anforderungen (Aktualisierung von PRDs/Reports, Changelogs soweit vorhanden)

## Out of Scope
- Retroaktive Anpassung aller bestehenden Dokumente an die neuen Templates (kann iterativ erfolgen).

## Deliverables
1. `docs/templates/PRD-TEMPLATE.md` mit Sektionen: Kontext, Zielsetzung, Scope, Out of Scope, Deliverables, Acceptance Criteria, Abhängigkeiten, Risiken/Annahmen, Umsetzungshinweise, Definition of Done.
2. `docs/templates/IMPLEMENTATION-COMPLETE-TEMPLATE.md` mit Sektionen: Zusammenfassung, Umgesetzte Punkte, Verifizierte Nachweise (Links/Artefakte), Offene Punkte/Nacharbeiten, Lessons Learned.
3. `docs/templates/REPORT-TEMPLATE.md` für technische Reports/Audits mit: Executive Summary, Metriken, Beobachtungen, Empfehlungen, Nächste Schritte.
4. `CONTRIBUTING.md` mit PR-Checkliste und Qualitäts-Gates (verweist auf bestehende CI-Workflows und Testreports).

## Acceptance Criteria
- AC1: `docs/templates/` existiert mit den drei genannten Template-Dateien und sinnvoller Struktur.
- AC2: `CONTRIBUTING.md` existiert im Repo-Root und verweist auf relevante PRDs/Guides.
- AC3: Verweise in PRD-06/PRD-11 auf Templates/Contributing sind erfüllbar (Dateien vorhanden).

## Abhängigkeiten
- PRD-06: Documentation Standards
- PRD-08/11: Qualitätssicherung der Dokumentation

## Umsetzungshinweise
- Templates knapp, klar und mit Beispielen/Platzhaltern versehen.
- Link-Referenzen relativ halten (z. B. `./docs/templates/PRD-TEMPLATE.md`).

## Definition of Done
- Dateien vorhanden, konsistent verlinkt und im nächsten PR verwendbar.
