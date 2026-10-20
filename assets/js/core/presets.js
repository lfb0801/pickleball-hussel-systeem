(function () {
  'use strict';

  // The organiser picks a preset, not individual weights. The values are a
  // starting point and get tuned here after an evening in the hall.
  const LIST = [
    {
      key: 'balanced',
      weights: { partner: 10, opponent: 3, levelGap: 8, borrower: 4, mixing: 0 },
    },
    {
      key: 'social',
      weights: { partner: 10, opponent: 5, levelGap: 2, borrower: 2, mixing: 1.2 },
    },
    {
      key: 'level',
      weights: { partner: 6, opponent: 2, levelGap: 30, borrower: 6, mixing: 0 },
    },
  ];

  const DEFAULT = 'balanced';

  function get(key) {
    for (const preset of LIST) {
      if (preset.key === key) return preset;
    }
    return get(DEFAULT);
  }

  globalThis.Presets = {
    list: LIST,
    DEFAULT: DEFAULT,
    get: get,
    weights: function (key) { return get(key).weights; },
  };
})();
