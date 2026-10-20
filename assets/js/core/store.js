(function () {
  'use strict';

  // Saves the club and the open evening in the browser. When the browser
  // will not store anything (private window, blocked storage) everything
  // still works from memory until the page closes.

  const CLUB_KEY = 'hussel.club';
  const EVENING_KEY = 'hussel.evening';
  const OLD_EVENING_KEY = 'hussel.avond';
  const PROBE_KEY = 'hussel.test';

  function createStore(storage) {
    const memory = {};
    let works = false;

    if (storage) {
      try {
        storage.setItem(PROBE_KEY, '1');
        storage.removeItem(PROBE_KEY);
        works = true;
      } catch (error) {
        works = false;
      }
    }

    function write(key, value) {
      const text = JSON.stringify(value);
      memory[key] = text;
      if (!works) return;
      try {
        storage.setItem(key, text);
      } catch (error) {
        works = false;
      }
    }

    function read(key) {
      let text = memory[key];
      if (text === undefined && works) {
        try {
          const saved = storage.getItem(key);
          if (saved !== null) text = saved;
        } catch (error) {
          works = false;
        }
      }
      if (text === undefined) return null;
      try {
        return JSON.parse(text);
      } catch (error) {
        return null;
      }
    }

    function remove(key) {
      delete memory[key];
      if (!works) return;
      try {
        storage.removeItem(key);
      } catch (error) {
        works = false;
      }
    }

    // Data from the Dutch-named version is converted once and written back,
    // so the next load finds it in the new shape. Migrate hands back the
    // same object when there is nothing to convert.
    function loadClub() {
      const data = read(CLUB_KEY);
      const club = Migrate.club(data);
      if (club !== data) write(CLUB_KEY, club);
      return club;
    }

    function loadEvening() {
      const data = read(EVENING_KEY);
      if (data === null) {
        const old = read(OLD_EVENING_KEY);
        if (old === null) return null;
        const evening = Migrate.evening(old);
        write(EVENING_KEY, evening);
        remove(OLD_EVENING_KEY);
        return evening;
      }
      const evening = Migrate.evening(data);
      if (evening !== data) write(EVENING_KEY, evening);
      return evening;
    }

    return {
      available: function () { return works; },
      loadClub: loadClub,
      saveClub: function (club) { write(CLUB_KEY, club); },
      loadEvening: loadEvening,
      saveEvening: function (evening) { write(EVENING_KEY, evening); },
      // The old key goes too, so a closed evening cannot come back from it.
      clearEvening: function () {
        remove(EVENING_KEY);
        remove(OLD_EVENING_KEY);
      },
    };
  }

  globalThis.createStore = createStore;
  globalThis.Store = createStore(typeof localStorage === 'undefined' ? null : localStorage);
})();
