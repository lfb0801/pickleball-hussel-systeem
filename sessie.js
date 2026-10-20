(function () {
  'use strict';

  // De regels van de live sessie: verzoeken van telefoons en handelingen op
  // de laptop lopen door dezelfde functies. Alles is puur: elke functie
  // krijgt de toestand mee en geeft een nieuwe terug, zonder netwerk, DOM of
  // opslag. Zo is de sessie onder Node te testen.

  const CODETEKENS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function kopie(waarde) {
    return JSON.parse(JSON.stringify(waarde));
  }

  function maakSessiecode(rng) {
    const kans = rng === undefined ? Math.random : rng;
    let code = '';
    for (let i = 0; i < 6; i += 1) {
      code += CODETEKENS[Math.floor(kans() * CODETEKENS.length)];
    }
    return code;
  }

  function nieuweAvond(aanwezigen, banen, sessiecode) {
    return vulAan({ aanwezigen: aanwezigen.slice(), banen: banen, sessiecode: sessiecode });
  }

  // Vult velden aan die een avond uit een oudere versie nog niet had.
  function vulAan(avond) {
    const volledig = kopie(avond);
    if (!volledig.rondes) volledig.rondes = [];
    if (!volledig.rustcorrectie) volledig.rustcorrectie = {};
    if (volledig.concept === undefined) volledig.concept = null;
    if (!volledig.pauzes) volledig.pauzes = {};
    if (!volledig.verouderd) volledig.verouderd = {};
    if (!volledig.koppelingen) volledig.koppelingen = {};
    if (!volledig.sessiecode) volledig.sessiecode = maakSessiecode();
    return volledig;
  }

  function spelerOp(club, id) {
    for (const speler of club.spelers) {
      if (speler.id === id) return speler;
    }
    return null;
  }

  function isAanwezig(avond, id) {
    return avond.aanwezigen.indexOf(id) !== -1;
  }

  // Een wijziging na het maken van het concept: de laptop toont een badge
  // en meldt dat opnieuw genereren nodig is.
  function markeer(avond, id, reden) {
    if (avond.concept) avond.verouderd[id] = reden;
  }

  // Een laatkomer staat op nul rustbeurten en zou daarmee als eerste
  // moeten rusten. Het hoogste saldo onder de aanwezigen laat hem meteen
  // meedraaien in de rotatie.
  function meldAan(avond, id) {
    const nieuw = kopie(avond);
    if (isAanwezig(nieuw, id)) return nieuw;
    const stat = Hussel.maakHistorieStatistiek(nieuw.rondes, nieuw.rustcorrectie);
    const huidig = Hussel.aantal(stat.rust, id);
    const hoogste = Hussel.hoogsteRustsaldo(stat, nieuw.aanwezigen);
    nieuw.rustcorrectie[id] = (nieuw.rustcorrectie[id] || 0) + Math.max(0, hoogste - huidig);
    nieuw.aanwezigen.push(id);
    markeer(nieuw, id, 'aanmelding');
    return nieuw;
  }

  function meldAf(avond, id) {
    const nieuw = kopie(avond);
    if (!isAanwezig(nieuw, id)) return nieuw;
    nieuw.aanwezigen = nieuw.aanwezigen.filter(function (a) { return a !== id; });
    delete nieuw.pauzes[id];
    markeer(nieuw, id, 'vertrek');
    return nieuw;
  }

  function zetPauze(avond, id, aan) {
    const nieuw = kopie(avond);
    if (!isAanwezig(nieuw, id)) return nieuw;
    if (Boolean(nieuw.pauzes[id]) === Boolean(aan)) return nieuw;
    if (aan) nieuw.pauzes[id] = true;
    else delete nieuw.pauzes[id];
    markeer(nieuw, id, aan ? 'pauze' : 'terug');
    // Wie zijn pauze intrekt terwijl het concept hem al als pauzerend
    // heeft, staat daarin weer gewoon bij de rustenden.
    if (!aan && nieuw.concept && (nieuw.concept.gepauzeerd || []).indexOf(id) !== -1) {
      nieuw.concept.gepauzeerd = nieuw.concept.gepauzeerd.filter(function (g) { return g !== id; });
      nieuw.concept.rustend.push(id);
    }
    return nieuw;
  }

  function baanVan(ronde, id) {
    for (const baan of ronde.banen) {
      if (baan.teamA.indexOf(id) !== -1 || baan.teamB.indexOf(id) !== -1) return baan.baan;
    }
    return null;
  }

  // De invaller is de rustende speler die het meest gerust heeft; bij
  // gelijke stand die het dichtst bij het niveau van de uitvaller zit.
  function invallerVoor(ronde, avond, club, historie, id) {
    const groepen = groepVan(club);
    const stat = Hussel.maakHistorieStatistiek(historie, avond.rustcorrectie);
    let beste = null;
    let besteRust = -1;
    let besteAfstand = Infinity;
    for (const kandidaat of ronde.rustend) {
      if (kandidaat === id || !isAanwezig(avond, kandidaat) || avond.pauzes[kandidaat]) continue;
      const rust = Hussel.aantal(stat.rust, kandidaat);
      const afstand = Math.abs((groepen[kandidaat] || 0) - (groepen[id] || 0));
      if (rust > besteRust || (rust === besteRust && afstand < besteAfstand)) {
        beste = kandidaat;
        besteRust = rust;
        besteAfstand = afstand;
      }
    }
    return beste;
  }

  // Haalt de uitvaller uit de rustlijst van een ronde. Bij een pauze komt
  // hij bij de pauzerenden, zodat het als rustbeurt telt; wie vertrekt,
  // verdwijnt uit de ronde.
  function haalUit(ronde, id, reden) {
    ronde.rustend = ronde.rustend.filter(function (r) { return r !== id; });
    ronde.gepauzeerd = (ronde.gepauzeerd || []).filter(function (g) { return g !== id; });
    if (reden === 'pauze') ronde.gepauzeerd.push(id);
  }

  function vervangInRonde(ronde, avond, club, historie, id, reden) {
    const baan = baanVan(ronde, id);
    let nieuw = kopie(ronde);
    if (baan === null) {
      haalUit(nieuw, id, reden);
      return { ronde: nieuw, invaller: null, baan: null };
    }
    const invaller = invallerVoor(ronde, avond, club, historie, id);
    if (!invaller) return { ronde: ronde, invaller: null, baan: baan };
    nieuw = Hussel.wisselSpelers(nieuw, id, invaller, groepVan(club));
    haalUit(nieuw, id, reden);
    return { ronde: nieuw, invaller: invaller, baan: baan };
  }

  // Iemand valt uit: alleen die speler wordt vervangen, de rest van de
  // indeling blijft staan, ook handmatige wissels. In het concept bij een
  // pauze of vertrek; in de lopende ronde bij een vertrek of een pauze die
  // 'nu meteen' geldt. Is er niemand om in te vallen, dan wordt het concept
  // opnieuw geloot en blijft de lopende ronde zoals hij is.
  function valtUit(avond, club, id, opties) {
    let nieuw = kopie(avond);
    const invallen = [];
    const metConcept = opties.reden === 'vertrek' || !opties.nu;
    const metLopende = opties.reden === 'vertrek' || opties.nu;

    if (nieuw.concept && metConcept) {
      const opBaan = baanVan(nieuw.concept, id) !== null;
      const uitkomst = vervangInRonde(nieuw.concept, nieuw, club, nieuw.rondes, id, opties.reden);
      if (opBaan && !uitkomst.invaller) {
        const opnieuw = maakConcept(nieuw, club, { gewichten: opties.gewichten });
        if (!opnieuw.fout) {
          nieuw = opnieuw.avond;
          invallen.push({ waar: 'concept', uit: id, in: null, baan: null });
        }
      } else {
        nieuw.concept = uitkomst.ronde;
        if (uitkomst.invaller) invallen.push({ waar: 'concept', uit: id, in: uitkomst.invaller, baan: uitkomst.baan });
      }
      delete nieuw.verouderd[id];
    }

    if (metLopende && nieuw.rondes.length) {
      const index = nieuw.rondes.length - 1;
      const lopende = nieuw.rondes[index];
      if (baanVan(lopende, id) !== null) {
        const uitkomst = vervangInRonde(lopende, nieuw, club, nieuw.rondes.slice(0, index), id, opties.reden);
        nieuw.rondes[index] = uitkomst.ronde;
        invallen.push({ waar: 'ronde', uit: id, in: uitkomst.invaller, baan: uitkomst.baan });
      }
    }
    return { avond: nieuw, invallen: invallen };
  }

  // Pauze voor de volgende ronde, of met nu: true voor de lopende ronde
  // waarin de speler al op een baan staat.
  function pauzeer(avond, club, id, aan, nu, gewichten) {
    if (!isAanwezig(avond, id)) return { avond: avond, invallen: [] };
    if (aan && nu) return valtUit(avond, club, id, { reden: 'pauze', nu: true, gewichten: gewichten });
    const nieuw = zetPauze(avond, id, aan);
    if (!aan) return { avond: nieuw, invallen: [] };
    return valtUit(nieuw, club, id, { reden: 'pauze', nu: false, gewichten: gewichten });
  }

  function vertrek(avond, club, id, gewichten) {
    if (!isAanwezig(avond, id)) return { avond: avond, invallen: [] };
    return valtUit(meldAf(avond, id), club, id, { reden: 'vertrek', gewichten: gewichten });
  }

  // Het aantal banen mag tussen rondes veranderen. De lopende ronde blijft
  // staan; de wijziging geldt vanaf de volgende loting.
  function zetBanen(avond, banen) {
    const nieuw = kopie(avond);
    nieuw.banen = Math.min(20, Math.max(1, Math.round(banen)));
    return nieuw;
  }

  function aanwezigeSpelers(avond, club) {
    const spelers = [];
    for (const id of avond.aanwezigen) {
      const speler = spelerOp(club, id);
      if (speler) spelers.push(speler);
    }
    return spelers;
  }

  // Het concept is de volgende ronde in voorbereiding. Het telt niet mee in
  // de historie tot het gepubliceerd is.
  function maakConcept(avond, club, opties) {
    const instellingen = opties || {};
    const nieuw = kopie(avond);
    const aanwezigen = aanwezigeSpelers(nieuw, club);
    const gepauzeerd = Object.keys(nieuw.pauzes).filter(function (id) { return isAanwezig(nieuw, id); });
    const ronde = Hussel.genereerRonde({
      aanwezigen: aanwezigen,
      gepauzeerd: gepauzeerd,
      banen: nieuw.banen,
      historie: nieuw.rondes,
      rustcorrectie: nieuw.rustcorrectie,
      altijd: nieuw.eerste ? [nieuw.eerste] : [],
      gewichten: instellingen.gewichten,
      rng: instellingen.rng,
      pogingen: instellingen.pogingen,
    });
    if (!ronde) return { avond: avond, fout: 'te-weinig' };
    nieuw.concept = ronde;
    nieuw.verouderd = {};
    return { avond: nieuw, fout: null };
  }

  function groepVan(club) {
    const groepen = {};
    for (const speler of club.spelers) groepen[speler.id] = speler.groep;
    return groepen;
  }

  function wissel(avond, club, idA, idB) {
    const nieuw = kopie(avond);
    if (!nieuw.concept) return nieuw;
    nieuw.concept = Hussel.wisselSpelers(nieuw.concept, idA, idB, groepVan(club));
    nieuw.concept.handmatig = true;
    return nieuw;
  }

  // Wie zich aanmeldt terwijl er een concept openstaat, moet in de volgende
  // ronde mee kunnen doen. Het concept wordt dan opnieuw geloot, behalve
  // als de organisator er al met de hand in gewisseld heeft: dan blijft het
  // staan en toont de laptop een badge. Geeft de nieuwkomers terug.
  function nieuwkomersBuitenConcept(avond) {
    if (!avond.concept) return [];
    const ingedeeld = {};
    for (const baan of avond.concept.banen) {
      for (const id of baan.teamA.concat(baan.teamB)) ingedeeld[id] = true;
    }
    for (const id of avond.concept.rustend.concat(avond.concept.gepauzeerd || [])) ingedeeld[id] = true;
    return avond.aanwezigen.filter(function (id) { return !ingedeeld[id] && !avond.pauzes[id]; });
  }

  // De organisator mag het niveau van een speler tijdens de avond wijzigen.
  // Gespeelde rondes blijven zoals ze waren; het nieuwe niveau geldt vanaf
  // de volgende loting.
  function zetNiveau(club, id, groep) {
    if (!(Number.isInteger(groep) && groep >= 0 && groep < club.groepen.length)) return club;
    const nieuw = kopie(club);
    for (const speler of nieuw.spelers) {
      if (speler.id === id) speler.groep = groep;
    }
    return nieuw;
  }

  function staatOpBaanInConcept(avond, id) {
    if (!avond.concept) return false;
    for (const baan of avond.concept.banen) {
      if (baan.teamA.indexOf(id) !== -1 || baan.teamB.indexOf(id) !== -1) return true;
    }
    return false;
  }

  function markeerVerouderd(avond, id, reden) {
    const nieuw = kopie(avond);
    markeer(nieuw, id, reden);
    return nieuw;
  }

  function moetConceptVernieuwen(avond) {
    return Boolean(avond.concept) && !avond.concept.handmatig && nieuwkomersBuitenConcept(avond).length > 0;
  }

  // Een pauze geldt voor de eerstvolgende gepubliceerde ronde waarin hij
  // verwerkt is. Kwam hij binnen na het concept, dan schuift hij door.
  function publiceer(avond) {
    const nieuw = kopie(avond);
    if (!nieuw.concept) return nieuw;
    delete nieuw.concept.handmatig;
    nieuw.rondes.push(nieuw.concept);
    for (const id of nieuw.concept.gepauzeerd || []) delete nieuw.pauzes[id];
    nieuw.concept = null;
    nieuw.verouderd = {};
    return nieuw;
  }

  function telefoonVan(avond, spelerId) {
    for (const telefoon of Object.keys(avond.koppelingen)) {
      if (avond.koppelingen[telefoon] === spelerId) return telefoon;
    }
    return null;
  }

  function ontkoppel(avond, spelerId) {
    const nieuw = kopie(avond);
    const telefoon = telefoonVan(nieuw, spelerId);
    if (telefoon) delete nieuw.koppelingen[telefoon];
    return { avond: nieuw, telefoon: telefoon };
  }

  function koppel(avond, telefoon, spelerId) {
    const bezitter = telefoonVan(avond, spelerId);
    if (bezitter && bezitter !== telefoon) return { avond: avond, fout: 'bezet' };
    const nieuw = kopie(avond);
    nieuw.koppelingen[telefoon] = spelerId;
    return { avond: nieuw, fout: null };
  }

  function vergelijkbaar(naam) {
    return naam.trim().toLowerCase();
  }

  const MAX_NAAMLENGTE = 40;

  function schoneNaam(naam) {
    return String(naam || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAAMLENGTE);
  }

  function naamBestaat(club, naam, behalveId) {
    for (const speler of club.spelers) {
      if (speler.id !== behalveId && vergelijkbaar(speler.naam) === vergelijkbaar(naam)) return true;
    }
    return false;
  }

  // Een nieuwe speler meldt zich met de telefoon zelf aan, met naam en
  // niveau. Hij komt in de spelerslijst, staat meteen op de aanwezigheids-
  // lijst en is aan die telefoon gekoppeld.
  function registreer(avond, club, telefoon, naam, groep, nieuwId) {
    const schoon = schoneNaam(naam);
    if (!schoon) return { avond: avond, club: club, fout: 'lege-naam' };
    if (naamBestaat(club, schoon)) return { avond: avond, club: club, fout: 'naam-bestaat' };
    if (!(Number.isInteger(groep) && groep >= 0 && groep < club.groepen.length)) {
      return { avond: avond, club: club, fout: 'onbekend-niveau' };
    }
    const nieuweClub = kopie(club);
    nieuweClub.spelers.push({ id: nieuwId, naam: schoon, groep: groep });
    const nieuw = meldAan(avond, nieuwId);
    nieuw.koppelingen[telefoon] = nieuwId;
    return { avond: nieuw, club: nieuweClub, fout: null };
  }

  // Verwerkt één bericht van een telefoon. antwoord is null of een foutcode
  // die alleen aan die telefoon wordt teruggemeld. nieuwId is nodig voor een
  // registratie, zodat deze functie puur blijft.
  // Wie als eerste met een telefoon meedoet, speelt elke ronde op zijn eigen
  // niveau. Niet zichtbaar op telefoons of het scherm in de zaal.
  function onthoudEerste(uitkomst) {
    const avond = uitkomst.avond;
    if (uitkomst.antwoord || avond.eerste) return uitkomst;
    const id = avond.koppelingen[uitkomst.telefoon];
    if (!id || !isAanwezig(avond, id)) return uitkomst;
    const nieuw = kopie(avond);
    nieuw.eerste = id;
    return { avond: nieuw, club: uitkomst.club, antwoord: null };
  }

  function pasVerzoekToe(avond, club, verzoek, nieuwId, gewichten) {
    const uitkomst = verwerkVerzoek(avond, club, verzoek, nieuwId, gewichten);
    if (['claim', 'registreer', 'aanmelden'].indexOf(verzoek.type) === -1) return uitkomst;
    const metEerste = onthoudEerste({ avond: uitkomst.avond, club: uitkomst.club, antwoord: uitkomst.antwoord, telefoon: verzoek.telefoon });
    return { avond: metEerste.avond, club: metEerste.club, antwoord: metEerste.antwoord, invallen: uitkomst.invallen };
  }

  function verwerkVerzoek(avond, club, verzoek, nieuwId, gewichten) {
    const telefoon = verzoek.telefoon;
    const ik = avond.koppelingen[telefoon] || null;
    function uitkomst(nieuweAvond, fout, nieuweClub, invallen) {
      return { avond: nieuweAvond, club: nieuweClub || club, antwoord: fout ? { fout: fout } : null, invallen: invallen || [] };
    }

    switch (verzoek.type) {
      case 'hallo': {
        // Een bekende telefoon wordt weer gekoppeld, maar niet vanzelf
        // aangemeld: wie vertrokken is, blijft vertrokken.
        if (ik || !verzoek.speler || !spelerOp(club, verzoek.speler)) return uitkomst(avond, null);
        const poging = koppel(avond, telefoon, verzoek.speler);
        return uitkomst(poging.avond, null);
      }
      case 'claim': {
        // Je eigen naam aantikken betekent: ik ben er.
        if (!spelerOp(club, verzoek.speler)) return uitkomst(avond, 'onbekend');
        const poging = koppel(avond, telefoon, verzoek.speler);
        if (poging.fout) return uitkomst(avond, poging.fout);
        return uitkomst(meldAan(poging.avond, verzoek.speler), null);
      }
      case 'registreer': {
        if (!nieuwId) return uitkomst(avond, 'onbekend-verzoek');
        const poging = registreer(avond, club, telefoon, verzoek.naam, verzoek.groep, nieuwId);
        if (poging.fout) return uitkomst(avond, poging.fout);
        return uitkomst(poging.avond, null, poging.club);
      }
      case 'loslaten': {
        const nieuw = kopie(avond);
        delete nieuw.koppelingen[telefoon];
        return uitkomst(nieuw, null);
      }
      case 'pauze': {
        if (!ik) return uitkomst(avond, 'geen-naam');
        if (!isAanwezig(avond, ik)) return uitkomst(avond, 'niet-aanwezig');
        const gevolg = pauzeer(avond, club, ik, verzoek.aan, verzoek.nu === true, gewichten);
        return uitkomst(gevolg.avond, null, null, gevolg.invallen);
      }
      case 'vertrek': {
        if (!ik) return uitkomst(avond, 'geen-naam');
        const gevolg = vertrek(avond, club, ik, gewichten);
        return uitkomst(gevolg.avond, null, null, gevolg.invallen);
      }
      case 'aanmelden':
        if (!ik) return uitkomst(avond, 'geen-naam');
        return uitkomst(meldAan(avond, ik), null);
      default:
        return uitkomst(avond, 'onbekend-verzoek');
    }
  }

  function naamVan(club, id) {
    const speler = spelerOp(club, id);
    return speler ? speler.naam : '?';
  }

  function mijnPlek(ronde, id, club) {
    if (!ronde || !id) return null;
    for (const baan of ronde.banen) {
      const inA = baan.teamA.indexOf(id) !== -1;
      const inB = baan.teamB.indexOf(id) !== -1;
      if (inA || inB) {
        const eigen = inA ? baan.teamA : baan.teamB;
        const ander = inA ? baan.teamB : baan.teamA;
        return {
          status: 'speelt',
          baan: baan.baan,
          partner: naamVan(club, eigen[0] === id ? eigen[1] : eigen[0]),
          tegen: ander.map(function (a) { return naamVan(club, a); }),
        };
      }
    }
    if (ronde.rustend.indexOf(id) !== -1) return { status: 'rust' };
    if ((ronde.gepauzeerd || []).indexOf(id) !== -1) return { status: 'pauze' };
    return { status: 'niet-ingedeeld' };
  }

  // Wat één telefoon te zien krijgt. Alleen de gepubliceerde ronde, nooit
  // het concept.
  function toestandVoor(avond, club, telefoon) {
    const ik = avond ? avond.koppelingen[telefoon] || null : null;
    if (!avond) return { type: 'toestand', avondLoopt: false };

    const ronde = avond.rondes.length ? avond.rondes[avond.rondes.length - 1] : null;
    const spelers = club.spelers
      .map(function (speler) {
        return { id: speler.id, naam: speler.naam, aanwezig: isAanwezig(avond, speler.id) };
      })
      .sort(function (a, b) { return a.naam.localeCompare(b.naam, 'nl'); });

    function namen(ids) {
      return ids.map(function (id) { return naamVan(club, id); });
    }

    return {
      type: 'toestand',
      avondLoopt: true,
      spelers: spelers,
      ik: ik,
      ikNaam: ik ? naamVan(club, ik) : null,
      aanwezig: ik ? isAanwezig(avond, ik) : false,
      pauzeertVolgende: ik ? Boolean(avond.pauzes[ik]) : false,
      groepen: club.groepen.slice(),
      ronde: ronde ? {
        nummer: avond.rondes.length,
        banen: ronde.banen.map(function (baan) {
          return { baan: baan.baan, teamA: namen(baan.teamA), teamB: namen(baan.teamB) };
        }),
        rustend: namen(ronde.rustend),
        gepauzeerd: namen(ronde.gepauzeerd || []),
      } : null,
      mijn: mijnPlek(ronde, ik, club),
    };
  }

  globalThis.Sessie = {
    maakSessiecode: maakSessiecode,
    nieuweAvond: nieuweAvond,
    vulAan: vulAan,
    meldAan: meldAan,
    meldAf: meldAf,
    zetPauze: zetPauze,
    pauzeer: pauzeer,
    vertrek: vertrek,
    valtUit: valtUit,
    zetBanen: zetBanen,
    aanwezigeSpelers: aanwezigeSpelers,
    maakConcept: maakConcept,
    wissel: wissel,
    nieuwkomersBuitenConcept: nieuwkomersBuitenConcept,
    moetConceptVernieuwen: moetConceptVernieuwen,
    zetNiveau: zetNiveau,
    staatOpBaanInConcept: staatOpBaanInConcept,
    markeerVerouderd: markeerVerouderd,
    publiceer: publiceer,
    telefoonVan: telefoonVan,
    ontkoppel: ontkoppel,
    registreer: registreer,
    schoneNaam: schoneNaam,
    naamBestaat: naamBestaat,
    pasVerzoekToe: pasVerzoekToe,
    toestandVoor: toestandVoor,
  };
})();
