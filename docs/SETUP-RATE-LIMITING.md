# Rate Limiting Setup Guide (Upstash Redis)

**Status:** ✅ Code implementiert | ⏳ Upstash Account-Setup ausstehend

Rate Limiting schützt deine API vor Missbrauch, Brute-Force-Angriffen und DDoS.

---

## 🎯 Warum Rate Limiting?

**Ohne Rate Limiting:**
- Brute-Force Login-Angriffe möglich
- API kann gespammt werden (Kosten!)
- Service kann durch zu viele Requests ausfallen

**Mit Rate Limiting:**
- Max. 5 Login-Versuche / 15 Minuten
- API-Spam wird blockiert
- Service bleibt stabil

---

## 📋 Setup-Schritte

### 1. Upstash Account erstellen

1. Gehe zu: https://console.upstash.com/
2. **Sign Up** (kostenlos mit GitHub/Google)
3. **Free Tier:** 10,000 Commands/Tag (völlig ausreichend!)

### 2. Redis Database erstellen

1. **Create Database**
2. **Name:** balanceup-ratelimit
3. **Type:** Regional (günstiger, ausreichend)
4. **Region:** Europe (Frankfurt) - näher = schneller!
5. **Eviction:** No Eviction (Daten bleiben erhalten)
6. **Create**

### 3. REST Credentials kopieren

Nach Erstellung siehst du:

```
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ
```

**WICHTIG:** REST API verwenden, NICHT Redis-CLI Credentials!

### 4. Environment Variables setzen

#### **Lokal (.env.local):**

```bash
# .env.local
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ
```

#### **Vercel/Production:**

Vercel Dashboard → Projekt → **Settings** → **Environment Variables**:

```
UPSTASH_REDIS_REST_URL = https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN = AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ
```

**Redeploy** auslösen!

---

## 🧪 Testing

### Lokale Entwicklung

```bash
# 1. .env.local setzen (siehe oben)

# 2. Server starten
npm run dev

# 3. Rate Limit testen
# Öffne Terminal:

# Login-Endpoint 6x aufrufen (Limit: 5/15min)
for i in {1..6}; do
  curl -X POST http://localhost:9002/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' \
    -i
done

# ✅ Erste 5 Requests: Status 200/401 (je nach Auth-Logik)
# ✅ 6. Request: Status 429 Too Many Requests

# Response Header prüfen:
# X-RateLimit-Limit: 5
# X-RateLimit-Remaining: 0
# X-RateLimit-Reset: 2026-02-28T12:15:00.000Z
# Retry-After: 900
```

### Production Testing

```bash
# Nach Deployment
# Teste mit verschiedenen IPs (VPN/Mobile)

curl -X POST https://your-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}' \
  -i

# 5x wiederholen
# ✅ 6. Versuch sollte 429 zurückgeben
```

---

## 📊 Rate Limit Konfiguration

### Aktuelle Limits (in middleware.ts)

| Endpoint | Limit | Zeitfenster | Zweck |
|----------|-------|-------------|-------|
| `/api/auth/*` | 5 | 15 Minuten | Brute-Force Schutz |
| `/api/admin/*` | 10 | 1 Stunde | Admin-Missbrauch verhindern |
| `/api/teams/browse` | 200 | 1 Minute | Public Browsing |
| `/api/*` (Rest) | 100 | 1 Minute | Normaler API-Verkehr |

### Anpassung

```typescript
// src/middleware.ts

// Strengeres Limit (z.B. für Payments)
payment: new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'), // 3 Zahlungen/Stunde
  analytics: true,
  prefix: '@balanceup/payment',
}),

// Dann in middleware():
if (pathname.startsWith('/api/payments/')) {
  ratelimiter = rateLimiters.payment;
}
```

---

## 🔍 Monitoring

### Upstash Dashboard

1. Upstash Console → Dein Database
2. **Metrics Tab:**
   - Total Commands
   - Commands/Second
   - Storage Usage

### Logs

```typescript
// Rate Limit Violations werden geloggt (production):
console.warn(`[Rate Limit] IP ${ip} exceeded limit on ${pathname}`);

// In Sentry/Logging-Tool integrieren:
import * as Sentry from '@sentry/nextjs';

Sentry.captureMessage('Rate limit exceeded', {
  level: 'warning',
  tags: {
    ip,
    pathname,
  },
});
```

