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

test('maakOverzicht telt gespeelde rondes en rustbeurten per speler', function () {
  const rondes = [
    maakTestRonde([maakTestBaan(1, ['a', 'b'], ['c', 'd'])], ['e']),
    maakTestRonde([maakTestBaan(1, ['a', 'c'], ['b', 'e'])], ['d']),
  ];
  const overzicht = Hussel.maakOverzicht(rondes, ['a', 'b', 'c', 'd', 'e']);
  assertGelijk(overzicht, [
    { id: 'a', gespeeld: 2, gerust: 0, gepauzeerd: 0 },
    { id: 'b', gespeeld: 2, gerust: 0, gepauzeerd: 0 },
    { id: 'c', gespeeld: 2, gerust: 0, gepauzeerd: 0 },
    { id: 'd', gespeeld: 1, gerust: 1, gepauzeerd: 0 },
    { id: 'e', gespeeld: 1, gerust: 1, gepauzeerd: 0 },
  ]);
});

test('maakOverzicht toont een speler zonder rondes als nul', function () {
  const overzicht = Hussel.maakOverzicht([], ['a']);
  assertGelijk(overzicht, [{ id: 'a', gespeeld: 0, gerust: 0, gepauzeerd: 0 }]);
});

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


function alleIngedeeld(ronde) {
  const ids = [];
  for (const baan of ronde.banen) {
    for (const id of baan.teamA.concat(baan.teamB)) ids.push(id);
  }
  return ids.concat(ronde.rustend, ronde.gepauzeerd || []);
}

test('genereerRonde zet een gepauzeerde speler nooit op een baan', function () {
  const spelers = maakSpelers([9]);
  for (let zaad = 0; zaad < 20; zaad += 1) {
    const ronde = Hussel.genereerRonde({
      aanwezigen: spelers,
      gepauzeerd: ['g0n0', 'g0n1'],
      banen: 2,
      rng: Hussel.maakRng(zaad),
      pogingen: 10,
    });
    assertGelijk(ronde.gepauzeerd, ['g0n0', 'g0n1']);
    for (const baan of ronde.banen) {
      for (const id of baan.teamA.concat(baan.teamB)) {
        assert(id !== 'g0n0' && id !== 'g0n1', id + ' staat op een baan terwijl hij pauzeert');
      }
    }
    assertGelijk(ronde.rustend.length, 3, 'zeven beschikbaar op twee banen: drie rusten');
    assertGelijk(new Set(alleIngedeeld(ronde)).size, 9, 'niet iedereen precies één keer ingedeeld');
  }
});

test('genereerRonde geeft null als er door pauzes geen viertal over is', function () {
  const spelers = maakSpelers([5]);
  const ronde = Hussel.genereerRonde({
    aanwezigen: spelers,
    gepauzeerd: ['g0n0', 'g0n1'],
    banen: 2,
    rng: Hussel.maakRng(1),
  });
  assertGelijk(ronde, null);
});

test('een pauze telt als rustbeurt en wie terugkomt speelt de volgende ronde', function () {
  const spelers = maakSpelers([10]);
  const rondes = [];
  rondes.push(Hussel.genereerRonde({
    aanwezigen: spelers, gepauzeerd: ['g0n3'], banen: 2, historie: rondes, rng: Hussel.maakRng(5), pogingen: 20,
  }));
  const stat = Hussel.maakHistorieStatistiek(rondes);
  assertGelijk(Hussel.aantal(stat.rust, 'g0n3'), 1, 'pauze telt niet als rust');
  for (let zaad = 0; zaad < 10; zaad += 1) {
    const volgende = Hussel.genereerRonde({
      aanwezigen: spelers, banen: 2, historie: rondes, rng: Hussel.maakRng(zaad), pogingen: 20,
    });
    assert(volgende.rustend.indexOf('g0n3') === -1, 'teruggekeerde speler rust opnieuw');
  }
});

