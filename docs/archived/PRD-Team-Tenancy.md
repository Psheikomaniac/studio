PRD 1 – Mandantenfähigkeit (Teams) – Architektur & Datenschema

Version: 1.0 · Status: Draft · Gilt für: balanceUp (Next.js 16, React 19, Firestore)

1. Ziel und Kontext
- Problem: Alle registrierten Benutzer sehen aktuell dieselben Daten (keine Mandantentrennung).
- Ziel: Echte Mandantenfähigkeit pro Mannschaft (Team). Nutzer:innen sehen und bearbeiten ausschließlich Inhalte ihres Teams.
- Scope PRD 1: Architekturentwurf, Datenschema, Security‑Rules‑Entwurf, Migrationsplan. Keine produktive Rules‑Umstellung, keine UI‑Flows (kommen in späteren PRDs).

Nicht‑Ziele (in PRD 1):
- Vollständige Implementierung der Security Rules (PRD 8)
- UI‑Onboarding/Team‑Switcher (PRD 3/4)
- Datenmigration ausführen (PRD 10)

2. Fachliches Zielbild
- Jede:r Benutzer:in besitzt einen „aktuellen Team‑Kontext” (teamId).
- Beim Onboarding wird ein Team erstellt oder man tritt per Einladung bei (späterer PRD).
- Sicht‑/Schreibrechte sind strikt auf das Team beschränkt, dessen Mitglied man ist.
- Rollen je Team: owner, admin, member.

3. Datenmodell (Firestore)
Empfohlenes hierarchisches, team‑gescoptes Schema:

```
/teams/{teamId}
  id: string
  name: string
  ownerUid: string
  inviteCode?: string
  archived?: boolean
  createdAt: string
  updatedAt: string

  /teamMembers/{uid}
    uid: string
    role: 'owner' | 'admin' | 'member'
    joinedAt: string

  /players/{playerId}
    // bisheriger Player + optional teamId
    id: string
    name: string
    nickname: string
    photoUrl: string
    balance: number
    email?: string
    phone?: string
    totalUnpaidPenalties: number
    totalPaidPenalties: number
    active?: boolean
    notes?: string
    teamId?: string       // redundant, erleichtert Queries/Rules
    createdAt?: string
    updatedAt?: string

    /fines/{fineId}
      id: string
      userId: string      // == playerId
      teamId?: string
      reason: string
      amount: number
      date: string
      paid: boolean
      paidAt?: string | null
      amountPaid?: number | null
      createdAt: string
      updatedAt: string

    /payments/{paymentId}
      id: string
      userId: string      // == playerId
      teamId?: string
      reason: string
      category?: 'PAYMENT' | 'DEPOSIT' | 'TRANSFER'
      amount: number
      date: string
      paid: boolean       // Zahlungen sind i. d. R. paid=true
      paidAt?: string | null
      createdAt?: string
      updatedAt?: string

    /beverageConsumptions/{consumptionId}
      id: string
      userId: string
      teamId?: string
      beverageId: string
      beverageName: string
      amount: number
      date: string
      paid: boolean
      paidAt?: string | null
      amountPaid?: number | null
      createdAt: string
      updatedAt?: string

    /duePayments/{dpId}
      id: string
      dueId: string
      userId: string
      teamId?: string
      userName: string
      amountDue: number
      paid: boolean
      paidAt?: string | null
      amountPaid?: number | null
      exempt: boolean
      createdAt: string
      updatedAt?: string

  /dues/{dueId}
    id: string
    teamId?: string
    name: string
    amount: number
    createdAt: string
    active: boolean
    archived: boolean
```

Optionale, team‑weite Dokumente (später):
- /teams/{teamId}/predefinedFines/{id} für vordefinierte Strafen
- /teams/{teamId}/settings/{id} für Team‑Einstellungen

Hinweis: teamId in Unterdokumenten ist redundant (Pfad ist führend), erleichtert jedoch Collection‑Group‑Queries und Rules.

3.1. Typen (TypeScript)
Ergänzungen im Code (bereits umgesetzt/teilweise vorhanden):
- Neue Typen: Team, TeamMember, TeamRole.
- Optionales teamId bei team‑gescopten Entitäten (Player, Fine, Payment, BeverageConsumption, Due, DuePayment).
- Einheitliche Auditfelder createdAt, updatedAt (ISO‑Strings) wo sinnvoll.

4. Service‑Layer – Pfade
Dank BaseFirebaseService<T> werden die Collection‑Pfade zentral injiziert.
- PlayersService: teams/{teamId}/players (Fallback: users im Legacy‑Modus)
- FinesService: teams/{teamId}/players/{playerId}/fines
- PaymentsService: teams/{teamId}/players/{playerId}/payments
- BeveragesService: teams/{teamId}/players/{playerId}/beverageConsumptions
- DuesService: teams/{teamId}/dues und ggf. teams/{teamId}/players/{playerId}/duePayments

Collection‑Group‑Queries (bereits genutzt) filtern bei gesetztem teamId über Feldfilter where('teamId','==',teamId).

