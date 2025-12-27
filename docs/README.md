# Docs – PRDs & Arbeitsweise

## Archiv

Alle bisherigen Markdown-Dokumente wurden nach `docs/archived/` verschoben.

Der Ordner `docs/` (Root) ist ab jetzt **für neue, ausführliche PRDs** reserviert, die direkt als Grundlage für Implementierungsaufgaben dienen.

## Neue PRDs erstellen

1. **Template verwenden:** Starte mit `docs/PRD-TEMPLATE.md`.
2. **Sehr ausführlich schreiben:** Das PRD soll so konkret sein, dass Entwickler:innen daraus Tickets ableiten können, ohne Rückfragen zu stellen.
3. **Ist-Analyse + Gap:** Beschreibe explizit, was in der Codebase bereits existiert und was fehlt.

### Grundlage / Stil-Vorlage

Als inhaltliche und stilistische Orientierung dient die WebStorm-Scratch-Datei:

`Ich_brauche_mal_deine_Einschätzung_als_j.md`

(Diese Datei liegt außerhalb des Repos in den IDE-Scratches; daher ist das Template im Repo die nachhaltige Referenz.)

## Naming-Konvention

- PRDs: `PRD-XX-<kurzer-title>.md` (oder falls sinnvoll: `PRD-<Thema>.md`)
- Optional: Completion-Reports separat, z. B. `PRD-XX-IMPLEMENTATION-COMPLETE.md`