test('wisselSpelers wisselt tussen twee banen en bepaalt groepen en leners opnieuw', function () {
  const ronde = {
    banen: [
      { baan: 1, teamA: ['a1', 'a2'], teamB: ['a3', 'a4'], thuisgroep: 0, groepen: [0], leners: [] },
      { baan: 2, teamA: ['b1', 'b2'], teamB: ['b3', 'b4'], thuisgroep: 1, groepen: [1], leners: [] },
    ],
    rustend: ['r1'],
    gepauzeerd: [],
  };
  const groepVan = { a1: 0, a2: 0, a3: 0, a4: 0, b1: 1, b2: 1, b3: 1, b4: 1, r1: 1 };
  const gewisseld = Hussel.wisselSpelers(ronde, 'a1', 'b1', groepVan);
  assertGelijk(gewisseld.banen[0].teamA, ['b1', 'a2']);
  assertGelijk(gewisseld.banen[1].teamA, ['a1', 'b2']);
  assertGelijk(gewisseld.banen[0].groepen, [0, 1]);
  assertGelijk(gewisseld.banen[0].leners, ['b1']);
  assertGelijk(gewisseld.banen[1].leners, ['a1']);
  assertGelijk(ronde.banen[0].teamA, ['a1', 'a2'], 'origineel is gewijzigd');
});

test('wisselSpelers wisselt een speler op een baan met een rustende speler', function () {
  const ronde = {
    banen: [{ baan: 1, teamA: ['a', 'b'], teamB: ['c', 'd'], thuisgroep: 0, groepen: [0], leners: [] }],
    rustend: ['e'],
    gepauzeerd: ['f'],
  };
  const gewisseld = Hussel.wisselSpelers(ronde, 'e', 'c', { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 });
  assertGelijk(gewisseld.banen[0].teamB, ['e', 'd']);
  assertGelijk(gewisseld.rustend, ['c']);
  assertGelijk(gewisseld.gepauzeerd, ['f']);
  assertGelijk(new Set(alleIngedeeld(gewisseld)).size, 6);
});

test('wisselSpelers laat een gepauzeerde speler ongemoeid', function () {
  const ronde = {
    banen: [{ baan: 1, teamA: ['a', 'b'], teamB: ['c', 'd'], thuisgroep: 0, groepen: [0], leners: [] }],
    rustend: [],
    gepauzeerd: ['f'],
  };
  const gewisseld = Hussel.wisselSpelers(ronde, 'f', 'a', { a: 0, b: 0, c: 0, d: 0, f: 0 });
  assertGelijk(gewisseld.banen[0].teamA, ['a', 'b']);
  assertGelijk(gewisseld.gepauzeerd, ['f']);
});

function meetAvond(sleutel) {
  const spelers = maakSpelers([6, 6, 6, 6]);
  const rondes = [];
  for (let i = 0; i < 10; i += 1) {
    rondes.push(Hussel.genereerRonde({
      aanwezigen: spelers,
      banen: 6,
      historie: rondes,
      gewichten: Presets.gewichten(sleutel),
      rng: Hussel.maakRng(900 + i),
      pogingen: 100,
    }));
  }
  let kloof = 0;
  let herhaling = 0;
  const gezien = { partner: {}, tegenstander: {} };
  for (const ronde of rondes) {
    for (const baan of ronde.banen) {
      kloof += baan.groepen[baan.groepen.length - 1] - baan.groepen[0];
      for (const team of [baan.teamA, baan.teamB]) {
        const s = Hussel.sleutel(team[0], team[1]);
        if (gezien.partner[s]) herhaling += 1;
        gezien.partner[s] = true;
      }
      for (const a of baan.teamA) {
        for (const b of baan.teamB) {
          const s = Hussel.sleutel(a, b);
          if (gezien.tegenstander[s]) herhaling += 1;
          gezien.tegenstander[s] = true;
        }
      }
    }
  }
  return { kloof: kloof, herhaling: herhaling };
}

test('presets: Binnen niveau geeft minder niveaukloof dan Sociaal mixen', function () {
  const niveau = meetAvond('niveau');
  const sociaal = meetAvond('sociaal');
  assert(niveau.kloof < sociaal.kloof, 'kloof niveau ' + niveau.kloof + ', sociaal ' + sociaal.kloof);
});

