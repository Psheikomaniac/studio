# PRD-07: Firestore-Sicherheitsregeln & einheitliche Collections-Architektur

## Überblick
Dieses PRD definiert die finale Sicherheits- und Datenhaltungsarchitektur für Firestore. Es schließt zwei aktuell offene Punkte:
- Härtung der Firestore Security Rules (derzeit DEV-weit offen)
- Entscheidung und Konsolidierung der Collections-Architektur (Subcollections vs. Top-Level)

Ziel ist es, konsistente, testbare und skalierbare Regeln zu etablieren, die das reale Nutzungsmodell des Codes widerspiegeln und Privacy/Least-Privilege sicherstellen.

## Ziele
- Einheitliche Architekturentscheidung: Transaktionsdaten als Subcollections unter `users/{userId}`; Kataloge als Top-Level Collections.
- Strikte Security Rules für Lesen/Schreiben, inkl. Admin-Ausnahmen per Custom Claims.
- Vollständige Emulator-Testabdeckung inkl. Rules-Tests und Negativfällen.
- Dokumentierte Indizes für alle queries (Composite Indexe, wo nötig).

## Nicht-Ziele
- Umstellung der UI/Services auf ein neues Datenmodell (Services sind bereits für Subcollections unter `users/{userId}` implementiert und werden beibehalten).
- Vollständige Produktions-Härtung nicht-funktionaler Policies (z. B. Rate Limits) jenseits Firestore.

## Scope
- Collections-Entscheidung und Migrationspfad
- Security Rules Design inkl. Admin-Bypass und Owner-basierten Rechten
- Indizes (firestore.indexes.json) und Validierungs-Checks
- Testplan für Emulator (Unit-like Rules-Tests, Integrationstests)

---

## 🐝 HIVE MIND ANALYSIS: CRITICAL ARCHITECTURE MISMATCH DISCOVERED

### ⚠️ PROBLEM: Original PRD Misalignment with Implementation

**DISCOVERY**: Die ursprüngliche Annahme in Zeile 17 ("Services sind bereits für Subcollections implementiert") ist **FALSCH**!

**EVIDENCE FROM CODE ANALYSIS**:
1. `src/services/players.service.ts:31` → `super(firestore, 'users')` ← **TOP-LEVEL**
2. `src/services/fines.service.ts` → verwendet `/fines` ← **TOP-LEVEL**
3. `src/services/payments.service.ts` → verwendet `/payments` ← **TOP-LEVEL**
4. `firestore.indexes.json` → hat `COLLECTION_GROUP` queries ← vorbereitet für Subcollections, aber nicht genutzt
5. `firestore.rules:60` → `match /{document=**}` mit `allow read, write: if true` ← **WIDE OPEN DEV MODE**

**IMPACT**: Wenn PRD-07 wie geschrieben umgesetzt wird, brechen ALLE Services!

---

## 🎯 REVISED ARCHITECTURE DECISION (Hive Mind Recommendation)

### **OPTION A: Keep Top-Level (RECOMMENDED - Low Risk)**

**Architektur**: ALLE Collections bleiben Top-Level:
- `/users/{userId}` ← Player profiles (renamed from "players" for consistency)
- `/fines/{fineId}` with `userId` field
- `/payments/{paymentId}` with `userId` field
- `/dues/{dueId}` ← Team-wide dues catalog
- `/duePayments/{paymentId}` with `userId` and `dueId` fields
- `/beverages/{beverageId}` ← Catalog
- `/beverageConsumptions/{consumptionId}` with `userId` field
- `/predefinedFines/{id}` ← Catalog
- `/auditLogs/{logId}` ← Admin only

**Begründung**:
- ✅ **Zero code changes required** - Services funktionieren wie sie sind
- ✅ **Indexes bereits korrekt** - firestore.indexes.json passt
- ✅ **Team-transparency** - Users können alle Fines/Payments sehen (Handball-Team Usecase)
- ✅ **Einfachere Queries** - Cross-user Statistiken und Reports ohne collectionGroup
- ✅ **Schnellere Umsetzung** - Nur Security Rules härten, keine Migration

**Security Rules Approach**:
```javascript
// Read: Authenticated users (Team-Transparenz)
// Write: Admins only (Treasurer/Manager)
match /fines/{fineId} {
  allow read: if isSignedIn();
  allow write: if isAdmin();
}
```

