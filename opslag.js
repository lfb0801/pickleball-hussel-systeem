(function () {
  'use strict';

  const SLEUTEL_CLUB = 'hussel.club';
  const SLEUTEL_AVOND = 'hussel.avond';
  const SLEUTEL_PROEF = 'hussel.proef';

  function maakOpslag(store) {
    const geheugen = {};
    let werkt = false;

    if (store) {
      try {
        store.setItem(SLEUTEL_PROEF, '1');
        store.removeItem(SLEUTEL_PROEF);
        werkt = true;
      } catch (fout) {
        werkt = false;
      }
    }

    function schrijf(sleutel, waarde) {
      const tekst = JSON.stringify(waarde);
      geheugen[sleutel] = tekst;
      if (!werkt) return;
      try {
        store.setItem(sleutel, tekst);
      } catch (fout) {
        werkt = false;
      }
    }

    function lees(sleutel) {
      let tekst = geheugen[sleutel];
      if (tekst === undefined && werkt) {
        try {
          const opgeslagen = store.getItem(sleutel);
          if (opgeslagen !== null) tekst = opgeslagen;
        } catch (fout) {
          werkt = false;
        }
      }
      if (tekst === undefined) return null;
      try {
        return JSON.parse(tekst);
      } catch (fout) {
        return null;
      }
    }

    function wis(sleutel) {
      delete geheugen[sleutel];
      if (!werkt) return;
      try {
        store.removeItem(sleutel);
      } catch (fout) {
        werkt = false;
      }
    }

    return {
      beschikbaar: function () { return werkt; },
      laadClub: function () { return lees(SLEUTEL_CLUB); },
      bewaarClub: function (club) { schrijf(SLEUTEL_CLUB, club); },
      laadAvond: function () { return lees(SLEUTEL_AVOND); },
      bewaarAvond: function (avond) { schrijf(SLEUTEL_AVOND, avond); },
      wisAvond: function () { wis(SLEUTEL_AVOND); },
    };
  }

  globalThis.maakOpslag = maakOpslag;
  globalThis.Opslag = maakOpslag(typeof localStorage === 'undefined' ? null : localStorage);
})();
