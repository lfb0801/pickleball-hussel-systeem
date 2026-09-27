(function () {
  'use strict';

  // PapaParse doet het parseerwerk: scheidingsteken herkennen, aanhalings-
  // tekens en regeleindes. Hier blijft alleen over wat dit systeem eigen is:
  // uit elke rij de eerste kolom als spelersnaam halen.
  function leesNamen(tekst) {
    const zonderMarkering = tekst.replace(/^﻿/, '');
    const uitkomst = Papa.parse(zonderMarkering, { skipEmptyLines: 'greedy' });

    const namen = [];
    for (const rij of uitkomst.data) {
      if (!rij.length) continue;
      const naam = String(rij[0]).trim();
      if (naam) namen.push(naam);
    }

    if (namen.length && namen[0].toLowerCase() === 'naam') namen.shift();
    return namen;
  }

  globalThis.leesNamen = leesNamen;
})();
