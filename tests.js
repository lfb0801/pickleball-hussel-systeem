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
