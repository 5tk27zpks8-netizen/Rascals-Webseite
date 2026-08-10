# Verbindlicher Integrationsauftrag für ChatGPT / Codex

## Verwendung

Stelle ChatGPT beziehungsweise Codex gleichzeitig diese Dinge bereit:

1. dieses Übergabepaket `rascals-playbook-scheme-module-2026-08-10.zip`,
2. das vollständige GitHub-Repository oder den lokalen Projektordner des bestehenden SCM,
3. diese Datei als verbindlichen Arbeitsauftrag,
4. vorhandene Testzugänge und Informationen zur Cloudflare-Umgebung, sofern sie nicht bereits im Repository dokumentiert sind.

Danach soll ChatGPT den folgenden Auftrag ausführen.

---

## Auftrag

Du integrierst das bereitgestellte Modul **„Rascals Playbook & Scheme“** vollständig in mein bestehendes SCM. Das SCM ist die Hauptanwendung und die einzige verbindliche Quelle für Benutzer, Teams, Spieler, Leistungswerte, Saisons, Wochen, Spiele und KPIs.

Das Ergebnis darf keine lose Demo, kein iframe und keine zweite eigenständige Webseite sein. Das Playbook muss als echte Route beziehungsweise als internes Modul des SCM funktionieren und die vorhandene Anmeldung, Navigation, Rechteverwaltung, Datenbank, API und Cloudflare-Konfiguration verwenden.

## Bereitgestellte Moduldateien

- `app/coach/playbook/CoachPlaybook.tsx` enthält die React-Oberfläche und die bisherige Playbook-Logik.
- `app/coach/playbook/playbook.module.css` enthält das vollständige Design und Footballfeld.
- `app/coach/playbook/page.tsx` ist der bisherige Next.js-Routeneinstieg.
- `app/data/coach.ts` enthält derzeitige Ausgangs-, Demo- und Profildaten.
- `public/rascals-endzone-wordmark-v3.png` enthält den Endzonen-Schriftzug.
- `public/rascals-logo-header.webp` enthält das Logo des Moduls.

Kopiere diese Dateien **nicht blind** über gleichnamige SCM-Dateien. Ermittle zuerst Struktur, Framework, Routing und Datenmodelle des SCM. Passe Zielpfade und Imports an die vorhandene Architektur an. Bestehende SCM-Dateien und Funktionen müssen erhalten bleiben.

## Unveränderliche Produktanforderungen

Das integrierte Modul muss weiterhin enthalten:

- Aufstellung für Offense, Defense und Special Teams,
- Starter, Backups, Spielerdaten und Ratings,
- regelgerechtes American-Football-Feld,
- Formationen,
- Playbook und Spielzug-Designer,
- freie Positionierung von Spielern,
- Standardrouten,
- Editor für eigene benannte Routen,
- Speichern, Bearbeiten, Duplizieren und Löschen von Spielzügen,
- Gegneranalyse,
- historische Gegner und Spiele,
- Video- beziehungsweise Clip-Zuordnung,
- gegnerische Formationen, Routen und Assignments,
- dynamisch berechnete KPIs und Tendenzen.

Die vorhandene Optik und Footballfeld-Geometrie sind grundsätzlich beizubehalten. Technisch notwendige Anpassungen an das SCM-Layout und die Responsivität sind erlaubt, dürfen die Funktionen aber nicht reduzieren.

## Phase 1: Bestandsaufnahme vor jeder Änderung

Untersuche zuerst das SCM und dokumentiere knapp:

1. verwendetes Framework und Version,
2. Routing-System,
3. Authentifizierung und Session-Verarbeitung,
4. Benutzerrollen und Berechtigungen,
5. Datenbank und ORM,
6. vorhandene API-Struktur,
7. Modelle für Team, Spieler, Saison, Woche, Spiel und Statistiken,
8. Berechnung beziehungsweise Speicherung vorhandener KPIs,
9. Cloudflare Pages-/Workers-Konfiguration,
10. Test-, Build- und Deployment-Befehle.

Suche nach Projektanweisungen wie `AGENTS.md`, `README`, Datenbankschemas, Migrationen, API-Routen, Middleware und Umgebungsvariablen. Befolge vorhandene Projektregeln.

Erstelle danach einen konkreten Integrationsplan mit den Dateien, die du anlegst oder änderst. Implementiere nicht auf Basis erfundener Endpunkte, Tabellen oder Feldnamen.

