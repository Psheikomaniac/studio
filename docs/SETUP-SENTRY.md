# Sentry Error Monitoring Setup Guide

**Status:** ✅ Code implementiert | ⏳ Sentry Projekt-Setup ausstehend

Sentry bietet Echtzeit-Error-Tracking und Performance-Monitoring für Production.

---

## 🎯 Warum Sentry?

**Ohne Error Monitoring:**
- Errors in Production bleiben unbemerkt
- Keine Stack Traces von User-Fehlern
- Debugging ist Rätselraten

**Mit Sentry:**
- Automatische Error-Erfassung
- Detaillierte Stack Traces
- Performance Monitoring
- User Impact Tracking
- Alerts bei kritischen Fehlern

---

## 📋 Setup-Schritte

### 1. Sentry Account erstellen

1. Gehe zu: https://sentry.io/signup/
2. **Kostenloser Plan:** 5.000 Errors/Monat + 10.000 Performance-Events
3. Account erstellen

### 2. Neues Projekt anlegen

1. **Create Project**
2. **Platform:** Next.js
3. **Project Name:** balanceup-production
4. **Alert Frequency:** Default (sofort bei neuem Error)
5. **Create Project**

### 3. DSN kopieren

Nach Project-Erstellung siehst du:

```
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxx.ingest.sentry.io/xxxxx
```

**DSN = Data Source Name** (öffentlich, kein Secret!)

### 4. Environment Variables setzen

#### **Lokal (.env.local):**

```bash
# .env.local
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxx.ingest.sentry.io/xxxxx

# Optional: Enable in development (default: only production)
SENTRY_ENABLED=true
```

#### **Vercel/Production:**

Vercel Dashboard → Projekt → **Settings** → **Environment Variables**:

```
NEXT_PUBLIC_SENTRY_DSN = https://xxxxx@xxxx.ingest.sentry.io/xxxxx
```

**Redeploy** auslösen!

### 5. Source Maps hochladen (für bessere Stack Traces)

**Sentry Auth Token generieren:**

1. Sentry → **Settings** → **Account** → **Auth Tokens**
2. **Create New Token**
3. **Scopes:** `project:releases` + `org:read`
4. Token kopieren

**In Vercel setzen:**

```bash
# Vercel Dashboard → Environment Variables
SENTRY_AUTH_TOKEN=sntrys_xxxxx
SENTRY_ORG=your-org-name
SENTRY_PROJECT=balanceup-production
```

**next.config.ts aktualisieren:**

```typescript
// next.config.ts
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  // ... existing config
};

module.exports = withSentryConfig(
  nextConfig,
  {
    // Sentry configuration
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    
    // Only upload source maps in production
    silent: process.env.NODE_ENV !== 'production',
    
    // Upload source maps during build
    widenClientFileUpload: true,
    hideSourceMaps: true,
    disableLogger: true,
  }
);
```

---

## 🧪 Testing

### Lokale Entwicklung

```bash
# .env.local
SENTRY_ENABLED=true

# Server starten
npm run dev

# Error provozieren
# 1. Gehe zu einer beliebigen Seite
# 2. Öffne Browser Console
# 3. Trigger Error:

throw new Error('Test Error for Sentry');

# 4. Check Console
# ✅ Sollte sehen: "[Sentry] Error captured"
# ✅ Sollte NICHT zu Sentry senden (dev mode)
```

### Production Testing

```bash
# Nach Deployment zu Vercel
# Trigger einen Fehler in der App

# Sentry Dashboard prüfen:
# https://sentry.io/organizations/your-org/issues/

# ✅ Error sollte innerhalb von Sekunden erscheinen
# ✅ Stack Trace sollte Dateinamen + Zeilennummern zeigen
```

**Test Error Button (temporär):**

```typescript
// Füge zu einer Seite hinzu (NUR FÜR TESTING!)
<button onClick={() => { throw new Error('Sentry Test Error'); }}>
  Test Sentry
</button>
```

---

## 📊 Monitoring & Alerts

### Error Alerts konfigurieren

Sentry → **Alerts** → **Create Alert Rule**:

**Critical Errors Alert:**
- **Condition:** Error count > 10 in 5 minutes
- **Action:** Email an dich
- **Save Rule**

**New Issue Alert:**
- **Condition:** New issue erscheint
- **Action:** Email an dich
- **Save Rule**

### Slack Integration (optional)