test('presets: Sociaal mixen geeft minder herhaling dan Binnen niveau', function () {
  const niveau = meetAvond('niveau');
  const sociaal = meetAvond('sociaal');
  assert(sociaal.herhaling < niveau.herhaling, 'herhaling sociaal ' + sociaal.herhaling + ', niveau ' + niveau.herhaling);
});

test('presets: een onbekende sleutel valt terug op de standaard', function () {
  assertGelijk(Presets.op('bestaat-niet').sleutel, Presets.STANDAARD);
});

function maakTestClub(aantal) {
  const spelers = [];
  for (let i = 0; i < aantal; i += 1) spelers.push({ id: 'p' + i, naam: 'Speler ' + i, groep: i % 2 });
  return { groepen: ['Sterk', 'Zwak'], spelers: spelers };
}

function idsVan(club, aantal) {
  return club.spelers.slice(0, aantal).map(function (s) { return s.id; });
}

test('sessie: een claim op een vrije naam lukt, een tweede claim wordt geweigerd', function () {
  const club = maakTestClub(8);
  let avond = Sessie.nieuweAvond(idsVan(club, 8), 2, 'ABCDEF');
  let uitkomst = Sessie.pasVerzoekToe(avond, club, { telefoon: 't1', type: 'claim', speler: 'p0' });
  assertGelijk(uitkomst.antwoord, null);
  avond = uitkomst.avond;
  uitkomst = Sessie.pasVerzoekToe(avond, club, { telefoon: 't2', type: 'claim', speler: 'p0' });
  assertGelijk(uitkomst.antwoord, { fout: 'bezet' });
  avond = Sessie.ontkoppel(avond, 'p0').avond;
  uitkomst = Sessie.pasVerzoekToe(avond, club, { telefoon: 't2', type: 'claim', speler: 'p0' });
  assertGelijk(uitkomst.antwoord, null);
  assertGelijk(uitkomst.avond.koppelingen, { t2: 'p0' });
});

test('sessie: een telefoon claimt één naam tegelijk', function () {
  const club = maakTestClub(8);
  let avond = Sessie.nieuweAvond(idsVan(club, 8), 2, 'ABCDEF');
  avond = Sessie.pasVerzoekToe(avond, club, { telefoon: 't1', type: 'claim', speler: 'p0' }).avond;
  avond = Sessie.pasVerzoekToe(avond, club, { telefoon: 't1', type: 'claim', speler: 'p1' }).avond;
  assertGelijk(avond.koppelingen, { t1: 'p1' });
});

test('sessie: hallo met een onthouden naam koppelt opnieuw', function () {
  const club = maakTestClub(8);
  const avond = Sessie.nieuweAvond(idsVan(club, 8), 2, 'ABCDEF');
  const uitkomst = Sessie.pasVerzoekToe(avond, club, { telefoon: 't1', type: 'hallo', speler: 'p3' });
  assertGelijk(uitkomst.avond.koppelingen, { t1: 'p3' });
});

test('sessie: pauze, vertrek en aanmelden via de telefoon geven dezelfde avond als op de laptop', function () {
  const club = maakTestClub(10);
  let avond = Sessie.nieuweAvond(idsVan(club, 8), 2, 'ABCDEF');
  avond = Sessie.publiceer(Sessie.maakConcept(avond, club, { rng: Hussel.maakRng(1), pogingen: 5 }).avond);
  avond = Sessie.pasVerzoekToe(avond, club, { telefoon: 't1', type: 'claim', speler: 'p1' }).avond;
  avond = Sessie.pasVerzoekToe(avond, club, { telefoon: 't9', type: 'claim', speler: 'p9' }).avond;

  const viaTelefoon = Sessie.pasVerzoekToe(avond, club, { telefoon: 't1', type: 'pauze', aan: true }).avond;
  assertGelijk(viaTelefoon, Sessie.zetPauze(avond, 'p1', true));

  const vertrek = Sessie.pasVerzoekToe(avond, club, { telefoon: 't1', type: 'vertrek' }).avond;
  assertGelijk(vertrek, Sessie.meldAf(avond, 'p1'));

  const weg = Sessie.meldAf(avond, 'p9');
  const aanmelding = Sessie.pasVerzoekToe(weg, club, { telefoon: 't9', type: 'aanmelden' }).avond;
  assertGelijk(aanmelding, Sessie.meldAan(weg, 'p9'));
});

