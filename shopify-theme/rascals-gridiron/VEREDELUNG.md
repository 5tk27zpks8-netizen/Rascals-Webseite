# Veredelung: Nummer, Initialen oder Position

Käufer können sich bei ausgewählten Artikeln die Rückennummer, ihre Initialen
oder ihre Position aufdrucken lassen. Der Aufpreis beträgt 4 € und ist ein
echter Preis, kein Hinweis auf der Seite.

## Warum es zwei Hälften braucht

Shopify kann einen Zeilenpreis nur über die **Variante** erhöhen. Der Text,
der gedruckt wird, kann dagegen nur als **Line Item Property** mitreisen —
das ist freier Text, der niemals den Preis berührt.

Deshalb: die 4 € stecken in einer Variante, der Aufdruck in Properties.
Ein Aufpreis, der nur aus Properties gebaut wäre, wäre eine Zahl auf der
Seite, der die Kasse widerspricht.

## Einmal pro Artikel im Shopify-Admin

Für jeden Artikel, der veredelt werden kann:

1. **Produkt → Varianten → Option hinzufügen**
   - Optionsname: `Veredelung`
   - Werte: `Ohne` und `Mit Druck`
2. Bei allen Varianten mit `Mit Druck` den Preis **4 € höher** setzen.

Mehr ist nicht zu tun. Artikel **ohne** diese Option sehen aus wie vorher —
daran erkennt das Theme, welche Artikel die Veredelung anbieten, ohne dass
irgendwo eine Liste gepflegt werden muss.

Der Aufpreis auf der Seite wird aus dem Preisunterschied der Varianten
gelesen. Werden daraus später 5 €, zeigt die Seite 5 € an, ohne dass am
Theme etwas geändert wird.

## Was im Shop passiert

- Die Option `Veredelung` taucht **nicht** in der normalen Variantenauswahl
  auf. Sie wird als eigener Block dargestellt: OHNE · NUMMER · INITIALEN ·
  POSITION, dazu das passende Feld und die Platzierung.
- Nummer: nur Ziffern, höchstens zwei. Initialen: Großbuchstaben, höchstens
  vier Zeichen. Position: Auswahl aus der Positionsliste.
- Der Preis oben auf der Seite aktualisiert sich beim Umschalten.
- Ohne Eintrag im Feld lässt sich nicht in den Warenkorb legen — ein Trikot
  mit leerem Aufdruck ist ein Reklamationsfall.
- Im Warenkorb und in der Bestellung stehen die Angaben als
  `Veredelung`, `Aufdruck` und `Platzierung`. Das ist, was der Druckerei
  vorliegt.

## Einstellungen im Theme-Editor

Produktseite → Block **„Veredelung (Nummer / Initialen / Position)"**:
Optionsname, Wert für „ohne Druck", Überschrift, Hinweistext, die
Positionsliste und die Platzierungen. Der Aufpreis steht dort bewusst
nicht — er kommt aus den Varianten.
