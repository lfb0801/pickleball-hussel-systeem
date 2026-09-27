# Pickleball hussel systeem — ontwerp

**Datum:** 2026-09-27

## Doel

Een indelingssysteem voor pickleball-clubavonden. Het bepaalt per ronde wie met en tegen wie speelt op welke baan, ingedeeld op niveau. Het houdt geen scores bij en berekent geen ranglijst.

## Uitgangspunten

- Spelers zijn ingedeeld in ruwe niveaugroepen (bijvoorbeeld gevorderd / midden / beginner). Het systeem kent geen cijfermatige rating.
- Een typische avond telt tussen de 8 en 40 spelers op 2 tot 8 banen. Aantallen wisselen per avond.
- Komt een groep niet uit op een veelvoud van vier, dan wordt aangevuld uit een naastliggende groep.
- Blijft er daarna nog een rest over, dan rusten die spelers die ronde. Rustbeurten worden eerlijk gerouleerd.
- Het schema wordt per ronde gegenereerd, niet vooraf voor de hele avond. Laatkomers en afhakers kunnen tussendoor verwerkt worden.
- Tussen avonden blijft alleen de spelerslijst met groepsindeling bewaard. Het hussel-geheugen begint elke avond blanco.
- De app draait lokaal in de browser, zonder server en zonder internetverbinding.

## Architectuur

Drie bestanden, geen build-stap:

| Bestand | Verantwoordelijkheid |
|---|---|
| `hussel.js` | Het algoritme. Pure functies, geen DOM, geen opslag. |
| `index.html` | De app: opmaak, schermen, opslag. Laadt `hussel.js` via een gewone `<script>`. |
| `test.html` | Draait assertions tegen `hussel.js` en toont de uitslag op de pagina. |

Het algoritme staat apart van de app omdat het daarmee zonder browserinteractie te testen is. Een gewone `<script>` in plaats van een ES-module houdt het werkend via `file://`.

### Grens tussen algoritme en app

`hussel.js` biedt één ingang:

```
genereerRonde({ aanwezigen, groepen, banen, historie }) -> ronde
```

De app levert de toestand aan en krijgt een indeling terug. Het algoritme leest niets uit `localStorage` en schrijft niets naar het scherm. Zo is elke uitkomst reproduceerbaar uit zijn invoer.

## Datamodel

- **Groepen** — een geordende lijst met namen, bijvoorbeeld `["Gevorderd", "Midden", "Beginner"]`. De volgorde is de niveauvolgorde; posities naast elkaar zijn naastliggende groepen.
- **Speler** — naam en groep.
- **Avond** — de aanwezigen, het aantal banen en de gespeelde rondes.
- **Ronde** — per baan twee teams van twee, plus de lijst rustende spelers.

Spelerslijst, groepen en de lopende avond worden opgeslagen in `localStorage`. De lopende avond wordt bewaard zodat een ververste pagina de avond niet wist.

Het hussel-geheugen — wie speelde met wie, wie speelde tegen wie, wie rustte hoe vaak, wie speelde hoe vaak buiten de eigen groep — wordt telkens herleid uit de gespeelde rondes. Er is geen aparte administratie die uit de pas kan lopen met de werkelijkheid.

## Het algoritme

Per ronde, in vijf stappen:

1. **Capaciteit bepalen.** Het aantal spelende plekken is `min(banen × 4, aanwezigen naar beneden afgerond op een veelvoud van 4)`.
2. **Rust toewijzen.** Een harde regel: wie tot dan toe het minst gerust heeft, speelt. Gelijke stand wordt willekeurig gebroken. Het verschil in rustbeurten tussen spelers loopt daardoor nooit verder op dan één.
3. **Banen vullen.** De spelende spelers worden op niveauvolgorde op een rij gezet en in blokken van vier geknipt; elk blok wordt een baan. Binnen een groep is de volgorde willekeurig, zodat het per ronde wisselt wie er op een breukvlak terechtkomt. Waar een groep niet op een veelvoud van vier uitkomt, ontstaat vanzelf een baan met spelers uit twee naastliggende groepen. Baan 1 is het sterkst.
4. **Koppels binnen de baan.** Van de drie mogelijke teamindelingen binnen een viertal wordt de minst herhalende gekozen.
5. **Scorend zoeken.** Stap 2 tot en met 4 draaien een paar honderd keer met andere willekeur. De indeling met de laagste strafscore wint.

