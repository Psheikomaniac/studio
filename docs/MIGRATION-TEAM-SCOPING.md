# Migration Guide: Team-Scoping Security Fix

**Status:** ✅ Rules deployed | ⚠️ Data migration required

---

## 🚨 CRITICAL SECURITY FIX

**Problem:** Alte Firestore Rules erlaubten jedem authentifizierten User ALLE Daten zu lesen.

**Fix:** Team-basiertes Scoping - User können nur Daten ihres eigenen Teams sehen.

---

## ⚠️ BREAKING CHANGES

### Was ändert sich?

**Firestore Rules:**
- ✅ **Vorher:** `allow read: if isSignedIn();` (JEDER kann ALLES lesen)
- ✅ **Nachher:** `allow read: if canAccessTeam(resource.data.teamId);` (nur eigenes Team)

**Datenstruktur:**
- Alle Dokumente brauchen jetzt ein `teamId` Feld
- Queries MÜSSEN nach `teamId` filtern

**Betroffene Collections:**
- `/fines/{fineId}`
- `/payments/{paymentId}`
- `/beverages/{beverageId}`
- `/beverageConsumptions/{consumptionId}`
- `/dues/{dueId}`
- `/duePayments/{paymentId}`
- `/transactions/{transactionId}`
- `/predefinedFines/{fineId}`
- `/auditLogs/{logId}`

---

## 📋 Migration Steps

### 1. Backup erstellen

```bash
# Firebase CLI installieren
npm install -g firebase-tools

# Backup aller Collections
firebase firestore:export gs://your-project-id-backup/backups/$(date +%Y%m%d-%H%M%S)
```

### 2. teamId zu bestehenden Dokumenten hinzufügen

**Option A: Firebase Console (kleine Datenmengen)**

1. Öffne Firebase Console → Firestore Database
2. Für jede Collection:
   - Öffne Dokument
   - Feld hinzufügen: `teamId` = `your-default-team-id`
   - Speichern

**Option B: Migration Script (empfohlen)**

```typescript
// scripts/migrate-add-teamId.ts
import admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

const DEFAULT_TEAM_ID = 'your-default-team-id'; // ← ANPASSEN!

const COLLECTIONS = [
  'fines',
  'payments',
  'beverages',
  'beverageConsumptions',
  'dues',
  'duePayments',
  'transactions',
  'predefinedFines',
  'auditLogs',
];

async function migrate() {
  for (const collectionName of COLLECTIONS) {
    console.log(`Migrating ${collectionName}...`);
    
    const batch = db.batch();
    const snapshot = await db.collection(collectionName).get();
    
    let count = 0;
    for (const doc of snapshot.docs) {
      if (!doc.data().teamId) {
        batch.update(doc.ref, { teamId: DEFAULT_TEAM_ID });
        count++;
      }
    }
    
    if (count > 0) {
      await batch.commit();
      console.log(`✅ ${collectionName}: ${count} documents updated`);
    } else {
      console.log(`⏭️  ${collectionName}: Already migrated`);
    }
  }
  
  console.log('🎉 Migration complete!');
}

migrate().catch(console.error);
```

**Ausführen:**
```bash
# Service Account Key herunterladen:
# Firebase Console → Project Settings → Service Accounts → Generate new private key

# In .env setzen
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account-key.json"

# Script ausführen
npx ts-node scripts/migrate-add-teamId.ts
```

### 3. Default Team ID ermitteln

```typescript
// Finde die erste Team ID in deiner Datenbank
const teams = await db.collection('teams').limit(1).get();
const defaultTeamId = teams.docs[0]?.id;
console.log('Default Team ID:', defaultTeamId);
```

### 4. Firestore Indexes erstellen

```bash
# firestore.indexes.json wurde bereits aktualisiert
firebase deploy --only firestore:indexes
```

**Erforderliche Indexes:**
```json
{
  "indexes": [
    {
      "collectionGroup": "fines",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "teamId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "payments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "teamId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
    // ... weitere Collections
  ]
}
```

### 5. Rules deployen

