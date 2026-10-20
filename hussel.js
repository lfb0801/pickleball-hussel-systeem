(function () {
  'use strict';

  const GEWICHT_PARTNER = 10;
  const GEWICHT_TEGENSTANDER = 3;
  const GEWICHT_NIVEAUKLOOF = 8;
  const GEWICHT_LENER = 4;
  const AANTAL_POGINGEN = 300;

  // Menging 0 houdt de banen strikt op niveauvolgorde. Hogere waarden laten
  // spelers met een kans over het breukvlak naar een naastliggende groep
  // schuiven, zodat de presets ook echt kunnen mengen.
  const STANDAARD_GEWICHTEN = {
    partner: GEWICHT_PARTNER,
    tegenstander: GEWICHT_TEGENSTANDER,
    niveaukloof: GEWICHT_NIVEAUKLOOF,
    lener: GEWICHT_LENER,
    menging: 0,
  };

  function vulGewichten(gewichten) {
    const volledig = {};
    for (const naam of Object.keys(STANDAARD_GEWICHTEN)) {
      volledig[naam] = gewichten && typeof gewichten[naam] === 'number'
        ? gewichten[naam]
        : STANDAARD_GEWICHTEN[naam];
    }
    return volledig;
  }

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
      // Een vrijwillige pauze telt als rustbeurt, zodat wie terugkomt als
      // eerste weer speelt.
      for (const id of ronde.rustend.concat(ronde.gepauzeerd || [])) {
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
  function kiesSpelenden(aanwezigen, plekken, stat, rng, altijd) {
    const voorrang = altijd || {};
    const opRustsaldo = husselLijst(aanwezigen, rng).sort(function (a, b) {
      const verschil = (voorrang[b.id] ? 1 : 0) - (voorrang[a.id] ? 1 : 0);
      if (verschil) return verschil;
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
  function verdeelOverBanen(spelend, rng, menging, altijd) {
    const gehusseld = husselLijst(spelend, rng);
    const vast = altijd || {};
    const rang = {};
    for (const speler of gehusseld) {
      rang[speler.id] = menging > 0 && !vast[speler.id] ? speler.groep + rng() * menging : speler.groep;
    }
    const rij = gehusseld.sort(function (a, b) {
      return rang[a.id] - rang[b.id];
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

  function scoorViertal(teamA, teamB, stat, gewichten) {
    const g = gewichten === undefined ? STANDAARD_GEWICHTEN : gewichten;
    let score = 0;

    score += g.partner * kwadraat(aantal(stat.partner, sleutel(teamA[0].id, teamA[1].id)));
    score += g.partner * kwadraat(aantal(stat.partner, sleutel(teamB[0].id, teamB[1].id)));

    for (const a of teamA) {
      for (const b of teamB) {
        score += g.tegenstander * kwadraat(aantal(stat.tegenstander, sleutel(a.id, b.id)));
      }
    }

    const viertal = teamA.concat(teamB);
    const groepen = viertal.map(function (speler) { return speler.groep; });
    const kloof = Math.max.apply(null, groepen) - Math.min.apply(null, groepen);
    score += g.niveaukloof * kwadraat(kloof);

    for (const lener of bepaalLeners(viertal).leners) {
      score += g.lener * kwadraat(aantal(stat.lener, lener.id));
    }

    return score;
  }

  function kiesTeams(viertal, stat, gewichten) {
    let beste = null;
    let besteScore = Infinity;
    for (const verdeling of TEAMVERDELINGEN) {
      const teamA = [viertal[verdeling[0][0]], viertal[verdeling[0][1]]];
      const teamB = [viertal[verdeling[1][0]], viertal[verdeling[1][1]]];
      const score = scoorViertal(teamA, teamB, stat, gewichten);
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

    const gewichten = vulGewichten(invoer.gewichten);
    const gepauzeerd = invoer.gepauzeerd === undefined ? [] : invoer.gepauzeerd;
    const pauzeert = {};
    for (const id of gepauzeerd) pauzeert[id] = true;
    const beschikbaar = aanwezigen.filter(function (speler) { return !pauzeert[speler.id]; });
    const altijd = {};
    for (const id of invoer.altijd || []) altijd[id] = true;

    const stat = maakHistorieStatistiek(historie, invoer.rustcorrectie);
    const plekken = aantalPlekken(beschikbaar.length, invoer.banen);
    if (plekken === 0) return null;

    let beste = null;
    let besteScore = Infinity;

    for (let poging = 0; poging < pogingen; poging += 1) {
      const keuze = kiesSpelenden(beschikbaar, plekken, stat, rng, altijd);
      const viertallen = verdeelOverBanen(keuze.spelend, rng, gewichten.menging, altijd);
      const teamsPerBaan = viertallen.map(function (viertal) { return kiesTeams(viertal, stat, gewichten); });

      let score = 0;
      for (const teams of teamsPerBaan) {
        score += scoorViertal(teams.teamA, teams.teamB, stat, gewichten);
      }

      if (score < besteScore) {
        besteScore = score;
        beste = { teamsPerBaan: teamsPerBaan, rustend: keuze.rustend };
      }
    }

    return {
      banen: beste.teamsPerBaan.map(function (teams, index) { return maakBaan(index + 1, teams); }),
      rustend: beste.rustend.map(function (speler) { return speler.id; }),
      gepauzeerd: aanwezigen
        .filter(function (speler) { return pauzeert[speler.id]; })
        .map(function (speler) { return speler.id; }),
    };
  }

  // Wisselt twee spelers van plek: binnen een baan, tussen banen, of tussen
  // een baan en de rustlijst. groepVan geeft per id de groepsindex, zodat
  // groepen, thuisgroep en leners per baan opnieuw kloppen.
  function wisselSpelers(ronde, idA, idB, groepVan) {
    const kopie = JSON.parse(JSON.stringify(ronde));
    if (idA === idB) return kopie;

    const lijsten = [kopie.rustend];
    for (const baan of kopie.banen) lijsten.push(baan.teamA, baan.teamB);

    function vind(id) {
      for (const lijst of lijsten) {
        const index = lijst.indexOf(id);
        if (index !== -1) return { lijst: lijst, index: index };
      }
      return null;
    }

    const plekA = vind(idA);
    const plekB = vind(idB);
    if (!plekA || !plekB) return kopie;
    plekA.lijst[plekA.index] = idB;
    plekB.lijst[plekB.index] = idA;

    function alsSpeler(id) {
      return { id: id, groep: groepVan[id] === undefined ? 0 : groepVan[id] };
    }

    kopie.banen = kopie.banen.map(function (baan) {
      return maakBaan(baan.baan, {
        teamA: baan.teamA.map(alsSpeler),
        teamB: baan.teamB.map(alsSpeler),
      });
    });
    return kopie;
  }

  function maakOverzicht(rondes, ids) {
    const gespeeld = {};
    const gerust = {};
    const gepauzeerd = {};
    for (const ronde of rondes) {
      for (const baan of ronde.banen) {
        for (const id of baan.teamA.concat(baan.teamB)) tel(gespeeld, id);
      }
      for (const id of ronde.rustend) tel(gerust, id);
      for (const id of ronde.gepauzeerd || []) tel(gepauzeerd, id);
    }
    return ids.map(function (id) {
      return {
        id: id,
        gespeeld: aantal(gespeeld, id),
        gerust: aantal(gerust, id),
        gepauzeerd: aantal(gepauzeerd, id),
      };
    });
  }

  globalThis.Hussel = {
    maakOverzicht: maakOverzicht,
    genereerRonde: genereerRonde,
    wisselSpelers: wisselSpelers,
    STANDAARD_GEWICHTEN: STANDAARD_GEWICHTEN,
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
