(function () {
  'use strict';

  // De organisator kiest een preset, geen losse gewichten. De waarden zijn
  // een vertrekpunt en worden na een avond in de zaal hier bijgesteld.
  const LIJST = [
    {
      sleutel: 'gebalanceerd',
      gewichten: { partner: 10, tegenstander: 3, niveaukloof: 8, lener: 4, menging: 0 },
    },
    {
      sleutel: 'sociaal',
      gewichten: { partner: 10, tegenstander: 5, niveaukloof: 2, lener: 2, menging: 1.2 },
    },
    {
      sleutel: 'niveau',
      gewichten: { partner: 6, tegenstander: 2, niveaukloof: 30, lener: 6, menging: 0 },
    },
  ];

  const STANDAARD = 'gebalanceerd';

  function op(sleutel) {
    for (const preset of LIJST) {
      if (preset.sleutel === sleutel) return preset;
    }
    return op(STANDAARD);
  }

  globalThis.Presets = {
    lijst: LIJST,
    STANDAARD: STANDAARD,
    op: op,
    gewichten: function (sleutel) { return op(sleutel).gewichten; },
  };
})();
