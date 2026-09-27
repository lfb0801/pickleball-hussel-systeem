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

  globalThis.Hussel = {
    aantalPlekken: aantalPlekken,
    kiesSpelenden: kiesSpelenden,
    GEWICHT_PARTNER: GEWICHT_PARTNER,
    GEWICHT_TEGENSTANDER: GEWICHT_TEGENSTANDER,
    GEWICHT_NIVEAUKLOOF: GEWICHT_NIVEAUKLOOF,
    GEWICHT_LENER: GEWICHT_LENER,
    AANTAL_POGINGEN: AANTAL_POGINGEN,
    maakRng: maakRng,
    husselLijst: husselLijst,
    sleutel: sleutel,
    aantal: aantal,
    maakHistorieStatistiek: maakHistorieStatistiek,
    hoogsteRustsaldo: hoogsteRustsaldo,
  };
})();
