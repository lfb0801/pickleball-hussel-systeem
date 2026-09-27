# Pickleball hussel systeem — implementatieplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een lokaal in de browser draaiende app die per ronde bepaalt wie met en tegen wie speelt op welke baan, ingedeeld op niveaugroep, met eerlijk gerouleerde rustbeurten.

**Architecture:** Het algoritme staat als pure functies in `hussel.js`, zonder DOM en zonder opslag, en is daardoor volledig testbaar onder Node. De app eromheen bestaat uit een opslaglaag, een gedeelde toestand met schermnavigatie, en één bestand per scherm. Alles wordt ingeladen met gewone `<script>`-tags, zodat de app werkt door `index.html` te dubbelklikken — geen build-stap, geen server, geen internetverbinding.

**Tech Stack:** Vanilla JavaScript (ES2019), HTML, CSS, `localStorage`. Node wordt alleen gebruikt om de tests te draaien.

**Spec:** `docs/superpowers/specs/2026-09-27-pickleball-hussel-systeem-design.md`

## Global Constraints

- Geen build-stap, geen npm-afhankelijkheden, geen ES-modules. Alleen gewone `<script src="...">`-tags, zodat alles werkt via `file://`.
- Alle bestanden schrijven hun API op `globalThis`, zodat dezelfde code in de browser en onder Node draait.
- Taal: alle identifiers, teksten in de app, commentaar en commitberichten zijn Nederlands.
- Doelomgeving: Node 16 en een moderne browser. Geen `Object.hasOwn`, geen optional chaining in bestanden die onder Node geëvalueerd worden (`hussel.js`, `opslag.js`, `tests.js`).
- `hussel.js` bevat geen DOM-toegang en geen `localStorage`-toegang, en gebruikt `Math.random()` alleen als terugval wanneer er geen `rng` wordt meegegeven.
- Elke test draait met een meegegeven `rng` uit `Hussel.maakRng(zaad)`, zodat uitkomsten reproduceerbaar zijn.
- Testcommando: `node test-node.js` draait alles; `node test-node.js "<deel van de testnaam>"` draait een selectie.
- Strafpuntgewichten staan als benoemde constanten bovenaan `hussel.js` met de startwaarden uit de spec: partner 10, tegenstander 3, niveaukloof 8, lener 4.

## Bestandsindeling

| Bestand | Verantwoordelijkheid | Taak |
|---|---|---|
| `hussel.js` | Het algoritme: pure functies en de strafpuntgewichten. | 1–8 |
| `tests.js` | Alle testgevallen. | 1–8 |
| `test-node.js` | Testrunner voor de terminal. | 1 |
| `test.html` | Testrunner voor de browser. | 1 |
| `opslag.js` | `localStorage`-laag met terugval op geheugen. | 9 |
| `index.html` | Markup van alle vier de schermen. | 10–15 |
| `stijl.css` | Opmaak. | 10, 13 |
| `app.js` | Gedeelde toestand, navigatie, opstarten. | 10 |
| `scherm-spelers.js` | Spelers- en groepsbeheer. | 11 |
| `scherm-avond.js` | Avond starten, afsluiten, aanwezigheid aanpassen. | 12, 14 |
| `scherm-ronde.js` | Het ronde-scherm met baankaarten. | 13 |
| `scherm-overzicht.js` | Tabel met gespeelde rondes en rustbeurten. | 15 |

## Gegevensvormen

Deze vormen gelden in het hele plan.

```js
// speler
{ id: 's1', naam: 'Anne', groep: 0 }              // groep = index in de groepenlijst, 0 is het sterkst

// baan binnen een ronde
{ baan: 1, teamA: ['s1', 's2'], teamB: ['s3', 's4'],
  thuisgroep: 0, groepen: [0], leners: [] }

// ronde
{ banen: [ /* banen */ ], rustend: ['s9', 's10'] }

// club (blijft bewaard tussen avonden)
{ groepen: ['Gevorderd', 'Midden', 'Beginner'], spelers: [ /* spelers */ ] }

// avond (blijft bewaard tot hij wordt afgesloten)
{ aanwezigen: ['s1', 's2'], banen: 4, rondes: [ /* rondes */ ], rustcorrectie: { s7: 2 } }

// historiestatistiek
{ partner: { 's1|s2': 3 }, tegenstander: { 's1|s3': 1 }, rust: { 's9': 2 }, lener: { 's5': 1 } }
```

**Testen van de gebruikersinterface.** Taken 1 tot en met 9 hebben geautomatiseerde tests. Taken 10 tot en met 15 raken de DOM en worden geverifieerd door `index.html` in de browser te openen en de beschreven handelingen uit te voeren; elke stap noemt precies wat er te zien moet zijn. De logica achter die schermen zit in `hussel.js` en `opslag.js` en is daar wél getest.

---

### Task 1: Testopstelling en willekeurgenerator

**Files:**
- Create: `hussel.js`
- Create: `tests.js`
- Create: `test-node.js`
- Create: `test.html`

**Interfaces:**
- Consumes: niets
- Produces: `Hussel.maakRng(zaad) -> () => number`, `Hussel.husselLijst(lijst, rng) -> Array`, en de testfuncties `test(naam, fn)`, `assert(voorwaarde, bericht)`, `assertGelijk(gevonden, verwacht, bericht)` op `globalThis`.

- [ ] **Step 1: Maak de testrunner voor de terminal**

Maak `test-node.js`:

```js
const fs = require('fs');
const path = require('path');

const filter = process.argv[2] || '';
const resultaten = [];

globalThis.test = function (naam, fn) {
  if (filter && naam.indexOf(filter) === -1) return;
  try {
    fn();
    resultaten.push({ naam: naam, gelukt: true });
  } catch (fout) {
    resultaten.push({ naam: naam, gelukt: false, fout: fout.message });
  }
};

globalThis.assert = function (voorwaarde, bericht) {
  if (!voorwaarde) throw new Error(bericht || 'assertie mislukt');
};

globalThis.assertGelijk = function (gevonden, verwacht, bericht) {
  const a = JSON.stringify(gevonden);
  const b = JSON.stringify(verwacht);
  if (a !== b) throw new Error((bericht || 'niet gelijk') + ': ' + a + ' !== ' + b);
};

const bestanden = ['hussel.js', 'tests.js'];
for (const bestand of bestanden) {
  const volledig = path.join(__dirname, bestand);
  if (!fs.existsSync(volledig)) continue;
  (0, eval)(fs.readFileSync(volledig, 'utf8'));
}

let mislukt = 0;
for (const resultaat of resultaten) {
  if (resultaat.gelukt) {
    console.log('ok   ' + resultaat.naam);
  } else {
    mislukt += 1;
    console.log('FOUT ' + resultaat.naam + ' — ' + resultaat.fout);
  }
}
console.log('');
console.log((resultaten.length - mislukt) + '/' + resultaten.length + ' geslaagd');
process.exit(mislukt === 0 ? 0 : 1);
```

- [ ] **Step 2: Maak de testrunner voor de browser**

Maak `test.html`:

```html
<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<title>Tests — hussel systeem</title>
<style>
  body { font: 16px system-ui, sans-serif; margin: 2rem; }
  li.gelukt { color: #17603a; }
  li.mislukt { color: #a01b1b; }
</style>
</head>
<body>
<h1>Tests</h1>
<p id="samenvatting"></p>
<ul id="resultaten"></ul>
<script>
  const resultaten = [];
  function test(naam, fn) {
    try {
      fn();
      resultaten.push({ naam: naam, gelukt: true });
    } catch (fout) {
      resultaten.push({ naam: naam, gelukt: false, fout: fout.message });
    }
  }
  function assert(voorwaarde, bericht) {
    if (!voorwaarde) throw new Error(bericht || 'assertie mislukt');
  }
  function assertGelijk(gevonden, verwacht, bericht) {
    const a = JSON.stringify(gevonden);
    const b = JSON.stringify(verwacht);
    if (a !== b) throw new Error((bericht || 'niet gelijk') + ': ' + a + ' !== ' + b);
  }
</script>
<script src="hussel.js"></script>
<script src="tests.js"></script>
<script>
  const lijst = document.getElementById('resultaten');
  let mislukt = 0;
  for (const resultaat of resultaten) {
    const item = document.createElement('li');
    item.className = resultaat.gelukt ? 'gelukt' : 'mislukt';
    item.textContent = resultaat.naam + (resultaat.gelukt ? '' : ' — ' + resultaat.fout);
    if (!resultaat.gelukt) mislukt += 1;
    lijst.appendChild(item);
  }
  document.getElementById('samenvatting').textContent =
    (resultaten.length - mislukt) + '/' + resultaten.length + ' geslaagd';
</script>
</body>
</html>
```

- [ ] **Step 3: Schrijf de falende tests**

Maak `tests.js`:

```js
test('maakRng levert bij hetzelfde zaad dezelfde reeks', function () {
  const a = Hussel.maakRng(42);
  const b = Hussel.maakRng(42);
  const reeksA = [a(), a(), a()];
  const reeksB = [b(), b(), b()];
  assertGelijk(reeksA, reeksB);
});

test('maakRng levert getallen tussen 0 en 1', function () {
  const rng = Hussel.maakRng(7);
  for (let i = 0; i < 100; i += 1) {
    const waarde = rng();
    assert(waarde >= 0 && waarde < 1, 'waarde buiten bereik: ' + waarde);
  }
});

test('husselLijst behoudt alle elementen en laat het origineel ongemoeid', function () {
  const origineel = [1, 2, 3, 4, 5];
  const gehusseld = Hussel.husselLijst(origineel, Hussel.maakRng(3));
  assertGelijk(origineel, [1, 2, 3, 4, 5], 'origineel is gewijzigd');
  assertGelijk(gehusseld.slice().sort(function (a, b) { return a - b; }), [1, 2, 3, 4, 5]);
});

test('husselLijst verandert de volgorde bij een voldoende lange lijst', function () {
  const origineel = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const gehusseld = Hussel.husselLijst(origineel, Hussel.maakRng(3));
  assert(JSON.stringify(gehusseld) !== JSON.stringify(origineel), 'volgorde is niet veranderd');
});
```

- [ ] **Step 4: Draai de tests en zie ze falen**

Run: `node test-node.js`
Expected: FOUT bij alle vier de tests, met `Hussel is not defined`. Afsluitcode 1.

- [ ] **Step 5: Schrijf de minimale implementatie**

Maak `hussel.js`:

```js
(function () {
  'use strict';

  const GEWICHT_PARTNER = 10;
  const GEWICHT_TEGENSTANDER = 3;
  const GEWICHT_NIVEAUKLOOF = 8;
  const GEWICHT_LENER = 4;
  const AANTAL_POGINGEN = 300;

  // Mulberry32: klein, snel en reproduceerbaar. Nodig omdat elke ronde
  // honderden keren met andere willekeur wordt gegenereerd, en tests dat
  // moeten kunnen herhalen.
  function maakRng(zaad) {
    let toestand = zaad >>> 0;
    return function () {
      toestand = (toestand + 0x6d2b79f5) >>> 0;
      let getal = toestand;
      getal = Math.imul(getal ^ (getal >>> 15), getal | 1);
      getal ^= getal + Math.imul(getal ^ (getal >>> 7), getal | 61);
      return ((getal ^ (getal >>> 14)) >>> 0) / 4294967296;
    };
  }

  function husselLijst(lijst, rng) {
    const kopie = lijst.slice();
    for (let i = kopie.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      const tussen = kopie[i];
      kopie[i] = kopie[j];
      kopie[j] = tussen;
    }
    return kopie;
  }

  globalThis.Hussel = {
    GEWICHT_PARTNER: GEWICHT_PARTNER,
    GEWICHT_TEGENSTANDER: GEWICHT_TEGENSTANDER,
    GEWICHT_NIVEAUKLOOF: GEWICHT_NIVEAUKLOOF,
    GEWICHT_LENER: GEWICHT_LENER,
    AANTAL_POGINGEN: AANTAL_POGINGEN,
    maakRng: maakRng,
    husselLijst: husselLijst,
  };
})();
```

