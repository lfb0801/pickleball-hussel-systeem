# Pickleball hussel systeem — ontwerp

**Datum:** 2026-09-27
**Bijgewerkt:** 2026-10-20 — gebouwd; gratis gehoste webapp, live sessie met telefoons, concept en publiceren, handmatig wisselen, presets, opmaak in de stijl van Pickleball Den Bosch.

## Doel

Een indelingssysteem voor pickleball-clubavonden. Het bepaalt per ronde wie met en tegen wie speelt op welke baan, ingedeeld op niveau. Het houdt geen scores bij en berekent geen ranglijst.

Het draait als gratis gehoste webapp. Eén laptop of tablet in de zaal leidt de avond; spelers sluiten met hun telefoon aan via een QR-code, zoals bij Kahoot. Ze melden zich daar zelf aan met naam en niveau, zien hun baan en kunnen zelf pauzeren of vertrekken. De organisator hoeft geen namen in te voeren.

## Uitgangspunten

- Spelers zijn ingedeeld in ruwe niveaugroepen (bijvoorbeeld gevorderd / midden / beginner). Het systeem kent geen cijfermatige rating.
- Een typische avond telt tussen de 8 en 40 spelers op 2 tot 8 banen. Aantallen wisselen per avond.
- Komt een groep niet uit op een veelvoud van vier, dan wordt aangevuld uit een naastliggende groep.
- Blijft er daarna nog een rest over, dan rusten die spelers die ronde. Rustbeurten worden eerlijk gerouleerd.
- Het schema wordt per ronde gegenereerd, niet vooraf voor de hele avond. Laatkomers, pauzes en afhakers kunnen tussendoor verwerkt worden.
- Tussen avonden blijft alleen de spelerslijst met groepsindeling bewaard, plus de gekozen preset. De spelerslijst groeit vanzelf doordat spelers zich met hun telefoon aanmelden. Het hussel-geheugen begint elke avond blanco.
- De laptop in de zaal is de enige bron van waarheid. Telefoons sturen alleen verzoeken; de laptop past ze toe en stuurt de nieuwe toestand terug.
- Er is geen eigen server en geen database. De app is een verzameling statische bestanden. Telefoons verbinden rechtstreeks met de laptop (WebRTC via PeerJS); alleen het vinden van elkaar loopt via de gratis publieke PeerJS-server.
- De laptop werkt ook zonder internet en zonder telefoons: alles wat een telefoon kan, kan de laptop ook. Telefoons zijn gemak, geen voorwaarde.
- De interface is Nederlands. Alle zichtbare tekst staat in één bestand, zodat vertalen later mogelijk blijft.

## Architectuur

Losse bestanden zonder build-stap, elk met één verantwoordelijkheid:

| Bestand | Verantwoordelijkheid |
|---|---|
| `hussel.js` | Het algoritme. Pure functies, geen DOM, geen opslag. |
| `presets.js` | De drie presets met hun gewichten. |
| `sessie.js` | Verzoeken van telefoons toepassen op de avond. Pure functies, geen DOM, geen netwerk. |
| `verbinding.js` | De PeerJS-laag: de laptop als gastheer, telefoons als gast, berichten heen en weer, opnieuw verbinden. |
| `opslag.js` | De `localStorage`-laag, met terugval op geheugen. |
| `teksten.js` | Alle zichtbare tekst van laptop en telefoon. |
| `app.js` | Gedeelde toestand, navigatie tussen schermen, opstarten. |
| `scherm-spelers.js` | Het scherm voor spelers- en groepsbeheer. |
| `scherm-avond.js` | Avond starten, afsluiten, de aanwezigheid aanpassen, preset kiezen, QR-code voor telefoons. |
| `scherm-ronde.js` | Het ronde-scherm met concept, publiceren, handmatig wisselen en de baankaarten. |
| `scherm-overzicht.js` | De tabel met gespeelde rondes en rustbeurten. |
| `thema.css` | De huisstijl als CSS-variabelen: kleuren en lettertypen. |
| `stijl.css` | De opmaak, die alleen variabelen uit `thema.css` gebruikt. |
| `index.html` | De laptop-app, die de bovenstaande bestanden inlaadt. |
| `speler.html` / `speler.js` / `speler.css` | De telefoon-app en zijn opmaak. |
| `peerjs.min.js` (1.5.4), `qrcode.js` (qrcode-generator 1.4.4) | Meegeleverde bibliotheken op een vaste versie, geen CDN-afhankelijkheid. |
| `tests.js` | De testgevallen. |
| `test.html` | Testrunner in de browser. |
| `test-node.js` | Dezelfde tests via `node test-node.js`, voor gebruik zonder browser. |