5. Security Rules – Entwurf (Skizze)
Rules‑Version 2, hoch‑level Entwurf. Exakte Umsetzung inkl. Tests folgt in PRD 8.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isTeamMember(teamId) {
      return isSignedIn() && exists(/databases/$(database)/documents/teams/$(teamId)/teamMembers/$(request.auth.uid));
    }
    function hasRole(teamId, roles) {
      return isTeamMember(teamId) &&
             get(/databases/$(database)/documents/teams/$(teamId)/teamMembers/$(request.auth.uid)).data.role in roles;
    }

    match /teams/{teamId} {
      allow read: if isTeamMember(teamId);
      allow write: if hasRole(teamId, ['owner','admin']);

      match /teamMembers/{uid} {
        allow read: if isTeamMember(teamId);
        allow write: if request.auth.uid == uid || hasRole(teamId, ['owner']);
      }

      match /players/{playerId} {
        allow read, write: if isTeamMember(teamId);
        match /fines/{fineId} { allow read, write: if isTeamMember(teamId); }
        match /payments/{paymentId} { allow read, write: if isTeamMember(teamId); }
        match /beverageConsumptions/{bevId} { allow read, write: if isTeamMember(teamId); }
        match /duePayments/{dpId} { allow read, write: if isTeamMember(teamId); }
      }

      match /dues/{dueId} {
        allow read: if isTeamMember(teamId);
        allow write: if hasRole(teamId, ['owner','admin']);
      }

      match /predefinedFines/{pfId} {
        allow read: if isTeamMember(teamId);
        allow write: if hasRole(teamId, ['owner','admin']);
      }
    }
  }
}
```

Validierungsregeln (später) können zusätzlich sicherstellen, dass resource.data.teamId == teamId bei Schreibvorgängen gilt.

6. Indizes (Vorschlag)
- teams/{teamId}/players sortierbar nach name, balance.
- fines (Group): index auf teamId + date (Composite, absteigend).
- payments (Group): index auf teamId + date.
- beverageConsumptions (Group): index auf teamId + date.
- duePayments (Group): index auf teamId + createdAt.

Konkrete firestore.indexes.json‑Einträge werden nach finaler Query‑Form erstellt (PRD 8/10).

7. Migrationsplan (von Legacy → Teams)
Annahme: Bisherige Daten unter /users/{userId} mit Subcollections fines, payments, beverageConsumptions, ggf. duePayments.

Strategie A (einfach, kurzes Wartungsfenster):
1) Backup/Export der Daten (Firestore Export).
2) Wartungsfenster aktivieren (App read‑only/hidden deploy).
3) Einmalige Migration via Admin SDK:
   - Default‑Team anlegen, z. B. teams/{legacyTeamId}.
   - Jeden users/{userId} als teams/{legacyTeamId}/players/{userId} anlegen.
   - Subcollections fines, payments, beverageConsumptions, duePayments kopieren.
   - In kopierten Dokumenten teamId = legacyTeamId setzen.
   - Referenzen/Transaktionen zeigen künftig auf Player‑Dokument im Team‑Pfad.
4) Konsistenzprüfung: Stichproben, Summen (Payments – Fines – Consumptions – DuePayments) == player.balance.
5) Legacy‑Collections archivieren/entfernen.

Strategie B (Dual‑Write, zero downtime):
- Für kurze Zeit synchron in Legacy und Team‑Pfad schreiben, dann Umschalten, danach Legacy aufräumen. Mehr Aufwand, wird aktuell nicht empfohlen.

7.1. Technischer Ablauf (Admin Script)
- Node/TS‑Script mit Firebase Admin SDK.
- Idempotent (erneute Ausführung überschreibt nicht unkontrolliert).
- Pseudocode:

```
for (const user of getAll('/users')) {
  const teamId = LEGACY_TEAM_ID;
  const playerRef = `/teams/${teamId}/players/${user.id}`;
  write(playerRef, { ...user, teamId });
  for (const c of ['fines','payments','beverageConsumptions','duePayments']) {
    for (const doc of getAll(`/users/${user.id}/${c}`)) {
      write(`/teams/${teamId}/players/${user.id}/${c}/${doc.id}`, { ...doc, teamId });
    }
  }
}
```

7.2. Validierung
- Vor/Nach‑Summenvergleich pro Spieler.
- Zufallsstichproben pro Subcollection.
- App‑Smoke‑Test im Staging mit Rules aktiv.

8. Risiken & Gegenmaßnahmen
- Rule‑Fehlkonfiguration: Vor Produktion automatische Rule‑Tests (PRD 8).
- Migration inkonsistent: Backup, Idempotenz, Checksummen, Staging‑Dry‑Run.
- UX‑Abbrüche im Onboarding: Zwischenspeicherung (localStorage), Wiederaufnahme (PRD 3/4).

9. Akzeptanzkriterien (PRD 1)
- Dieses Dokument liegt im Repo (docs/PRD-Team-Tenancy.md).
- Datenmodell und Pfade sind beschrieben und konsistent mit Service‑Layer.
- Rules‑Skizze vorhanden (keine produktive Aktivierung in PRD 1).
- Migrationsplan mit Ablauf und Validierung beschrieben.

Anmerkung zur aktuellen Codebasis (Stand):
- TeamProvider existiert und liefert teamId (Kontext).
- Services (PlayersService, FinesService, PaymentsService, BeveragesService, DuesService) unterstützen team‑gescopte Pfade mit optionalem Fallback auf Legacy.
- Hooks nutzen teamId für Collection‑Group‑Queries via Feld teamId.
