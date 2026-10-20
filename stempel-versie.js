// Zet een versie achter elk eigen script en stijlblad in de HTML, zodat een
// browser na een nieuwe uitgave nooit oude en nieuwe bestanden door elkaar
// gebruikt. GitHub Pages laat browsers bestanden tien minuten bewaren.
//
// Gebruik: node stempel-versie.js   (vóór elke commit die je gaat pushen)
const fs = require('fs');
const path = require('path');

const versie = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const paginas = ['index.html', 'speler.html', 'test.html'];
const eigenBestand = /((?:src|href)=")([a-z0-9.-]+\.(?:js|css))(?:\?v=[0-9]+)?(")/g;

for (const pagina of paginas) {
  const bestand = path.join(__dirname, pagina);
  const voor = fs.readFileSync(bestand, 'utf8');
  const na = voor.replace(eigenBestand, function (_, begin, naam, eind) {
    return begin + naam + '?v=' + versie + eind;
  });
  fs.writeFileSync(bestand, na);
}
console.log('versie ' + versie);