Het algoritme staat apart van de app omdat het daarmee zonder browserinteractie te testen is. Om dezelfde reden staat het verwerken van telefoonverzoeken (`sessie.js`) los van het netwerk (`verbinding.js`). Gewone `<script>`-tags in plaats van ES-modules houden alles werkend via `file://`; de bestanden schrijven zichzelf op `globalThis`, zodat dezelfde code ook onder Node draait.

### Grens tussen algoritme en app

`hussel.js` biedt één ingang:

```
genereerRonde({ aanwezigen, gepauzeerd, banen, historie, rustcorrectie, gewichten }) -> ronde
```

De app levert de toestand aan en krijgt een indeling terug. Het algoritme leest niets uit `localStorage` en schrijft niets naar het scherm. Zo is elke uitkomst reproduceerbaar uit zijn invoer. `gewichten` komt uit de gekozen preset.

Daarnaast:

```
wisselSpelers(ronde, idA, idB, groepVan) -> ronde
```

Wisselt twee spelers van plek: binnen een baan, tussen banen, of tussen een baan en de rustlijst. `groepVan` geeft per speler de groepsindex, zodat leners en groepen per baan opnieuw bepaald worden. Gepauzeerde spelers zijn niet te wisselen.

### Grens tussen sessie en netwerk

`sessie.js` biedt:

```
pasVerzoekToe(avond, club, verzoek) -> { avond, club, antwoord }
```

`verbinding.js` ontvangt berichten, geeft ze aan `pasVerzoekToe`, bewaart de uitkomst en stuurt de nieuwe toestand naar alle telefoons. Zo is alle logica van de live sessie onder Node te testen zonder netwerk.

## Datamodel

- **Groepen** — een geordende lijst met namen, bijvoorbeeld `["Gevorderd", "Midden", "Beginner"]`. De volgorde is de niveauvolgorde; posities naast elkaar zijn naastliggende groepen.
- **Speler** — naam en groep.
- **Preset** — de naam van de gekozen preset, bewaard per apparaat.
- **Avond** — de aanwezigen, het aantal banen, de gepubliceerde rondes, het concept voor de volgende ronde, wie de volgende ronde pauzeert, de sessiecode en welke telefoon welke speler heeft geclaimd.
- **Ronde** — per baan twee teams van twee, plus de lijst rustende spelers en daarbinnen wie vrijwillig pauzeert.

Spelerslijst, groepen, preset en de lopende avond worden opgeslagen in `localStorage`. De lopende avond, inclusief sessiecode, wordt bewaard zodat een ververste pagina de avond niet wist en de telefoons opnieuw kunnen verbinden.

Het hussel-geheugen — wie speelde met wie, wie speelde tegen wie, wie rustte hoe vaak, wie speelde hoe vaak buiten de eigen groep — wordt telkens herleid uit de gepubliceerde rondes. Het concept telt niet mee. Er is geen aparte administratie die uit de pas kan lopen met de werkelijkheid. Ook handmatige wissels tellen zo vanzelf mee in de eerlijkheid van volgende rondes.

## Het algoritme

Per ronde, in vijf stappen:

