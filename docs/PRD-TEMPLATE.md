# PRD – <Titel>

Version: 0.1 · Status: Draft · Datum: <YYYY-MM-DD> · Owner: <Name/Rolle>

## 1. Ziel und Kontext

### 1.1 Problem / Ausgangslage

- **Was ist aktuell das Problem?** (konkret, beobachtbar)
- **Warum ist das wichtig?** (Business/Organisation/Usecase)

### 1.2 Zielbild (Wunschvorstellung)

Beschreibe das Zielbild so, dass man es sich „vorstellen“ kann.

- Hierarchie/Struktur (falls relevant)
- Kern-Workflows (Happy Path)
- Was Nutzer:innen am Ende können

### 1.3 Nicht-Ziele

Explizit festhalten, was **nicht** umgesetzt wird (Scope-Cut), um Diskussionen zu vermeiden.

## 2. Ist-Analyse (Codebase-Realität)

Dieser Abschnitt ist **entscheidend**: Wie ist es heute im Repo wirklich gebaut?

### 2.1 Relevante Bereiche im Repo

- Dateien/Module, die betroffen sind (mit Pfaden)
- Bestehende Datenmodelle / Services / UI-Flows

### 2.2 Was ist bereits umgesetzt?

- Bullet-Liste mit Fakten
- Wenn möglich: Verweise auf konkrete Funktionen/Services/Routes

### 2.3 Was fehlt noch?

- Bullet-Liste der Lücken
- Aufteilen nach: Datenmodell, Security, UI/UX, Migration, Tests

## 3. Anforderungen

### 3.1 Funktionale Anforderungen

Formuliere Anforderungen testbar.

- FR-1 …
- FR-2 …

### 3.2 Nicht-funktionale Anforderungen

- Performance (z. B. „Listen laden < 2s“)
- Sicherheit/Privacy/Least-Privilege
- Wartbarkeit / Erweiterbarkeit

### 3.3 Rollen & Berechtigungen

- Rollenmodell (z. B. owner/admin/member)
- Was darf wer lesen/schreiben?

## 4. Datenmodell & Persistenz

### 4.1 Firestore Schema (Soll)

```text
/<collection>/{id}
  ...
```

### 4.2 Felder / Typen

- TypeScript-Interfaces (oder Referenz auf `src/lib/types.ts`)
- Pflichtfelder vs. optional
- Auditfelder (createdAt/updatedAt/createdBy/updatedBy)

### 4.3 Queries & Indizes

- Welche Queries werden benötigt?
- Welche Composite Indizes sind erforderlich?

## 5. Security Rules (Soll)

- Rules-Entwurf (skizzenhaft oder final)
- Validierungen (z. B. teamId Konsistenz)

## 6. UX / UI-Flows

### 6.1 Screens / Routen

- Liste der betroffenen Seiten (Next.js routes)

### 6.2 User Journeys

- Journey 1: …
- Journey 2: …

### 6.3 Edge Cases

- Leere Zustände
- Fehlerfälle (Rules denied, network, invalid input)

## 7. Implementierungsplan (Tickets)

Dieser Abschnitt ist die direkte Vorlage für Entwickler-Tickets.

### 7.1 Reihenfolge / Phasen

1. Phase 1: …
2. Phase 2: …

### 7.2 Konkrete Tasks

- [ ] Task: … (inkl. Datei-Hinweisen)
- [ ] Task: …

## 8. Teststrategie

- Unit Tests (welche Module)
- Integration / Emulator Tests (Firestore Rules)
- E2E (Playwright) – Smoke Tests

## 9. Rollout / Migration

- Braucht es Migration? Wenn ja: Plan + Idempotenz + Validierung
- Feature Flag / staged rollout

## 10. Akzeptanzkriterien

**Definition of Done** – messbar und überprüfbar.

- AC-1 …
- AC-2 …

## 11. Risiken & offene Fragen

### 11.1 Risiken

- Risiko: … → Mitigation: …

### 11.2 Offene Fragen

- Frage: …