1. Sentry → **Settings** → **Integrations** → **Slack**
2. **Install Slack Integration**
3. Channel auswählen: `#balanceup-errors`
4. **Save**

Jetzt bekommst du Errors direkt in Slack! 🎉

---

## 🔍 Sentry Features

### 1. Error Grouping

Sentry gruppiert ähnliche Errors automatisch:
- `TypeError: Cannot read property 'name' of undefined`
- Zeigt **Häufigkeit** und **betroffene User**

### 2. Breadcrumbs

Sentry erfasst User-Actions vor dem Error:
- Button clicks
- Navigation
- API calls
- Console logs

→ Hilfreich für Reproduktion!

### 3. Release Tracking

Markiere Deployments als "Releases":

```bash
# Bei jedem Deploy
export SENTRY_RELEASE=$(git rev-parse HEAD)

# Sentry wird automatisch benachrichtigt
# Shows which errors appeared in which version
```

### 4. Performance Monitoring

Sentry misst:
- Page Load Zeit
- API Response Zeit
- Slow Transactions

**Performance Tab** in Sentry Dashboard prüfen!

---

## 🚨 Troubleshooting

### Error: "Sentry is not initialized"

**Lösung:** DSN fehlt oder falsch.

```bash
# Check .env.local
cat .env.local | grep SENTRY

# Sollte anzeigen:
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxx.ingest.sentry.io/xxxxx
```

### Errors werden nicht gesendet

**Checkliste:**
1. ✅ `NEXT_PUBLIC_SENTRY_DSN` gesetzt?
2. ✅ Production-Build? (dev sendet nicht, außer `SENTRY_ENABLED=true`)
3. ✅ Browser Console zeigt "[Sentry] Error captured"?
4. ✅ Sentry Dashboard → Issues → "All" (nicht nur "Unresolved")

### Source Maps fehlen (Stack Traces zeigen minified code)

**Lösung:**

```bash
# Check: SENTRY_AUTH_TOKEN gesetzt in Vercel?
# Check: withSentryConfig() in next.config.ts?

# Manuelle Upload:
npx sentry-cli releases files <release-version> upload-sourcemaps .next
```

### Zu viele Events (Quota exceeded)

**Lösung:** Sample Rate anpassen:

```typescript
// sentry.client.config.ts
tracesSampleRate: 0.1, // 10% statt 100%
replaysSessionSampleRate: 0.05, // 5% Sessions
```

---

## 📈 Best Practices

### 1. Custom Context

```typescript
import * as Sentry from '@sentry/nextjs';

// User Context setzen
Sentry.setUser({
  id: user.uid,
  email: user.email,
  // Keine sensitiven Daten!
});

// Custom Tags
Sentry.setTag('team', 'team-a');
Sentry.setTag('feature', 'payments');
```

### 2. Manual Error Capture

```typescript
try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      operation: 'payment',
    },
    extra: {
      amount: 100,
      userId: 'user123',
    },
  });
  
  // User-friendly error anzeigen
  toast.error('Zahlung fehlgeschlagen');
}
```

### 3. Performance Tracking

```typescript
import * as Sentry from '@sentry/nextjs';

const transaction = Sentry.startTransaction({
  name: 'processPayment',
  op: 'payment',
});

try {
  await processPayment();
} finally {
  transaction.finish();
}
```

---

## ✅ Checkliste

- [ ] Sentry Account erstellt
- [ ] Projekt angelegt
- [ ] DSN kopiert
- [ ] `NEXT_PUBLIC_SENTRY_DSN` in .env.local gesetzt
- [ ] Auth Token generiert (für Source Maps)
- [ ] `SENTRY_AUTH_TOKEN` in Vercel gesetzt
- [ ] App deployed
- [ ] Test Error geworfen
- [ ] Error in Sentry Dashboard sichtbar
- [ ] Stack Trace zeigt korrekte Dateinamen (Source Maps funktionieren)
- [ ] Alerts konfiguriert
- [ ] Slack Integration (optional)

---

## 🔗 Referenzen

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Source Maps](https://docs.sentry.io/platforms/javascript/sourcemaps/)

---

**Status:**
- ✅ **Code:** Implementiert
- ⏳ **Sentry Projekt:** Noch nicht erstellt
- ⏳ **DSN:** Noch nicht konfiguriert
- ⏳ **Testing:** Pending

**Nächster Schritt:** Sentry Account erstellen und DSN setzen!