- [ ] **Step 6: Draai de tests en zie ze slagen**

Run: `node test-node.js`
Expected: `4/4 geslaagd`, afsluitcode 0.

- [ ] **Step 7: Commit**

```bash
git add hussel.js tests.js test-node.js test.html
git commit -m "Testopstelling en reproduceerbare willekeurgenerator"
```

---

### Task 2: Historiestatistiek

Uit de gespeelde rondes wordt afgeleid wie met wie speelde, wie tegen wie, wie hoe vaak rustte en wie hoe vaak buiten de eigen groep speelde. Er is bewust geen aparte administratie: de rondes zijn de enige bron.

**Files:**
- Modify: `hussel.js`
- Modify: `tests.js`

**Interfaces:**
- Consumes: niets uit eerdere taken.
- Produces:
  - `Hussel.sleutel(a, b) -> string` — ordeneutrale sleutel voor een paar spelers-id's.
  - `Hussel.aantal(telling, sleutel) -> number` — 0 als de sleutel ontbreekt.
  - `Hussel.maakHistorieStatistiek(rondes, rustcorrectie) -> { partner, tegenstander, rust, lener }` — `rustcorrectie` mag `undefined` zijn.
  - `Hussel.hoogsteRustsaldo(stat, ids) -> number`.

- [ ] **Step 1: Schrijf de falende tests**

Voeg toe aan het einde van `tests.js`:

```js
function maakTestRonde(banen, rustend) {
  return { banen: banen, rustend: rustend || [] };
}

function maakTestBaan(nummer, teamA, teamB, leners) {
  return {
    baan: nummer,
    teamA: teamA,
    teamB: teamB,
    thuisgroep: 0,
    groepen: [0],
    leners: leners || [],
  };
}

test('sleutel is onafhankelijk van de volgorde', function () {
  assertGelijk(Hussel.sleutel('a', 'b'), Hussel.sleutel('b', 'a'));
  assert(Hussel.sleutel('a', 'b') !== Hussel.sleutel('a', 'c'));
});

test('aantal geeft nul terug voor een onbekende sleutel', function () {
  assertGelijk(Hussel.aantal({ x: 2 }, 'x'), 2);
  assertGelijk(Hussel.aantal({ x: 2 }, 'y'), 0);
});

test('historiestatistiek telt partners, tegenstanders, rust en leners', function () {
  const rondes = [
    maakTestRonde([maakTestBaan(1, ['a', 'b'], ['c', 'd'], ['d'])], ['e']),
    maakTestRonde([maakTestBaan(1, ['a', 'b'], ['c', 'e'], [])], ['d']),
  ];
  const stat = Hussel.maakHistorieStatistiek(rondes);
  assertGelijk(Hussel.aantal(stat.partner, Hussel.sleutel('a', 'b')), 2);
  assertGelijk(Hussel.aantal(stat.partner, Hussel.sleutel('c', 'd')), 1);
  assertGelijk(Hussel.aantal(stat.tegenstander, Hussel.sleutel('a', 'c')), 2);
  assertGelijk(Hussel.aantal(stat.tegenstander, Hussel.sleutel('a', 'd')), 1);
  assertGelijk(Hussel.aantal(stat.rust, 'e'), 1);
  assertGelijk(Hussel.aantal(stat.rust, 'd'), 1);
  assertGelijk(Hussel.aantal(stat.lener, 'd'), 1);
  assertGelijk(Hussel.aantal(stat.lener, 'a'), 0);
});

test('historiestatistiek telt de rustcorrectie mee', function () {
  const rondes = [maakTestRonde([maakTestBaan(1, ['a', 'b'], ['c', 'd'])], ['e'])];
  const stat = Hussel.maakHistorieStatistiek(rondes, { e: 3, f: 2 });
  assertGelijk(Hussel.aantal(stat.rust, 'e'), 4);
  assertGelijk(Hussel.aantal(stat.rust, 'f'), 2);
});

test('hoogsteRustsaldo geeft het maximum onder de opgegeven spelers', function () {
  const stat = { partner: {}, tegenstander: {}, rust: { a: 1, b: 3, c: 0 }, lener: {} };
  assertGelijk(Hussel.hoogsteRustsaldo(stat, ['a', 'b', 'c']), 3);
  assertGelijk(Hussel.hoogsteRustsaldo(stat, ['a', 'c']), 1);
  assertGelijk(Hussel.hoogsteRustsaldo(stat, []), 0);
});
```

- [ ] **Step 2: Draai de tests en zie ze falen**

Run: `node test-node.js "sleutel"`
Expected: FOUT met `Hussel.sleutel is not a function`.

- [ ] **Step 3: Schrijf de implementatie**

Voeg in `hussel.js` toe, na `husselLijst`:

```js
  function sleutel(a, b) {
    return a < b ? a + '|' + b : b + '|' + a;
  }

  function aantal(telling, sleutelwaarde) {
    const waarde = telling[sleutelwaarde];
    return waarde === undefined ? 0 : waarde;
  }

  function tel(telling, sleutelwaarde) {
    telling[sleutelwaarde] = aantal(telling, sleutelwaarde) + 1;
  }

  function maakHistorieStatistiek(rondes, rustcorrectie) {
    const stat = { partner: {}, tegenstander: {}, rust: {}, lener: {} };

    if (rustcorrectie) {
      for (const id of Object.keys(rustcorrectie)) {
        stat.rust[id] = rustcorrectie[id];
      }
    }

    for (const ronde of rondes) {
      for (const id of ronde.rustend) {
        tel(stat.rust, id);
      }
      for (const baan of ronde.banen) {
        tel(stat.partner, sleutel(baan.teamA[0], baan.teamA[1]));
        tel(stat.partner, sleutel(baan.teamB[0], baan.teamB[1]));
        for (const a of baan.teamA) {
          for (const b of baan.teamB) {
            tel(stat.tegenstander, sleutel(a, b));
          }
        }
        for (const id of baan.leners) {
          tel(stat.lener, id);
        }
      }
    }

    return stat;
  }

  function hoogsteRustsaldo(stat, ids) {
    let hoogste = 0;
    for (const id of ids) {
      const saldo = aantal(stat.rust, id);
      if (saldo > hoogste) hoogste = saldo;
    }
    return hoogste;
  }
```

Vul het `globalThis.Hussel`-object aan met:

```js
    sleutel: sleutel,
    aantal: aantal,
    maakHistorieStatistiek: maakHistorieStatistiek,
    hoogsteRustsaldo: hoogsteRustsaldo,
```

- [ ] **Step 4: Draai de tests en zie ze slagen**

Run: `node test-node.js`
Expected: `9/9 geslaagd`.

- [ ] **Step 5: Commit**

```bash
git add hussel.js tests.js
git commit -m "Historiestatistiek afgeleid uit de gespeelde rondes"
```

---

### Task 3: Capaciteit en rustverdeling

**Files:**
- Modify: `hussel.js`
- Modify: `tests.js`

**Interfaces:**
- Consumes: `Hussel.husselLijst`, `Hussel.aantal`, `Hussel.maakHistorieStatistiek`.
- Produces:
  - `Hussel.aantalPlekken(aantalAanwezigen, banen) -> number`.
  - `Hussel.kiesSpelenden(aanwezigen, plekken, stat, rng) -> { spelend, rustend }` — beide arrays met spelerobjecten.

- [ ] **Step 1: Schrijf de falende tests**

Voeg toe aan het einde van `tests.js`:

```js
function maakSpelers(aantalPerGroep) {
  const spelers = [];
  aantalPerGroep.forEach(function (hoeveel, groep) {
    for (let i = 0; i < hoeveel; i += 1) {
      const id = 'g' + groep + 'n' + i;
      spelers.push({ id: id, naam: id, groep: groep });
    }
  });
  return spelers;
}

test('aantalPlekken wordt begrensd door banen en door viertallen', function () {
  assertGelijk(Hussel.aantalPlekken(18, 4), 16);
  assertGelijk(Hussel.aantalPlekken(18, 10), 16);
  assertGelijk(Hussel.aantalPlekken(11, 4), 8);
  assertGelijk(Hussel.aantalPlekken(20, 3), 12);
  assertGelijk(Hussel.aantalPlekken(3, 4), 0);
  assertGelijk(Hussel.aantalPlekken(8, 0), 0);
});

test('kiesSpelenden vult precies het aantal plekken en laat de rest rusten', function () {
  const spelers = maakSpelers([6, 6]);
  const stat = Hussel.maakHistorieStatistiek([]);
  const keuze = Hussel.kiesSpelenden(spelers, 8, stat, Hussel.maakRng(1));
  assertGelijk(keuze.spelend.length, 8);
  assertGelijk(keuze.rustend.length, 4);
  const ids = keuze.spelend.concat(keuze.rustend).map(function (s) { return s.id; });
  assertGelijk(ids.slice().sort(), spelers.map(function (s) { return s.id; }).sort());
});

test('kiesSpelenden laat wie het meest gerust heeft spelen', function () {
  const spelers = maakSpelers([5]);
  const stat = Hussel.maakHistorieStatistiek([], { g0n0: 3, g0n1: 0, g0n2: 0, g0n3: 0, g0n4: 0 });
  const keuze = Hussel.kiesSpelenden(spelers, 4, stat, Hussel.maakRng(1));
  const rustendeIds = keuze.rustend.map(function (s) { return s.id; });
  assert(rustendeIds.indexOf('g0n0') === -1, 'de speler met het hoogste rustsaldo rust ten onrechte opnieuw');
});

test('kiesSpelenden breekt gelijke rustsaldi willekeurig', function () {
  const spelers = maakSpelers([8]);
  const stat = Hussel.maakHistorieStatistiek([]);
  const eerste = Hussel.kiesSpelenden(spelers, 4, stat, Hussel.maakRng(1)).rustend
    .map(function (s) { return s.id; }).sort();
  let andersGevonden = false;
  for (let zaad = 2; zaad < 20; zaad += 1) {
    const volgende = Hussel.kiesSpelenden(spelers, 4, stat, Hussel.maakRng(zaad)).rustend
      .map(function (s) { return s.id; }).sort();
    if (JSON.stringify(volgende) !== JSON.stringify(eerste)) andersGevonden = true;
  }
  assert(andersGevonden, 'de rustende spelers zijn bij elk zaad gelijk');
});
```

- [ ] **Step 2: Draai de tests en zie ze falen**

Run: `node test-node.js "aantalPlekken"`
Expected: FOUT met `Hussel.aantalPlekken is not a function`.

- [ ] **Step 3: Schrijf de implementatie**

Voeg in `hussel.js` toe, na `hoogsteRustsaldo`:

```js
  function aantalPlekken(aantalAanwezigen, banen) {
    const doorBanen = Math.max(0, banen) * 4;
    const doorViertallen = Math.floor(aantalAanwezigen / 4) * 4;
    return Math.min(doorBanen, doorViertallen);
  }

  // Harde regel: wie tot nu toe het meest gerust heeft, speelt. Eerst
  // husselen en dan stabiel sorteren geeft een willekeurige tiebreak.
  function kiesSpelenden(aanwezigen, plekken, stat, rng) {
    const opRustsaldo = husselLijst(aanwezigen, rng).sort(function (a, b) {
      return aantal(stat.rust, b.id) - aantal(stat.rust, a.id);
    });
    return {
      spelend: opRustsaldo.slice(0, plekken),
      rustend: opRustsaldo.slice(plekken),
    };
  }
```

Vul het `globalThis.Hussel`-object aan met:

```js
    aantalPlekken: aantalPlekken,
    kiesSpelenden: kiesSpelenden,
```

- [ ] **Step 4: Draai de tests en zie ze slagen**

Run: `node test-node.js`
Expected: `13/13 geslaagd`.

- [ ] **Step 5: Commit**

```bash
git add hussel.js tests.js
git commit -m "Capaciteitsberekening en eerlijke rustverdeling"
```

---

### Task 4: Banen vullen en leners bepalen

De spelende spelers worden op niveauvolgorde in een rij gezet en in blokken van vier geknipt. Binnen een groep is de volgorde willekeurig, zodat het per ronde wisselt wie op een breukvlak tussen twee groepen terechtkomt.