1. **Capaciteit bepalen.** Het aantal spelende plekken is `min(banen × 4, beschikbare spelers naar beneden afgerond op een veelvoud van 4)`. Wie de volgende ronde pauzeert, is niet beschikbaar.
2. **Rust toewijzen.** Een harde regel: wie tot dan toe het meest gerust heeft, speelt. Gelijke stand wordt willekeurig gebroken. Het verschil in rustbeurten tussen spelers die niet pauzeren loopt daardoor nooit verder op dan één. Gepauzeerde spelers staan in de rustlijst en hun pauze telt als rustbeurt, zodat ze na terugkomst als eersten weer spelen.
3. **Banen vullen.** De spelende spelers worden op niveauvolgorde op een rij gezet (met de *menging* uit de preset, zie hieronder) en in blokken van vier geknipt; elk blok wordt een baan. Binnen een groep is de volgorde willekeurig, zodat het per ronde wisselt wie er op een breukvlak terechtkomt. Waar een groep niet op een veelvoud van vier uitkomt, ontstaat vanzelf een baan met spelers uit twee naastliggende groepen. Baan 1 is het sterkst.
4. **Koppels binnen de baan.** Van de drie mogelijke teamindelingen binnen een viertal wordt de minst herhalende gekozen.
5. **Scorend zoeken.** Stap 2 tot en met 4 draaien een paar honderd keer met andere willekeur. De indeling met de laagste strafscore wint.

### Strafpunten

Elke overtreding telt kwadratisch mee in het aantal keren dat ze al voorkwam, zodat een derde herhaling zwaarder weegt dan een eerste.

| Wat | Formule |
|---|---|
| Opnieuw dezelfde partner | `partner × eerdere keren²` |
| Opnieuw dezelfde tegenstander | `tegenstander × eerdere keren²` |
| Baan die meerdere niveaus overspant | `niveaukloof × (hoogste groepsindex − laagste groepsindex op die baan)²` |
| Dezelfde speler steeds de lener op het breukvlak | `lener × eerdere keren buiten eigen groep²` |

Rustverdeling is geen strafpunt maar een harde regel in stap 2.

### Presets

De organisator kiest uit drie presets; losse gewichten zijn niet instelbaar in de app. De keuze geldt vanaf de volgende generatie.

| Preset | Partner | Tegenstander | Niveaukloof | Lener | Menging | Bedoeling |
|---|---|---|---|---|---|---|
| Gebalanceerd (standaard) | 10 | 3 | 8 | 4 | 0 | De oorspronkelijke startwaarden. |
| Sociaal mixen | 10 | 5 | 2 | 2 | 1,2 | Zoveel mogelijk nieuwe partners en tegenstanders, niveau telt minder. |
| Binnen niveau | 6 | 2 | 30 | 6 | 0 | Banen zo zuiver mogelijk op niveau, herhaling neemt men voor lief. |

*Menging* bepaalt hoe streng de niveauvolgorde in stap 3 is. Elke speler krijgt als sorteerwaarde zijn groepsindex plus een willekeurig getal tussen 0 en de menging. Bij 0 blijft de volgorde strikt. Boven 1 kan een speler over het breukvlak naar een naastliggende groep schuiven, zodat de niveaukloof-strafpunten ook echt een afweging worden. Zonder menging ligt de niveauverdeling grotendeels vast door wie er speelt, en verschillen *Gebalanceerd* en *Binnen niveau* vooral bij wie rust en in de teamindeling.

De waarden zijn een vertrekpunt en worden na een avond in de zaal bijgesteld in `presets.js`. Een test laat per preset zien dat de bedoeling ook uitkomt.

## Schermen op de laptop

De laptop of tablet staat de hele avond in de zaal en is ook het scherm waar spelers op kijken. De opmaak is daarom gericht op een liggend scherm, met grote baankaarten die van een paar meter afstand leesbaar zijn. Tijdens een lopende avond vraagt de app de browser het scherm aan te houden (Wake Lock), waar de browser dat ondersteunt.