Wenn eine zwingend benötigte Information weder im Repository noch in der Konfiguration auffindbar ist, stelle eine konkrete Rückfrage. Fahre bei allen unabhängig davon möglichen Arbeiten fort.

## Phase 2: Modul sauber in das SCM einbauen

1. Erstelle eine SCM-interne Route für „Playbook & Scheme“ nach dem bestehenden Routing-Muster.
2. Binde die Route in die vorhandene Navigation und Rechteprüfung ein.
3. Verwende das bestehende SCM-Layout; erstelle keine zweite Sidebar, keinen zweiten Header und keine zweite Anmeldung.
4. Extrahiere bei Bedarf Teilbereiche aus `CoachPlaybook.tsx` in wartbare Komponenten, ohne Funktionen zu entfernen.
5. Übernimm `playbook.module.css` beziehungsweise migriere es in das vorhandene Styling-System, ohne die Darstellung des Feldes und der Routen zu beschädigen.
6. Lege die beiden Bilddateien im öffentlichen Asset-Verzeichnis des SCM ab und passe die Pfade an dessen Base-Path an.
7. Vermeide globale CSS-Regeln, die andere SCM-Seiten beeinflussen.
8. Stelle sicher, dass Canvas, Pointer-Events und Drag-and-drop mit Maus und Touch funktionieren.

Wenn das SCM nicht Next.js verwendet:

- übernimm `CoachPlaybook.tsx` als React-Komponente,
- ersetze `page.tsx` durch die bestehende Router-Lösung,
- entferne ausschließlich Next.js-spezifische Metadata-Imports,
- behalte die eigentliche Moduloberfläche und Logik bei.

## Phase 3: Klare Datenadapter statt direkter Mockdaten

Die Oberfläche darf nicht direkt an die bisherige Datei `app/data/coach.ts` oder an eine bestimmte Datenbank gekoppelt bleiben. Erstelle zwischen UI und SCM einen typisierten Service beziehungsweise Repository-Adapter.

Der Modulkontext muss mindestens diese Werte aus der vorhandenen SCM-Session oder Seitenauswahl erhalten:

```ts
export type PlaybookModuleContext = {
  teamId: string;
  seasonId: string;
  weekId?: string;
  currentUserId: string;
  permissions: string[];
};
```

Der Datenadapter soll sinngemäß folgende Fähigkeiten besitzen. Passe Namen und Signaturen an die vorhandene SCM-Architektur an:

```ts
export interface PlaybookRepository {
  getPlayers(context: PlaybookModuleContext): Promise<Player[]>;
  getPlayerRatings(context: PlaybookModuleContext): Promise<PlayerRating[]>;
  getTeamKpis(context: PlaybookModuleContext): Promise<TeamKpi[]>;

  listLineups(context: PlaybookModuleContext): Promise<Lineup[]>;
  saveLineup(context: PlaybookModuleContext, lineup: LineupInput): Promise<Lineup>;
  deleteLineup(context: PlaybookModuleContext, lineupId: string): Promise<void>;

  listFormations(context: PlaybookModuleContext): Promise<Formation[]>;
  saveFormation(context: PlaybookModuleContext, formation: FormationInput): Promise<Formation>;
  deleteFormation(context: PlaybookModuleContext, formationId: string): Promise<void>;

  listPlays(context: PlaybookModuleContext): Promise<Play[]>;
  savePlay(context: PlaybookModuleContext, play: PlayInput): Promise<Play>;
  deletePlay(context: PlaybookModuleContext, playId: string): Promise<void>;

  listRoutes(context: PlaybookModuleContext): Promise<CustomRoute[]>;
  saveRoute(context: PlaybookModuleContext, route: CustomRouteInput): Promise<CustomRoute>;
  deleteRoute(context: PlaybookModuleContext, routeId: string): Promise<void>;

  listOpponents(context: PlaybookModuleContext): Promise<Opponent[]>;
  listScoutingGames(context: PlaybookModuleContext, opponentId?: string): Promise<ScoutingGame[]>;
  saveScoutingGame(context: PlaybookModuleContext, game: ScoutingGameInput): Promise<ScoutingGame>;
  saveScoutingClip(context: PlaybookModuleContext, clip: ScoutingClipInput): Promise<ScoutingClip>;
  deleteScoutingClip(context: PlaybookModuleContext, clipId: string): Promise<void>;
}
```

Verwende stabile Datenbank-IDs. Namen, Positionskürzel und Trikotnummern dürfen nicht als Primärschlüssel dienen.

## Phase 4: Echte Spieler und KPIs anbinden