test('sessie: pauze zonder gekoppelde naam wordt geweigerd', function () {
  const club = maakTestClub(8);
  const avond = Sessie.nieuweAvond(idsVan(club, 8), 2, 'ABCDEF');
  const uitkomst = Sessie.pasVerzoekToe(avond, club, { telefoon: 't1', type: 'pauze', aan: true });
  assertGelijk(uitkomst.antwoord, { fout: 'geen-naam' });
});

test('sessie: een laatkomer krijgt het hoogste rustsaldo onder de aanwezigen', function () {
  const club = maakTestClub(10);
  let avond = Sessie.nieuweAvond(idsVan(club, 9), 2, 'ABCDEF');
  for (let i = 0; i < 3; i += 1) {
    avond = Sessie.publiceer(Sessie.maakConcept(avond, club, { rng: Hussel.maakRng(i), pogingen: 5 }).avond);
  }
  const stat = Hussel.maakHistorieStatistiek(avond.rondes, avond.rustcorrectie);
  const hoogste = Hussel.hoogsteRustsaldo(stat, avond.aanwezigen);
  avond = Sessie.meldAan(avond, 'p9');
  const na = Hussel.maakHistorieStatistiek(avond.rondes, avond.rustcorrectie);
  assertGelijk(Hussel.aantal(na.rust, 'p9'), hoogste);
});

test('sessie: een nieuwe speler meldt zich aan met naam en niveau en doet meteen mee', function () {
  const club = maakTestClub(8);
  let avond = Sessie.nieuweAvond([], 2, 'ABCDEF');
  const uitkomst = Sessie.pasVerzoekToe(avond, club, { telefoon: 't7', type: 'registreer', naam: '  Gerda   de  Vries ', groep: 1 }, 'nieuw1');
  assertGelijk(uitkomst.antwoord, null);
  assertGelijk(uitkomst.club.spelers.length, 9);
  assertGelijk(uitkomst.club.spelers[8], { id: 'nieuw1', naam: 'Gerda de Vries', groep: 1 });
  assertGelijk(club.spelers.length, 8, 'originele club is gewijzigd');
  avond = uitkomst.avond;
  assertGelijk(avond.aanwezigen, ['nieuw1']);
  assertGelijk(avond.koppelingen.t7, 'nieuw1');
});

test('sessie: registreren met een bestaande naam verwijst naar de lijst', function () {
  const club = maakTestClub(8);
  const avond = Sessie.nieuweAvond([], 2, 'ABCDEF');
  const uitkomst = Sessie.pasVerzoekToe(avond, club, { telefoon: 't7', type: 'registreer', naam: 'speler 3', groep: 0 }, 'nieuw1');
  assertGelijk(uitkomst.antwoord, { fout: 'naam-bestaat' });
  assertGelijk(uitkomst.club.spelers.length, 8);
});

test('sessie: registreren zonder naam of met een onbekend niveau wordt geweigerd', function () {
  const club = maakTestClub(8);
  const avond = Sessie.nieuweAvond([], 2, 'ABCDEF');
  assertGelijk(Sessie.pasVerzoekToe(avond, club, { telefoon: 't7', type: 'registreer', naam: '   ', groep: 0 }, 'n1').antwoord, { fout: 'lege-naam' });
  assertGelijk(Sessie.pasVerzoekToe(avond, club, { telefoon: 't7', type: 'registreer', naam: 'Bob', groep: 5 }, 'n1').antwoord, { fout: 'onbekend-niveau' });
  assertGelijk(Sessie.pasVerzoekToe(avond, club, { telefoon: 't7', type: 'registreer', naam: 'Bob', groep: '0' }, 'n1').antwoord, { fout: 'onbekend-niveau' });
});