### Strafpunten

Elke overtreding telt kwadratisch mee in het aantal keren dat ze al voorkwam, zodat een derde herhaling zwaarder weegt dan een eerste.

| Wat | Formule | Startwaarde |
|---|---|---|
| Opnieuw dezelfde partner | `GEWICHT_PARTNER × eerdere keren²` | 10 |
| Opnieuw dezelfde tegenstander | `GEWICHT_TEGENSTANDER × eerdere keren²` | 3 |
| Baan die meerdere niveaus overspant | `GEWICHT_NIVEAUKLOOF × (hoogste groepsindex − laagste groepsindex op die baan)²` | 8 |
| Dezelfde speler steeds de lener op het breukvlak | `GEWICHT_LENER × eerdere keren buiten eigen groep²` | 4 |

De vier gewichten staan als benoemde constanten bovenaan `hussel.js`. De startwaarden zijn een vertrekpunt, bedoeld om na een avond in de zaal bijgesteld te worden.

Rustverdeling is geen strafpunt maar een harde regel in stap 2.

## Schermen

**Spelersbeheer.** Groepen benoemen, op volgorde zetten, toevoegen en verwijderen. Spelers toevoegen met naam en groep, later te bewerken of te verwijderen. Dit is het enige dat tussen avonden bewaard blijft.

**Avond starten.** Aanwezigen aanvinken uit de bewaarde lijst en het aantal banen instellen. Een teller toont hoeveel spelers per ronde spelen en hoeveel er rusten, zodat het aantal banen vóór aanvang bijgesteld kan worden.

**Ronde-scherm.** Het scherm dat de hele avond openstaat. Grote kaarten per baan met baannummer, de betrokken groep of groepen, en team tegen team. Daaronder wie deze ronde rust. Knoppen: *volgende ronde*, *opnieuw genereren* (zelfde ronde, andere loting), *spelers aanpassen*, *avond afsluiten*.

**Spelers aanpassen tijdens de avond.** Een laatkomer aanvinken of een afhaker uitvinken. De lopende ronde blijft ongewijzigd; de aanpassing geldt vanaf de volgende ronde. Een laatkomer start met het hoogste rustsaldo dat op dat moment onder de aanwezigen voorkomt. Zou die op nul beginnen, dan zou hij volgens de regel uit stap 2 elke resterende ronde voorrang krijgen en zouden de spelers van het eerste uur alle overige rustbeurten opvangen. Met het hoogste saldo draait de laatkomer vanaf zijn eerste ronde gewoon mee in de rotatie.

**Overzicht.** Een tabel met per speler het aantal gespeelde rondes en rustbeurten, om bij twijfel te laten zien dat de verdeling klopt.

## Randgevallen

| Situatie | Gedrag |
|---|---|
| Minder dan vier aanwezigen | Melding, geen ronde gegenereerd. |
| Meer banen dan spelers aankunnen | Overtollige banen blijven leeg, geen foutmelding. |
| Speler verwijderd die in de lopende ronde staat | Waarschuwing dat de lopende ronde blijft staan; de wijziging geldt vanaf de volgende ronde. |
| `localStorage` geblokkeerd of vol | De app werkt door in het geheugen, met een zichtbare waarschuwing dat er niets bewaard wordt. |
| Pagina ververst tijdens een avond | De avond wordt hersteld in de toestand van vóór het verversen. |

## Tests

In `test.html`, tegen `hussel.js`:

- Iedere aanwezige staat per ronde precies één keer ingedeeld: spelend of rustend, nooit allebei en nooit geen van beide.
- Over twintig rondes verschilt het aantal rustbeurten tussen spelers nooit meer dan één.
- Bij een groep met een aantal spelers dat deelbaar is door vier, blijft iedere baan binnen één niveau.
- Bij een groep waarbij dat niet zo is, overspant een baan hooguit twee naastliggende niveaus.
- Wie als lener op het breukvlak tussen groepen terechtkomt, rouleert over de rondes.
- Een doorloop van 4 tot en met 40 spelers bij 1 tot en met 10 banen levert nooit een crash of een ongeldige indeling op.

## Buiten scope

Scores, ranglijsten, klimmen en zakken tussen banen, enkelspel, historie over meerdere avonden, accounts, een server en meekijkschermen voor spelers.