**Spelersbeheer.** Groepen benoemen, op volgorde zetten, toevoegen en verwijderen. De groepen zijn ook de niveaus waaruit spelers op hun telefoon kiezen. Spelers melden zich normaal zelf aan; hier kan de organisator er ook een toevoegen, een naam verbeteren (spelers typen hem zelf in), het niveau aanpassen of een speler verwijderen. Een naam is uniek, zonder op hoofdletters of spaties te letten. Dit is, met de preset, het enige dat tussen avonden bewaard blijft. Er is geen import uit een bestand.

**Avond starten.** Het aantal banen instellen en een preset kiezen. Aanvinken uit de bewaarde lijst kan, maar hoeft niet: een avond kan ook zonder aanwezigen starten, waarna spelers zich met hun telefoon aanmelden. Een teller toont hoeveel spelers per ronde spelen en hoeveel er rusten, zodat het aantal banen vóór aanvang bijgesteld kan worden. Bij het starten krijgt de avond een sessiecode; het scherm toont een QR-code en de korte code waarmee telefoons aansluiten.

**Ronde-scherm.** Het scherm dat de hele avond openstaat. Het kent drie toestanden:

- *Wachtruimte.* Zolang er nog geen eerste ronde is, toont het scherm een grote QR-code met de sessiecode en, per niveau, wie er al binnen is. Nieuwe namen lichten even op. Een teller meldt hoeveel spelers er nog nodig zijn; de knop *Eerste ronde voorbereiden* werkt vanaf vier beschikbare spelers. Er wordt niets vanzelf geloot, zodat de organisator wacht tot iedereen binnen is.

- *Concept.* De organisator genereert de volgende ronde, kan *opnieuw genereren* (andere loting) en spelers met de hand wisselen door twee namen na elkaar aan te tikken. Ook een speler op een baan en een rustende speler zijn te wisselen. Telefoons zien het concept niet. Wie zich aanmeldt terwijl het concept openstaat, moet de volgende ronde meteen mee kunnen doen: het concept wordt dan vanzelf opnieuw geloot, met de nieuwkomer erin. Dat gebeurt niet als de organisator al met de hand in het concept gewisseld heeft; dan blijft het staan, krijgt de nieuwkomer een badge en meldt het scherm dat opnieuw loten nodig is. Een pauze of vertrek tijdens het concept geeft altijd die badge en melding.
- *Gepubliceerd.* Met *Start ronde* wordt het concept de lopende ronde. Telefoons krijgen de indeling en een melding, precies één keer per ronde.

Naast de rondetitel staat het aantal banen, met een min- en plusknop. Het aantal banen is tussen rondes aan te passen: de lopende ronde blijft staan en de wijziging geldt vanaf de volgende loting. Staat er een concept open, dan wordt dat meteen opnieuw geloot met het nieuwe aantal; handmatige wissels in dat concept vervallen dan. Op het avondscherm werkt de baanteller tijdens de avond op dezelfde manier.

Grote kaarten per baan met baannummer, de betrokken groep of groepen, en team tegen team. Daaronder wie deze ronde rust en wie pauzeert. Knoppen: *volgende ronde* (maakt een concept), *opnieuw genereren*, *start ronde*, *spelers aanpassen*, *avond afsluiten*. Een kleine QR-code in een hoek laat laatkomers ook tijdens de avond aansluiten.

**Spelers aanpassen tijdens de avond.** Een laatkomer aanvinken, een afhaker uitvinken of een speler voor de volgende ronde laten pauzeren. De lopende ronde blijft ongewijzigd; de aanpassing geldt vanaf de volgende ronde. Een laatkomer start met het hoogste rustsaldo dat op dat moment onder de aanwezigen voorkomt. Zou die op nul beginnen, dan zou hij volgens de regel uit stap 2 juist als eerste aan de beurt zijn om te rusten, terwijl hij nog geen bal heeft geslagen. Met het hoogste saldo speelt hij zijn eerste ronde meteen mee en draait hij daarna gewoon mee in de rotatie.