```bash
# Test Rules erst im Emulator
npm run emulator:start

# Dann live deployen
firebase deploy --only firestore:rules

# ⚠️ ACHTUNG: Sofort nach Deploy wird ALLE alte Daten blockiert!
# Stelle sicher dass Migration VORHER abgeschlossen ist!
```

### 6. Frontend Code aktualisieren

**Queries MÜSSEN teamId filtern:**

```typescript
// ❌ VORHER (funktioniert nicht mehr!)
const finesRef = collection(db, 'fines');
const snapshot = await getDocs(finesRef);

// ✅ NACHHER (mit teamId filter)
const teamId = useTeamId(); // aus TeamProvider
const finesRef = collection(db, 'fines');
const q = query(finesRef, where('teamId', '==', teamId));
const snapshot = await getDocs(q);
```

**Alle Services aktualisieren:**

```typescript
// src/services/fines.ts
export async function getFines(teamId: string) {
  const q = query(
    collection(db, 'fines'),
    where('teamId', '==', teamId),
    orderBy('createdAt', 'desc')
  );
  return getDocs(q);
}

export async function createFine(teamId: string, fine: CreateFineInput) {
  return addDoc(collection(db, 'fines'), {
    ...fine,
    teamId, // ← CRITICAL: immer teamId mitgeben!
    createdAt: serverTimestamp(),
  });
}
```

---

## 🧪 Testing

### Emulator Testing

```bash
# 1. Starte Emulator
npm run emulator:start

# 2. Seed Testdaten mit teamId
npm run seed:emulator

# 3. Teste App
npm run dev

# 4. Prüfe Console auf Security-Fehler
```

### Production Testing Plan

**Phase 1: Soft Launch (1 Tag)**
- Rules deployen OHNE Enforcement
- Monitoring aktivieren
- Logs auf Permission Errors prüfen

**Phase 2: Enforcement (nach 24h)**
- Keine Errors mehr in Logs?
- Rules Enforcement aktivieren

**Phase 3: Verification**
- Cross-Team Access Tests
- User aus Team A versucht Team B Daten zu lesen → DENY
- User aus Team A liest Team A Daten → ALLOW

---

## 📊 Verification Queries

**Check: Alle Dokumente haben teamId?**

```typescript
// Firebase Console → Firestore
// Für jede Collection:
db.collection('fines').where('teamId', '==', null).get()
// → Sollte leer sein!
```

**Check: Cross-Team Access blocked?**

```typescript
// Als User A (teamId: 'team-a') einloggen
const q = query(
  collection(db, 'fines'),
  where('teamId', '==', 'team-b') // ← Andere Team!
);
const snapshot = await getDocs(q);
// → Sollte leer sein (oder Permission Error)!
```

---

## 🚨 Rollback Plan

Falls Migration schief geht:

```bash
# 1. Alte Rules wiederherstellen
cp firestore.rules.backup firestore.rules
firebase deploy --only firestore:rules

# 2. Datenbank von Backup wiederherstellen
firebase firestore:import gs://your-project-id-backup/backups/20260228-123456

# 3. App neu deployen (alte Version)
git revert HEAD
vercel --prod
```

---

## ✅ Post-Migration Checklist

- [ ] Backup erstellt
- [ ] Default Team ID ermittelt
- [ ] Migration Script ausgeführt
- [ ] Alle Dokumente haben `teamId` (Verification Query)
- [ ] Firestore Indexes deployed
- [ ] Frontend Services aktualisiert (teamId filter)
- [ ] Emulator Tests bestanden
- [ ] Rules deployed
- [ ] Production Monitoring aktiv (24h)
- [ ] Cross-Team Access Tests bestanden
- [ ] Alte Rules-Backup archiviert

---

## 🔗 Referenzen

- [Firestore Multi-Tenancy](https://firebase.google.com/docs/firestore/solutions/multi-tenancy)
- [Security Rules Testing](https://firebase.google.com/docs/firestore/security/test-rules-emulator)
- [Data Migration Best Practices](https://firebase.google.com/docs/firestore/manage-data/export-import)

---

**Status:**
- ✅ **Rules:** Deployed
- ⏳ **Migration:** Waiting for execution
- ⏳ **Frontend:** Needs teamId filter updates
- ⏳ **Testing:** Pending

**Nächster Schritt:** Migration Script ausführen!