test('sessie: een te lange naam wordt ingekort', function () {
  assertGelijk(Sessie.schoneNaam('x'.repeat(60)).length, 40);
});

test('sessie: je eigen naam aantikken meldt je aan', function () {
  const club = maakTestClub(8);
  const avond = Sessie.nieuweAvond([], 2, 'ABCDEF');
  const uitkomst = Sessie.pasVerzoekToe(avond, club, { telefoon: 't1', type: 'claim', speler: 'p2' });
  assertGelijk(uitkomst.avond.aanwezigen, ['p2']);
});

test('sessie: hallo koppelt opnieuw maar meldt een vertrokken speler niet vanzelf aan', function () {
  const club = maakTestClub(8);
  let avond = Sessie.nieuweAvond(['p2'], 2, 'ABCDEF');
  avond = Sessie.meldAf(avond, 'p2');
  const uitkomst = Sessie.pasVerzoekToe(avond, club, { telefoon: 't1', type: 'hallo', speler: 'p2' });
  assertGelijk(uitkomst.avond.koppelingen, { t1: 'p2' });
  assertGelijk(uitkomst.avond.aanwezigen, []);
});

test('sessie: het concept telt niet mee in de historie', function () {
  const club = maakTestClub(10);
  let avond = Sessie.nieuweAvond(idsVan(club, 10), 2, 'ABCDEF');
  avond = Sessie.maakConcept(avond, club, { rng: Hussel.maakRng(3), pogingen: 5 }).avond;
  assert(avond.concept !== null, 'geen concept');
  assertGelijk(avond.rondes.length, 0);
  avond = Sessie.publiceer(avond);
  assertGelijk(avond.rondes.length, 1);
  assertGelijk(avond.concept, null);
});

test('sessie: een pauze vervalt bij het publiceren van de ronde waarvoor hij gold', function () {
  const club = maakTestClub(10);
  let avond = Sessie.nieuweAvond(idsVan(club, 10), 2, 'ABCDEF');
  avond = Sessie.zetPauze(avond, 'p2', true);
  avond = Sessie.maakConcept(avond, club, { rng: Hussel.maakRng(3), pogingen: 5 }).avond;
  assertGelijk(avond.concept.gepauzeerd, ['p2']);
  avond = Sessie.publiceer(avond);
  assertGelijk(avond.pauzes, {});
});

test('sessie: een pauze na het concept wordt gemarkeerd en schuift door als het concept zo gepubliceerd wordt', function () {
  const club = maakTestClub(10);
  let avond = Sessie.nieuweAvond(idsVan(club, 10), 2, 'ABCDEF');
  avond = Sessie.maakConcept(avond, club, { rng: Hussel.maakRng(3), pogingen: 5 }).avond;
  avond = Sessie.zetPauze(avond, 'p4', true);
  assertGelijk(avond.verouderd, { p4: 'pauze' });
  avond = Sessie.publiceer(avond);
  assertGelijk(avond.pauzes, { p4: true });
  assertGelijk(avond.verouderd, {});
});

test('sessie: de telefoon ziet alleen de gepubliceerde ronde en zijn eigen plek', function () {
  const club = maakTestClub(8);
  let avond = Sessie.nieuweAvond(idsVan(club, 8), 2, 'ABCDEF');
  avond = Sessie.pasVerzoekToe(avond, club, { telefoon: 't1', type: 'claim', speler: 'p0' }).avond;
  avond = Sessie.maakConcept(avond, club, { rng: Hussel.maakRng(3), pogingen: 5 }).avond;
  assertGelijk(Sessie.toestandVoor(avond, club, 't1').ronde, null, 'concept is zichtbaar');
  avond = Sessie.publiceer(avond);
  const toestand = Sessie.toestandVoor(avond, club, 't1');
  assertGelijk(toestand.ronde.nummer, 1);
  assertGelijk(toestand.ikNaam, 'Speler 0');
  assertGelijk(toestand.mijn.status, 'speelt');
  assertGelijk(toestand.mijn.tegen.length, 2);
});

