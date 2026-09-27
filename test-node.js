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

const bestanden = ['hussel.js', 'opslag.js', 'tests.js'];
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