Ersetze die produktive Verwendung von `playerProfiles`, `performanceCards`, Snapshots und weiteren statischen Werten aus `app/data/coach.ts` durch echte SCM-Daten.

Die Spielerzuordnung muss mindestens berücksichtigen:

- Spieler-ID,
- Team-ID,
- Saison-ID,
- Position,
- Depth-Chart-Rolle,
- Trikotnummer,
- Anzeigename,
- Verfügbarkeit beziehungsweise Verletzungsstatus,
- aktuelle oder zur ausgewählten Woche passende Bewertung.

Die KPI-Karten müssen reale Daten anzeigen. Für jeden KPI sind Datenquelle und Berechnungsformel zu dokumentieren. Dazu gehören, sofern die Quelldaten vorhanden sind:

- Overall Rating,
- Points per Game,
- Yards per Game,
- First Downs per Game,
- Red-Zone-Touchdown-Quote,
- Turnover Margin,
- Positions- und Unit-Ratings,
- gegnerische Formation-, Down-, Distance-, Run-/Pass- und Routentendenzen.

Filtere alle Werte nach dem aktuellen Team, der Saison und – sofern fachlich sinnvoll – der Woche. Zeige während des Ladens einen Ladezustand, bei Fehlern eine verständliche Fehlermeldung und bei fehlenden Werten „Keine Daten verfügbar“. Erfinde keine Ersatzwerte.

## Phase 5: Dauerhafte Speicherung

Der Prototyp verwendet aktuell diese lokalen Schlüssel:

- `rascals-playbook-plays`
- `rascals-custom-routes`
- `rascals-opponent-scouting`

Im Produktivbetrieb darf `localStorage` nicht die verbindliche Datenbank sein. Ersetze diese Zugriffe durch die vorhandene SCM-API oder implementiere passende serverseitige Endpunkte nach den Konventionen des SCM.

Gespeichert werden müssen mindestens:

- Aufstellungen und Spielerzuordnungen,
- Formationen und Koordinaten,
- Spielzüge und Situationsangaben,
- Routen mit allen Segmenten und Winkeln,
- Gegner,
- Scouting-Spiele,
- Clips und Clip-Metadaten,
- gegnerische Spielerpositionen,
- gegnerische Routen und Assignments.

Koordinaten müssen normalisiert gespeichert werden, damit Spielzüge auf verschiedenen Bildschirmgrößen gleich dargestellt werden. Nutze beispielsweise normierte Werte oder fachliche Feldkoordinaten und nicht rohe Browserpixel.

Implementiere eine einmalige, ausdrücklich ausgelöste Importmöglichkeit für vorhandene lokale Daten, sofern sich diese zuverlässig validieren lassen. Überschreibe niemals ungefragt vorhandene Serverdaten.

## Phase 6: API, Validierung und Berechtigungen

Verwende vorhandene API-Konventionen. Wenn neue Endpunkte benötigt werden, halte sie konsistent und versioniert.

Jeder schreibende und lesende Serverzugriff muss prüfen:

- angemeldeter Benutzer,
- Teamzugehörigkeit,
- erlaubte Rolle beziehungsweise Berechtigung,
- Zugehörigkeit des angefragten Datensatzes zum aktuellen Team,
- gültige Eingabedaten.

Mindestens folgende Rechte berücksichtigen:

- Playbook ansehen,
- Playbook bearbeiten,
- Spielzüge löschen,
- Aufstellungen bearbeiten,
- Gegneranalyse ansehen,
- Gegneranalyse bearbeiten,
- Videos hochladen,
- Administration.

Die Rechteprüfung darf nicht nur im Frontend erfolgen. Verwende serverseitige Schema-Validierung für IDs, Namen, Koordinaten, Routensegmente, Yard-Angaben, URLs und Metadaten.

## Phase 7: Videos und Cloudflare

Prüfe zunächst die vorhandene Cloudflare-Konfiguration. Verwende bestehende Bindings und Projektkonventionen. Lege keine parallele, unnötige Infrastruktur an.

Falls Videos gespeichert werden sollen und das SCM dafür noch keine Lösung besitzt:

- speichere Videodateien in einem geeigneten Objektspeicher wie Cloudflare R2,
- speichere in der Datenbank nur Objekt-ID, Metadaten und Zuordnung,
- verwende zeitlich begrenzte Upload- beziehungsweise Download-Berechtigungen,
- prüfe Benutzerrecht, Dateityp und Dateigröße serverseitig,
- speichere Videos niemals als Base64 in der relationalen Datenbank.

