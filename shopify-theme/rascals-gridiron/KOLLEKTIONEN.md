# Kollektionen und Unterkategorien

**Old-School · Basic · Standard** als Kollektionen, darunter jeweils
**Mützen · Caps · Pullover · Jacken · Accessoires · Zubehör**.

## Wie das abgebildet ist

Zwei Tags pro Artikel, mehr nicht:

| | Tag | Beispiel |
|---|---|---|
| **Kollektion** | die Linie | `old-school` |
| **Unterkategorie** | die Warenart | `Pullover` |

Daraus fällt alles ab. „Old-School → Pullover" ist keine eigene Liste,
sondern `/collections/old-school/pullover` — das kann Shopify von Haus aus.

**Warum Tags und nicht Produkttyp-Filter:** Filter brauchen die App *Search &
Discovery* und Einrichtung im Admin. Tags brauchen nichts. Die Knöpfe stehen
da, sobald die Artikel getaggt sind. (Sind Filter später doch eingerichtet,
nutzt das Theme sie zusätzlich für Größe und Preis.)

**Warum nicht 18 Sammlungen:** 3 Linien × 6 Kategorien wären 18 Listen, und
jeder neue Artikel müsste in zwei davon einsortiert werden. Jedes vergessene
Einsortieren ist ein Artikel, den niemand findet.

---

## Einrichtung

### 1. Theme hochladen

*Onlineshop → Themes → Theme hinzufügen → Zip-Datei hochladen.* Erst als
Entwurf ansehen, dann veröffentlichen.

### 2. Die Navigation

**Old-School, Basic, Standard und Fanware hängen sich von selbst an** die
Kopfzeile, sobald es die Sammlungen bzw. die Seite gibt. Dafür musst du
nichts einstellen. Was schon im Menü steht, wird übersprungen.

Es bleibt nur Shopifys Vorgabe aufzuräumen — *Inhalte → Menüs → Hauptmenü*:

- „Katalog" umbenennen in **Kollektion**, Ziel auf `/collections`
  (oder ganz entfernen, wenn dir die Linien genügen)
- „Startseite" und „Kontakt" stehen lassen

> **Wenn nach dem Hochladen nichts Neues in der Leiste steht,** fehlen die
> Sammlungen selbst — siehe Schritt 3. Das Theme kann nur zeigen, was es
> gibt; eine Verknüpfung auf eine nicht angelegte Sammlung wäre ein 404.

### 2b. Optional: Menü aufräumen

Das steht **nicht im Theme** — es ist Shopifys Standard-Menüeintrag.

*Inhalte → Menüs → Hauptmenü →* bei „Katalog" auf *Bearbeiten*, Titel auf
**Kollektion** ändern, Ziel auf `/collections`.

Darunter die drei Linien einrücken (per Ziehen):

```
Kollektion      → /collections
    Old-School  → /collections/old-school
    Basic       → /collections/basic
    Standard    → /collections/standard
```

Das Theme klappt die zweite Ebene auf.

### 3. Die Kollektionen anlegen

*Produkte → Sammlungen → Sammlung erstellen*, jeweils **Automatisiert**:

| Titel | Bedingung |
|---|---|
| Old-School | Produkt-Tag ist gleich `old-school` |
| Basic | Produkt-Tag ist gleich `basic` |
| Standard | Produkt-Tag ist gleich `standard` |

Automatisiert, nicht manuell: dann genügt beim nächsten Artikel der Tag.

Jeder Sammlung ein Titelbild und einen Satz Beschreibung geben — beides wird
auf der Seite gezeigt.

> Zu „Basic" und „Standard": die beiden Wörter bedeuten im Alltag dasselbe.
> Ohne je einen Satz Beschreibung kann ein Käufer nicht erkennen, was sie
> unterscheidet. Wenn du bei zwei Linien bleibst, lass „Standard" einfach weg
> — die Knöpfe richten sich danach, was es gibt.

### 4. Produkte taggen

Pro Artikel **zwei Tags**:

- die Linie: `old-school`, `basic` oder `standard`
- die Kategorie: `Mützen`, `Caps`, `Pullover`, `Jacken`, `Accessoires`
  oder `Zubehör`

Die Schreibweise muss überall gleich sein. Ein Knopf erscheint nur, wenn
mindestens ein Artikel der Kollektion diesen Tag trägt.

> **Falls eine Kategorie nicht filtert:** Shopify bildet Tag-Adressen über die
> vereinfachte Schreibweise, aus `Mützen` wird `mutzen`. Das funktioniert
> normalerweise. Sollte ein Knopf ins Leere laufen, benenne den Tag ohne
> Umlaut (`Muetzen`) — die Beschriftung im Theme ist frei einstellbar.

### 5. Theme-Editor

*Onlineshop → Themes → Anpassen*, Seite **Sammlungen**:

- **Kollektionen:** Old-School, Basic, Standard auswählen
- **Kollektionen auch als Knöpfe zeigen:** an

Seite **Kollektion**, Abschnitt *Collection products*:

- **Unterkategorien:** `Mützen, Caps, Pullover, Jacken, Accessoires, Zubehör`
  (durch Komma getrennt, frei änderbar)

### 6. Fanware-Seite anlegen

Der rote Knopf **Fanware** steht neben den Linien, ist aber keine Sammlung —
es gibt noch nichts zu zeigen. Er führt auf eine Seite, die genau das sagt.

*Inhalte → Seiten → Seite hinzufügen:*

- Titel: **Fanware**
- Inhalt: leer lassen
- rechts unter *Theme-Vorlage*: **fanware** auswählen
- speichern

Fertig — `/pages/fanware` zeigt „FANWARE. / COMING SOON." Text und Knopf sind
im Theme-Editor änderbar.

Sobald es echte Fanware gibt: eine normale Sammlung daraus machen und im
Theme-Editor unter *Zusätzlicher Knopf* das Ziel umhängen (oder das Feld
leeren, dann verschwindet der Knopf).

### 7. Laufband

Das rote Band unter dem Hero zeigt abwechselnd zwei Texte. Im Theme-Editor
unter *Game ticker*:

- **Text:** `ALL GRIT • ALL HEART • ALL RASCALS`
- **Zwischentext (Info):** `FANWARE COMING SOON`

Der Zwischentext steht auf navy Fläche, damit er sich absetzt und bei jeder
Schriftgröße lesbar bleibt. Leer lassen blendet ihn aus.

---

## Was das Theme daraus macht

- **Kollektionsseite** (`/collections`): Überschrift „KOLLEKTIONEN", darunter
  eine Knopfreihe der Linien und die Bildkacheln.
- **Linienseite** (`/collections/old-school`): Knopfreihe der
  Unterkategorien über dem Raster, „Alle" ganz links.
- **Kopfzeile:** zweite Menüebene, aufklappbar per Maus und per Tabulator.

Das Design ist unverändert: am bestehenden CSS wurde keine Zeile geändert,
nur ergänzt.
