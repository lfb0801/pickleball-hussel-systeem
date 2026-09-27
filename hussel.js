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