Führe ohne ausdrückliche Freigabe weder eine Produktionsmigration noch ein Deployment aus.

## Phase 8: Football-Fachlogik schützen

Behalte das gemeinsame Koordinatensystem für Feld, Spieler und Routen bei. Prüfe insbesondere:

- Gesamtfeld 120 × 53⅓ Yards,
- zwei 10-Yard-Endzonen,
- 100 Yards zwischen den Goal Lines,
- korrekte Yard-Linien und Hashmarks,
- gerade, nicht gegeneinander versetzte Zahlenreihen,
- korrekte Umrechnung von Yards in Feldkoordinaten,
- vollständig sichtbarer, gerader, weißer RASCALS-Schriftzug,
- große Spielerkarten in der Aufstellungsansicht,
- kleine Positionsmarker im Spielzug-Designer,
- verständliche Pfeile, Routensegmente und Assignments,
- freie Positionierung von WR1, WR2, TE, LT, LG, C, RG, RT, QB, RB, FB sowie Defense- und Special-Team-Positionen.

Eine technische Umstrukturierung darf diese Fachlogik nicht vereinfachen oder entfernen.

## Phase 9: Qualitätssicherung

Führe die im SCM vorgesehenen Befehle für Installation, Typecheck, Linting, Tests und Produktions-Build aus. Behebe durch die Integration verursachte Fehler.

Teste im Browser mindestens:

1. Route ist nur für berechtigte Benutzer erreichbar.
2. Team-, Saison- und Wochenwechsel laden die richtigen Daten.
3. Spielerprofile und Ratings stammen aus dem SCM.
4. KPI-Karten aktualisieren sich korrekt.
5. Aufstellung lässt sich speichern und nach Neuladen wieder öffnen.
6. Formation lässt sich erstellen und bearbeiten.
7. Eigene Route lässt sich zeichnen, benennen, speichern und erneut verwenden.
8. Spielzug lässt sich speichern, duplizieren, bearbeiten und löschen.
9. Gegner und historisches Spiel lassen sich anlegen und wieder öffnen.
10. Gegnerische Formation und Routen bleiben nach Neuladen erhalten.
11. Nicht berechtigte API-Aufrufe werden serverseitig abgewiesen.
12. Lade-, Fehler- und Leerzustände funktionieren.
13. Desktop- und Tablet-Ansicht funktionieren.
14. Im Browser entstehen keine neuen Konsolenfehler.

Erstelle erforderliche Datenbankmigrationen und Tests. Dokumentiere, wie die Migration lokal und später kontrolliert in der Zielumgebung ausgeführt wird.

## Abnahmebedingungen

Die Integration ist erst abgeschlossen, wenn:

- das Modul innerhalb des SCM und dessen Layout läuft,
- keine zweite Anmeldung oder zweite Hauptnavigation existiert,
- bestehende SCM-Seiten unverändert weiter funktionieren,
- Spieler und Ratings aus echten SCM-Daten kommen,
- KPIs echte, nachvollziehbar berechnete Werte anzeigen,
- Aufstellungen, Formationen, Spielzüge, Routen und Gegneranalysen serverseitig gespeichert werden,
- Daten nach Neuladen und auf einem anderen autorisierten Gerät verfügbar sind,
- alle Datensätze sauber nach Team und Saison getrennt sind,
- serverseitige Rechteprüfungen vorhanden sind,
- Typecheck, Tests und Produktions-Build erfolgreich sind,
- die wichtigsten Abläufe im Browser geprüft wurden,
- eine Integrations-, Datenmodell-, Migrations- und Deployment-Dokumentation erstellt wurde.

## Abschlussbericht

Berichte am Ende konkret:

1. welche Dateien geändert oder neu angelegt wurden,
2. wie das Modul im SCM erreichbar ist,
3. wie Spieler und KPIs angebunden wurden,
4. welche Datenbanktabellen und API-Endpunkte verwendet wurden,
5. wie Rollen und Rechte geprüft werden,
6. wie vorhandene lokale Daten importiert werden können,
7. welche Tests und Builds erfolgreich waren,
8. welche Umgebungsvariablen oder Cloudflare-Bindings noch eingerichtet werden müssen,
9. welche Schritte vor einem Produktionsdeployment erforderlich sind.

Beginne jetzt mit der Bestandsaufnahme. Überschreibe keine bestehenden SCM-Dateien blind und deploye nicht ungefragt.