### **OPTION B: Migrate to Subcollections (HIGH RISK - Major Refactor)**

Falls zukünftig Multi-Tenant oder strikte User-Isolation gewünscht, dann:
- Transaktionsdaten als Subcollections unter `/users/{userId}/...`
- Erfordert **komplette Service-Umschreibung**
- Erfordert **Datenmigration** aller bestehenden Fines/Payments
- Erfordert **neue Indizes** für Subcollection queries
- **Zeitaufwand**: 3-5 Tage statt 1-2 Tage

**HIVE MIND CONSENSUS**: Option A ist für aktuellen Usecase (Handball-Verein mit Team-Transparenz) die richtige Wahl.

---

## Architekturentscheidung (FINAL - Option A)

**Top-Level Collections mit field-based user filtering**:

**Collections**:
- `/users/{userId}` - Player profiles (active, balance, penalties, etc.)
- `/fines/{fineId}` - Top-level fines mit `userId` field
- `/payments/{paymentId}` - Top-level payments mit `userId` field
- `/dues/{dueId}` - Team dues catalog
- `/duePayments/{paymentId}` - Due payment records mit `userId` und `dueId`
- `/beverages/{beverageId}` - Beverage catalog
- `/beverageConsumptions/{consumptionId}` - Beverage consumption mit `userId`
- `/predefinedFines/{id}` - Fine templates catalog
- `/auditLogs/{logId}` - Audit trail (admin only)

**Rationale**:
1. **Matches Implementation**: Services verwenden bereits Top-Level Collections
2. **Team Transparency**: Handball-Verein Usecase erfordert Team-weite Sichtbarkeit
3. **Zero Migration**: Keine Datenverschiebung erforderlich
4. **Simplified Queries**: Cross-user aggregations und Statistics ohne collectionGroup
5. **Faster Delivery**: Nur Security Rules härten (1-2 Tage statt 5 Tage)

## Security Rules (REVISED - Top-Level Architecture)

**IMPLEMENTATION PLAN**:

