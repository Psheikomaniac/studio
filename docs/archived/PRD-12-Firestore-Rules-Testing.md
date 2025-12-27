# PRD-12: Firestore Security Rules – Testabdeckung & Verifikation

## Kontext
In der Codebasis existieren ausgehärtete `firestore.rules` und passende Indizes. Laut PRD-04 und PRD-07 sind jedoch explizite Tests für die Security Rules gefordert. Diese Tests fehlen derzeit.

## Zielsetzung
- Verlässliche, automatisierte Tests für Firestore Security Rules schaffen.
- Positive und negative Zugriffsszenarien für alle relevanten Collections abdecken.
- Sicherstellen, dass CI die Rules-Tests ausführt und bei Verstößen fehlschlägt.

## Scope
- Test der Lese-/Schreibrechte basierend auf:
  - Authentifizierungsstatus (unauthenticated vs. authenticated)
  - Rollen/Claims (z. B. Admin vs. Nicht-Admin), gemäß den im Projekt gelebten Regeln
  - Team-/Projektkontext (sofern in den Regeln kodiert)
- Abdeckung aller Top-Level Collections, die in `firestore.rules` mit Bedingungen versehen sind.

## Out of Scope
- Änderungen an `firestore.rules` selbst (außer minimale Korrekturen, falls Tests reale Lücken aufdecken).
- Performance- oder Index-Optimierung (separat in PRD-10/13).

## Deliverables
1. Testdatei(en):
   - `tests/integration/firestore-rules.test.ts`
     - Enthält Test-Suites für: Lesezugriff (Allow/Deny), Schreibzugriff (Create/Update/Delete), Queries (falls relevant)
2. Test-Setup:
   - Nutzung des Firebase Emulators (empfohlen) oder Mocks konsistent mit bestehendem Test-Stack.
   - Hilfsfunktionen/Fixtures zur Simulation von:
     - Unauthentifiziertem Nutzer
     - Authentifiziertem Standardnutzer (Team-Mitglied)
     - Authentifiziertem Admin (z. B. via Custom Claim `role: 'admin'` oder analog zum Projekt)
3. CI-Integration:
   - Rules-Tests laufen im bestehenden Test-Workflow (keine separaten Jobs erforderlich).

## Acceptance Criteria
- AC1: Unauthentifizierte Nutzer werden für alle geschützten Lese- und Schreiboperationen geblockt.
- AC2: Authentifizierte Standardnutzer dürfen nur die laut Regeln erlaubten Leseoperationen und keine Admin-Only Schreiboperationen.
- AC3: Admins dürfen die laut Regeln vorgesehenen Schreiboperationen ausführen.
- AC4: Jede relevante Top-Level Collection aus `firestore.rules` hat mind. 1 Positiv- und 1 Negativtest für Read sowie mind. 1 Negativtest für Write (falls Write beschränkt ist).
- AC5: Tests laufen in CI grün; bei Rule-Regression schlägt CI fehl.

## Abhängigkeiten
- PRD-04: Testing & Quality Assurance
- PRD-07: Firestore Security & Collections Architecture

## Risiken / Annahmen
- Emulator-basierte Tests sind der empfohlene Weg; falls Emulator-Setup fehlt, muss es ergänzt werden.
- Claims-/Rollenmodell muss mit tatsächlichen Regeln abgeglichen werden.

## Umsetzungshinweise
- Struktur:
  - Arrange: Nutzerkontext/Claims, Seed-Daten (falls nötig) über Emulator
  - Act: Firestore Operation (get/set/update/query)
  - Assert: erlauben/verbieten (erwartete Fehlermeldung)
- Dokumentation: Kurzabschnitt in `TEST_SUITE_COMPLETE_REPORT.md` zum neuen Coverage-Bereich.
- Abschluss-Nachweis für PRD-07:
  - Ergänze als Teil dieser Arbeit die Dokumentation `docs/PRD-07-IMPLEMENTATION-COMPLETE.md` mit Ergebnissen der Rules-Tests (Screenshots/Logs optional).

## Definition of Done
- Alle Acceptance Criteria erfüllt; PRD-07-IMPLEMENTATION-COMPLETE.md erstellt/aktualisiert.
- Tests sind deterministisch (keine Flakes) und lokal wie in CI lauffähig.
