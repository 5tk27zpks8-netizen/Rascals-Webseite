# Veredelung: Nummer, Initialen oder Position

Käufer können sich bei ausgewählten Artikeln die Rückennummer, ihre Initialen
oder ihre Position aufdrucken lassen. Der Aufpreis beträgt 4 €.

## Einrichtung — einmalig

1. **Produkt „Veredelung" anlegen**, Preis 4,00 €.
   - Veröffentlichen (sonst lässt es sich nicht in den Warenkorb legen),
     aber **in keine Collection** aufnehmen, damit es nicht im Shop
     herumsteht.
   - Kein Versandgewicht, keine Bestandsverfolgung.
2. **Theme-Editor → Produktseite → Block „Veredelung"**: dieses Produkt unter
   *Zusatzartikel für den Aufpreis* auswählen.

Der angezeigte Aufpreis ist der Preis dieses Produkts. Werden daraus später
5 €, zeigt die Seite 5 € — am Theme ist nichts zu ändern.

## Artikel auswählen — ein Tag

Jedem Artikel, der veredelt werden kann, im Shopify-Admin den Tag
**`veredelung`** geben. Fertig. Artikel ohne den Tag sehen aus wie vorher.

(Der Tag ist im Theme-Editor änderbar, falls ein anderer Name lieber ist.)

## Warum ein zweiter Artikel und keine Variante

In Shopify kann **nur eine Variante** einen Zeilenpreis erhöhen. Der Text,
der gedruckt wird, kann dagegen **nur als Line Item Property** mitreisen, und
eine Property fasst den Preis nie an.

Über Varianten zu gehen hieße: pro Artikel eine zusätzliche Option und eine
verdoppelte Variantenliste. Das ist viel Verwaltungsarbeit, um bei einem
Artikel Ja zu sagen. Deshalb der zweite Artikel — der Preis dafür ist die
zusätzliche Zeile im Warenkorb.

## Was im Shop passiert

- Block auf der Produktseite: OHNE · NUMMER · INITIALEN · POSITION, dazu das
  passende Feld und die Platzierung.
- Nummer: nur Ziffern, höchstens zwei. Initialen: Großbuchstaben, höchstens
  vier Zeichen. Position: Auswahl aus der Liste.
- Ohne Eintrag im Feld lässt sich nicht in den Warenkorb legen — ein Trikot
  mit leerem Aufdruck ist ein Reklamationsfall.
- Trikot und Veredelung gehen **in einer Anfrage** in den Warenkorb, in
  gleicher Menge. Zwei getrennte Anfragen hätten ein Zeitfenster, in dem das
  Trikot drin ist und die 4 € nicht.
- Bei der Bestellung steht am Trikot `Veredelung`, `Aufdruck` und
  `Platzierung`; an der Veredelungszeile steht, zu welchem Artikel sie
  gehört. Das ist, was der Druckerei vorliegt.

## Die Warenkorb-Absicherung

Eine eigene Zeile kann einzeln entfernt werden, und das Mengenfeld neben dem
Trikot weiß nichts von ihr. Beides ergäbe einen Warenkorb, der einen Druck
berechnet, den niemand bekommt — oder einen druckt, den niemand bezahlt hat.

Deshalb prüft die Warenkorbseite jede Veredelungszeile gegen das Trikot, mit
dem sie hinzugefügt wurde (beide tragen dieselbe unsichtbare Kennung):

- Menge geändert → die Veredelung zieht nach.
- Trikot entfernt → die Veredelung verschwindet.
- Zwei verschiedene Trikots mit je eigenem Druck bleiben getrennt.

Die Korrektur läuft höchstens einmal pro Seitenaufruf, damit eine Korrektur,
die nicht greift, die Seite nicht endlos neu lädt.
