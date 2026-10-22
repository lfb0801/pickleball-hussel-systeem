(function () {
  'use strict';

  // The rules of the live session: requests from phones and actions on the
  // laptop go through the same functions. Everything is pure: each function
  // gets the state passed in and returns a new one, without network, DOM or
  // storage. That makes the session testable under Node.

  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createSessionCode(rng) {
    const random = rng === undefined ? Math.random : rng;
    let code = '';
    for (let i = 0; i < 6; i += 1) {
      code += CODE_CHARS[Math.floor(random() * CODE_CHARS.length)];
    }
    return code;
  }

  function newEvening(attendees, courts, sessionCode) {
    return fillIn({ attendees: attendees.slice(), courts: courts, sessionCode: sessionCode });
  }

  // Fills in fields that an evening from an older version did not have yet.
  function fillIn(evening) {
    const complete = copy(evening);
    if (!complete.rounds) complete.rounds = [];
    if (!complete.restCorrection) complete.restCorrection = {};
    if (complete.draft === undefined) complete.draft = null;
    if (!complete.pauses) complete.pauses = {};
    if (!complete.stale) complete.stale = {};
    if (!complete.links) complete.links = {};
    if (!complete.sessionCode) complete.sessionCode = createSessionCode();
    return complete;
  }

  function playerById(club, id) {
    for (const player of club.players) {
      if (player.id === id) return player;
    }
    return null;
  }

  function isPresent(evening, id) {
    return evening.attendees.indexOf(id) !== -1;
  }

  // A change after the draft was made: the laptop shows a badge and says
  // that generating again is needed.
  function mark(evening, id, reason) {
    if (evening.draft) evening.stale[id] = reason;
  }

  // A latecomer starts at zero rest turns and would therefore be the first
  // to rest. The highest balance among the attendees lets them join the
  // rotation straight away.
  function checkIn(evening, id) {
    const updated = copy(evening);
    if (isPresent(updated, id)) return updated;
    const stats = Pairing.historyStats(updated.rounds, updated.restCorrection);
    const current = Pairing.count(stats.rest, id);
    const highest = Pairing.highestRestBalance(stats, updated.attendees);
    updated.restCorrection[id] = (updated.restCorrection[id] || 0) + Math.max(0, highest - current);
    updated.attendees.push(id);
    mark(updated, id, 'checkIn');
    return updated;
  }

  function checkOut(evening, id) {
    const updated = copy(evening);
    if (!isPresent(updated, id)) return updated;
    updated.attendees = updated.attendees.filter(function (a) { return a !== id; });
    delete updated.pauses[id];
    mark(updated, id, 'leave');
    return updated;
  }

  function setPause(evening, id, on) {
    const updated = copy(evening);
    if (!isPresent(updated, id)) return updated;
    if (Boolean(updated.pauses[id]) === Boolean(on)) return updated;
    if (on) updated.pauses[id] = true;
    else delete updated.pauses[id];
    mark(updated, id, on ? 'pause' : 'return');
    // Whoever withdraws their pause while the draft already has them as
    // paused goes back to the resting players in it.
    if (!on && updated.draft && (updated.draft.paused || []).indexOf(id) !== -1) {
      updated.draft.paused = updated.draft.paused.filter(function (p) { return p !== id; });
      updated.draft.resting.push(id);
    }
    return updated;
  }

  function courtOf(round, id) {
    for (const court of round.courts) {
      if (court.teamA.indexOf(id) !== -1 || court.teamB.indexOf(id) !== -1) return court.number;
    }
    return null;
  }

  // The substitute is the resting player who has rested the most; on a tie,
  // the one closest to the level of the player dropping out.
  function substituteFor(round, evening, club, history, id) {
    const groups = groupOf(club);
    const stats = Pairing.historyStats(history, evening.restCorrection);
    let best = null;
    let bestRest = -1;
    let bestDistance = Infinity;
    for (const candidate of round.resting) {
      if (candidate === id || !isPresent(evening, candidate) || evening.pauses[candidate]) continue;
      const rest = Pairing.count(stats.rest, candidate);
      const distance = Math.abs((groups[candidate] || 0) - (groups[id] || 0));
      if (rest > bestRest || (rest === bestRest && distance < bestDistance)) {
        best = candidate;
        bestRest = rest;
        bestDistance = distance;
      }
    }
    return best;
  }

  // Takes the player dropping out off a round's resting list. On a pause they
  // join the paused players, so it counts as a rest turn; whoever leaves
  // disappears from the round.
  function takeOut(round, id, reason) {
    round.resting = round.resting.filter(function (r) { return r !== id; });
    round.paused = (round.paused || []).filter(function (p) { return p !== id; });
    if (reason === 'pause') round.paused.push(id);
  }

  function replaceInRound(round, evening, club, history, id, reason) {
    const court = courtOf(round, id);
    let updated = copy(round);
    if (court === null) {
      takeOut(updated, id, reason);
      return { round: updated, substitute: null, court: null };
    }
    const substitute = substituteFor(round, evening, club, history, id);
    if (!substitute) return { round: round, substitute: null, court: court };
    updated = Pairing.swapPlayers(updated, id, substitute, groupOf(club));
    takeOut(updated, id, reason);
    return { round: updated, substitute: substitute, court: court };
  }

  // Someone drops out: only that player is replaced, the rest of the line-up
  // stays, manual swaps included. In the draft on a pause or a leave; in the
  // running round on a leave or a pause that applies 'right now'. If there is
  // nobody to substitute, the draft is redrawn and the running round stays
  // as it is.
  function dropOut(evening, club, id, options) {
    let updated = copy(evening);
    const substitutions = [];
    const inDraft = options.reason === 'leave' || !options.now;
    const inRunning = options.reason === 'leave' || options.now;

    if (updated.draft && inDraft) {
      const onCourt = courtOf(updated.draft, id) !== null;
      const result = replaceInRound(updated.draft, updated, club, updated.rounds, id, options.reason);
      if (onCourt && !result.substitute) {
        const redrawn = createDraft(updated, club, { weights: options.weights });
        if (!redrawn.error) {
          updated = redrawn.evening;
          substitutions.push({ where: 'draft', out: id, in: null, court: null });
        }
      } else {
        updated.draft = result.round;
        if (result.substitute) substitutions.push({ where: 'draft', out: id, in: result.substitute, court: result.court });
      }
      delete updated.stale[id];
    }

    if (inRunning && updated.rounds.length) {
      const index = updated.rounds.length - 1;
      const running = updated.rounds[index];
      if (courtOf(running, id) !== null) {
        const result = replaceInRound(running, updated, club, updated.rounds.slice(0, index), id, options.reason);
        updated.rounds[index] = result.round;
        substitutions.push({ where: 'round', out: id, in: result.substitute, court: result.court });
      }
    }
    return { evening: updated, substitutions: substitutions };
  }

  // A pause for the next round, or with now: true for the running round in
  // which the player is already on a court.
  function pause(evening, club, id, on, now, weights) {
    if (!isPresent(evening, id)) return { evening: evening, substitutions: [] };
    if (on && now) return dropOut(evening, club, id, { reason: 'pause', now: true, weights: weights });
    const updated = setPause(evening, id, on);
    if (!on) return { evening: updated, substitutions: [] };
    return dropOut(updated, club, id, { reason: 'pause', now: false, weights: weights });
  }

  function leave(evening, club, id, weights) {
    if (!isPresent(evening, id)) return { evening: evening, substitutions: [] };
    return dropOut(checkOut(evening, id), club, id, { reason: 'leave', weights: weights });
  }

  // The number of courts may change between rounds. The running round stays
  // as it is; the change applies from the next draw.
  function setCourts(evening, courts) {
    const updated = copy(evening);
    updated.courts = Math.min(20, Math.max(1, Math.round(courts)));
    return updated;
  }

  const FORGOTTEN_AFTER = 12 * 60 * 60 * 1000;

  // An evening that has not changed for twelve hours was probably never
  // closed. Without a timestamp (from an older version) we cannot tell, so
  // we ask just to be safe.
  function isForgotten(evening, now) {
    if (!evening) return false;
    if (typeof evening.updatedAt !== 'number') return true;
    return now - evening.updatedAt > FORGOTTEN_AFTER;
  }

  function presentPlayers(evening, club) {
    const players = [];
    for (const id of evening.attendees) {
      const player = playerById(club, id);
      if (player) players.push(player);
    }
    return players;
  }

  // The draft is the next round in preparation. It does not count towards
  // the history until it is published.
  function createDraft(evening, club, options) {
    const settings = options || {};
    const updated = copy(evening);
    const attendees = presentPlayers(updated, club);
    const paused = Object.keys(updated.pauses).filter(function (id) { return isPresent(updated, id); });
    const round = Pairing.generateRound({
      attendees: attendees,
      paused: paused,
      courts: updated.courts,
      history: updated.rounds,
      restCorrection: updated.restCorrection,
      always: updated.first ? [updated.first] : [],
      weights: settings.weights,
      rng: settings.rng,
      attempts: settings.attempts,
    });
    if (!round) return { evening: evening, error: 'too-few' };
    updated.draft = round;
    updated.stale = {};
    return { evening: updated, error: null };
  }

  function groupOf(club) {
    const groups = {};
    for (const player of club.players) groups[player.id] = player.group;
    return groups;
  }

  function swap(evening, club, idA, idB) {
    const updated = copy(evening);
    if (!updated.draft) return updated;
    updated.draft = Pairing.swapPlayers(updated.draft, idA, idB, groupOf(club));
    updated.draft.manual = true;
    return updated;
  }

  // Whoever checks in while a draft is open must be able to play in the next
  // round. The draft is then redrawn, unless the organiser has already
  // swapped in it by hand: then it stays and the laptop shows a badge.
  // Returns the newcomers.
  function newcomersOutsideDraft(evening) {
    if (!evening.draft) return [];
    const placed = {};
    for (const court of evening.draft.courts) {
      for (const id of court.teamA.concat(court.teamB)) placed[id] = true;
    }
    for (const id of evening.draft.resting.concat(evening.draft.paused || [])) placed[id] = true;
    return evening.attendees.filter(function (id) { return !placed[id] && !evening.pauses[id]; });
  }

  // The organiser may change a player's level during the evening. Rounds
  // already played stay as they were; the new level applies from the next
  // draw.
  function setLevel(club, id, group) {
    if (!(Number.isInteger(group) && group >= 0 && group < club.groups.length)) return club;
    const updated = copy(club);
    for (const player of updated.players) {
      if (player.id === id) player.group = group;
    }
    return updated;
  }

  function isOnCourtInDraft(evening, id) {
    if (!evening.draft) return false;
    for (const court of evening.draft.courts) {
      if (court.teamA.indexOf(id) !== -1 || court.teamB.indexOf(id) !== -1) return true;
    }
    return false;
  }

  function markStale(evening, id, reason) {
    const updated = copy(evening);
    mark(updated, id, reason);
    return updated;
  }

  function shouldRefreshDraft(evening) {
    return Boolean(evening.draft) && !evening.draft.manual && newcomersOutsideDraft(evening).length > 0;
  }

  // A pause applies to the first published round that takes it into
  // account. If it came in after the draft, it carries over.
  function publish(evening) {
    const updated = copy(evening);
    if (!updated.draft) return updated;
    delete updated.draft.manual;
    updated.rounds.push(updated.draft);
    for (const id of updated.draft.paused || []) delete updated.pauses[id];
    updated.draft = null;
    updated.stale = {};
    return updated;
  }

  function phoneOf(evening, playerId) {
    for (const phone of Object.keys(evening.links)) {
      if (evening.links[phone] === playerId) return phone;
    }
    return null;
  }

  function unlink(evening, playerId) {
    const updated = copy(evening);
    const phone = phoneOf(updated, playerId);
    if (phone) delete updated.links[phone];
    return { evening: updated, phone: phone };
  }

  function link(evening, phone, playerId) {
    const holder = phoneOf(evening, playerId);
    if (holder && holder !== phone) return { evening: evening, error: 'taken' };
    const updated = copy(evening);
    updated.links[phone] = playerId;
    return { evening: updated, error: null };
  }

  function comparable(name) {
    return name.trim().toLowerCase();
  }

  const MAX_NAME_LENGTH = 40;

  function cleanName(name) {
    return String(name || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);
  }

  function playerWithName(club, name) {
    const clean = cleanName(name);
    if (!clean) return null;
    for (const player of club.players) {
      if (comparable(player.name) === comparable(clean)) return player.id;
    }
    return null;
  }

  function nameExists(club, name, exceptId) {
    for (const player of club.players) {
      if (player.id !== exceptId && comparable(player.name) === comparable(name)) return true;
    }
    return false;
  }

  // A new player registers on the phone itself, with name and level. They
  // are added to the player list, are on the attendance list straight away
  // and are linked to that phone.
  function register(evening, club, phone, name, group, newId) {
    const clean = cleanName(name);
    if (!clean) return { evening: evening, club: club, error: 'empty-name' };
    if (nameExists(club, clean)) return { evening: evening, club: club, error: 'name-exists' };
    if (!(Number.isInteger(group) && group >= 0 && group < club.groups.length)) {
      return { evening: evening, club: club, error: 'unknown-level' };
    }
    const newClub = copy(club);
    newClub.players.push({ id: newId, name: clean, group: group });
    const updated = checkIn(evening, newId);
    updated.links[phone] = newId;
    return { evening: updated, club: newClub, error: null };
  }

  // Handles one message from a phone. reply is null or an error code that is
  // reported back to that phone only. newId is needed for a registration, so
  // this function stays pure.
  // Whoever joins first with a phone plays every round at their own level.
  // Not visible on phones or on the screen in the hall.
  function rememberFirst(result) {
    const evening = result.evening;
    if (result.reply || evening.first) return result;
    const id = evening.links[result.phone];
    if (!id || !isPresent(evening, id)) return result;
    const updated = copy(evening);
    updated.first = id;
    return { evening: updated, club: result.club, reply: null };
  }

  function applyRequest(evening, club, request, newId, weights) {
    const result = handleRequest(evening, club, request, newId, weights);
    if (['claim', 'register', 'checkIn'].indexOf(request.type) === -1) return result;
    const withFirst = rememberFirst({ evening: result.evening, club: result.club, reply: result.reply, phone: request.phone });
    return { evening: withFirst.evening, club: withFirst.club, reply: withFirst.reply, substitutions: result.substitutions };
  }

  function handleRequest(evening, club, request, newId, weights) {
    const phone = request.phone;
    const me = evening.links[phone] || null;
    function result(newEvening, error, newClub, substitutions) {
      return { evening: newEvening, club: newClub || club, reply: error ? { error: error } : null, substitutions: substitutions || [] };
    }

    switch (request.type) {
      case 'hello': {
        // A known phone is linked again, but not checked in automatically:
        // whoever left stays gone. If this laptop does not know the stored
        // player id, it recognises the player by name.
        if (me) return result(evening, null);
        const known = request.player && playerById(club, request.player)
          ? request.player
          : playerWithName(club, request.name);
        if (!known) return result(evening, null);
        const attempt = link(evening, phone, known);
        return result(attempt.evening, null);
      }
      case 'claim': {
        // Tapping your own name means: I'm here.
        if (!playerById(club, request.player)) return result(evening, 'unknown');
        const attempt = link(evening, phone, request.player);
        if (attempt.error) return result(evening, attempt.error);
        return result(checkIn(attempt.evening, request.player), null);
      }
      case 'register': {
        if (!newId) return result(evening, 'unknown-request');
        const attempt = register(evening, club, phone, request.name, request.group, newId);
        if (attempt.error) return result(evening, attempt.error);
        return result(attempt.evening, null, attempt.club);
      }
      case 'release': {
        const updated = copy(evening);
        delete updated.links[phone];
        return result(updated, null);
      }
      case 'pause': {
        if (!me) return result(evening, 'no-name');
        if (!isPresent(evening, me)) return result(evening, 'not-present');
        const outcome = pause(evening, club, me, request.on, request.now === true, weights);
        return result(outcome.evening, null, null, outcome.substitutions);
      }
      case 'leave': {
        if (!me) return result(evening, 'no-name');
        const outcome = leave(evening, club, me, weights);
        return result(outcome.evening, null, null, outcome.substitutions);
      }
      case 'checkIn':
        if (!me) return result(evening, 'no-name');
        return result(checkIn(evening, me), null);
      default:
        return result(evening, 'unknown-request');
    }
  }

  // A check-in pass held up to the laptop camera means: I'm here. The
  // player is found by the id on the pass, else by name, and the phone on
  // the pass is linked to them, so it finds its player straight away once
  // it does get a connection. If another phone already holds that name, the
  // player is still checked in; the link stays where it was. Someone nobody
  // knows yet is signed up with the level on the pass. Without a level this
  // laptop knows, outcome 'needs-level' asks the laptop to let the player
  // choose; the scan is then repeated with that group.
  function scanPass(evening, club, pass, newId, group) {
    const phone = pass.phone;
    function result(newEvening, newClub, outcome, player, error) {
      if (outcome === 'checked-in' || outcome === 'registered') {
        newEvening = rememberFirst({ evening: newEvening, club: newClub, reply: null, phone: phone }).evening;
      }
      return { evening: newEvening, club: newClub, outcome: outcome, player: player, error: error || null };
    }

    const known = pass.player && playerById(club, pass.player)
      ? pass.player
      : playerWithName(club, pass.name);
    if (known) {
      const attempt = link(evening, phone, known);
      const linked = attempt.error ? evening : attempt.evening;
      if (isPresent(linked, known)) return result(linked, club, 'already-here', known);
      return result(checkIn(linked, known), club, 'checked-in', known);
    }

    if (!cleanName(pass.name)) return result(evening, club, 'error', null, 'empty-name');
    const chosen = group === undefined ? club.groups.indexOf(pass.level) : group;
    if (chosen === -1) return result(evening, club, 'needs-level', null);
    if (!newId) return result(evening, club, 'error', null, 'unknown-request');
    const attempt = register(evening, club, phone, pass.name, chosen, newId);
    if (attempt.error) return result(evening, club, 'error', null, attempt.error);
    return result(attempt.evening, attempt.club, 'registered', newId);
  }

  function nameOf(club, id) {
    const player = playerById(club, id);
    return player ? player.name : '?';
  }

  function mySpot(round, id, club) {
    if (!round || !id) return null;
    for (const court of round.courts) {
      const inA = court.teamA.indexOf(id) !== -1;
      const inB = court.teamB.indexOf(id) !== -1;
      if (inA || inB) {
        const own = inA ? court.teamA : court.teamB;
        const other = inA ? court.teamB : court.teamA;
        return {
          status: 'playing',
          court: court.number,
          partner: nameOf(club, own[0] === id ? own[1] : own[0]),
          opponents: other.map(function (o) { return nameOf(club, o); }),
        };
      }
    }
    if (round.resting.indexOf(id) !== -1) return { status: 'resting' };
    if ((round.paused || []).indexOf(id) !== -1) return { status: 'paused' };
    return { status: 'unassigned' };
  }

  // What one phone gets to see. Only the published round, never the draft.
  function stateFor(evening, club, phone) {
    const me = evening ? evening.links[phone] || null : null;
    if (!evening) return { type: 'state', eveningRunning: false };

    const round = evening.rounds.length ? evening.rounds[evening.rounds.length - 1] : null;
    const players = club.players
      .map(function (player) {
        return { id: player.id, name: player.name, present: isPresent(evening, player.id) };
      })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });

    function names(ids) {
      return ids.map(function (id) { return nameOf(club, id); });
    }

    return {
      type: 'state',
      eveningRunning: true,
      players: players,
      me: me,
      myName: me ? nameOf(club, me) : null,
      myLevel: me && playerById(club, me) ? club.groups[playerById(club, me).group] : null,
      present: me ? isPresent(evening, me) : false,
      pausingNext: me ? Boolean(evening.pauses[me]) : false,
      groups: club.groups.slice(),
      round: round ? {
        number: evening.rounds.length,
        courts: round.courts.map(function (court) {
          return { number: court.number, teamA: names(court.teamA), teamB: names(court.teamB) };
        }),
        resting: names(round.resting),
        paused: names(round.paused || []),
      } : null,
      mine: mySpot(round, me, club),
    };
  }

  globalThis.Session = {
    createSessionCode: createSessionCode,
    newEvening: newEvening,
    fillIn: fillIn,
    checkIn: checkIn,
    checkOut: checkOut,
    setPause: setPause,
    pause: pause,
    leave: leave,
    dropOut: dropOut,
    setCourts: setCourts,
    isForgotten: isForgotten,
    presentPlayers: presentPlayers,
    createDraft: createDraft,
    swap: swap,
    newcomersOutsideDraft: newcomersOutsideDraft,
    shouldRefreshDraft: shouldRefreshDraft,
    setLevel: setLevel,
    isOnCourtInDraft: isOnCourtInDraft,
    markStale: markStale,
    publish: publish,
    phoneOf: phoneOf,
    unlink: unlink,
    register: register,
    cleanName: cleanName,
    nameExists: nameExists,
    applyRequest: applyRequest,
    scanPass: scanPass,
    stateFor: stateFor,
  };
})();
