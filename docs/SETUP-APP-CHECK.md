# Firebase App Check Setup Guide

**Status:** ✅ Code implementiert | ⏳ Konfiguration ausstehend

Firebase App Check schützt deine Backend-Ressourcen vor Missbrauch durch unbefugte Clients.

---

## 🎯 Warum App Check?

**Ohne App Check:**
- Jeder kann deine Firebase API Keys kopieren
- API-Missbrauch möglich (Quota-Diebstahl)
- Unbefugte Zugriffe auf Firestore/Auth

**Mit App Check:**
- Nur verifizierte Apps können API aufrufen
- reCAPTCHA v3 validiert Requests
- Schutz vor Bots und Scraping

---

## 📋 Setup-Schritte

### 1. reCAPTCHA v3 Registrierung

1. Gehe zu: https://www.google.com/recaptcha/admin/create
2. **Label:** balanceUp Production
3. **reCAPTCHA-Typ:** reCAPTCHA v3
4. **Domains hinzufügen:**
   - `localhost` (für Development)
   - `your-app.web.app` (deine Firebase Hosting Domain)
   - `your-custom-domain.com` (falls vorhanden)
5. **Absenden** → Du erhältst:
   - **Site Key** (öffentlich, geht ins Frontend)
   - **Secret Key** (privat, nur für Backend - NICHT ins Frontend!)

### 2. Firebase Console - App Check aktivieren

1. Öffne [Firebase Console](https://console.firebase.google.com/)
2. Wähle dein Projekt
3. **Build** → **App Check**
4. **Erste Schritte** klicken
5. **Web-App registrieren:**
   - App auswählen
   - **Provider:** reCAPTCHA v3
   - **Site Key** einfügen (von Schritt 1)
   - **Speichern**

### 3. Environment Variables setzen

#### **Lokal (.env.local):**

```bash
# .env.local
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6LcXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Für lokale Entwicklung (optional):
# Debug Token generieren mit: firebase appcheck:debug --project your-project-id
NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
```

#### **Vercel/Production:**

Füge die Environment Variables in Vercel hinzu:

1. **Vercel Dashboard** → Dein Projekt → **Settings** → **Environment Variables**
2. Füge hinzu:
   - `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` = `dein-site-key`
3. **Redeploy** auslösen

### 4. App Check Enforcement aktivieren (Wichtig!)

**⚠️ Erst nach vollständiger Einrichtung & Tests!**

1. Firebase Console → **App Check** → **Apps**
2. Bei deiner App auf **⋮** (Menü) → **Enforcement**
3. **Aktivieren** für:
   - ✅ **Cloud Firestore**
   - ✅ **Firebase Authentication**

**Reihenfolge:**
1. ❌ **NICHT SOFORT** enforcement aktivieren!
2. ✅ Erst App deployen mit App Check Code
3. ✅ Testen ob alles funktioniert
4. ✅ Metrics in Firebase Console prüfen (erfolgreiche Verifications)
5. ✅ **Dann erst** Enforcement aktivieren

---

## 🧪 Testing

### Lokale Entwicklung

```bash
# 1. Debug Token generieren
firebase appcheck:debug --project your-project-id

# Output: Debug token: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX

# 2. Token in .env.local setzen
echo "NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" >> .env.local

# 3. Dev Server starten
npm run dev

# 4. Browser Console prüfen
# ✅ Sollte sehen: "Firebase App Check: Debug mode enabled (development)"
# ✅ Sollte sehen: "Firebase App Check: Initialized successfully with reCAPTCHA v3"
```

### Production Testing

1. Deploy nach Vercel/Firebase Hosting
2. Öffne App im Browser
3. **DevTools → Console:**
   - ✅ `Firebase App Check: Initialized successfully with reCAPTCHA v3`
   - ❌ Keine Fehler
4. **Firebase Console → App Check → Metrics:**
   - ✅ Successful verifications sollten steigen

---

## 🚨 Troubleshooting

### Fehler: "reCAPTCHA placeholder element must be empty"

**Lösung:** reCAPTCHA Badge wird zweimal geladen. Prüfe ob `initializeFirebaseAppCheck()` nur einmal aufgerufen wird.

### Fehler: "App Check token is invalid"

**Ursachen:**
1. Site Key ist falsch
2. Domain nicht in reCAPTCHA whitelisted
3. App Check Enforcement aktiv, aber kein gültiger Token

**Lösung:**
- Site Key in `.env.local` prüfen
- reCAPTCHA Console → Domains prüfen
- Enforcement temporär deaktivieren zum Testen

### Fehler: "429 Too Many Requests"

**Ursache:** reCAPTCHA Quota überschritten (kostenloses Limit: 10.000 Anfragen/Monat)

**Lösung:**
- Upgrade auf reCAPTCHA Enterprise (kostenpflichtig)
- Token caching optimieren
- Rate Limiting implementieren

### App Check funktioniert lokal nicht

**Lösung:** Debug Token verwenden:

```bash
# Debug Token generieren
firebase appcheck:debug

# In .env.local setzen
NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN=<generated-token>

# Firebase Console → App Check → Apps → Manage debug tokens
# Token dort ebenfalls registrieren!
```

---

## 📊 Monitoring

### Firebase Console

**App Check Dashboard:**
- Successful verifications
- Failed verifications
- Enforcement status

**Alerts einrichten:**
1. Firebase Console → **Alerts**
2. **Create Alert** → **App Check**
3. Trigger: Failed verifications > 100/hour
4. Notification: Email/Slack

---

## ✅ Checkliste

- [ ] reCAPTCHA v3 bei Google registriert
- [ ] Site Key & Secret Key erhalten
- [ ] Firebase App Check aktiviert
- [ ] `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` in .env.local gesetzt
- [ ] Debug Token für lokale Entwicklung generiert
- [ ] App deployed und getestet
- [ ] Console Log zeigt "App Check: Initialized successfully"
- [ ] Metrics in Firebase Console zeigen erfolgreiche Verifications
- [ ] Enforcement für Firestore aktiviert ✅
- [ ] Enforcement für Auth aktiviert ✅
- [ ] Monitoring/Alerts konfiguriert

---

## 🔗 Referenzen

- [Firebase App Check Docs](https://firebase.google.com/docs/app-check)
- [reCAPTCHA v3 Admin](https://www.google.com/recaptcha/admin)
- [App Check Best Practices](https://firebase.google.com/docs/app-check/web/recaptcha-provider)

---

**Status nach Setup:**
- ✅ **Code:** Implementiert
- ⏳ **Config:** Wartet auf reCAPTCHA Keys
- ⏳ **Deployment:** Noch nicht deployed
- ⏳ **Enforcement:** Noch nicht aktiv

**Nächster Schritt:** reCAPTCHA registrieren und Keys setzen!
