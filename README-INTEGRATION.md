# Rascals Playbook & Scheme – Übergabepaket

Dieses Paket enthält ausschließlich das bisher erstellte Playbook-&-Scheme-Modul und seine direkten Dateien.

## Hauptdatei

`app/coach/playbook/CoachPlaybook.tsx`

In dieser React-Komponente befinden sich die Oberfläche und die aktuelle Logik für:

- Aufstellung für Offense, Defense und Special Teams
- Playbook und Spielzug-Designer
- frei positionierbare Spieler
- Standardrouten und eigene Routen
- Speichern und Bearbeiten von Spielzügen
- Gegneranalyse, Gegnerformationen und Video-Metadaten
- KPI-Anzeigen

## Weitere benötigte Dateien

- `app/coach/playbook/playbook.module.css` – vollständiges Design und Footballfeld
- `app/coach/playbook/page.tsx` – Next.js-Routeneinstieg
- `app/data/coach.ts` – derzeitige Demo-/Ausgangsdaten und Typen
- `public/rascals-endzone-wordmark-v3.png` – Endzonen-Schriftzug
- `public/rascals-logo-header.webp` – Logo im Modul

## Integration in ein Next.js-SCM

1. Die Ordner aus diesem Paket unter Beibehaltung der Struktur in das SCM kopieren.
2. Falls im SCM bereits eine Route für das Modul besteht, nur `CoachPlaybook.tsx` und `playbook.module.css` übernehmen und dort importieren.
3. Die Daten aus `app/data/coach.ts` nicht dauerhaft als Produktivdaten verwenden.
4. `playerProfiles`, `performanceCards`, Formationen, Spielzüge, Routen und Gegnerdaten durch die API beziehungsweise Datenadapter des SCM ersetzen.
5. Die bestehende SCM-Authentifizierung und die IDs für Team, Saison, Woche und Benutzer an das Modul übergeben.

## Aktueller Speicherzustand

Der Prototyp verwendet im Browser derzeit folgende `localStorage`-Schlüssel:

- `rascals-playbook-plays`
- `rascals-custom-routes`
- `rascals-opponent-scouting`

Für den Produktivbetrieb müssen diese durch API-Aufrufe und serverseitige Speicherung ersetzt werden. Das SCM bleibt die verbindliche Quelle für Spielerprofile, Ratings und KPIs.

## Hinweis für andere Frontend-Frameworks

`CoachPlaybook.tsx` ist eine React-Komponente. `page.tsx` ist nur für den Next.js App Router erforderlich. Bei Vite oder einem anderen React-Router wird stattdessen `CoachPlaybook` in die vorhandene SCM-Route eingebunden.
