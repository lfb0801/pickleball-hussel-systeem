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