test('sessie: het aantal banen wijzigen laat de gespeelde rondes staan en geldt bij de volgende loting', function () {
  const club = maakTestClub(16);
  let avond = Sessie.nieuweAvond(idsVan(club, 16), 2, 'ABCDEF');
  avond = Sessie.publiceer(Sessie.maakConcept(avond, club, { rng: Hussel.maakRng(1), pogingen: 5 }).avond);
  avond = Sessie.zetBanen(avond, 4);
  assertGelijk(avond.rondes[0].banen.length, 2, 'gespeelde ronde is veranderd');
  avond = Sessie.maakConcept(avond, club, { rng: Hussel.maakRng(2), pogingen: 5 }).avond;
  assertGelijk(avond.concept.banen.length, 4);
});

test('sessie: het aantal banen blijft tussen één en twintig', function () {
  const avond = Sessie.nieuweAvond([], 2, 'ABCDEF');
  assertGelijk(Sessie.zetBanen(avond, 0).banen, 1);
  assertGelijk(Sessie.zetBanen(avond, 25).banen, 20);
});

test('sessie: wie zich aanmeldt terwijl er een concept openstaat, komt in een vernieuwd concept', function () {
  const club = maakTestClub(10);
  let avond = Sessie.nieuweAvond(idsVan(club, 8), 2, 'ABCDEF');
  avond = Sessie.maakConcept(avond, club, { rng: Hussel.maakRng(1), pogingen: 5 }).avond;
  assertGelijk(Sessie.moetConceptVernieuwen(avond), false);
  avond = Sessie.meldAan(avond, 'p9');
  assertGelijk(Sessie.nieuwkomersBuitenConcept(avond), ['p9']);
  assertGelijk(Sessie.moetConceptVernieuwen(avond), true);
  avond = Sessie.maakConcept(avond, club, { rng: Hussel.maakRng(2), pogingen: 5 }).avond;
  assertGelijk(Sessie.nieuwkomersBuitenConcept(avond), []);
});

test('sessie: een nieuwkomer speelt de eerstvolgende ronde', function () {
  const club = maakTestClub(14);
  let avond = Sessie.nieuweAvond(idsVan(club, 10), 2, 'ABCDEF');
  for (let i = 0; i < 3; i += 1) {
    avond = Sessie.publiceer(Sessie.maakConcept(avond, club, { rng: Hussel.maakRng(i), pogingen: 5 }).avond);
  }
  avond = Sessie.meldAan(avond, 'p13');
  for (let zaad = 0; zaad < 15; zaad += 1) {
    const concept = Sessie.maakConcept(avond, club, { rng: Hussel.maakRng(100 + zaad), pogingen: 5 }).avond.concept;
    assert(concept.rustend.indexOf('p13') === -1, 'nieuwkomer rust meteen bij zaad ' + zaad);
  }
});

test('sessie: een concept met handmatige wissels wordt niet vanzelf vernieuwd', function () {
  const club = maakTestClub(10);
  let avond = Sessie.nieuweAvond(idsVan(club, 9), 2, 'ABCDEF');
  avond = Sessie.maakConcept(avond, club, { rng: Hussel.maakRng(1), pogingen: 5 }).avond;
  const opBaan = avond.concept.banen[0].teamA[0];
  avond = Sessie.wissel(avond, club, opBaan, avond.concept.rustend[0]);
  avond = Sessie.meldAan(avond, 'p9');
  assertGelijk(Sessie.moetConceptVernieuwen(avond), false);
  assertGelijk(avond.verouderd, { p9: 'aanmelding' });
  avond = Sessie.publiceer(avond);
  assertGelijk(avond.rondes[0].handmatig, undefined);
});

test('sessie: zetNiveau wijzigt alleen die speler en weigert een onbekend niveau', function () {
  const club = maakTestClub(4);
  const nieuw = Sessie.zetNiveau(club, 'p0', 1);
  assertGelijk(nieuw.spelers[0].groep, 1);
  assertGelijk(club.spelers[0].groep, 0, 'originele club is gewijzigd');
  assertGelijk(Sessie.zetNiveau(club, 'p0', 7), club);
});

