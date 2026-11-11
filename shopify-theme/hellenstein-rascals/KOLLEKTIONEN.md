# Kollektionen und Kategorien

Drei Linien — **Old-School**, **Basic**, **Standard** — und quer dazu die
Kategorien Mützen, Pullover, Jacken, Accessoires, Merch.

## Warum nicht fünfzehn Kollektionen

Linie und Kategorie sind zwei Achsen, nicht eine. Beide als Kollektion
anzulegen hiesse 3 × 5 = 15 Listen und jeden neuen Artikel in zwei davon
einsortieren — und jedes vergessene Einsortieren ist ein Artikel, den im Shop
niemand findet.

| | wird abgebildet als | Beispiel |
|---|---|---|
| **Linie** | Kollektion (automatisch, über einen Tag) | Old-School |
| **Kategorie** | Produkttyp (Shopify-Standardfeld) | Pullover |

Jeder Artikel trägt beides genau einmal. „Old-School → Pullover" ist keine
eigene Liste, sondern die Old-School-Seite mit gesetztem Reiter.

Der Produkttyp steht in diesem Theme ohnehin schon auf jeder Produktkachel
(`snippets/product-card.liquid`, die kleine Zeile über dem Titel) — die
Kategorie war also längst sichtbar, nur nicht navigierbar.

---

## Einrichtung im Shopify-Admin

### 1. Filter einschalten — der wichtigste Schritt

**Apps → „Shopify Search & Discovery"** installieren (kostenlos, von Shopify
selbst). Dort unter *Filters* anlegen:

- **Produkttyp** ← ohne den gibt es keine Kategorie-Reiter
- Größe (bzw. wie die Variantenoption heisst), Preis, Verfügbarkeit

> Solange das fehlt, bleibt die Kollektionsseite wie bisher: Überschrift,
> Produktzahl, Sortierung, Raster. Reiter und Filterkasten erscheinen nicht.
> Das ist Absicht — eine Reiterzeile, die nicht filtert, wäre schlimmer als
> keine.

### 2. Die drei Linien anlegen

**Produkte → Sammlungen → Sammlung erstellen**, dreimal, jeweils
**Automatisiert**:

| Titel | Bedingung |
|---|---|
| Old-School | Produkt-Tag ist gleich `old-school` |
| Basic | Produkt-Tag ist gleich `basic` |
| Standard | Produkt-Tag ist gleich `standard` |

Automatisiert, nicht manuell: dann genügt beim nächsten Artikel der Tag.

Jeder Kollektion ein **Titelbild** und **einen Satz Beschreibung** geben. Beides
wird auf der Seite gerendert.

> Zu „Basic" und „Standard": die beiden Wörter bedeuten im Alltag dasselbe.
> Ohne je einen Satz Beschreibung kann ein Käufer nicht erkennen, was sie
> unterscheidet, und kauft im Zweifel keins von beiden. (Geschrieben wird
> „Standard", nicht „Standart".)

### 3. Produkte einsortieren

Pro Artikel unter **Produktorganisation**:

- **Produkttyp:** `Mützen` · `Pullover` · `Jacken` · `Accessoires` · `Merch`
- **Tags:** `old-school`, `basic` oder `standard`

Die Schreibweise des Produkttyps muss überall gleich sein — `Pullover` und
`pullover` sind für Shopify zwei Kategorien und ergeben zwei Reiter.

### 4. Kategorie-Sammlungen (optional)

Für das Menü „Kategorien" quer über alle Linien: fünf weitere
**automatisierte** Sammlungen, Bedingung jeweils *Produkttyp ist gleich …*.

### 5. Das Menü anlegen — hier gab es vorher gar keins

**Inhalte → Menüs** (in älteren Shops: *Onlineshop → Navigation*). Ein Menü
anlegen, Unterpunkte durch Einrücken per Ziehen:

```
Shop            → /collections
    Old-School  → /collections/old-school
    Basic       → /collections/basic
    Standard    → /collections/standard
Kategorien      → /collections
    Mützen      → /collections/muetzen
    …
Team            → /pages/team
```

Dann **Onlineshop → Themes → Anpassen → Header** und das Menü unter *Menü*
auswählen.

> Vorher war die Navigation fest einprogrammiert: „Shop / Team / Über uns /
> Service" standen als Links im Code und liessen sich im Admin nicht ändern.
> **Solange kein Menü ausgewählt ist, bleibt genau diese alte Leiste stehen** —
> der Shop sieht also unverändert aus, bis du eins einträgst.

### 6. Shop-Übersicht einstellen

**Anpassen**, Seite *Sammlungen*, Abschnitt **Kollektionen**: oben die drei
Linien, unten die Kategorien eintragen. Ohne Eintrag zeigt die Seite wie bisher
alle Sammlungen.

---

## Was am Theme geändert wurde

Nur vier Dateien, das Design bleibt wie es war — dieselben Farben, Schriften,
Rahmen und Abstände.

| Datei | Änderung |
|---|---|
| `sections/header.liquid` | Liest ein echtes Shopify-Menü mit zweiter Ebene, Rückfall auf die alte feste Leiste |
| `sections/main-collection.liquid` | Kategorie-Reiter, Filterkasten, eigener Text für leere Auswahl |
| `sections/main-list-collections.liquid` | Linien gross, Kategorien als Reihe darunter |
| `assets/theme.css` | Die Stile dazu, angehängt |

Im Detail:

- **Aufklappen ohne JavaScript**, über `:hover` und `:focus-within`. Geht damit
  auch per Tabulator und kollidiert nicht mit dem mobilen Menü, das sein
  eigenes Skript hat.
- **Mobil wird eingerückt statt aufgeklappt**, und die Leiste scrollt selbst,
  wenn sie länger wird als der Bildschirm — sonst wären die unteren Einträge
  unerreichbar, weil `body{overflow:hidden}` die Seite währenddessen sperrt.
- **Sortieren wirft die Kategorie nicht weg.** Die Reiter sind Links, die
  Sortierung ist ein Formular; versteckte Felder halten die gewählte Kategorie
  fest. Ohne sie wäre man nach dem Sortieren wieder bei „Alle".
- **Leere Auswahl** sagt, dass es an den Filtern liegt, und bietet den Weg
  zurück an, statt nur „NOCH KEINE PRODUKTE".

## Noch offen: die Veredelung

Die Funktion „Nummer, Initialen oder Position aufdrucken, +4 €" liegt in einem
anderen Theme-Ordner (`../rascals-gridiron/`, siehe dessen `VEREDELUNG.md`) und
ist **in diesem Theme nicht enthalten**. Das andere Theme läuft nicht im Shop;
die Veredelung müsste hierher übertragen werden, bevor sie jemand sieht.
