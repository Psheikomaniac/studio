# CSV Import - Beispieldateien und Dokumentation

## Übersicht

Das balanceUp System unterstützt den Import von drei verschiedenen CSV-Typen:

1. **Dues** (Beiträge) - Für Saisonbeiträge, Veranstaltungen, etc.
2. **Punishments** (Strafen) - Für Strafen und Getränke
3. **Transactions** (Transaktionen) - Für alle Zahlungsbewegungen

## Wichtige Hinweise

### Dateinamen

Die CSV-Dateien **müssen** einen der folgenden Begriffe im Dateinamen enthalten:
- `dues` - für Beiträge
- `punishment` - für Strafen/Getränke
- `transaction` - für Transaktionen

**Beispiele:**
- ✅ `team-dues-2024.csv`
- ✅ `export-punishments.csv`
- ✅ `transactions-mai.csv`
- ❌ `export.csv` (wird nicht erkannt)

### CSV-Format

- **Trennzeichen:** Semikolon (`;`)
- **Encoding:** UTF-8 (mit oder ohne BOM)
- **Datumsformat:** `DD-MM-YYYY` (z.B. `15-05-2024`)
- **Beträge:** In Cent (100 = 1,00 EUR)
- **Header:** Erste Zeile muss Spaltennamen enthalten

---

## 1. Dues (Beiträge)

### CSV-Struktur

```csv
team_id;team_name;due_name;due_created;due_amount;due_currency;due_archived;user_id;username;user_paid;user_payment_date;search_params
```

### Spalten

| Spalte | Beschreibung | Pflicht | Beispiel |
|--------|--------------|---------|----------|
| `team_id` | Team-ID | Nein | `team123` |
| `team_name` | Team-Name | Nein | `HSG Musterstadt` |
| `due_name` | **Beitragsname** | **Ja** | `Saison2425` |
| `due_created` | Erstellungsdatum | Nein | `01-08-2024` |
| `due_amount` | **Betrag in Cent** | **Ja** | `15000` (= 150,00 EUR) |
| `due_currency` | Währung | Nein | `EUR` |
| `due_archived` | Archiviert? | Nein | `YES` / `NO` |
| `user_id` | Spieler-ID | Nein | `player1` |
| `username` | **Spielername** | **Ja** | `Max Mustermann` |
| `user_paid` | Zahlungsstatus | Nein | `STATUS_PAID` / `STATUS_UNPAID` / `STATUS_EXEMPT` |
| `user_payment_date` | Zahlungsdatum | Nein | `15-08-2024` |
| `search_params` | Suchparameter | Nein | `` |

### Zahlungsstatus

- `STATUS_PAID` - Bezahlt (benötigt `user_payment_date`)
- `STATUS_UNPAID` - Unbezahlt (Standard)
- `STATUS_EXEMPT` - Befreit (z.B. Trainer, Ehrenmitglieder)

### Beispiel

```csv
team_id;team_name;due_name;due_created;due_amount;due_currency;due_archived;user_id;username;user_paid;user_payment_date;search_params
team123;HSG Musterstadt;Saison2425;01-08-2024;15000;EUR;NO;player1;Max Mustermann;STATUS_PAID;15-08-2024;
team123;HSG Musterstadt;Saison2425;01-08-2024;15000;EUR;NO;player2;Anna Schmidt;STATUS_UNPAID;;
team123;HSG Musterstadt;Saison2425;01-08-2024;15000;EUR;NO;player3;Tom Weber;STATUS_EXEMPT;;
```

---

## 2. Punishments (Strafen)

### CSV-Struktur

```csv
team_id;team_name;penatly_created;penatly_user;penatly_reason;penatly_archived;penatly_paid;penatly_amount;penatly_currency;penatly_subject;search_params
```

### Spalten

| Spalte | Beschreibung | Pflicht | Beispiel |
|--------|--------------|---------|----------|
| `team_id` | Team-ID | Nein | `team123` |
| `team_name` | Team-Name | Nein | `HSG Musterstadt` |
| `penatly_created` | Erstellungsdatum | Nein | `10-05-2024` |
| `penatly_user` | **Spielername** | **Ja** | `Max Mustermann` |
| `penatly_reason` | **Grund** | **Ja** | `Zu spät zum Training` |
| `penatly_archived` | Archiviert? | Nein | `YES` / `NO` |
| `penatly_paid` | Bezahldatum | Nein | `15-05-2024` |
| `penatly_amount` | **Betrag in Cent** | **Ja** | `500` (= 5,00 EUR) |
| `penatly_currency` | Währung | Nein | `EUR` |
| `penatly_subject` | Kategorie | Nein | `Strafe` / `Getränk` |
| `search_params` | Suchparameter | Nein | `` |