### Phase 1: Replace Dev Mode with Strict Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      // Use /admins collection check (bereits implementiert in current rules)
      // Alternative: request.auth.token.role == 'admin' wenn Custom Claims gewünscht
      return isSignedIn() &&
             exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // Remove isDevelopment() function completely!
    // Remove "match /{document=**} { allow read, write: if true; }" rule!

    // ============================================
    // USERS (Player Profiles)
    // ============================================

    match /users/{userId} {
      // Team-wide read (Team-Transparenz für Handball-Verein)
      allow read: if isSignedIn();

      // Only owner or admin can update profile
      allow create, update: if isOwner(userId) || isAdmin();

      // Only admin can delete players
      allow delete: if isAdmin();
    }

    // ============================================
    // FINES (Top-Level mit userId field)
    // ============================================

    match /fines/{fineId} {
      // Team-wide read access (everyone can see all fines)
      allow read: if isSignedIn();

      // Only admins can create/update/delete fines
      allow create, update, delete: if isAdmin();
    }

    // ============================================
    // PAYMENTS (Top-Level mit userId field)
    // ============================================

    match /payments/{paymentId} {
      // Team-wide read access
      allow read: if isSignedIn();

      // Only admins can manage payments
      allow create, update, delete: if isAdmin();
    }

    // ============================================
    // DUES (Team Dues Catalog)
    // ============================================

    match /dues/{dueId} {
      // Everyone can read dues
      allow read: if isSignedIn();

      // Only admins can manage dues
      allow create, update, delete: if isAdmin();
    }

    // ============================================
    // DUE PAYMENTS
    // ============================================

    match /duePayments/{paymentId} {
      // Team-wide read access
      allow read: if isSignedIn();

      // Only admins can manage due payments
      allow create, update, delete: if isAdmin();
    }

    // ============================================
    // BEVERAGES (Catalog)
    // ============================================

    match /beverages/{beverageId} {
      // Everyone can read beverage catalog
      allow read: if isSignedIn();

      // Only admins can manage catalog
      allow create, update, delete: if isAdmin();
    }

    // ============================================
    // BEVERAGE CONSUMPTIONS
    // ============================================

    match /beverageConsumptions/{consumptionId} {
      // Team-wide read access
      allow read: if isSignedIn();

      // Only admins can manage consumption records
      allow create, update, delete: if isAdmin();
    }

    // ============================================
    // PREDEFINED FINES (Templates)
    // ============================================

    match /predefinedFines/{fineId} {
      // Everyone can read fine templates
      allow read: if isSignedIn();

      // Only admins can manage templates
      allow create, update, delete: if isAdmin();
    }

    // ============================================
    // AUDIT LOGS (Admin Only)
    // ============================================

    match /auditLogs/{logId} {
      // Only admins can read/write audit logs
      allow read, write: if isAdmin();
    }

    // ============================================
    // ADMIN MANAGEMENT
    // ============================================

    match /admins/{adminId} {
      // Anyone can read who the admins are (transparency)
      allow read: if isSignedIn();

      // Admin role managed via Firebase Console or Admin SDK only
      allow create, update, delete: if false;
    }
  }
}
```

### Phase 2: Optional Advanced Validations (Future Enhancement)

```javascript
// Add data validation rules (Phase 2 - optional):
// - Beträge positiv: resource.data.amount > 0
// - paid konsistent mit paidAt: resource.data.paid == (resource.data.paidAt != null)
// - createdBy entspricht auth: request.auth.uid == resource.data.createdBy
// - Serverzeit: request.time innerhalb akzeptabler Range von createdAt
```

**MIGRATION NOTES**:
1. ❌ **Remove** `isDevelopment()` function
2. ❌ **Remove** `match /{document=**}` catch-all rule
3. ❌ **Remove** alle Subcollection rules unter `/users/{userId}/fines/...` etc.
4. ✅ **Keep** Collection Group rules (lines 229-260) - diese sind harmless und für zukünftige Flexibilität
5. ✅ **Test thoroughly** in Emulator before deploying!

## Indizes (REVISED)

**STATUS**: firestore.indexes.json ist bereits vollständig! ✅

**Analysis**:
- Vorhandene COLLECTION_GROUP indexes für fines, payments, beverageConsumptions, duePayments
- Composite indexes für häufige Filter-Kombinationen (paid + date, userId + date)
- Keine Änderungen erforderlich für Top-Level Architecture

**Action Items**: NONE - Indexes sind production-ready

---

## Migration (REVISED - MASSIVELY SIMPLIFIED)

**GOOD NEWS**: Keine Datenmigration erforderlich! ✅

**Grund**: Alle Collections sind bereits Top-Level, Services verwenden bereits die korrekte Struktur.

**ONLY REQUIRED CHANGES**:
1. **firestore.rules**: Replace dev mode rules with production rules (siehe oben)
2. **Test in Emulator**: Validate rules don't break existing queries
3. **Deploy Rules**: `firebase deploy --only firestore:rules`

**Estimated Time**: 2-4 hours (statt ursprünglich 1-3 Tage!)

---

## Testplan (REVISED)

### Emulator Rules Tests (Unit-Style)

**Test Cases für Auth**:
1. ✅ Anonymous user → READ/WRITE denied auf allen Collections
2. ✅ Authenticated user → READ allowed auf /users, /fines, /payments, /beverages
3. ✅ Authenticated non-admin → WRITE denied auf /fines, /payments (only admins)
4. ✅ Admin user → WRITE allowed auf alle Collections
5. ✅ User can UPDATE own /users/{userId} profile
6. ✅ User CANNOT UPDATE other user's profile
7. ✅ Admin can DELETE /users, /fines, /payments
8. ✅ Non-admin CANNOT DELETE anything

**Test Framework**: `@firebase/rules-unit-testing` mit Emulator

**Test Location**: `tests/integration/firestore-rules.test.ts` (neu erstellen)

### Integration Tests mit Services

**Test Cases für Services**:
1. ✅ PlayersService.getAll() funktioniert mit authentifiziertem User
2. ✅ FinesService.create() funktioniert nur mit Admin
3. ✅ PaymentsService.create() funktioniert nur mit Admin
4. ✅ Query mit `where('userId', '==', uid)` funktioniert
5. ✅ orderBy queries matchen vorhandene Indizes

**Test Location**: `tests/integration/services.emulator.test.ts` (bereits vorhanden, erweitern)

### E2E Smoke Tests

**Test Cases**:
1. ✅ Login → User sieht Dashboard mit allen Fines/Payments (Team-Transparenz)
2. ✅ Non-Admin → "Add Fine" button disabled oder Hidden
3. ✅ Admin → "Add Fine" button enabled, kann Fines erstellen
4. ✅ Admin → Kann Catalog Items (Beverages, Predefined Fines) bearbeiten

**Test Framework**: Playwright (bereits eingerichtet)

---

## Akzeptanzkriterien (REVISED)

**Security**:
- ✅ Keine anonyme Lese-/Schreiboperation möglich
- ✅ Authenticated users können Team-Daten lesen (fines, payments, users)
- ✅ NUR Admins können schreiben (fines, payments, dues, beverages)
- ✅ Users können eigenes Profil aktualisieren
- ✅ Audit Logs nur für Admins sichtbar/schreibbar

**Functionality**:
- ✅ Alle Services funktionieren ohne Code-Änderungen
- ✅ Alle UI-Seiten laden Daten korrekt (/dashboard, /players, /money)
- ✅ Keine Firestore index errors in Console
- ✅ Rules Tests grün (100% Pass Rate)

**Performance**:
- ✅ Keine Performance-Degradation durch Rule-Checks
- ✅ P95 Read/Write Latency < 500ms (Emulator)

## Metriken & Observability
- Anzahl abgewiesener unautorisierter Anfragen (Emulator-Report, Produktiv mit AuditLog o. Monitoring)
- Time-to-Read/Write (P95) unter festgelegten Grenzen

## Risiken
- Falsche Rule-Auswertung blockiert legitime Zugriffe → Emulator-first, Canary-Deploy
- Bestehende Daten außerhalb Zielstruktur → Migrationsplan zwingend ausführen

## Deliverables (REVISED)

**Code Changes**:
- ✅ Updated `firestore.rules` (production-ready, dev mode removed)
- ⚠️ `firestore.indexes.json` (NO CHANGES - bereits vollständig)

**Tests**:
- ✅ `tests/integration/firestore-rules.test.ts` (new file with 8+ test cases)
- ✅ Erweiterte Service Integration Tests in existing test files
- ✅ E2E Smoke Tests für Auth/Admin flows

**Documentation**:
- ✅ `docs/PRD-07-IMPLEMENTATION-COMPLETE.md` (Completion Report)
- ⚠️ `docs/FIRESTORE-MIGRATION-ROADMAP.md` (NOT NEEDED - no migration!)
- ✅ Updated AGENTS.md mit Security Rules Hinweisen

---

## Zeitplan (REVISED - DRASTICALLY REDUCED)

**ORIGINAL ESTIMATE**: 3-4 Tage
**REVISED ESTIMATE**: 4-6 Stunden ✨

**Breakdown**:
- ✅ Architecture Decision & Design: 1 hour (DONE via Hive Mind Analysis)
- Rules Implementation: 1 hour (copy/paste + minor adjustments)
- Rules Unit Tests: 1-2 hours (setup @firebase/rules-unit-testing)
- Integration Testing: 1 hour (extend existing tests)
- E2E Verification: 30 minutes (manual + Playwright)
- Documentation: 30 minutes (completion report)

**CRITICAL SUCCESS FACTOR**: No data migration = 90% time savings! 🎉

---

## 🐝 HIVE MIND FINAL RECOMMENDATION

**IMPLEMENTATION ORDER**:
1. **FIRST**: Update `firestore.rules` (remove dev mode)
2. **SECOND**: Add rules tests (`@firebase/rules-unit-testing`)
3. **THIRD**: Test in Emulator thoroughly
4. **FOURTH**: Deploy to production with monitoring
5. **FIFTH**: Document completion in PRD-07-IMPLEMENTATION-COMPLETE.md

**RISK LEVEL**: LOW ✅
- No code changes
- No data migration
- Rollback possible within minutes
- Tested in Emulator before production

**DEPENDENCIES**:
- BLOCKS: Nothing (can be done independently)
- BLOCKED BY: Nothing (ready to start immediately)
- PARALLEL: Can run alongside PRD-08 (TypeScript fixes)