test('sessie: een ander niveau geldt bij de volgende loting, gespeelde rondes blijven staan', function () {
  let club = maakTestClub(8);
  let avond = Sessie.nieuweAvond(idsVan(club, 8), 2, 'ABCDEF');
  avond = Sessie.publiceer(Sessie.maakConcept(avond, club, { rng: Hussel.maakRng(1), pogingen: 5 }).avond);
  const voor = JSON.stringify(avond.rondes);
  club = Sessie.zetNiveau(club, 'p0', 1);
  assertGelijk(JSON.stringify(avond.rondes), voor);
  avond = Sessie.maakConcept(avond, club, { rng: Hussel.maakRng(2), pogingen: 5 }).avond;
  const baanVanP0 = avond.concept.banen.filter(function (b) { return b.teamA.concat(b.teamB).indexOf('p0') !== -1; })[0];
  if (baanVanP0) assert(baanVanP0.groepen.indexOf(1) !== -1, 'p0 telt nog als niveau 0');
});

test('sessie: staatOpBaanInConcept herkent alleen spelers op een baan', function () {
  const club = maakTestClub(9);
  let avond = Sessie.nieuweAvond(idsVan(club, 9), 2, 'ABCDEF');
  avond = Sessie.maakConcept(avond, club, { rng: Hussel.maakRng(1), pogingen: 5 }).avond;
  assertGelijk(Sessie.staatOpBaanInConcept(avond, avond.concept.banen[0].teamB[1]), true);
  assertGelijk(Sessie.staatOpBaanInConcept(avond, avond.concept.rustend[0]), false);
  assertGelijk(Sessie.markeerVerouderd(avond, 'p1', 'niveau').verouderd, { p1: 'niveau' });
});

test('sessie: wie als eerste met een telefoon meedoet, speelt elke ronde', function () {
  const club = maakTestClub(11);
  let avond = Sessie.nieuweAvond(idsVan(club, 6), 2, 'ABCDEF');
  avond = Sessie.pasVerzoekToe(avond, club, { telefoon: 't1', type: 'claim', speler: 'p10' }).avond;
  avond = Sessie.pasVerzoekToe(avond, club, { telefoon: 't2', type: 'claim', speler: 'p9' }).avond;
  avond = Sessie.pasVerzoekToe(avond, club, { telefoon: 't3', type: 'claim', speler: 'p8' }).avond;
  assertGelijk(avond.eerste, 'p10');
  for (let i = 0; i < 12; i += 1) {
    avond = Sessie.publiceer(Sessie.maakConcept(avond, club, { rng: Hussel.maakRng(700 + i), pogingen: 20 }).avond);
    assert(avond.rondes[i].rustend.indexOf('p10') === -1, 'p10 rust in ronde ' + (i + 1));
  }
  assertGelijk(Sessie.toestandVoor(avond, club, 't2').eerste, undefined);
});

test('sessie: een pauze van de eerste speler wordt gewoon gerespecteerd', function () {
  const club = maakTestClub(9);
  let avond = Sessie.nieuweAvond(idsVan(club, 8), 2, 'ABCDEF');
  avond = Sessie.pasVerzoekToe(avond, club, { telefoon: 't1', type: 'claim', speler: 'p8' }).avond;
  avond = Sessie.zetPauze(avond, 'p8', true);
  avond = Sessie.maakConcept(avond, club, { rng: Hussel.maakRng(3), pogingen: 5 }).avond;
  assertGelijk(avond.concept.gepauzeerd, ['p8']);
});

test('sessie: aanvinken op de laptop maakt niemand de eerste', function () {
  const club = maakTestClub(8);
  let avond = Sessie.nieuweAvond([], 2, 'ABCDEF');
  avond = Sessie.meldAan(avond, 'p0');
  avond = Sessie.pasVerzoekToe(avond, club, { telefoon: 't1', type: 'hallo', speler: 'p0' }).avond;
  assertGelijk(avond.eerste, undefined);
});
