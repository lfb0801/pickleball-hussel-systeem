(function () {
  'use strict';

  // Turns data saved by the Dutch-named version into the English shape, so a
  // club's player list and an evening that is still open survive the
  // upgrade. Pure: no DOM, no storage. Anything already in the new shape
  // comes back as the very same object, which is how the store knows there
  // is nothing to write back. Partial data is converted as far as it goes.

  const CLUB_FIELDS = { groepen: 'groups', spelers: 'players' };
  const PLAYER_FIELDS = { naam: 'name', groep: 'group' };
  const EVENING_FIELDS = {
    aanwezigen: 'attendees',
    banen: 'courts',
    sessiecode: 'sessionCode',
    rondes: 'rounds',
    rustcorrectie: 'restCorrection',
    concept: 'draft',
    pauzes: 'pauses',
    verouderd: 'stale',
    koppelingen: 'links',
    eerste: 'first',
    bijgewerkt: 'updatedAt',
  };
  const ROUND_FIELDS = { banen: 'courts', rustend: 'resting', gepauzeerd: 'paused', handmatig: 'manual' };
  const COURT_FIELDS = { baan: 'number', thuisgroep: 'homeGroup', groepen: 'groups', leners: 'borrowers' };
  const PHONE_FIELDS = {
    telefoon: 'phone',
    sessie: 'session',
    speler: 'player',
    naam: 'name',
    niveau: 'level',
    laatsteRonde: 'lastRound',
    vertrokken: 'left',
  };
  const PRESET_KEYS = { gebalanceerd: 'balanced', sociaal: 'social', niveau: 'level' };
  const STALE_REASONS = { pauze: 'pause', terug: 'return', vertrek: 'leave', aanmelding: 'checkIn', niveau: 'level' };

  function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function has(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  // Renames old keys and keeps the key order. When both an old and a new key are
  // present the new one wins, since it can only have been written later.
  function renameKeys(object, fields) {
    if (!isObject(object)) return object;
    let changed = false;
    const result = {};
    for (const key of Object.keys(object)) {
      if (has(fields, key)) {
        changed = true;
        if (!has(object, fields[key])) result[fields[key]] = object[key];
      } else {
        result[key] = object[key];
      }
    }
    return changed ? result : object;
  }

  function mapList(list, convert) {
    if (!Array.isArray(list)) return list;
    let changed = false;
    const result = list.map(function (item) {
      const converted = convert(item);
      if (converted !== item) changed = true;
      return converted;
    });
    return changed ? result : list;
  }

  function mapValues(object, convert) {
    if (!isObject(object)) return object;
    let changed = false;
    const result = {};
    for (const key of Object.keys(object)) {
      result[key] = convert(object[key]);
      if (result[key] !== object[key]) changed = true;
    }
    return changed ? result : object;
  }

  // Copies the object only when the field really changes.
  function withField(object, key, value) {
    if (!has(object, key) || object[key] === value) return object;
    const result = Object.assign({}, object);
    result[key] = value;
    return result;
  }

  function lookup(table, value) {
    return typeof value === 'string' && has(table, value) ? table[value] : value;
  }

  function presetKey(key) {
    return lookup(PRESET_KEYS, key);
  }

  function staleReason(reason) {
    return lookup(STALE_REASONS, reason);
  }

  function player(data) {
    return renameKeys(data, PLAYER_FIELDS);
  }

  function club(data) {
    if (!isObject(data)) return data;
    let result = renameKeys(data, CLUB_FIELDS);
    result = withField(result, 'players', mapList(result.players, player));
    result = withField(result, 'preset', presetKey(result.preset));
    return result;
  }

  function court(data) {
    return renameKeys(data, COURT_FIELDS);
  }

  function round(data) {
    if (!isObject(data)) return data;
    const result = renameKeys(data, ROUND_FIELDS);
    return withField(result, 'courts', mapList(result.courts, court));
  }

  function evening(data) {
    if (!isObject(data)) return data;
    let result = renameKeys(data, EVENING_FIELDS);
    result = withField(result, 'rounds', mapList(result.rounds, round));
    result = withField(result, 'draft', round(result.draft));
    result = withField(result, 'stale', mapValues(result.stale, staleReason));
    return result;
  }

  function phone(data) {
    return renameKeys(data, PHONE_FIELDS);
  }

  globalThis.Migrate = {
    club: club,
    evening: evening,
    phone: phone,
    presetKey: presetKey,
    staleReason: staleReason,
  };
})();
