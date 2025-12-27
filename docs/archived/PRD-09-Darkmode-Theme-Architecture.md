 # PRD-09: Darkmode & Theme-Architektur
 
 ## Überblick
 Dieses PRD beschreibt einen minimal-invasiven, SSR-sicheren Darkmode für die Next.js App. Die Codebasis nutzt bereits Tailwind mit darkMode:"class" und CSS-Variablen in globals.css. Es fehlt eine zentrale Steuerung (Persistenz, Umschalter, FOUC-Vermeidung).
 
 ## Ziele
 - Darkmode mit drei Modi: light | dark | system.
 - Kein FOUC beim initialen Render.
 - Persistenz der Präferenz (localStorage) mit Rückfall auf Systempräferenz.
 - Minimaler Eingriff in bestehende Komponenten.
 
 ## Nicht-Ziele
 - Redesign der UI oder Austausch der bestehenden Farb-Tokens.
 - Migration auf andere UI-Bibliotheken.
 
 ## Ist-Stand (aus README, AGENTS, Code)
 - tailwind.config.ts: darkMode ist auf "class" gesetzt; Farb-Tokens sind an CSS-Variablen gebunden.
 - src/app/globals.css: Variablen für :root (Light) und .dark (Dark) sind vorhanden.
 - src/app/layout.tsx: suppressHydrationWarning ist aktiv; kein zentraler Theme-Schalter vorhanden.
 - Komponenten nutzen bereits Tokens und teils dark:-Utilities; Charts unterstützen .dark via Scoping.
 
 ## Optionen
 - Option A (empfohlen): Leichtgewichtiges Inline-Theme-Script im <head>, das vor dem ersten Paint die Klasse "dark" auf <html> setzt oder entfernt (basierend auf localStorage.theme oder prefers-color-scheme).
 - Option B: Einsatz einer Bibliothek wie next-themes (zusätzliche Dependency, ähnlicher Mechanismus, ggf. dennoch Head-Script notwendig).
 
 ## Entscheidung
 - Option A (Inline-Script) wegen minimaler Abhängigkeiten, bester FOUC-Vermeidung und voller Kontrolle.
 
 ## Architektur (High Level)
 - Quelle der Wahrheit: localStorage.theme ∈ { light, dark, system }, Default: system.
 - Initialisierung: Inline-Script im head setzt/entfernt .dark auf <html> vor erstem Paint.
 - Laufzeitwechsel: UI-Toggle schreibt localStorage.theme und passt die Klasse an; bei system reagiert ein matchMedia-Listener auf OS-Wechsel.
 - Meta: <meta name="color-scheme" content="dark light"> für native Controls.
 
 ## Implementierungsschritte
 1. Inline-Script in src/app/layout.tsx im head ergänzen (FOUC-Schutz). Tokens bleiben unverändert.
 2. Meta-Tag color-scheme ergänzen.
 3. Kleines Utility src/lib/theme.ts (getTheme, setTheme, toggleTheme, resolveEffectiveTheme) inkl. Typen.
 4. UI-Toggle src/components/theme-toggle.tsx (Light/Dark/System), Platzierung: SidebarFooter nahe UserNav.
 5. Systemmodus: matchMedia Listener registrieren (Cleanup bei Unmount).
 6. Doku: README-Hinweis „Darkmode & Toggle“ ergänzen.
 7. Tests
    - Unit (Vitest): Utilities (Persistenz, Resolution, Toggle, Fallback ohne localStorage).
    - E2E (Playwright): First Paint mit vorgesetztem localStorage.theme, Toggle-Persistenz, Systemmodus via page.emulateMedia.
 
 ## Risiken und Gegenmaßnahmen
 - FOUC/Hydration: Inline-Script im head + suppressHydrationWarning mitigieren.
 - Storage/Privacy: Zugriff auf localStorage in try/catch; Default bleibt system.
 - Kontrast/A11y: Axe/Playwright-Checks; ggf. Feinjustage von --foreground/--muted-foreground.
 - CI: colorScheme in Headless via emulateMedia sicherstellen.
 
 ## Aufwandsschätzung
 - Implementierung: 2–4 h; Tests: 2–3 h; Review/Feinschliff: 1–2 h.
 
 ## Referenzen im Repo
 - tailwind.config.ts, src/app/globals.css, src/app/layout.tsx, src/components/ui/chart.tsx, vorhandene dark:-Utilities (z. B. src/components/dues/delete-due-dialog.tsx).