**Files:**
- Modify: `hussel.js`
- Modify: `tests.js`

**Interfaces:**
- Consumes: `Hussel.husselLijst`.
- Produces:
  - `Hussel.verdeelOverBanen(spelend, rng) -> Array<Array<speler>>` — viertallen, sterkste eerst.
  - `Hussel.bepaalLeners(viertal) -> { thuisgroep: number, leners: Array<speler> }` — de thuisgroep is de meest voorkomende groep op de baan; bij gelijke aantallen de laagste groepsindex.

- [ ] **Step 1: Schrijf de falende tests**

Voeg toe aan het einde van `tests.js`:

```js
test('verdeelOverBanen knipt de rij in viertallen op niveauvolgorde', function () {
  const spelers = maakSpelers([4, 4, 4]);
  const banen = Hussel.verdeelOverBanen(spelers, Hussel.maakRng(5));
  assertGelijk(banen.length, 3);
  banen.forEach(function (viertal, index) {
    assertGelijk(viertal.length, 4);
    viertal.forEach(function (speler) {
      assertGelijk(speler.groep, index, 'baan ' + index + ' bevat een speler uit groep ' + speler.groep);
    });
  });
});

test('verdeelOverBanen laat op het breukvlak twee naastliggende groepen samenspelen', function () {
  const spelers = maakSpelers([6, 6]);
  const banen = Hussel.verdeelOverBanen(spelers, Hussel.maakRng(5));
  assertGelijk(banen.length, 3);
  const spanwijdtes = banen.map(function (viertal) {
    const groepen = viertal.map(function (s) { return s.groep; });
    return Math.max.apply(null, groepen) - Math.min.apply(null, groepen);
  });
  assertGelijk(spanwijdtes, [0, 1, 0]);
});

test('verdeelOverBanen negeert spelers die geen viertal meer vormen', function () {
  const banen = Hussel.verdeelOverBanen(maakSpelers([6]), Hussel.maakRng(5));
  assertGelijk(banen.length, 1);
});

test('verdeelOverBanen wisselt wie er op het breukvlak komt', function () {
  const spelers = maakSpelers([6, 6]);
  const gezien = {};
  for (let zaad = 1; zaad < 30; zaad += 1) {
    const middelste = Hussel.verdeelOverBanen(spelers, Hussel.maakRng(zaad))[1];
    for (const speler of middelste) gezien[speler.id] = true;
  }
  assert(Object.keys(gezien).length > 4, 'steeds dezelfde spelers op het breukvlak');
});

test('bepaalLeners wijst de minderheid op een baan aan als lener', function () {
  const viertal = [
    { id: 'a', naam: 'a', groep: 0 },
    { id: 'b', naam: 'b', groep: 0 },
    { id: 'c', naam: 'c', groep: 0 },
    { id: 'd', naam: 'd', groep: 1 },
  ];
  const uitkomst = Hussel.bepaalLeners(viertal);
  assertGelijk(uitkomst.thuisgroep, 0);
  assertGelijk(uitkomst.leners.map(function (s) { return s.id; }), ['d']);
});

test('bepaalLeners kiest bij gelijke aantallen de sterkste groep als thuisgroep', function () {
  const viertal = [
    { id: 'a', naam: 'a', groep: 0 },
    { id: 'b', naam: 'b', groep: 0 },
    { id: 'c', naam: 'c', groep: 1 },
    { id: 'd', naam: 'd', groep: 1 },
  ];
  const uitkomst = Hussel.bepaalLeners(viertal);
  assertGelijk(uitkomst.thuisgroep, 0);
  assertGelijk(uitkomst.leners.map(function (s) { return s.id; }), ['c', 'd']);
});

test('bepaalLeners levert geen leners bij een baan uit één groep', function () {
  const viertal = maakSpelers([4]);
  assertGelijk(Hussel.bepaalLeners(viertal).leners.length, 0);
});
```

- [ ] **Step 2: Draai de tests en zie ze falen**

Run: `node test-node.js "verdeelOverBanen"`
Expected: FOUT met `Hussel.verdeelOverBanen is not a function`.

- [ ] **Step 3: Schrijf de implementatie**

Voeg in `hussel.js` toe, na `kiesSpelenden`:

```js
  // Eerst husselen, dan stabiel sorteren op groep: de groepsvolgorde ligt
  // vast, maar binnen een groep wisselt de volgorde per ronde. Daardoor
  // rouleert vanzelf wie er op een breukvlak tussen twee groepen valt.
  function verdeelOverBanen(spelend, rng) {
    const rij = husselLijst(spelend, rng).sort(function (a, b) {
      return a.groep - b.groep;
    });
    const banen = [];
    for (let i = 0; i + 4 <= rij.length; i += 4) {
      banen.push(rij.slice(i, i + 4));
    }
    return banen;
  }

  function bepaalLeners(viertal) {
    const telling = {};
    for (const speler of viertal) {
      telling[speler.groep] = (telling[speler.groep] === undefined ? 0 : telling[speler.groep]) + 1;
    }
    const groepen = Object.keys(telling).map(Number).sort(function (a, b) { return a - b; });
    let thuisgroep = groepen[0];
    for (const groep of groepen) {
      if (telling[groep] > telling[thuisgroep]) thuisgroep = groep;
    }
    return {
      thuisgroep: thuisgroep,
      leners: viertal.filter(function (speler) { return speler.groep !== thuisgroep; }),
    };
  }
```

Vul het `globalThis.Hussel`-object aan met:

```js
    verdeelOverBanen: verdeelOverBanen,
    bepaalLeners: bepaalLeners,
```

- [ ] **Step 4: Draai de tests en zie ze slagen**

Run: `node test-node.js`
Expected: `20/20 geslaagd`.

- [ ] **Step 5: Commit**

```bash
git add hussel.js tests.js
git commit -m "Banen vullen op niveauvolgorde en leners bepalen"
```

---

### Task 5: Strafpunten en teamindeling

**Files:**
- Modify: `hussel.js`
- Modify: `tests.js`

**Interfaces:**
- Consumes: `Hussel.sleutel`, `Hussel.aantal`, `Hussel.bepaalLeners`, de gewichtsconstanten.
- Produces:
  - `Hussel.scoorViertal(teamA, teamB, stat) -> number`.
  - `Hussel.kiesTeams(viertal, stat) -> { teamA: Array<speler>, teamB: Array<speler> }`.

- [ ] **Step 1: Schrijf de falende tests**

Voeg toe aan het einde van `tests.js`:

```js
test('scoorViertal is nul zonder historie en binnen één groep', function () {
  const spelers = maakSpelers([4]);
  const stat = Hussel.maakHistorieStatistiek([]);
  assertGelijk(Hussel.scoorViertal(spelers.slice(0, 2), spelers.slice(2), stat), 0);
});

test('scoorViertal straft partnerherhaling kwadratisch', function () {
  const spelers = maakSpelers([4]);
  const stat = Hussel.maakHistorieStatistiek([]);
  stat.partner[Hussel.sleutel('g0n0', 'g0n1')] = 2;
  const score = Hussel.scoorViertal(spelers.slice(0, 2), spelers.slice(2), stat);
  assertGelijk(score, Hussel.GEWICHT_PARTNER * 4);
});

test('scoorViertal straft tegenstanderherhaling lichter dan partnerherhaling', function () {
  const spelers = maakSpelers([4]);
  const metPartner = Hussel.maakHistorieStatistiek([]);
  metPartner.partner[Hussel.sleutel('g0n0', 'g0n1')] = 1;
  const metTegenstander = Hussel.maakHistorieStatistiek([]);
  metTegenstander.tegenstander[Hussel.sleutel('g0n0', 'g0n2')] = 1;
  const scorePartner = Hussel.scoorViertal(spelers.slice(0, 2), spelers.slice(2), metPartner);
  const scoreTegenstander = Hussel.scoorViertal(spelers.slice(0, 2), spelers.slice(2), metTegenstander);
  assert(scorePartner > scoreTegenstander, 'partnerherhaling weegt niet zwaarder');
});

test('scoorViertal straft de niveaukloof op een baan', function () {
  const stat = Hussel.maakHistorieStatistiek([]);
  const smal = [
    { id: 'a', naam: 'a', groep: 0 }, { id: 'b', naam: 'b', groep: 0 },
    { id: 'c', naam: 'c', groep: 0 }, { id: 'd', naam: 'd', groep: 1 },
  ];
  const breed = [
    { id: 'a', naam: 'a', groep: 0 }, { id: 'b', naam: 'b', groep: 0 },
    { id: 'c', naam: 'c', groep: 0 }, { id: 'd', naam: 'd', groep: 2 },
  ];
  const scoreSmal = Hussel.scoorViertal(smal.slice(0, 2), smal.slice(2), stat);
  const scoreBreed = Hussel.scoorViertal(breed.slice(0, 2), breed.slice(2), stat);
  assertGelijk(scoreSmal, Hussel.GEWICHT_NIVEAUKLOOF * 1);
  assertGelijk(scoreBreed, Hussel.GEWICHT_NIVEAUKLOOF * 4);
});

test('scoorViertal straft wie al vaker lener was', function () {
  const stat = Hussel.maakHistorieStatistiek([]);
  stat.lener.d = 2;
  const viertal = [
    { id: 'a', naam: 'a', groep: 0 }, { id: 'b', naam: 'b', groep: 0 },
    { id: 'c', naam: 'c', groep: 0 }, { id: 'd', naam: 'd', groep: 1 },
  ];
  const score = Hussel.scoorViertal(viertal.slice(0, 2), viertal.slice(2), stat);
  assertGelijk(score, Hussel.GEWICHT_NIVEAUKLOOF * 1 + Hussel.GEWICHT_LENER * 4);
});

test('kiesTeams vermijdt een partnercombinatie die al voorkwam', function () {
  const spelers = maakSpelers([4]);
  const stat = Hussel.maakHistorieStatistiek([]);
  stat.partner[Hussel.sleutel('g0n0', 'g0n1')] = 3;
  stat.partner[Hussel.sleutel('g0n2', 'g0n3')] = 3;
  const teams = Hussel.kiesTeams(spelers, stat);
  const paren = [
    Hussel.sleutel(teams.teamA[0].id, teams.teamA[1].id),
    Hussel.sleutel(teams.teamB[0].id, teams.teamB[1].id),
  ];
  assert(paren.indexOf(Hussel.sleutel('g0n0', 'g0n1')) === -1, 'herhaalt een bestaand koppel');
});

test('kiesTeams levert twee teams van twee met alle vier de spelers', function () {
  const spelers = maakSpelers([4]);
  const teams = Hussel.kiesTeams(spelers, Hussel.maakHistorieStatistiek([]));
  assertGelijk(teams.teamA.length, 2);
  assertGelijk(teams.teamB.length, 2);
  const ids = teams.teamA.concat(teams.teamB).map(function (s) { return s.id; }).sort();
  assertGelijk(ids, spelers.map(function (s) { return s.id; }).sort());
});
```

- [ ] **Step 2: Draai de tests en zie ze falen**

Run: `node test-node.js "scoorViertal"`
Expected: FOUT met `Hussel.scoorViertal is not a function`.

- [ ] **Step 3: Schrijf de implementatie**

Voeg in `hussel.js` toe, na `bepaalLeners`:

```js
  const TEAMVERDELINGEN = [
    [[0, 1], [2, 3]],
    [[0, 2], [1, 3]],
    [[0, 3], [1, 2]],
  ];

  function kwadraat(getal) {
    return getal * getal;
  }

  function scoorViertal(teamA, teamB, stat) {
    let score = 0;

    score += GEWICHT_PARTNER * kwadraat(aantal(stat.partner, sleutel(teamA[0].id, teamA[1].id)));
    score += GEWICHT_PARTNER * kwadraat(aantal(stat.partner, sleutel(teamB[0].id, teamB[1].id)));

    for (const a of teamA) {
      for (const b of teamB) {
        score += GEWICHT_TEGENSTANDER * kwadraat(aantal(stat.tegenstander, sleutel(a.id, b.id)));
      }
    }

    const viertal = teamA.concat(teamB);
    const groepen = viertal.map(function (speler) { return speler.groep; });
    const kloof = Math.max.apply(null, groepen) - Math.min.apply(null, groepen);
    score += GEWICHT_NIVEAUKLOOF * kwadraat(kloof);

    for (const lener of bepaalLeners(viertal).leners) {
      score += GEWICHT_LENER * kwadraat(aantal(stat.lener, lener.id));
    }

    return score;
  }

  function kiesTeams(viertal, stat) {
    let beste = null;
    let besteScore = Infinity;
    for (const verdeling of TEAMVERDELINGEN) {
      const teamA = [viertal[verdeling[0][0]], viertal[verdeling[0][1]]];
      const teamB = [viertal[verdeling[1][0]], viertal[verdeling[1][1]]];
      const score = scoorViertal(teamA, teamB, stat);
      if (score < besteScore) {
        besteScore = score;
        beste = { teamA: teamA, teamB: teamB };
      }
    }
    return beste;
  }
```

Vul het `globalThis.Hussel`-object aan met:

```js
    scoorViertal: scoorViertal,
    kiesTeams: kiesTeams,
```

- [ ] **Step 4: Draai de tests en zie ze slagen**

Run: `node test-node.js`
Expected: `27/27 geslaagd`.

- [ ] **Step 5: Commit**

```bash
git add hussel.js tests.js
git commit -m "Strafpunten en teamindeling binnen een baan"
```

---

### Task 6: Een ronde genereren

Het scorend zoeken: stap 2 tot en met 4 een paar honderd keer draaien met andere willekeur en de indeling met de laagste strafscore houden.

**Files:**
- Modify: `hussel.js`
- Modify: `tests.js`

**Interfaces:**
- Consumes: `Hussel.maakRng`, `Hussel.maakHistorieStatistiek`, `Hussel.aantalPlekken`, `Hussel.kiesSpelenden`, `Hussel.verdeelOverBanen`, `Hussel.kiesTeams`, `Hussel.scoorViertal`, `Hussel.bepaalLeners`.
- Produces: `Hussel.genereerRonde(invoer) -> ronde | null`, met
  `invoer = { aanwezigen, banen, historie, rustcorrectie, rng, pogingen }`. Alleen
  `aanwezigen` en `banen` zijn verplicht. De uitkomst is `null` wanneer er geen
  volledige baan te vullen is.

- [ ] **Step 1: Schrijf de falende tests**

Voeg toe aan het einde van `tests.js`:

```js
test('genereerRonde geeft null als er geen volledige baan te vullen is', function () {
  const uitkomst = Hussel.genereerRonde({
    aanwezigen: maakSpelers([3]),
    banen: 4,
    rng: Hussel.maakRng(1),
    pogingen: 5,
  });
  assertGelijk(uitkomst, null);
});

test('genereerRonde deelt iedere aanwezige precies één keer in', function () {
  const spelers = maakSpelers([6, 6, 6]);
  const ronde = Hussel.genereerRonde({
    aanwezigen: spelers,
    banen: 4,
    rng: Hussel.maakRng(11),
    pogingen: 20,
  });
  const ingedeeld = [];
  for (const baan of ronde.banen) {
    for (const id of baan.teamA.concat(baan.teamB)) ingedeeld.push(id);
  }
  for (const id of ronde.rustend) ingedeeld.push(id);
  assertGelijk(ingedeeld.length, spelers.length);
  assertGelijk(ingedeeld.slice().sort(), spelers.map(function (s) { return s.id; }).sort());
});

test('genereerRonde vult niet meer banen dan er plekken zijn', function () {
  const ronde = Hussel.genereerRonde({
    aanwezigen: maakSpelers([18]),
    banen: 3,
    rng: Hussel.maakRng(2),
    pogingen: 20,
  });
  assertGelijk(ronde.banen.length, 3);
  assertGelijk(ronde.rustend.length, 6);
  assertGelijk(ronde.banen.map(function (baan) { return baan.baan; }), [1, 2, 3]);
});

test('genereerRonde vult de baanbeschrijving met groepen, thuisgroep en leners', function () {
  const ronde = Hussel.genereerRonde({
    aanwezigen: maakSpelers([6, 6]),
    banen: 3,
    rng: Hussel.maakRng(4),
    pogingen: 20,
  });
  const breukvlak = ronde.banen[1];
  assertGelijk(breukvlak.groepen, [0, 1]);
  assertGelijk(breukvlak.thuisgroep, 0);
  assertGelijk(breukvlak.leners.length, 2);
  assertGelijk(ronde.banen[0].groepen, [0]);
  assertGelijk(ronde.banen[0].leners, []);
});

test('genereerRonde is reproduceerbaar bij hetzelfde zaad', function () {
  const spelers = maakSpelers([8, 8]);
  const eerste = Hussel.genereerRonde({ aanwezigen: spelers, banen: 4, rng: Hussel.maakRng(9), pogingen: 30 });
  const tweede = Hussel.genereerRonde({ aanwezigen: spelers, banen: 4, rng: Hussel.maakRng(9), pogingen: 30 });
  assertGelijk(eerste, tweede);
});

test('genereerRonde vermijdt het koppel dat vorige ronde samen speelde', function () {
  const spelers = maakSpelers([4]);
  const eerste = Hussel.genereerRonde({ aanwezigen: spelers, banen: 1, rng: Hussel.maakRng(6), pogingen: 30 });
  const tweede = Hussel.genereerRonde({
    aanwezigen: spelers,
    banen: 1,
    historie: [eerste],
    rng: Hussel.maakRng(6),
    pogingen: 30,
  });
  const eerdereKoppels = [
    Hussel.sleutel(eerste.banen[0].teamA[0], eerste.banen[0].teamA[1]),
    Hussel.sleutel(eerste.banen[0].teamB[0], eerste.banen[0].teamB[1]),
  ];
  const nieuweKoppels = [
    Hussel.sleutel(tweede.banen[0].teamA[0], tweede.banen[0].teamA[1]),
    Hussel.sleutel(tweede.banen[0].teamB[0], tweede.banen[0].teamB[1]),
  ];
  for (const koppel of nieuweKoppels) {
    assert(eerdereKoppels.indexOf(koppel) === -1, 'koppel ' + koppel + ' wordt herhaald');
  }
});
```

- [ ] **Step 2: Draai de tests en zie ze falen**

Run: `node test-node.js "genereerRonde"`
Expected: FOUT met `Hussel.genereerRonde is not a function`.

- [ ] **Step 3: Schrijf de implementatie**

Voeg in `hussel.js` toe, na `kiesTeams`:

```js
  function maakBaan(nummer, teams) {
    const viertal = teams.teamA.concat(teams.teamB);
    const verdeling = bepaalLeners(viertal);
    const groepen = [];
    for (const speler of viertal) {
      if (groepen.indexOf(speler.groep) === -1) groepen.push(speler.groep);
    }
    groepen.sort(function (a, b) { return a - b; });
    return {
      baan: nummer,
      teamA: teams.teamA.map(function (speler) { return speler.id; }),
      teamB: teams.teamB.map(function (speler) { return speler.id; }),
      thuisgroep: verdeling.thuisgroep,
      groepen: groepen,
      leners: verdeling.leners.map(function (speler) { return speler.id; }),
    };
  }

  function genereerRonde(invoer) {
    const aanwezigen = invoer.aanwezigen;
    const historie = invoer.historie === undefined ? [] : invoer.historie;
    const pogingen = Math.max(1, invoer.pogingen === undefined ? AANTAL_POGINGEN : invoer.pogingen);
    const rng = invoer.rng === undefined
      ? maakRng(Math.floor(Math.random() * 4294967296))
      : invoer.rng;

    const stat = maakHistorieStatistiek(historie, invoer.rustcorrectie);
    const plekken = aantalPlekken(aanwezigen.length, invoer.banen);
    if (plekken === 0) return null;

    let beste = null;
    let besteScore = Infinity;

    for (let poging = 0; poging < pogingen; poging += 1) {
      const keuze = kiesSpelenden(aanwezigen, plekken, stat, rng);
      const viertallen = verdeelOverBanen(keuze.spelend, rng);
      const teamsPerBaan = viertallen.map(function (viertal) { return kiesTeams(viertal, stat); });

      let score = 0;
      for (const teams of teamsPerBaan) {
        score += scoorViertal(teams.teamA, teams.teamB, stat);
      }

      if (score < besteScore) {
        besteScore = score;
        beste = { teamsPerBaan: teamsPerBaan, rustend: keuze.rustend };
      }
    }

    return {
      banen: beste.teamsPerBaan.map(function (teams, index) { return maakBaan(index + 1, teams); }),
      rustend: beste.rustend.map(function (speler) { return speler.id; }),
    };
  }
```

Vul het `globalThis.Hussel`-object aan met:

```js
    genereerRonde: genereerRonde,
```

- [ ] **Step 4: Draai de tests en zie ze slagen**

Run: `node test-node.js`
Expected: `33/33 geslaagd`.

- [ ] **Step 5: Commit**

```bash
git add hussel.js tests.js
git commit -m "Ronde genereren met scorend zoeken"
```

---

### Task 7: De eigenschapstests uit de spec

De zes eigenschappen die de spec als test benoemt, over hele avonden in plaats van losse rondes.

**Files:**
- Modify: `tests.js`

**Interfaces:**
- Consumes: `Hussel.genereerRonde`, `Hussel.maakRng`, `Hussel.aantalPlekken`.
- Produces: geen nieuwe API. Dit is een testtaak; `hussel.js` verandert alleen als een test een echt gebrek blootlegt.

- [ ] **Step 1: Schrijf de tests**

Voeg toe aan het einde van `tests.js`:

```js
function speelAvond(spelers, banen, aantalRondes, zaad) {
  const rondes = [];
  for (let i = 0; i < aantalRondes; i += 1) {
    const ronde = Hussel.genereerRonde({
      aanwezigen: spelers,
      banen: banen,
      historie: rondes,
      rng: Hussel.maakRng(zaad + i),
      pogingen: 50,
    });
    assert(ronde !== null, 'ronde ' + i + ' kon niet gemaakt worden');
    rondes.push(ronde);
  }
  return rondes;
}

function telRust(rondes, spelers) {
  const telling = {};
  for (const speler of spelers) telling[speler.id] = 0;
  for (const ronde of rondes) {
    for (const id of ronde.rustend) telling[id] += 1;
  }
  return telling;
}

test('eigenschap: iedere aanwezige staat per ronde precies één keer ingedeeld', function () {
  const spelers = maakSpelers([7, 7, 4]);
  const rondes = speelAvond(spelers, 4, 8, 100);
  for (const ronde of rondes) {
    const gezien = {};
    for (const baan of ronde.banen) {
      for (const id of baan.teamA.concat(baan.teamB)) {
        assert(gezien[id] === undefined, id + ' staat twee keer ingedeeld');
        gezien[id] = true;
      }
    }
    for (const id of ronde.rustend) {
      assert(gezien[id] === undefined, id + ' speelt en rust tegelijk');
      gezien[id] = true;
    }
    assertGelijk(Object.keys(gezien).length, spelers.length, 'niet iedereen is ingedeeld');
  }
});

test('eigenschap: over twintig rondes verschilt het aantal rustbeurten hooguit één', function () {
  const spelers = maakSpelers([18]);
  const rondes = speelAvond(spelers, 4, 20, 200);
  const telling = telRust(rondes, spelers);
  const waarden = Object.keys(telling).map(function (id) { return telling[id]; });
  const verschil = Math.max.apply(null, waarden) - Math.min.apply(null, waarden);
  assert(verschil <= 1, 'rustverschil is ' + verschil + ': ' + JSON.stringify(telling));
});

test('eigenschap: groepen die deelbaar zijn door vier blijven binnen één niveau', function () {
  const spelers = maakSpelers([8, 8]);
  const rondes = speelAvond(spelers, 4, 8, 300);
  for (const ronde of rondes) {
    for (const baan of ronde.banen) {
      assertGelijk(baan.groepen.length, 1, 'baan overspant meerdere niveaus: ' + JSON.stringify(baan.groepen));
    }
  }
});

test('eigenschap: een restgroep leent hooguit uit één naastliggend niveau', function () {
  const spelers = maakSpelers([6, 6]);
  const rondes = speelAvond(spelers, 3, 8, 400);
  for (const ronde of rondes) {
    for (const baan of ronde.banen) {
      const kloof = baan.groepen[baan.groepen.length - 1] - baan.groepen[0];
      assert(kloof <= 1, 'baan overspant een kloof van ' + kloof);
    }
  }
});

test('eigenschap: wie als lener op het breukvlak valt, rouleert', function () {
  const spelers = maakSpelers([6, 6]);
  const rondes = speelAvond(spelers, 3, 10, 500);
  const gezien = {};
  for (const ronde of rondes) {
    for (const baan of ronde.banen) {
      for (const id of baan.leners) gezien[id] = true;
    }
  }
  assert(Object.keys(gezien).length >= 4, 'slechts ' + Object.keys(gezien).length + ' spelers zijn ooit lener geweest');
});

test('eigenschap: vier tot veertig spelers bij één tot tien banen levert altijd een geldige ronde', function () {
  for (let aantalSpelers = 4; aantalSpelers <= 40; aantalSpelers += 1) {
    const spelers = [];
    for (let i = 0; i < aantalSpelers; i += 1) {
      spelers.push({ id: 'p' + i, naam: 'p' + i, groep: i % 3 });
    }
    for (let banen = 1; banen <= 10; banen += 1) {
      const ronde = Hussel.genereerRonde({
        aanwezigen: spelers,
        banen: banen,
        rng: Hussel.maakRng(aantalSpelers * 100 + banen),
        pogingen: 3,
      });
      const plekken = Hussel.aantalPlekken(aantalSpelers, banen);
      const omschrijving = aantalSpelers + ' spelers op ' + banen + ' banen';
      assert(ronde !== null, 'geen ronde bij ' + omschrijving);
      assertGelijk(ronde.banen.length, plekken / 4, 'verkeerd aantal banen bij ' + omschrijving);
      const ids = [];
      for (const baan of ronde.banen) {
        assertGelijk(baan.teamA.length, 2, 'teamA is geen tweetal bij ' + omschrijving);
        assertGelijk(baan.teamB.length, 2, 'teamB is geen tweetal bij ' + omschrijving);
        for (const id of baan.teamA.concat(baan.teamB)) ids.push(id);
      }
      for (const id of ronde.rustend) ids.push(id);
      assertGelijk(ids.length, aantalSpelers, 'niet iedereen ingedeeld bij ' + omschrijving);
      assertGelijk(new Set(ids).size, aantalSpelers, 'dubbele indeling bij ' + omschrijving);
    }
  }
});
```

- [ ] **Step 2: Draai de tests**

Run: `node test-node.js "eigenschap"`
Expected: `6/6 geslaagd`. Slaagt een van de eigenschappen niet, dan zit het gebrek in `hussel.js` en niet in de test: gebruik `superpowers:systematic-debugging` voordat je de test aanpast.

- [ ] **Step 3: Draai alles**

Run: `node test-node.js`
Expected: `39/39 geslaagd`.

- [ ] **Step 4: Commit**

```bash
git add tests.js
git commit -m "Eigenschapstests voor rustverdeling, niveaubehoud en lenerrotatie"
```

---

### Task 8: Overzicht van gespeelde rondes en rustbeurten

**Files:**
- Modify: `hussel.js`
- Modify: `tests.js`

**Interfaces:**
- Consumes: `Hussel.maakHistorieStatistiek`, `Hussel.aantal`.
- Produces: `Hussel.maakOverzicht(rondes, ids) -> Array<{ id, gespeeld, gerust }>` — de rustcorrectie telt hier bewust niet mee: het overzicht toont wat er werkelijk gespeeld en gerust is.

- [ ] **Step 1: Schrijf de falende tests**

Voeg toe aan het einde van `tests.js`:

```js
test('maakOverzicht telt gespeelde rondes en rustbeurten per speler', function () {
  const rondes = [
    maakTestRonde([maakTestBaan(1, ['a', 'b'], ['c', 'd'])], ['e']),
    maakTestRonde([maakTestBaan(1, ['a', 'c'], ['b', 'e'])], ['d']),
  ];
  const overzicht = Hussel.maakOverzicht(rondes, ['a', 'b', 'c', 'd', 'e']);
  assertGelijk(overzicht, [
    { id: 'a', gespeeld: 2, gerust: 0 },
    { id: 'b', gespeeld: 2, gerust: 0 },
    { id: 'c', gespeeld: 2, gerust: 0 },
    { id: 'd', gespeeld: 1, gerust: 1 },
    { id: 'e', gespeeld: 1, gerust: 1 },
  ]);
});

test('maakOverzicht toont een speler zonder rondes als nul', function () {
  const overzicht = Hussel.maakOverzicht([], ['a']);
  assertGelijk(overzicht, [{ id: 'a', gespeeld: 0, gerust: 0 }]);
});
```

- [ ] **Step 2: Draai de tests en zie ze falen**

Run: `node test-node.js "maakOverzicht"`
Expected: FOUT met `Hussel.maakOverzicht is not a function`.

- [ ] **Step 3: Schrijf de implementatie**

Voeg in `hussel.js` toe, na `genereerRonde`:

```js
  function maakOverzicht(rondes, ids) {
    const stat = maakHistorieStatistiek(rondes);
    const gespeeld = {};
    for (const ronde of rondes) {
      for (const baan of ronde.banen) {
        for (const id of baan.teamA.concat(baan.teamB)) {
          gespeeld[id] = aantal(gespeeld, id) + 1;
        }
      }
    }
    return ids.map(function (id) {
      return { id: id, gespeeld: aantal(gespeeld, id), gerust: aantal(stat.rust, id) };
    });
  }
```

Vul het `globalThis.Hussel`-object aan met:

```js
    maakOverzicht: maakOverzicht,
```

- [ ] **Step 4: Draai de tests en zie ze slagen**

Run: `node test-node.js`
Expected: `41/41 geslaagd`.

- [ ] **Step 5: Commit**

```bash
git add hussel.js tests.js
git commit -m "Overzicht van gespeelde rondes en rustbeurten"
```

---

### Task 9: Opslaglaag met terugval op geheugen

**Files:**
- Create: `opslag.js`
- Modify: `tests.js`
- Modify: `test-node.js`
- Modify: `test.html`

**Interfaces:**
- Consumes: niets.
- Produces:
  - `maakOpslag(store) -> opslag` — `store` mag `null` zijn of een object met `getItem`, `setItem` en `removeItem`.
  - `Opslag` — een `maakOpslag` op `localStorage`, of op geheugen als dat niet beschikbaar is.
  - Elke opslag biedt: `beschikbaar()`, `laadClub()`, `bewaarClub(club)`, `laadAvond()`, `bewaarAvond(avond)`, `wisAvond()`. De laadfuncties geven `null` als er niets bewaard is.

- [ ] **Step 1: Laad `opslag.js` in beide testrunners**

In `test-node.js`, vervang:

```js
const bestanden = ['hussel.js', 'tests.js'];
```

door:

```js
const bestanden = ['hussel.js', 'opslag.js', 'tests.js'];
```

In `test.html`, voeg tussen de regel met `hussel.js` en die met `tests.js` toe:

```html
<script src="opslag.js"></script>
```

- [ ] **Step 2: Schrijf de falende tests**

Voeg toe aan het einde van `tests.js`:

```js
function maakNepStore() {
  const data = {};
  return {
    data: data,
    getItem: function (sleutel) {
      return Object.prototype.hasOwnProperty.call(data, sleutel) ? data[sleutel] : null;
    },
    setItem: function (sleutel, waarde) { data[sleutel] = String(waarde); },
    removeItem: function (sleutel) { delete data[sleutel]; },
  };
}

function maakWeigerendeStore() {
  return {
    getItem: function () { throw new Error('geweigerd'); },
    setItem: function () { throw new Error('geweigerd'); },
    removeItem: function () { throw new Error('geweigerd'); },
  };
}

test('opslag bewaart en laadt de club', function () {
  const opslag = maakOpslag(maakNepStore());
  assertGelijk(opslag.laadClub(), null);
  opslag.bewaarClub({ groepen: ['A'], spelers: [{ id: 'x', naam: 'X', groep: 0 }] });
  assertGelijk(opslag.laadClub(), { groepen: ['A'], spelers: [{ id: 'x', naam: 'X', groep: 0 }] });
});

test('opslag bewaart, laadt en wist de avond', function () {
  const opslag = maakOpslag(maakNepStore());
  opslag.bewaarAvond({ aanwezigen: ['x'], banen: 2, rondes: [], rustcorrectie: {} });
  assertGelijk(opslag.laadAvond().banen, 2);
  opslag.wisAvond();
  assertGelijk(opslag.laadAvond(), null);
});

test('opslag overleeft een nieuwe opslag op dezelfde store', function () {
  const store = maakNepStore();
  maakOpslag(store).bewaarClub({ groepen: ['A'], spelers: [] });
  assertGelijk(maakOpslag(store).laadClub(), { groepen: ['A'], spelers: [] });
});

test('opslag valt terug op geheugen als de store weigert', function () {
  const opslag = maakOpslag(maakWeigerendeStore());
  assertGelijk(opslag.beschikbaar(), false);
  opslag.bewaarClub({ groepen: ['A'], spelers: [] });
  assertGelijk(opslag.laadClub(), { groepen: ['A'], spelers: [] });
});

test('opslag zonder store meldt zich als niet beschikbaar', function () {
  const opslag = maakOpslag(null);
  assertGelijk(opslag.beschikbaar(), false);
  opslag.bewaarAvond({ banen: 3 });
  assertGelijk(opslag.laadAvond().banen, 3);
});

test('opslag geeft null bij beschadigde inhoud', function () {
  const store = maakNepStore();
  store.data['hussel.club'] = '{geen geldige json';
  assertGelijk(maakOpslag(store).laadClub(), null);
});
```

- [ ] **Step 3: Draai de tests en zie ze falen**

Run: `node test-node.js "opslag"`
Expected: FOUT met `maakOpslag is not defined`.

- [ ] **Step 4: Schrijf de implementatie**

Maak `opslag.js`:

```js
(function () {
  'use strict';

  const SLEUTEL_CLUB = 'hussel.club';
  const SLEUTEL_AVOND = 'hussel.avond';
  const SLEUTEL_PROEF = 'hussel.proef';

  function maakOpslag(store) {
    const geheugen = {};
    let werkt = false;

    if (store) {
      try {
        store.setItem(SLEUTEL_PROEF, '1');
        store.removeItem(SLEUTEL_PROEF);
        werkt = true;
      } catch (fout) {
        werkt = false;
      }
    }

    function schrijf(sleutel, waarde) {
      const tekst = JSON.stringify(waarde);
      geheugen[sleutel] = tekst;
      if (!werkt) return;
      try {
        store.setItem(sleutel, tekst);
      } catch (fout) {
        werkt = false;
      }
    }

    function lees(sleutel) {
      let tekst = geheugen[sleutel];
      if (tekst === undefined && werkt) {
        try {
          const opgeslagen = store.getItem(sleutel);
          if (opgeslagen !== null) tekst = opgeslagen;
        } catch (fout) {
          werkt = false;
        }
      }
      if (tekst === undefined) return null;
      try {
        return JSON.parse(tekst);
      } catch (fout) {
        return null;
      }
    }

    function wis(sleutel) {
      delete geheugen[sleutel];
      if (!werkt) return;
      try {
        store.removeItem(sleutel);
      } catch (fout) {
        werkt = false;
      }
    }

    return {
      beschikbaar: function () { return werkt; },
      laadClub: function () { return lees(SLEUTEL_CLUB); },
      bewaarClub: function (club) { schrijf(SLEUTEL_CLUB, club); },
      laadAvond: function () { return lees(SLEUTEL_AVOND); },
      bewaarAvond: function (avond) { schrijf(SLEUTEL_AVOND, avond); },
      wisAvond: function () { wis(SLEUTEL_AVOND); },
    };
  }

  globalThis.maakOpslag = maakOpslag;
  globalThis.Opslag = maakOpslag(typeof localStorage === 'undefined' ? null : localStorage);
})();
```