Hier staat ook per aanwezige of er een telefoon aan gekoppeld is. De organisator kan een telefoon ontkoppelen, bijvoorbeeld als iemand per ongeluk de verkeerde naam koos.

**Overzicht.** Een tabel met per speler het aantal gespeelde rondes, rustbeurten en pauzes, om bij twijfel te laten zien dat de verdeling klopt.

## De telefoon

Een speler scant de QR-code of opent de link met sessiecode. Wie al eerder meedeed, tikt zijn naam aan en is daarmee aangemeld. Wie nieuw is, vult naam en niveau in en is meteen aangemeld: zonder goedkeuring van de organisator, die achteraf een naam of niveau kan aanpassen of iemand kan verwijderen. Bestaat de naam al, dan wordt de speler naar de lijst verwezen. Er zijn geen accounts en geen pincodes: de app vertrouwt op de gekozen naam. Een naam kan door één telefoon tegelijk gekoppeld worden.

De telefoon onthoudt welke speler hij is, ook na het afsluiten van de avond. Bij een verbroken verbinding sluit hij vanzelf weer aan; bij een volgende avond is één tik op *Ik ben er* genoeg. Opnieuw verbinden meldt niemand vanzelf aan, zodat wie vertrokken is ook vertrokken blijft.

Wat een telefoon kan:

- **Mijn baan zien.** Het hoofdscherm toont de lopende ronde vanuit de speler: baan, partner en tegenstanders, of dat hij rust. Bij een nieuwe gepubliceerde ronde trilt de telefoon waar de browser dat kan (Android); op een iPhone is de melding alleen zichtbaar.
- **Pauzeren.** *Volgende ronde sla ik over.* De pauze geldt voor één ronde en vervalt zodra die ronde gepubliceerd is. Opnieuw tikken pauzeert ook de ronde daarna. Intrekken kan zolang de ronde nog niet gepubliceerd is.
- **Vertrekken.** *Ik ga naar huis*, met een bevestiging tegen mistikken. Werkt als het uitvinken door de organisator.
- **Aanmelden.** Naam aantikken, *Ik ben er*, of nieuw aanmelden met naam en niveau. Een laatkomer krijgt dezelfde rustcorrectie als bij aanvinken op de laptop.

### Berichten

| Van | Bericht | Gevolg |
|---|---|---|
| Telefoon | `hallo` met telefoon-id en bewaarde speler | Stelt de telefoon voor en koppelt de bewaarde speler opnieuw, zonder aan te melden. |
| Telefoon | `claim` met speler | Koppelt de telefoon aan de speler en meldt hem aan, of weigert als een andere telefoon die naam al heeft. |
| Telefoon | `registreer` met naam en niveau | Nieuwe speler in de spelerslijst, aangemeld en gekoppeld; geweigerd bij een lege of bestaande naam of een onbekend niveau. |
| Telefoon | `loslaten` | Koppelt de telefoon los (*Niet jij?*). De speler blijft aangemeld. |
| Telefoon | `pauze` aan of uit | Zet of wist de pauze voor de volgende ronde. |
| Telefoon | `vertrek` | Haalt de speler van de aanwezigheidslijst vanaf de volgende ronde. |
| Telefoon | `aanmelden` met speler | Zet een speler uit de clublijst op de aanwezigheidslijst, met rustcorrectie. |
| Laptop | `toestand` | De namen van de clublijst, wie aanwezig is, de lopende ronde en de eigen status van de speler. Na elke wijziging naar alle telefoons. |
| Laptop | `ontkoppeld` | De telefoon gaat terug naar het naamkeuzescherm. |

## Huisstijl

De standaardopmaak volgt de huisstijl van Pickleball Den Bosch (pickleballdenbosch.nl). Alle kleuren en lettertypen staan als variabelen in `thema.css`; `stijl.css` gebruikt alleen die variabelen, zodat een andere stijl later één bestand is.

