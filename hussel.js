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

  globalThis.Hussel = {
    maakOverzicht: maakOverzicht,
    genereerRonde: genereerRonde,
    scoorViertal: scoorViertal,
    kiesTeams: kiesTeams,
    verdeelOverBanen: verdeelOverBanen,
    bepaalLeners: bepaalLeners,
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
