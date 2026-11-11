# Kollektionen und Kategorien

Drei Linien — **Old-School**, **Basic**, **Standard** — und quer dazu die
Kategorien Mützen, Pullover, Jacken, Accessoires, Merch.

## Warum nicht fünfzehn Kollektionen

Linie und Kategorie sind zwei Achsen, nicht eine. Wer beide als Kollektion
anlegt, hat 3 × 5 = 15 Listen und muss jeden neuen Artikel in zwei davon
einsortieren — und jedes vergessene Einsortieren ist ein Artikel, den im Shop
niemand findet.

Deshalb:

| | wird abgebildet als | Beispiel |
|---|---|---|
| **Linie** | Kollektion (automatisch, über einen Tag) | Old-School |
| **Kategorie** | Produkttyp (Shopify-Standardfeld) | Pullover |

Jeder Artikel trägt beides genau einmal. Alles andere fällt daraus ab:
„Old-School → Pullover" ist keine eigene Liste, sondern die Old-School-Seite
mit gesetztem Kategorie-Reiter.

---

## Einrichtung

### 1. Filter einschalten — das ist der wichtigste Schritt

**Apps → „Shopify Search & Discovery"** installieren (kostenlos, von Shopify
selbst). Dort unter **Filters** anlegen:

- **Produkttyp** ← ohne den gibt es keine Kategorie-Reiter
- Größe (bzw. wie die Variantenoption im Shop heißt)
- Preis
- Verfügbarkeit

> Solange das fehlt, bleibt die Kollektionsseite genau wie vorher: Überschrift,
> Sortierung, Raster. Die Reiter und der Filterkasten erscheinen nicht. Das ist
> Absicht — eine Reiterzeile, die nicht filtert, wäre schlimmer als keine.

### 2. Die drei Linien anlegen

**Produkte → Sammlungen → Sammlung erstellen**, dreimal:

| Titel | Typ | Bedingung |
|---|---|---|
| Old-School | Automatisiert | Produkt-Tag ist gleich `old-school` |
| Basic | Automatisiert | Produkt-Tag ist gleich `basic` |
| Standard | Automatisiert | Produkt-Tag ist gleich `standard` |

**Automatisiert**, nicht manuell: dann genügt beim nächsten Artikel der Tag,
und niemand muss daran denken, ihn irgendwo einzusortieren.

Jeder Kollektion ein **Titelbild** und eine **Beschreibung** von einem Satz
geben. Die Beschreibung steht auf der Seite direkt unter der Überschrift.

> Zu „Basic" und „Standard": die beiden Wörter bedeuten im Alltag dasselbe.
> Ohne je einen Satz Beschreibung kann ein Käufer nicht erkennen, was ihn
> unterscheidet — und kauft dann im Zweifel keins von beiden. Ein Satz pro
> Kollektion reicht, aber er sollte dastehen. (Ich habe „Standard" korrekt
> geschrieben, nicht „Standart".)

### 3. Produkte einsortieren

Pro Artikel zwei Felder unter **Produktorganisation**:

- **Produkttyp:** `Mützen` · `Pullover` · `Jacken` · `Accessoires` · `Merch`
- **Tags:** `old-school`, `basic` oder `standard`

Die Schreibweise des Produkttyps muss überall gleich sein — `Pullover` und
`pullover` sind für Shopify zwei verschiedene Kategorien und ergeben zwei
Reiter.

### 4. Kategorie-Sammlungen (für das Menü „Kategorien")

Damit es im Menü auch quer über alle Linien gehen kann, fünf weitere
**automatisierte** Sammlungen, Bedingung jeweils *Produkttyp ist gleich …*:

`Mützen` · `Pullover` · `Jacken` · `Accessoires` · `Merch`

Rein optional. Wer nur die drei Linien im Menü will, lässt sie weg.

### 5. Das Menü bauen

**Inhalte → Menüs** (in älteren Shops: *Onlineshop → Navigation*),
**Hauptmenü** bearbeiten. Unterpunkte entstehen durch Einrücken per Ziehen:

```
Shop            → /collections
    Old-School  → /collections/old-school
    Basic       → /collections/basic
    Standard    → /collections/standard
Kategorien      → /collections
    Mützen      → /collections/muetzen
    Pullover    → /collections/pullover
    Jacken      → /collections/jacken
    Accessoires → /collections/accessoires
    Merch       → /collections/merch
```

Das Theme klappt die zweite Ebene jetzt auf — vorher hat es Unterpunkte
verschluckt, egal was hier eingetragen war.

### 6. Shop-Übersicht einstellen

**Onlineshop → Themes → Anpassen**, Seite *Sammlungen*, Abschnitt
**Kollektionsliste**:

- **Linien:** Old-School, Basic, Standard
- **Kategorien:** die fünf aus Schritt 4

Ist nichts gesetzt, zeigt die Seite wie bisher alle Sammlungen.

---

## Was das Theme daraus macht

- **Kopfzeile:** zwei Ebenen. Aufklappen per Maus *und* per Tabulator, ohne
  JavaScript. Mobil wird eingerückt statt aufgeklappt.
- **Kollektionsseite:** Kategorie-Reiter über dem Raster, mit Anzahl je
  Kategorie. Daneben der Filterkasten für Größe, Preis, Verfügbarkeit, dazu die
  Sortierung.
- **Sortieren wirft die Kategorie nicht weg.** Die Reiter sind Links, die
  Sortierung ist ein Formular — ohne versteckte Felder wäre man nach dem
  Sortieren wieder bei „Alle", ohne es angefasst zu haben.
- **Leere Auswahl** sagt „Mit dieser Auswahl ist gerade nichts da" und bietet
  den Weg zurück an, statt eine leere Seite zu zeigen.
- **Shop-Übersicht:** Linien groß, Kategorien als Reihe darunter.

## Zusammenspiel mit der Veredelung

Keins nötig. Der Veredelungs-Block (siehe `VEREDELUNG.md`) hängt am Tag
`veredelung` und ist von Linie und Kategorie unabhängig: ein Old-School-Pullover
kann veredelbar sein, eine Mütze derselben Linie nicht.