- [ ] **Step 5: Draai de tests en zie ze slagen**

Run: `node test-node.js`
Expected: `47/47 geslaagd`.

- [ ] **Step 6: Commit**

```bash
git add opslag.js tests.js test-node.js test.html
git commit -m "Opslaglaag met terugval op geheugen"
```

---

### Task 10: Casco van de app

Markup, opmaak, gedeelde toestand en navigatie. Na deze taak opent de app met een lege inhoud en een werkende navigatiebalk, en herstelt hij een bewaarde avond na het verversen van de pagina.

**Files:**
- Create: `index.html`
- Create: `stijl.css`
- Create: `app.js`

**Interfaces:**
- Consumes: `Hussel`, `Opslag`.
- Produces: `App` op `window`, met:
  - `App.club` — `{ groepen: Array<string>, spelers: Array<speler> }`.
  - `App.avond` — `null` of `{ aanwezigen, banen, rondes, rustcorrectie }`.
  - `App.bewaarClub()`, `App.bewaarAvond()`.
  - `App.spelerOp(id) -> speler | null`.
  - `App.aanwezigeSpelers() -> Array<speler>` — de aanwezigen van de lopende avond als spelerobjecten.
  - `App.toonScherm(naam)` — naam is `'spelers'`, `'avond'`, `'ronde'` of `'overzicht'`.
  - `App.waarschuw(tekst)` — lege tekst verbergt de balk.
  - `App.nieuwId() -> string`.
- De schermbestanden uit taak 11 tot en met 15 leveren elk een object op `window` met een `render()`-functie: `SchermSpelers`, `SchermAvond`, `SchermRonde`, `SchermOverzicht`. `App.toonScherm` roept `render()` aan als het bestand geladen is en doet niets als het ontbreekt.

- [ ] **Step 1: Maak de markup**

Maak `index.html`:

```html
<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pickleball hussel systeem</title>
<link rel="stylesheet" href="stijl.css">
</head>
<body>
<header>
  <h1>Hussel</h1>
  <nav>
    <button type="button" data-scherm="spelers">Spelers</button>
    <button type="button" data-scherm="avond">Avond</button>
    <button type="button" data-scherm="ronde">Ronde</button>
    <button type="button" data-scherm="overzicht">Overzicht</button>
  </nav>
</header>
<p id="waarschuwing" hidden></p>
<main></main>
<script src="hussel.js"></script>
<script src="opslag.js"></script>
<script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Maak de opmaak**

Maak `stijl.css`:

```css
:root {
  --rand: #d6d8dc;
  --accent: #17603a;
  --waarschuwing: #8a5300;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font: 17px/1.5 system-ui, -apple-system, sans-serif;
  color: #1b1d21;
  background: #f7f7f8;
}

header {
  padding: 0.75rem 1rem;
  background: #fff;
  border-bottom: 1px solid var(--rand);
}

header h1 { margin: 0 0 0.5rem; font-size: 1.3rem; }

nav { display: flex; flex-wrap: wrap; gap: 0.5rem; }

button {
  font: inherit;
  padding: 0.6rem 0.9rem;
  border: 1px solid var(--rand);
  border-radius: 0.4rem;
  background: #fff;
  cursor: pointer;
}

button.actief { background: var(--accent); border-color: var(--accent); color: #fff; }

main { padding: 1rem; max-width: 60rem; margin: 0 auto; }

h2 { margin-top: 0; }

#waarschuwing {
  margin: 0;
  padding: 0.75rem 1rem;
  background: #fff4e0;
  color: var(--waarschuwing);
  border-bottom: 1px solid #f0dcb4;
}

input, select {
  font: inherit;
  padding: 0.5rem;
  border: 1px solid var(--rand);
  border-radius: 0.4rem;
  background: #fff;
}

form { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.75rem 0 1.5rem; }

table { width: 100%; border-collapse: collapse; background: #fff; }

th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid var(--rand); }

ul, ol { padding-left: 1.25rem; }

li { margin-bottom: 0.4rem; }
```

- [ ] **Step 3: Maak de gedeelde toestand en navigatie**

Maak `app.js`:

```js
(function () {
  'use strict';

  const STANDAARD_GROEPEN = ['Gevorderd', 'Midden', 'Beginner'];

  const App = {
    club: { groepen: STANDAARD_GROEPEN.slice(), spelers: [] },
    avond: null,

    bewaarClub: function () {
      Opslag.bewaarClub(this.club);
    },

    bewaarAvond: function () {
      if (this.avond) Opslag.bewaarAvond(this.avond);
      else Opslag.wisAvond();
    },

    spelerOp: function (id) {
      for (const speler of this.club.spelers) {
        if (speler.id === id) return speler;
      }
      return null;
    },

    aanwezigeSpelers: function () {
      if (!this.avond) return [];
      const spelers = [];
      for (const id of this.avond.aanwezigen) {
        const speler = this.spelerOp(id);
        if (speler) spelers.push(speler);
      }
      return spelers;
    },

    toonScherm: function (naam) {
      for (const sectie of document.querySelectorAll('main > section')) {
        sectie.hidden = sectie.id !== 'scherm-' + naam;
      }
      for (const knop of document.querySelectorAll('nav button')) {
        knop.classList.toggle('actief', knop.dataset.scherm === naam);
      }
      const schermen = {
        spelers: window.SchermSpelers,
        avond: window.SchermAvond,
        ronde: window.SchermRonde,
        overzicht: window.SchermOverzicht,
      };
      const scherm = schermen[naam];
      if (scherm && scherm.render) scherm.render();
    },

    waarschuw: function (tekst) {
      const balk = document.getElementById('waarschuwing');
      balk.textContent = tekst;
      balk.hidden = !tekst;
    },

    nieuwId: function () {
      return 's' + Date.now().toString(36) + Math.floor(Math.random() * 1000000).toString(36);
    },

    start: function () {
      const bewaardeClub = Opslag.laadClub();
      if (bewaardeClub && bewaardeClub.groepen && bewaardeClub.spelers) {
        this.club = bewaardeClub;
      }
      this.avond = Opslag.laadAvond();

      if (!Opslag.beschikbaar()) {
        this.waarschuw('De browser bewaart niets. De avond werkt door, maar gaat verloren als je de pagina sluit.');
      }

      for (const knop of document.querySelectorAll('nav button')) {
        knop.addEventListener('click', function () {
          App.toonScherm(knop.dataset.scherm);
        });
      }

      this.toonScherm(this.avond && this.avond.rondes.length ? 'ronde' : 'spelers');
    },
  };

  window.App = App;
  window.addEventListener('DOMContentLoaded', function () { App.start(); });
})();
```

- [ ] **Step 4: Controleer in de browser**

Run: `open index.html`

Verwacht:
- De kop "Hussel" met vier knoppen: Spelers, Avond, Ronde, Overzicht.
- De knop Spelers is groen gemarkeerd; de inhoud eronder is leeg.
- Op elke andere knop klikken verplaatst de groene markering; er verschijnt geen foutmelding.
- In de console van de browser (`Weergave → Ontwikkelaar → JavaScript-console`) staan geen fouten.

- [ ] **Step 5: Commit**

```bash
git add index.html stijl.css app.js
git commit -m "Casco van de app met navigatie en herstel van een bewaarde avond"
```

---

### Task 11: Scherm voor spelers en groepen

**Files:**
- Create: `scherm-spelers.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: `App.club`, `App.bewaarClub`, `App.waarschuw`, `App.nieuwId`, `App.avond`, `App.bewaarAvond`.
- Produces: `window.SchermSpelers` met `render()`, en `vulGroepKeuze(keuzeElement, geselecteerdeIndex)` die ook door taak 12 gebruikt mag worden.

- [ ] **Step 1: Voeg de markup toe**

In `index.html`, vervang `<main></main>` door:

```html
<main>
  <section id="scherm-spelers" hidden>
    <h2>Spelers en groepen</h2>

    <h3>Groepen, van sterk naar zwak</h3>
    <ol id="groepen-lijst"></ol>
    <form id="groep-toevoegen">
      <input type="text" id="groep-naam" placeholder="Naam van de groep" required>
      <button type="submit">Groep toevoegen</button>
    </form>

    <h3>Spelers</h3>
    <table id="spelers-tabel">
      <thead><tr><th>Naam</th><th>Groep</th><th></th></tr></thead>
      <tbody></tbody>
    </table>
    <form id="speler-toevoegen">
      <input type="text" id="nieuwe-speler-naam" placeholder="Naam van de speler" required>
      <select id="nieuwe-speler-groep"></select>
      <button type="submit">Speler toevoegen</button>
    </form>
  </section>
</main>
```

En voeg vóór de regel met `app.js` toe:

```html
<script src="scherm-spelers.js"></script>
```

- [ ] **Step 2: Schrijf het scherm**

Maak `scherm-spelers.js`:

```js
(function () {
  'use strict';

  const SchermSpelers = {
    render: function () {
      this.renderGroepen();
      this.vulGroepKeuze(document.getElementById('nieuwe-speler-groep'), 0);
      this.renderSpelers();
    },

    knop: function (tekst, bijKlik) {
      const knop = document.createElement('button');
      knop.type = 'button';
      knop.textContent = tekst;
      knop.addEventListener('click', bijKlik);
      return knop;
    },

    vulGroepKeuze: function (keuze, geselecteerd) {
      keuze.textContent = '';
      App.club.groepen.forEach(function (naam, index) {
        const optie = document.createElement('option');
        optie.value = String(index);
        optie.textContent = naam;
        if (index === geselecteerd) optie.selected = true;
        keuze.appendChild(optie);
      });
    },

    renderGroepen: function () {
      const lijst = document.getElementById('groepen-lijst');
      const scherm = this;
      lijst.textContent = '';
      App.club.groepen.forEach(function (naam, index) {
        const item = document.createElement('li');
        const label = document.createElement('span');
        label.textContent = naam + ' ';
        item.appendChild(label);
        item.appendChild(scherm.knop('Omhoog', function () { scherm.verplaatsGroep(index, -1); }));
        item.appendChild(scherm.knop('Omlaag', function () { scherm.verplaatsGroep(index, 1); }));
        item.appendChild(scherm.knop('Verwijder', function () { scherm.verwijderGroep(index); }));
        lijst.appendChild(item);
      });
    },

    gesorteerdeSpelers: function () {
      return App.club.spelers.slice().sort(function (a, b) {
        if (a.groep !== b.groep) return a.groep - b.groep;
        return a.naam.localeCompare(b.naam, 'nl');
      });
    },

    renderSpelers: function () {
      const lichaam = document.querySelector('#spelers-tabel tbody');
      const scherm = this;
      lichaam.textContent = '';
      for (const speler of this.gesorteerdeSpelers()) {
        const rij = document.createElement('tr');

        const naamCel = document.createElement('td');
        naamCel.textContent = speler.naam;

        const groepCel = document.createElement('td');
        const keuze = document.createElement('select');
        this.vulGroepKeuze(keuze, speler.groep);
        keuze.addEventListener('change', function () {
          speler.groep = Number(keuze.value);
          App.bewaarClub();
          scherm.renderSpelers();
        });
        groepCel.appendChild(keuze);

        const actieCel = document.createElement('td');
        actieCel.appendChild(this.knop('Verwijder', function () { scherm.verwijderSpeler(speler.id); }));

        rij.appendChild(naamCel);
        rij.appendChild(groepCel);
        rij.appendChild(actieCel);
        lichaam.appendChild(rij);
      }
    },

    verplaatsGroep: function (index, richting) {
      const doel = index + richting;
      if (doel < 0 || doel >= App.club.groepen.length) return;
      const groepen = App.club.groepen;
      const tussen = groepen[index];
      groepen[index] = groepen[doel];
      groepen[doel] = tussen;
      for (const speler of App.club.spelers) {
        if (speler.groep === index) speler.groep = doel;
        else if (speler.groep === doel) speler.groep = index;
      }
      App.bewaarClub();
      this.render();
    },

    verwijderGroep: function (index) {
      if (App.club.groepen.length === 1) {
        App.waarschuw('Er moet minstens één groep overblijven.');
        return;
      }
      for (const speler of App.club.spelers) {
        if (speler.groep === index) {
          App.waarschuw('Deze groep heeft nog spelers. Zet die eerst in een andere groep.');
          return;
        }
      }
      App.club.groepen.splice(index, 1);
      for (const speler of App.club.spelers) {
        if (speler.groep > index) speler.groep -= 1;
      }
      App.waarschuw('');
      App.bewaarClub();
      this.render();
    },

    verwijderSpeler: function (id) {
      if (App.avond && App.avond.aanwezigen.indexOf(id) !== -1) {
        App.avond.aanwezigen = App.avond.aanwezigen.filter(function (a) { return a !== id; });
        App.bewaarAvond();
        App.waarschuw('Deze speler deed mee aan de lopende avond. De gespeelde rondes blijven staan; vanaf de volgende ronde doet hij niet meer mee.');
      }
      App.club.spelers = App.club.spelers.filter(function (s) { return s.id !== id; });
      App.bewaarClub();
      this.renderSpelers();
    },
  };

  window.SchermSpelers = SchermSpelers;

  window.addEventListener('DOMContentLoaded', function () {
    document.getElementById('groep-toevoegen').addEventListener('submit', function (gebeurtenis) {
      gebeurtenis.preventDefault();
      const veld = document.getElementById('groep-naam');
      const naam = veld.value.trim();
      if (!naam) return;
      App.club.groepen.push(naam);
      App.bewaarClub();
      veld.value = '';
      SchermSpelers.render();
    });

    document.getElementById('speler-toevoegen').addEventListener('submit', function (gebeurtenis) {
      gebeurtenis.preventDefault();
      const veld = document.getElementById('nieuwe-speler-naam');
      const naam = veld.value.trim();
      if (!naam) return;
      App.club.spelers.push({
        id: App.nieuwId(),
        naam: naam,
        groep: Number(document.getElementById('nieuwe-speler-groep').value),
      });
      App.bewaarClub();
      veld.value = '';
      SchermSpelers.render();
    });
  });
})();
```

