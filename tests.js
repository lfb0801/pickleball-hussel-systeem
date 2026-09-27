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