| Variabele | Waarde |
|---|---|
| Primair | `#1D6A44` |
| Primair licht | `#28A05F` |
| Donkerblauw | `#0B1B2C` |
| Blauw | `#004B9E` |
| Accent | `#F8D20B` |
| Achtergrond licht | `#F3F3F4` |
| Koppen | Figtree 900, terugval `system-ui` |
| Tekst | DM Sans 400–600, terugval `system-ui` |

De lettertypen komen van Google Fonts. Zonder internet valt de app terug op het systeemlettertype en blijft hij volledig bruikbaar.

## Hosting en privacy

- De app staat op GitHub Pages, vanuit een publieke repository op de branch `master`.
- In de repository staan geen namen of andere gegevens van leden. `docs/Pickleball Den Bosch_members/` staat in `.gitignore` of buiten de repository, vóór de eerste push.
- Spelersnamen staan alleen in `localStorage` van de laptop en gaan rechtstreeks van laptop naar telefoon. De namen van de clublijst worden naar aangesloten telefoons gestuurd, zodat spelers zichzelf kunnen kiezen en aanmelden; andere gegevens dan naam en groep kent de app niet.
- De publieke PeerJS-server ziet alleen verbindingsgegevens, geen namen of indelingen. PeerJS gebruikt standaard ook zijn eigen gratis TURN-servers voor telefoons die niet rechtstreeks kunnen verbinden; daar is geen account of sleutel voor nodig. Het verkeer daarlangs is versleuteld (WebRTC).

## Randgevallen

| Situatie | Gedrag |
|---|---|
| Minder dan vier beschikbare spelers | Melding, geen ronde gegenereerd. |
| Meer banen dan spelers aankunnen | Overtollige banen blijven leeg, geen foutmelding. |
| Speler verwijderd die in de lopende ronde staat | Waarschuwing dat de lopende ronde blijft staan; de wijziging geldt vanaf de volgende ronde. |
| `localStorage` geblokkeerd of vol | De app werkt door in het geheugen, met een zichtbare waarschuwing dat er niets bewaard wordt. |
| Pagina ververst tijdens een avond | De avond wordt hersteld in de toestand van vóór het verversen, met dezelfde sessiecode. Telefoons verbinden vanzelf opnieuw. |
| Laptop slaapt of verliest internet | Telefoons tonen *verbinding kwijt* en proberen het steeds opnieuw. De laptop werkt door. |
| PeerJS-server onbereikbaar | De laptop werkt door zonder telefoons en toont dat aansluiten nu niet lukt. |
| Telefoon kan geen verbinding maken (bijvoorbeeld op mobiele data) | Vriendelijke melding met *opnieuw proberen* en de tip om de organisator te vragen of de wifi van de zaal te gebruiken. De organisator doet het dan op de laptop. |
| Sessiecode na verversen nog bezet bij de PeerJS-server | De laptop probeert het met dezelfde code opnieuw tot die vrij is. |
| Nieuwe speler kiest een naam die al bestaat | Geweigerd, met de vraag de naam in de lijst aan te tikken of de achternaam toe te voegen. |
| Iemand meldt een verzonnen naam aan | De organisator verwijdert die speler op het spelersscherm. Er is geen bescherming tegen; dat is bewust. |
| Tweede telefoon kiest een al gekoppelde naam | Geweigerd, met de melding dat die naam al gekoppeld is en dat de organisator kan ontkoppelen. |
| Aanmelding tijdens het concept | Het concept wordt vanzelf opnieuw geloot met de nieuwkomer erin, tenzij er al met de hand in gewisseld is; dan een badge en een melding. |
| Pauze of vertrek tijdens het concept | Badge bij de speler en een melding op de laptop dat opnieuw genereren nodig is. |
| Pauze na publiceren | Geldt voor de ronde daarna. |
| Handmatige wissel brengt de rustverdeling uit balans | Toegestaan. De volgende rondes herstellen de balans via de regel uit stap 2. |
| Iedereen pauzeert tegelijk, minder dan vier over | Melding, geen ronde gegenereerd. |
| Avond afgesloten | De sessiecode vervalt; aangesloten telefoons tonen dat de avond voorbij is. |