### Automatische Klassifizierung

Das System erkennt automatisch, ob es sich um eine **Strafe** oder ein **Getränk** handelt:

**Als GETRÄNK erkannt, wenn der Grund eines dieser Wörter enthält:**
- `getränke`, `getränk`, `bier`, `beer`, `drink`, `beverage`
- `wasser`, `water`, `cola`, `sprite`

**Beispiele:**
- ✅ `Bier nach dem Spiel` → GETRÄNK
- ✅ `Cola` → GETRÄNK
- ✅ `Zu spät zum Training` → STRAFE
- ✅ `Gelbe Karte` → STRAFE

### Beispiel

```csv
team_id;team_name;penatly_created;penatly_user;penatly_reason;penatly_archived;penatly_paid;penatly_amount;penatly_currency;penatly_subject;search_params
team123;HSG Musterstadt;10-05-2024;Max Mustermann;Zu spät zum Training;NO;15-05-2024;500;EUR;Strafe;
team123;HSG Musterstadt;14-05-2024;Tom Weber;Bier nach dem Spiel;NO;14-05-2024;150;EUR;Getränk;
team123;HSG Musterstadt;15-05-2024;Anna Schmidt;Gelbe Karte;NO;;750;EUR;Strafe;
```

---

## 3. Transactions (Transaktionen)

### CSV-Struktur

```csv
team_id;team_name;transaction_date;transaction_amount;transaction_currency;transaction_subject;balance_total;balance_filtered;search_params
```

### Spalten

| Spalte | Beschreibung | Pflicht | Beispiel |
|--------|--------------|---------|----------|
| `team_id` | Team-ID | Nein | `team123` |
| `team_name` | Team-Name | Nein | `HSG Musterstadt` |
| `transaction_date` | **Transaktionsdatum** | **Ja** | `10-05-2024` |
| `transaction_amount` | **Betrag in Cent** | **Ja** | `-500` oder `1000` |
| `transaction_currency` | Währung | Nein | `EUR` |
| `transaction_subject` | **Betreff** | **Ja** | `Strafen: Max Mustermann (Grund)` |
| `balance_total` | Gesamtsaldo | Nein | `-500` |
| `balance_filtered` | Gefilterter Saldo | Nein | `-500` |
| `search_params` | Suchparameter | Nein | `` |

### Betragsformat

- **Negative Beträge** = Belastung (Schuld)
- **Positive Beträge** = Gutschrift (Zahlung)

**Beispiele:**
- `-500` = Spieler schuldet 5,00 EUR
- `1000` = Spieler hat 10,00 EUR eingezahlt

### Subject-Format

Der `transaction_subject` muss den Spielernamen enthalten. Erkannte Formate:

1. `Strafen: Spielername (Kategorie)`
2. `Einzahlung: Spielername`
3. `Getränke: Spielername (Details)`

**Beispiele:**
- ✅ `Strafen: Max Mustermann (Training zu spät)`
- ✅ `Einzahlung: Anna Schmidt`
- ✅ `Getränke: Tom Weber (Bier)`

### Beispiel

```csv
team_id;team_name;transaction_date;transaction_amount;transaction_currency;transaction_subject;balance_total;balance_filtered;search_params
team123;HSG Musterstadt;10-05-2024;-500;EUR;Strafen: Max Mustermann (Training zu spät);-500;-500;
team123;HSG Musterstadt;15-05-2024;500;EUR;Einzahlung: Max Mustermann;0;0;
team123;HSG Musterstadt;14-05-2024;-150;EUR;Getränke: Tom Weber (Bier);-150;-150;
```

---

## Import-Prozess

### 1. Vorbereitung

1. CSV-Datei erstellen oder exportieren
2. Sicherstellen, dass das Format korrekt ist:
   - Semikolon (`;`) als Trennzeichen
   - Datum im Format `DD-MM-YYYY`
   - Beträge in Cent
3. Dateinamen mit `dues`, `punishment` oder `transaction` benennen

### 2. Import durchführen

1. Navigiere zu **Settings** Seite
2. Im **Data Import** Bereich:
   - Klicke auf **CSV File** Button
   - Wähle deine CSV-Datei aus
3. Klicke auf **Import Data**
4. Warte auf die Bestätigung

### 3. Ergebnis

Nach dem Import erhältst du eine Zusammenfassung:

```
Successfully imported [type] data:
- X rows processed
- Y players created
- Z errors
```

**Warnings/Errors werden in der Console ausgegeben:**
- Fehlende Pflichtfelder
- Ungültige Beträge
- Nicht parsbare Daten

---

## Besondere Funktionen

### Automatische Spieler-Erstellung

Wenn ein Spieler im CSV noch nicht existiert:
- ✅ Automatische Erstellung mit Namen
- ✅ Nickname = Vorname
- ✅ Avatar wird generiert
- ✅ Balance beginnt bei 0

### Duplikats-Erkennung

- Spieler werden anhand des **Namens** erkannt (case-insensitive)
- Wenn `user_id` vorhanden, wird auch nach ID gesucht
- Bei mehrfachen Importen: Bestehendes wird wiederverwendet

### Getränke-System

- Getränke werden automatisch als **Beverage** angelegt
- Preis wird aus dem ersten Import übernommen
- Spätere Käufe referenzieren das gleiche Getränk

### Beiträge-System

- Ein Beitrag (z.B. "Saison2425") wird nur einmal angelegt
- Alle Spieler-Zahlungen referenzieren den gleichen Beitrag
- Status pro Spieler: Bezahlt / Unbezahlt / Befreit

---

## Häufige Fehler

### ❌ "Unknown CSV type"

**Problem:** Dateiname enthält keinen erkannten Typ

**Lösung:** Benenne die Datei um:
- `export.csv` → `export-dues.csv`
- `daten.csv` → `punishments-2024.csv`

### ❌ "Missing required fields"

**Problem:** Pflichtfelder fehlen in einer Zeile

**Lösung:** Überprüfe:
- Dues: `due_name`, `due_amount`, `username`
- Punishments: `penatly_user`, `penatly_reason`, `penatly_amount`
- Transactions: `transaction_date`, `transaction_amount`, `transaction_subject`

### ❌ "Invalid amount"

**Problem:** Betrag ist nicht numerisch oder negativ (wo positiv erwartet)

**Lösung:**
- Nur Zahlen in Cent verwenden
- Keine Dezimaltrennzeichen
- `5,50 EUR` → `550`

### ❌ "Could not parse player name"

**Problem:** Bei Transactions konnte der Spielername nicht aus dem Subject extrahiert werden

**Lösung:** Subject-Format prüfen:
- ✅ `Strafen: Max Mustermann`
- ❌ `Max Mustermann hat Strafe`

---

## Tipps

### Export aus anderen Systemen

Wenn du aus einem anderen System exportierst:

1. **Excel/Google Sheets:**
   - Spalten wie oben beschrieben benennen
   - "Speichern als" → CSV (Semikolon getrennt)
   - UTF-8 Encoding wählen

2. **Datumsformat anpassen:**
   - In Excel: `=TEXT(A1;"DD-MM-YYYY")`
   - Oder: Zellenformat → Benutzerdefiniert → `TT-MM-JJJJ`

3. **Beträge in Cent:**
   - In Excel: `=A1*100` (wenn Beträge in EUR)
   - Dezimalstellen entfernen

### Große Datenmengen

- Importe können mehrere hundert Zeilen enthalten
- Bei > 1000 Zeilen: Aufteilen in mehrere Dateien
- Zuerst Spieler importieren (via Punishments/Dues)
- Dann Transaktionen

### Testen

Starte mit kleinen Test-Dateien:
- 3-5 Spieler
- 10-20 Einträge
- Überprüfe das Ergebnis
- Dann vollständigen Import

---

## Beispiel-Workflow

### Saisonstart mit neuem Team

1. **Schritt 1:** Saisonbeitrag importieren
   ```
   example-dues.csv → Saison2425 für alle Spieler
   ```

2. **Schritt 2:** Erste Strafen importieren
   ```
   example-punishments.csv → Vergangene Monat
   ```

3. **Schritt 3:** Getränke-Käufe importieren
   ```
   example-punishments.csv → Bier, Cola, Wasser
   ```

4. **Schritt 4:** Zahlungen importieren
   ```
   example-transactions.csv → Wer hat schon bezahlt?
   ```

---

## Weiterführende Informationen

- Nach dem Import: Überprüfe die **Players** Seite
- Transaktionen sind auf der **Money** Seite sichtbar
- Beiträge werden im Dashboard angezeigt

Bei Fragen oder Problemen:
- Console-Logs prüfen (F12 → Console)
- Import-Fehler werden im Toast angezeigt
- CSV-Format nochmals mit Beispielen vergleichen
