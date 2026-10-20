// Tests for Migrate and for the store's upgrade path from the Dutch-named
// version. Wrapped in a function so the helpers stay out of the global
// scope that tests.js shares.
(function () {
  'use strict';

  function fakeStorage(initial) {
    const data = Object.assign({}, initial || {});
    return {
      data: data,
      getItem: function (key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
      setItem: function (key, value) { data[key] = String(value); },
      removeItem: function (key) { delete data[key]; },
    };
  }

  function oldCourt(number, a, b, homeGroup, groups, borrowers) {
    return { baan: number, teamA: a, teamB: b, thuisgroep: homeGroup, groepen: groups, leners: borrowers };
  }

  function newCourt(number, a, b, homeGroup, groups, borrowers) {
    return { number: number, teamA: a, teamB: b, homeGroup: homeGroup, groups: groups, borrowers: borrowers };
  }

  function oldClub() {
    return {
      groepen: ['Gevorderd', 'Midden', 'Beginner'],
      spelers: [
        { id: 'p1', naam: 'Anna de Vries', groep: 0 },
        { id: 'p2', naam: 'Bram Jansen', groep: 2 },
      ],
      preset: 'sociaal',
    };
  }

  function newClub() {
    return {
      groups: ['Gevorderd', 'Midden', 'Beginner'],
      players: [
        { id: 'p1', name: 'Anna de Vries', group: 0 },
        { id: 'p2', name: 'Bram Jansen', group: 2 },
      ],
      preset: 'social',
    };
  }

  function oldEvening() {
    return {
      aanwezigen: ['a', 'b', 'c', 'd', 'e', 'f'],
      banen: 1,
      sessiecode: 'K7QM',
      rondes: [
        {
          banen: [oldCourt(1, ['a', 'b'], ['c', 'd'], 0, [0, 0, 0, 1], ['d'])],
          rustend: ['e'],
          gepauzeerd: ['f'],
        },
      ],
      rustcorrectie: { e: 1 },
      concept: {
        banen: [oldCourt(1, ['a', 'e'], ['b', 'c'], 0, [0, 0, 0, 0], [])],
        rustend: ['d'],
        gepauzeerd: ['f'],
        handmatig: true,
      },
      pauzes: { f: true },
      verouderd: { f: 'pauze', e: 'terug', d: 'vertrek', c: 'aanmelding', b: 'niveau' },
      koppelingen: { t1: 'a', t2: 'b' },
      eerste: 'a',
      bijgewerkt: 1700000000000,
    };
  }

  function newEvening() {
    return {
      attendees: ['a', 'b', 'c', 'd', 'e', 'f'],
      courts: 1,
      sessionCode: 'K7QM',
      rounds: [
        {
          courts: [newCourt(1, ['a', 'b'], ['c', 'd'], 0, [0, 0, 0, 1], ['d'])],
          resting: ['e'],
          paused: ['f'],
        },
      ],
      restCorrection: { e: 1 },
      draft: {
        courts: [newCourt(1, ['a', 'e'], ['b', 'c'], 0, [0, 0, 0, 0], [])],
        resting: ['d'],
        paused: ['f'],
        manual: true,
      },
      pauses: { f: true },
      stale: { f: 'pause', e: 'return', d: 'leave', c: 'checkIn', b: 'level' },
      links: { t1: 'a', t2: 'b' },
      first: 'a',
      updatedAt: 1700000000000,
    };
  }

  // ---- Migrate ----

  test('Migrate.club converts an old club', function () {
    assertEqual(Migrate.club(oldClub()), newClub());
  });

  test('Migrate.club converts every old preset key', function () {
    assertEqual(Migrate.club({ groepen: [], spelers: [], preset: 'gebalanceerd' }).preset, 'balanced');
    assertEqual(Migrate.club({ groepen: [], spelers: [], preset: 'sociaal' }).preset, 'social');
    assertEqual(Migrate.club({ groepen: [], spelers: [], preset: 'niveau' }).preset, 'level');
  });

  test('Migrate.club returns a new club unchanged', function () {
    const club = newClub();
    assert(Migrate.club(club) === club, 'same object expected');
    assertEqual(Migrate.club(club), newClub());
  });

  test('Migrate.club tolerates a club without preset or players', function () {
    assertEqual(Migrate.club({ groepen: ['A'] }), { groups: ['A'] });
    assertEqual(Migrate.club({ spelers: [{ id: 'x', naam: 'X' }] }), { players: [{ id: 'x', name: 'X' }] });
    assertEqual(Migrate.club({}), {});
  });

  test('Migrate.club converts a club with only the preset still old', function () {
    const club = { groups: ['A'], players: [], preset: 'niveau' };
    assertEqual(Migrate.club(club), { groups: ['A'], players: [], preset: 'level' });
    assertEqual(club.preset, 'niveau', 'input is not changed');
  });

  test('Migrate.evening converts an old evening with rounds, draft, stale reasons and links', function () {
    assertEqual(Migrate.evening(oldEvening()), newEvening());
  });

  test('Migrate.evening does not change its input', function () {
    const evening = oldEvening();
    Migrate.evening(evening);
    assertEqual(evening, oldEvening());
  });

  test('Migrate.evening returns a new evening unchanged', function () {
    const evening = newEvening();
    assert(Migrate.evening(evening) === evening, 'same object expected');
    assertEqual(Migrate.evening(evening), newEvening());
  });

  test('Migrate.evening keeps a missing draft as null', function () {
    const evening = oldEvening();
    evening.concept = null;
    const result = Migrate.evening(evening);
    assertEqual(result.draft, null);
    assertEqual(result.rounds, newEvening().rounds);
  });

  test('Migrate.evening tolerates an evening with only a few fields', function () {
    assertEqual(Migrate.evening({ aanwezigen: ['x'], banen: 3 }), { attendees: ['x'], courts: 3 });
    assertEqual(Migrate.evening({ banen: 2, rondes: [{ banen: [], rustend: [] }] }),
      { courts: 2, rounds: [{ courts: [], resting: [] }] });
    assertEqual(Migrate.evening({ rondes: [null] }), { rounds: [null] });
    assertEqual(Migrate.evening({}), {});
  });

  test('Migrate.evening keeps the first player optional', function () {
    const evening = oldEvening();
    delete evening.eerste;
    assert(!('first' in Migrate.evening(evening)), 'no first expected');
  });

  test('Migrate.phone converts old phone state', function () {
    const old = { telefoon: 'tabc123', sessie: 'K7QM', speler: 'p1', naam: 'Anna de Vries', niveau: 'Midden', laatsteRonde: 3, vertrokken: false };
    assertEqual(Migrate.phone(old),
      { phone: 'tabc123', session: 'K7QM', player: 'p1', name: 'Anna de Vries', level: 'Midden', lastRound: 3, left: false });
  });

  test('Migrate.phone tolerates partial state and keeps new state unchanged', function () {
    assertEqual(Migrate.phone({ telefoon: 't1', laatsteRonde: null }), { phone: 't1', lastRound: null });
    const state = { phone: 't1', session: 'ABCD', player: null, lastRound: null };
    assert(Migrate.phone(state) === state, 'same object expected');
  });

  test('Migrate.presetKey and staleReason convert old codes and keep new ones', function () {
    assertEqual(Migrate.presetKey('gebalanceerd'), 'balanced');
    assertEqual(Migrate.presetKey('level'), 'level');
    assertEqual(Migrate.presetKey(undefined), undefined);
    assertEqual(Migrate.staleReason('aanmelding'), 'checkIn');
    assertEqual(Migrate.staleReason('vertrek'), 'leave');
    assertEqual(Migrate.staleReason('pause'), 'pause');
    assertEqual(Migrate.staleReason(null), null);
  });

  test('Migrate returns null for null', function () {
    assertEqual(Migrate.club(null), null);
    assertEqual(Migrate.evening(null), null);
    assertEqual(Migrate.phone(null), null);
    assertEqual(Migrate.presetKey(null), null);
  });

  // ---- Store upgrade path ----

  test('store migrates an old club on load and writes it back', function () {
    const storage = fakeStorage({ 'hussel.club': JSON.stringify(oldClub()) });
    assertEqual(createStore(storage).loadClub(), newClub());
    assertEqual(JSON.parse(storage.data['hussel.club']), newClub());
  });

  test('store leaves a new club as it is', function () {
    const text = JSON.stringify(newClub());
    const storage = fakeStorage({ 'hussel.club': text });
    let writes = 0;
    const setItem = storage.setItem;
    storage.setItem = function (key, value) {
      if (key === 'hussel.club') writes += 1;
      setItem(key, value);
    };
    assertEqual(createStore(storage).loadClub(), newClub());
    assertEqual(writes, 0, 'no write back');
    assertEqual(storage.data['hussel.club'], text);
  });

  test('store moves an old evening to the new key', function () {
    const storage = fakeStorage({ 'hussel.avond': JSON.stringify(oldEvening()) });
    const store = createStore(storage);
    assertEqual(store.loadEvening(), newEvening());
    assertEqual(JSON.parse(storage.data['hussel.evening']), newEvening());
    assert(!('hussel.avond' in storage.data), 'old evening key removed');
    assertEqual(createStore(storage).loadEvening(), newEvening(), 'a fresh store finds it under the new key');
  });

  test('store prefers the new evening key over the old one', function () {
    const storage = fakeStorage({
      'hussel.evening': JSON.stringify(newEvening()),
      'hussel.avond': JSON.stringify({ aanwezigen: ['old'], banen: 9 }),
    });
    assertEqual(createStore(storage).loadEvening(), newEvening());
  });

  test('store clears both the new and the old evening key', function () {
    const storage = fakeStorage({ 'hussel.avond': JSON.stringify(oldEvening()) });
    const store = createStore(storage);
    store.clearEvening();
    assertEqual(store.loadEvening(), null);
    assert(!('hussel.avond' in storage.data), 'old evening key removed');
  });

  test('store migrates old data in memory when storage refuses', function () {
    const store = createStore(null);
    store.saveClub(oldClub());
    assertEqual(store.loadClub(), newClub());
    assertEqual(store.loadEvening(), null);
  });

  test('store uses the new probe key and leaves no probe behind', function () {
    const storage = fakeStorage();
    const seen = [];
    const setItem = storage.setItem;
    storage.setItem = function (key, value) {
      seen.push(key);
      setItem(key, value);
    };
    assertEqual(createStore(storage).available(), true);
    assertEqual(seen, ['hussel.test']);
    assertEqual(Object.keys(storage.data), []);
  });
})();