## Tests

In `test.html` en `test-node.js`, tegen `hussel.js`:

- Iedere aanwezige staat per ronde precies één keer ingedeeld: spelend of rustend, nooit allebei en nooit geen van beide.
- Over twintig rondes zonder pauzes verschilt het aantal rustbeurten tussen spelers nooit meer dan één.
- Bij een groep met een aantal spelers dat deelbaar is door vier, blijft iedere baan binnen één niveau.
- Bij een groep waarbij dat niet zo is, overspant een baan hooguit twee naastliggende niveaus.
- Wie als lener op het breukvlak tussen groepen terechtkomt, rouleert over de rondes.
- Een doorloop van 4 tot en met 40 spelers bij 1 tot en met 10 banen levert nooit een crash of een ongeldige indeling op.
- Een gepauzeerde speler staat nooit op een baan, staat in de rustlijst en zijn pauze telt als rustbeurt.
- Na een pauze speelt de speler de eerstvolgende ronde.
- `wisselSpelers` houdt iedere aanwezige precies één keer ingedeeld, ook bij een wissel met een rustende speler, en bepaalt leners en groepen opnieuw.
- Per preset komt de bedoeling uit: *Binnen niveau* geeft minder niveaukloof dan *Sociaal mixen*, *Sociaal mixen* minder herhaalde partners en tegenstanders.
- Het concept telt niet mee in de historie; alleen gepubliceerde rondes doen dat.

Tegen `sessie.js`:

- Een claim op een vrije naam lukt; een tweede claim op dezelfde naam wordt geweigerd; na ontkoppelen lukt hij weer.
- Pauze aan en uit, vertrek en aanmelden geven dezelfde avond als dezelfde handeling op de laptop.
- Aanmelden van een laatkomer geeft het hoogste rustsaldo onder de aanwezigen.
- Registreren met naam en niveau zet de speler in de lijst, meldt hem aan en koppelt de telefoon; een bestaande naam, een lege naam of een onbekend niveau wordt geweigerd.
- Je eigen naam aantikken meldt je aan; opnieuw verbinden doet dat niet.
- Een pauze vervalt bij het publiceren van de ronde waarvoor hij gold.
- Het aantal banen wijzigen laat gespeelde rondes ongemoeid en geldt bij de volgende loting.
- Een nieuwkomer rust niet in de eerstvolgende ronde.
- Een aanmelding tijdens een concept vraagt om een nieuw concept, behalve als er met de hand in gewisseld is.

De verbinding zelf (`verbinding.js`) wordt met de hand getest, volgens een vaste lijst: aansluiten via QR, laptop verversen, telefoon op wifi en op mobiele data, Android en iPhone.

## Buiten scope

Scores, ranglijsten, klimmen en zakken tussen banen, enkelspel, historie over meerdere avonden, accounts, een eigen server of database, vaste of verboden koppels, een eigen of betaalde TURN-relay naast die van PeerJS, bescherming tegen het claimen van andermans naam, spelers importeren uit een bestand, goedkeuren van aanmeldingen, losse gewichten instellen in de app, meerdere talen.

## Open punten

- **Opmaak voor andere clubs.** Hoe een andere club de app een eigen stijl geeft (eigen `thema.css` in een fork, of instellingen in de app) wordt later besloten. Tot dan houdt `thema.css` de deur open.
- **Logo van de club.** Alleen gebruiken met toestemming van het clubbestuur; tot dan alleen de clubnaam in tekst.
- **Wisselen na publiceren.** Of de organisator een al gepubliceerde ronde nog met de hand mag corrigeren, bijvoorbeeld als een speler niet komt opdagen, en of telefoons daar opnieuw een melding van krijgen.