- [ ] **Step 3: Controleer in de browser**

Run: `open index.html`

Verwacht:
- Onder "Groepen" staan Gevorderd, Midden en Beginner, elk met de knoppen Omhoog, Omlaag en Verwijder.
- Een speler toevoegen zet hem in de tabel, gesorteerd op groep en daarbinnen op naam.
- De groep van een speler wijzigen met het keuzemenu verplaatst hem meteen in de tabel.
- "Verwijder" bij een groep die nog spelers heeft, toont de melding dat die eerst verplaatst moeten worden.
- De laatste groep verwijderen toont de melding dat er één groep moet overblijven.
- Na het verversen van de pagina staan de groepen en spelers er nog.

- [ ] **Step 4: Commit**

```bash
git add scherm-spelers.js index.html
git commit -m "Scherm voor spelers- en groepsbeheer"
```

---

### Task 12: Avond starten en afsluiten

**Files:**
- Create: `scherm-avond.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: `App.club`, `App.avond`, `App.bewaarAvond`, `App.waarschuw`, `App.toonScherm`, `Hussel.aantalPlekken`, `Opslag.wisAvond`.
- Produces: `window.SchermAvond` met `render()`, `renderAanwezigheid()`, `renderTeller()`, `geselecteerdeIds()` en `bijWijziging(id, aanwezig)`. Taak 14 vervangt `bijWijziging` door de versie die laatkomers en afhakers verwerkt.

- [ ] **Step 1: Voeg de markup toe**

In `index.html`, voeg direct na `</section>` van `scherm-spelers` toe:

```html
  <section id="scherm-avond" hidden>
    <h2>Avond</h2>
    <p>
      <label>Aantal banen <input type="number" id="aantal-banen" min="1" max="20" value="4"></label>
    </p>
    <p id="avond-teller"></p>
    <ul id="aanwezigheid-lijst"></ul>
    <p>
      <button type="button" id="start-avond">Avond starten</button>
      <button type="button" id="stop-avond">Avond afsluiten</button>
    </p>
  </section>
```

En voeg vóór de regel met `app.js` toe:

```html
<script src="scherm-avond.js"></script>
```

- [ ] **Step 2: Schrijf het scherm**

Maak `scherm-avond.js`:

```js
(function () {
  'use strict';

  const SchermAvond = {
    render: function () {
      if (App.avond) {
        document.getElementById('aantal-banen').value = String(App.avond.banen);
      }
      this.renderAanwezigheid();
      this.renderTeller();
      document.getElementById('start-avond').hidden = Boolean(App.avond);
      document.getElementById('stop-avond').hidden = !App.avond;
    },

    geselecteerdeIds: function () {
      const vinkjes = document.querySelectorAll('#aanwezigheid-lijst input:checked');
      return Array.prototype.map.call(vinkjes, function (vinkje) { return vinkje.value; });
    },

    renderAanwezigheid: function () {
      const lijst = document.getElementById('aanwezigheid-lijst');
      const scherm = this;
      const aangevinkt = {};
      const bronnen = App.avond ? App.avond.aanwezigen : this.geselecteerdeIds();
      for (const id of bronnen) aangevinkt[id] = true;

      lijst.textContent = '';
      const gesorteerd = App.club.spelers.slice().sort(function (a, b) {
        if (a.groep !== b.groep) return a.groep - b.groep;
        return a.naam.localeCompare(b.naam, 'nl');
      });

      for (const speler of gesorteerd) {
        const item = document.createElement('li');
        const label = document.createElement('label');
        const vinkje = document.createElement('input');
        vinkje.type = 'checkbox';
        vinkje.value = speler.id;
        vinkje.checked = aangevinkt[speler.id] === true;
        vinkje.disabled = Boolean(App.avond);
        vinkje.addEventListener('change', function () {
          scherm.bijWijziging(speler.id, vinkje.checked);
        });
        label.appendChild(vinkje);
        label.appendChild(document.createTextNode(' ' + speler.naam + ' — ' + App.club.groepen[speler.groep]));
        item.appendChild(label);
        lijst.appendChild(item);
      }
    },

    bijWijziging: function (id, aanwezig) {
      this.renderTeller();
    },

    renderTeller: function () {
      const banen = Number(document.getElementById('aantal-banen').value) || 0;
      const aanwezig = App.avond ? App.avond.aanwezigen.length : this.geselecteerdeIds().length;
      const plekken = Hussel.aantalPlekken(aanwezig, banen);
      const teller = document.getElementById('avond-teller');
      if (aanwezig < 4) {
        teller.textContent = aanwezig + ' aanwezig. Er zijn minstens vier spelers nodig.';
      } else {
        teller.textContent = aanwezig + ' aanwezig: ' + plekken + ' spelen, '
          + (aanwezig - plekken) + ' rusten, ' + (plekken / 4) + ' van de ' + banen + ' banen in gebruik.';
      }
    },
  };

  window.SchermAvond = SchermAvond;

  window.addEventListener('DOMContentLoaded', function () {
    document.getElementById('aantal-banen').addEventListener('input', function () {
      if (App.avond) {
        App.avond.banen = Number(document.getElementById('aantal-banen').value) || 1;
        App.bewaarAvond();
      }
      SchermAvond.renderTeller();
    });

    document.getElementById('start-avond').addEventListener('click', function () {
      const aanwezigen = SchermAvond.geselecteerdeIds();
      const banen = Number(document.getElementById('aantal-banen').value) || 0;
      if (aanwezigen.length < 4) {
        App.waarschuw('Er zijn minstens vier aanwezige spelers nodig.');
        return;
      }
      if (banen < 1) {
        App.waarschuw('Er is minstens één baan nodig.');
        return;
      }
      App.waarschuw('');
      App.avond = { aanwezigen: aanwezigen, banen: banen, rondes: [], rustcorrectie: {} };
      App.bewaarAvond();
      App.toonScherm('ronde');
    });

    document.getElementById('stop-avond').addEventListener('click', function () {
      if (!window.confirm('Avond afsluiten? De rondes van vanavond worden gewist.')) return;
      App.avond = null;
      Opslag.wisAvond();
      App.waarschuw('');
      App.toonScherm('avond');
    });
  });
})();
```

- [ ] **Step 3: Controleer in de browser**

Run: `open index.html`

Verwacht:
- Voeg op het spelersscherm acht spelers toe, verdeeld over twee groepen. Ga naar Avond.
- Alle spelers staan met een vinkje, gegroepeerd op niveau. "Avond afsluiten" is onzichtbaar.
- Drie spelers aanvinken toont "3 aanwezig. Er zijn minstens vier spelers nodig."
- Acht spelers aanvinken bij 4 banen toont "8 aanwezig: 8 spelen, 0 rusten, 2 van de 4 banen in gebruik."
- Op "Avond starten" klikken springt naar het ronde-scherm. Dat is nog leeg; taak 13 vult het.
- Terug op Avond zijn de vinkjes nu grijs en onaanpasbaar, en is "Avond starten" vervangen door "Avond afsluiten". Taak 14 maakt de vinkjes tijdens de avond weer bruikbaar.
- "Avond afsluiten" vraagt om bevestiging en zet het scherm terug in de begintoestand.
- Met minder dan vier aangevinkte spelers op "Avond starten" klikken toont de melding over vier spelers.

- [ ] **Step 4: Commit**

```bash
git add scherm-avond.js index.html
git commit -m "Avond starten en afsluiten"
```

---

### Task 13: Het ronde-scherm

**Files:**
- Create: `scherm-ronde.js`
- Modify: `index.html`
- Modify: `stijl.css`

**Interfaces:**
- Consumes: `App.avond`, `App.club.groepen`, `App.spelerOp`, `App.aanwezigeSpelers`, `App.bewaarAvond`, `App.waarschuw`, `App.toonScherm`, `Hussel.genereerRonde`.
- Produces: `window.SchermRonde` met `render()`, `huidigeRonde()` en `genereer(vervangHuidige)`.

- [ ] **Step 1: Voeg de markup toe**

In `index.html`, voeg direct na `</section>` van `scherm-avond` toe:

```html
  <section id="scherm-ronde" hidden>
    <h2>Ronde <span id="ronde-nummer"></span></h2>
    <div id="banen"></div>
    <p id="rustend"></p>
    <p>
      <button type="button" id="volgende-ronde">Volgende ronde</button>
      <button type="button" id="opnieuw-genereren">Opnieuw genereren</button>
      <button type="button" id="naar-avond">Spelers aanpassen</button>
      <button type="button" id="naar-afsluiten">Avond afsluiten</button>
    </p>
  </section>
```

De laatste twee knoppen zijn snelkoppelingen naar het avondscherm, waar het
aanpassen en afsluiten gebeurt. De spec noemt ze op het ronde-scherm omdat je
daar de hele avond staat; ze krijgen hier geen eigen logica.

En voeg vóór de regel met `app.js` toe:

```html
<script src="scherm-ronde.js"></script>
```

- [ ] **Step 2: Voeg de opmaak voor de baankaarten toe**

Voeg aan het einde van `stijl.css` toe:

```css
#banen {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
}

.baan {
  background: #fff;
  border: 1px solid var(--rand);
  border-radius: 0.5rem;
  padding: 0.9rem;
  text-align: center;
}

.baan h3 { margin: 0; font-size: 1.1rem; }