---

## 🚨 Troubleshooting

### Fehler: "Rate limiting DISABLED: Upstash Redis not configured"

**Ursache:** Environment Variables fehlen.

**Lösung:**
```bash
# Check .env.local
cat .env.local | grep UPSTASH

# Sollte anzeigen:
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ
```

### Alle Requests werden geblockt (429)

**Ursache:** IP-Detection fehlerhaft oder zu strenge Limits.

**Debug:**
```typescript
// In middleware.ts, logge IP:
console.log('[Debug] Client IP:', ip);

// Wenn IP = 'unknown':
// → Check Headers: x-forwarded-for, x-real-ip
```

**Temporäre Lösung:** Limits erhöhen:
```typescript
limiter: Ratelimit.slidingWindow(500, '1 m'), // 5x mehr
```

### Redis Connection Error

**Ursache:** URL/Token falsch oder Upstash down.

**Check:**
```bash
# Test Upstash Verbindung
curl -X POST https://xxxxx.upstash.io/ping \
  -H "Authorization: Bearer AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ"

# ✅ Response: {"result":"PONG"}
```

### Rate Limit funktioniert nicht (trotz Setup)

**Checkliste:**
1. ✅ Environment Variables gesetzt?
2. ✅ Server neu gestartet? (`npm run dev` neu)
3. ✅ Middleware läuft? (Console sollte KEINE Warning zeigen)
4. ✅ Request geht an `/api/*`? (Middleware nur für API)

---

## 📈 Best Practices

### 1. Whitelist für Admins

```typescript
// In middleware.ts

// Check if user is admin (via session/cookie)
const session = await getServerSession(request);
if (session?.user?.role === 'admin') {
  return NextResponse.next(); // Skip rate limiting
}
```

### 2. IP-basiert + User-basiert

```typescript
// Kombiniere IP + User ID für bessere Limits
const userId = session?.user?.id;
const identifier = userId ? `user:${userId}` : `ip:${ip}`;

const { success } = await ratelimiter.limit(identifier);
```

### 3. Custom Error Response

```typescript
// Client-friendly Fehlermeldung
return new NextResponse(
  JSON.stringify({
    error: 'Zu viele Anfragen',
    message: 'Bitte warte einen Moment und versuche es erneut.',
    retryAfter,
  }),
  { status: 429 }
);
```

### 4. Analytics

Upstash bietet eingebaute Analytics:

```typescript
new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true, // ← Aktiviert!
  prefix: '@balanceup/api',
});

// Dashboard: Upstash Console → Analytics Tab
// Zeigt: Häufigste IPs, Blocked Requests, etc.
```

---

## 💰 Kosten

### Free Tier (Upstash)

- **Commands:** 10,000 / Tag
- **Storage:** 256 MB
- **Concurrent Connections:** 100

**Reicht das?**
- Bei 100 Requests/Minute = 144,000 Requests/Tag
- ABER: Nur 1 Rate-Limit-Check pro Request = ~5,000 Commands/Tag
- ✅ **Völlig ausreichend für kleine bis mittlere Apps!**

### Paid Tier (falls nötig)

- **Pay-as-you-go:** $0.20 / 100k Commands
- **Pro Plan:** $10/Monat (1M Commands inklusive)

---

## ✅ Checkliste

- [ ] Upstash Account erstellt
- [ ] Redis Database angelegt
- [ ] REST URL + Token kopiert
- [ ] Environment Variables gesetzt (.env.local)
- [ ] Environment Variables in Vercel gesetzt
- [ ] Server neu gestartet
- [ ] Rate Limit Test erfolgreich (6. Request = 429)
- [ ] Production Deployment
- [ ] Monitoring in Upstash Dashboard aktiviert
- [ ] Limits angepasst (falls nötig)

---

## 🔗 Referenzen

- [Upstash Redis Docs](https://docs.upstash.com/redis)
- [Upstash Rate Limiting](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [OWASP Rate Limiting](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)

---

**Status:**
- ✅ **Code:** Implementiert
- ⏳ **Upstash:** Noch nicht konfiguriert
- ⏳ **Testing:** Pending

**Nächster Schritt:** Upstash Account erstellen und Credentials setzen!
