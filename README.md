# balanceUp – Club Finance Studio

balanceUp ist eine Next.js‑App für Vereinsverwaltung mit Fokus auf Geldflüsse: Spieler, Strafen, Beiträge, Zahlungen und Getränke. Die App nutzt Firebase (Firestore), Tailwind CSS und shadcn/ui.

## Quick Start

1. Abhängigkeiten installieren

   npm install

2. Dev‑Server starten (Port 9002)

   npm run dev

### Emulator (lokal, empfohlen)

Wenn du lokal entwickelst, solltest du Firestore/Auth über die Firebase Emulator Suite laufen lassen.

1. Emulatoren starten

   npm run emulator:start

2. App im Dev verbindet sich auf `localhost` standardmäßig mit den Emulatoren.
   Falls du bewusst gegen das echte Firebase-Projekt entwickeln willst, setze in `.env.local`:

   NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false

Optional kannst du die Ziele explizit setzen:

NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099

3. Tests

   - Alle Tests: npm test
   - E2E (Playwright): npm run test:e2e
   - Coverage: npm run test:coverage

## Tech‑Stack

- Next.js 16 (App Router), React 19, TypeScript
- Firebase Firestore
- Tailwind CSS, shadcn/ui
- Playwright, Vitest

## Codepfade

- Seiten: src/app
- Komponenten: src/components
- Services (Firestore): src/services
- Typen & Utils: src/lib

## Responsives Design

- Global: Meta‑Viewport ist gesetzt, Basis‑Typografie in src/app/layout.tsx und globals.css.
- Tabellen: Einheitliche horizontale Scrollbarkeit via Komponenten‑Wrapper (overflow‑x‑auto, Touch‑Scrolling); Spalten ohne Umbruch für Datum/Betrag/Status.
- Toolbars/Buttons: Auf kleinen Screens flex‑wrap/Stacking; Finger‑Zielgrößen >= 44px.
- Grids: 1 Spalte mobil, ab md 2–3 Spalten (Tailwind Breakpoints).

Siehe test-results/ für automatische Responsive‑Snapshots.

## Hinweise

- Standard‑Landing leitet auf /dashboard um.
- Umgebungsvariablen: .env.local (siehe vorhandene Beispiel‑Keys).
- Mandantenfähigkeit (Teams): Spieler liegen nicht mehr global unter `/users`, sondern team‑scoped unter `/teams/{teamId}/players`.
  - `teamId` wird im Client vom `TeamProvider` bereitgestellt (Persistenz via localStorage Key `currentTeamId`).
  - Neue Nutzer:innen müssen das Onboarding (/onboarding) durchlaufen (Team erstellen oder per Invite‑Code beitreten).

## Dokumentation

- Mandantenfähigkeit (Teams) – Architektur & Datenschema, Security‑Rules‑Skizze, Migrationsplan: docs/PRD-Team-Tenancy.md

## Darkmode & Theme

- Drei Modi: light, dark, system (Standard ist system).
- FOUC‑frei dank Inline‑Theme‑Script im <head>.
- Persistenz via localStorage (Key: `theme`).
- Umschalten über den Theme‑Toggle im Sidebar‑Footer neben dem User‑Menü.
- Systemmodus folgt automatisch der OS‑Einstellung (Änderungen werden live übernommen).

## Lizenz

Interne Projektressource. 