.baan .niveau { margin: 0.1rem 0 0.7rem; color: #6a6e76; font-size: 0.9rem; }

.baan .team { margin: 0; font-size: 1.25rem; font-weight: 600; }

.baan .tegen { margin: 0.2rem 0; color: #6a6e76; font-size: 0.85rem; }

#rustend { font-size: 1.05rem; }
```

- [ ] **Step 3: Schrijf het scherm**

Maak `scherm-ronde.js`:

```js
(function () {
  'use strict';

  const SchermRonde = {
    huidigeRonde: function () {
      if (!App.avond || App.avond.rondes.length === 0) return null;
      return App.avond.rondes[App.avond.rondes.length - 1];
    },

    naam: function (id) {
      const speler = App.spelerOp(id);
      return speler ? speler.naam : 'onbekend';
    },

    render: function () {
      if (!App.avond) {
        App.waarschuw('Start eerst een avond.');
        App.toonScherm('avond');
        return;
      }
      if (App.avond.rondes.length === 0) this.genereer(false);

      const ronde = this.huidigeRonde();
      document.getElementById('ronde-nummer').textContent = ronde ? String(App.avond.rondes.length) : '';
      this.renderBanen(ronde);
      this.renderRustend(ronde);
    },

    renderBanen: function (ronde) {
      const houder = document.getElementById('banen');
      const scherm = this;
      houder.textContent = '';
      if (!ronde) return;

      for (const baan of ronde.banen) {
        const kaart = document.createElement('article');
        kaart.className = 'baan';

        const kop = document.createElement('h3');
        kop.textContent = 'Baan ' + baan.baan;

        const niveau = document.createElement('p');
        niveau.className = 'niveau';
        niveau.textContent = baan.groepen.map(function (groep) {
          return App.club.groepen[groep];
        }).join(' + ');

        const teamA = document.createElement('p');
        teamA.className = 'team';
        teamA.textContent = baan.teamA.map(function (id) { return scherm.naam(id); }).join(' & ');

        const tegen = document.createElement('p');
        tegen.className = 'tegen';
        tegen.textContent = 'tegen';

        const teamB = document.createElement('p');
        teamB.className = 'team';
        teamB.textContent = baan.teamB.map(function (id) { return scherm.naam(id); }).join(' & ');

        kaart.appendChild(kop);
        kaart.appendChild(niveau);
        kaart.appendChild(teamA);
        kaart.appendChild(tegen);
        kaart.appendChild(teamB);
        houder.appendChild(kaart);
      }
    },

    renderRustend: function (ronde) {
      const regel = document.getElementById('rustend');
      const scherm = this;
      if (!ronde || ronde.rustend.length === 0) {
        regel.textContent = 'Deze ronde rust niemand.';
        return;
      }
      regel.textContent = 'Rust deze ronde: ' + ronde.rustend.map(function (id) {
        return scherm.naam(id);
      }).join(', ');
    },

    // vervangHuidige: true laat de zichtbare ronde opnieuw loten in plaats
    // van er een volgende achter te zetten.
    genereer: function (vervangHuidige) {
      const aanwezigen = App.aanwezigeSpelers();
      if (aanwezigen.length < 4) {
        App.waarschuw('Er zijn minstens vier aanwezige spelers nodig.');
        return;
      }
      const historie = vervangHuidige ? App.avond.rondes.slice(0, -1) : App.avond.rondes;
      const ronde = Hussel.genereerRonde({
        aanwezigen: aanwezigen,
        banen: App.avond.banen,
        historie: historie,
        rustcorrectie: App.avond.rustcorrectie,
      });
      if (!ronde) {
        App.waarschuw('Met dit aantal spelers en banen is er geen volledige baan te vullen.');
        return;
      }
      App.avond.rondes = historie.concat([ronde]);
      App.bewaarAvond();
      App.waarschuw('');
    },
  };

  window.SchermRonde = SchermRonde;

  window.addEventListener('DOMContentLoaded', function () {
    document.getElementById('volgende-ronde').addEventListener('click', function () {
      SchermRonde.genereer(false);
      SchermRonde.render();
    });
    document.getElementById('opnieuw-genereren').addEventListener('click', function () {
      SchermRonde.genereer(true);
      SchermRonde.render();
    });
    document.getElementById('naar-avond').addEventListener('click', function () {
      App.toonScherm('avond');
    });
    document.getElementById('naar-afsluiten').addEventListener('click', function () {
      App.toonScherm('avond');
      document.getElementById('stop-avond').scrollIntoView({ block: 'center' });
    });
  });
})();
```

- [ ] **Step 4: Controleer in de browser**

Run: `open index.html`

Verwacht:
- Voeg elf spelers toe, verdeeld over twee groepen, vink ze allemaal aan bij 2 banen en start de avond.
- Het ronde-scherm toont "Ronde 1" met twee baankaarten, elk met twee namen, het woord "tegen" en twee namen, en de groepsnaam eronder.
- Onder de kaarten staat "Rust deze ronde:" met drie namen.
- "Volgende ronde" toont "Ronde 2" met andere koppels en drie andere rustende spelers.
- "Opnieuw genereren" houdt het rondenummer gelijk en verandert de indeling.
- "Spelers aanpassen" en "Avond afsluiten" brengen je naar het avondscherm.
- Na tien rondes verschilt het aantal rustbeurten per speler hooguit één; dat is in taak 15 af te lezen.
- De pagina verversen brengt dezelfde ronde terug.

- [ ] **Step 5: Commit**

```bash
git add scherm-ronde.js index.html stijl.css
git commit -m "Ronde-scherm met baankaarten"
```

---

### Task 14: Aanwezigheid aanpassen tijdens de avond

Een laatkomer aanvinken of een afhaker uitvinken terwijl de avond loopt. De lopende ronde blijft ongewijzigd; de wijziging geldt vanaf de volgende ronde.

Een laatkomer krijgt het hoogste rustsaldo dat op dat moment onder de aanwezigen voorkomt. Zonder die correctie zou hij op nul staan, en omdat de speler met het hóógste rustsaldo als eerste mag spelen, zou de laatkomer juist als eerste moeten rusten.

**Files:**
- Modify: `scherm-avond.js`

**Interfaces:**
- Consumes: `Hussel.maakHistorieStatistiek`, `Hussel.hoogsteRustsaldo`, `App.avond`, `App.bewaarAvond`, `App.spelerOp`, `App.waarschuw`.
- Produces: `SchermAvond.voegLaatkomerToe(id)` en `SchermAvond.verwijderAfhaker(id)`; `SchermAvond.bijWijziging` verwijst voortaan naar die twee.

- [ ] **Step 1: Maak de vinkjes tijdens de avond weer bruikbaar**

In `scherm-avond.js`, verwijder in `renderAanwezigheid` de regel:

```js
        vinkje.disabled = Boolean(App.avond);
```

- [ ] **Step 2: Vervang `bijWijziging`**

In `scherm-avond.js`, vervang:

```js
    bijWijziging: function (id, aanwezig) {
      this.renderTeller();
    },
```

door:

```js
    bijWijziging: function (id, aanwezig) {
      if (App.avond) {
        if (aanwezig) this.voegLaatkomerToe(id);
        else this.verwijderAfhaker(id);
      }
      this.renderTeller();
    },

    // Een laatkomer staat op nul rustbeurten en zou daarmee als eerste
    // moeten rusten. Het hoogste saldo onder de aanwezigen laat hem meteen
    // meedraaien in de rotatie.
    voegLaatkomerToe: function (id) {
      if (App.avond.aanwezigen.indexOf(id) !== -1) return;
      const stat = Hussel.maakHistorieStatistiek(App.avond.rondes, App.avond.rustcorrectie);
      App.avond.rustcorrectie[id] = Hussel.hoogsteRustsaldo(stat, App.avond.aanwezigen);
      App.avond.aanwezigen.push(id);
      App.bewaarAvond();
      const speler = App.spelerOp(id);
      App.waarschuw((speler ? speler.naam : 'De speler') + ' doet mee vanaf de volgende ronde.');
    },

    verwijderAfhaker: function (id) {
      App.avond.aanwezigen = App.avond.aanwezigen.filter(function (a) { return a !== id; });
      App.bewaarAvond();
      const speler = App.spelerOp(id);
      App.waarschuw((speler ? speler.naam : 'De speler')
        + ' doet niet meer mee. De lopende ronde blijft staan; de wijziging geldt vanaf de volgende ronde.');
    },
```

- [ ] **Step 3: Controleer in de browser**

Run: `open index.html`

Verwacht:
- Start een avond met twaalf spelers op 2 banen en speel vijf rondes.
- Ga naar Avond. De vinkjes zijn nu aanpasbaar.
- Vink een dertiende speler aan. Er verschijnt "… doet mee vanaf de volgende ronde." De teller telt hem mee.
- Ga naar Ronde. De zichtbare ronde is nog ongewijzigd. Klik op "Volgende ronde": de nieuwe speler staat ingedeeld op een baan, niet bij de rustenden.
- Ga terug naar Avond en vink een speler uit. Er verschijnt de melding dat de lopende ronde blijft staan. Op Ronde is die speler nog te zien; na "Volgende ronde" niet meer.
- Ververs de pagina: de gewijzigde aanwezigheid is bewaard.

- [ ] **Step 4: Commit**

```bash
git add scherm-avond.js
git commit -m "Laatkomers en afhakers verwerken tijdens de avond"
```

---

### Task 15: Overzichtscherm

**Files:**
- Create: `scherm-overzicht.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: `App.avond`, `App.spelerOp`, `Hussel.maakOverzicht`.
- Produces: `window.SchermOverzicht` met `render()`.

- [ ] **Step 1: Voeg de markup toe**

In `index.html`, voeg direct na `</section>` van `scherm-ronde` toe:

```html
  <section id="scherm-overzicht" hidden>
    <h2>Overzicht</h2>
    <p id="overzicht-melding"></p>
    <table id="overzicht-tabel">
      <thead><tr><th>Speler</th><th>Gespeeld</th><th>Gerust</th></tr></thead>
      <tbody></tbody>
    </table>
  </section>
```

En voeg vóór de regel met `app.js` toe:

```html
<script src="scherm-overzicht.js"></script>
```

- [ ] **Step 2: Schrijf het scherm**

Maak `scherm-overzicht.js`:

```js
(function () {
  'use strict';

  const SchermOverzicht = {
    render: function () {
      const melding = document.getElementById('overzicht-melding');
      const tabel = document.getElementById('overzicht-tabel');
      const lichaam = tabel.querySelector('tbody');
      lichaam.textContent = '';

      if (!App.avond) {
        melding.textContent = 'Er loopt geen avond.';
        tabel.hidden = true;
        return;
      }

      melding.textContent = App.avond.rondes.length + ' gespeelde rondes.';
      tabel.hidden = false;

      const regels = Hussel.maakOverzicht(App.avond.rondes, App.avond.aanwezigen).map(function (regel) {
        const speler = App.spelerOp(regel.id);
        return {
          naam: speler ? speler.naam : 'onbekend',
          gespeeld: regel.gespeeld,
          gerust: regel.gerust,
        };
      });

      regels.sort(function (a, b) {
        if (a.gerust !== b.gerust) return b.gerust - a.gerust;
        return a.naam.localeCompare(b.naam, 'nl');
      });

      for (const regel of regels) {
        const rij = document.createElement('tr');
        for (const waarde of [regel.naam, String(regel.gespeeld), String(regel.gerust)]) {
          const cel = document.createElement('td');
          cel.textContent = waarde;
          rij.appendChild(cel);
        }
        lichaam.appendChild(rij);
      }
    },
  };

  window.SchermOverzicht = SchermOverzicht;
})();
```

- [ ] **Step 3: Controleer in de browser**

Run: `open index.html`

Verwacht:
- Zonder lopende avond toont Overzicht "Er loopt geen avond." en geen tabel.
- Start een avond met elf spelers op 2 banen en speel tien rondes. Overzicht toont "10 gespeelde rondes." en elf regels.
- Bij elke speler is gespeeld plus gerust gelijk aan tien.
- Het hoogste en het laagste aantal rustbeurten verschillen hooguit één.
- Een speler die halverwege is toegevoegd, heeft minder gespeelde rondes dan de rest en staat met zijn werkelijke aantal rustbeurten in de tabel, zonder de correctie die intern voor de rotatie gebruikt wordt.

- [ ] **Step 4: Draai alle geautomatiseerde tests nog één keer**

Run: `node test-node.js`
Expected: `47/47 geslaagd`.

- [ ] **Step 5: Commit**

```bash
git add scherm-overzicht.js index.html
git commit -m "Overzichtscherm met gespeelde rondes en rustbeurten"
```
