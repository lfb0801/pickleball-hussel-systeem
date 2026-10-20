test('createRng gives the same sequence for the same seed', function () {
  const a = Pairing.createRng(42);
  const b = Pairing.createRng(42);
  const sequenceA = [a(), a(), a()];
  const sequenceB = [b(), b(), b()];
  assertEqual(sequenceA, sequenceB);
});

test('createRng gives numbers between 0 and 1', function () {
  const rng = Pairing.createRng(7);
  for (let i = 0; i < 100; i += 1) {
    const value = rng();
    assert(value >= 0 && value < 1, 'value out of range: ' + value);
  }
});

test('shuffle keeps all elements and leaves the original untouched', function () {
  const original = [1, 2, 3, 4, 5];
  const shuffled = Pairing.shuffle(original, Pairing.createRng(3));
  assertEqual(original, [1, 2, 3, 4, 5], 'original was changed');
  assertEqual(shuffled.slice().sort(function (a, b) { return a - b; }), [1, 2, 3, 4, 5]);
});

test('shuffle changes the order of a long enough list', function () {
  const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const shuffled = Pairing.shuffle(original, Pairing.createRng(3));
  assert(JSON.stringify(shuffled) !== JSON.stringify(original), 'order did not change');
});

function makeTestRound(courts, resting) {
  return { courts: courts, resting: resting || [] };
}

function makeTestCourt(number, teamA, teamB, borrowers) {
  return {
    number: number,
    teamA: teamA,
    teamB: teamB,
    homeGroup: 0,
    groups: [0],
    borrowers: borrowers || [],
  };
}

test('pairKey does not depend on the order', function () {
  assertEqual(Pairing.pairKey('a', 'b'), Pairing.pairKey('b', 'a'));
  assert(Pairing.pairKey('a', 'b') !== Pairing.pairKey('a', 'c'));
});

test('count returns zero for an unknown key', function () {
  assertEqual(Pairing.count({ x: 2 }, 'x'), 2);
  assertEqual(Pairing.count({ x: 2 }, 'y'), 0);
});

test('history stats count partners, opponents, rest and borrowers', function () {
  const rounds = [
    makeTestRound([makeTestCourt(1, ['a', 'b'], ['c', 'd'], ['d'])], ['e']),
    makeTestRound([makeTestCourt(1, ['a', 'b'], ['c', 'e'], [])], ['d']),
  ];
  const stats = Pairing.historyStats(rounds);
  assertEqual(Pairing.count(stats.partner, Pairing.pairKey('a', 'b')), 2);
  assertEqual(Pairing.count(stats.partner, Pairing.pairKey('c', 'd')), 1);
  assertEqual(Pairing.count(stats.opponent, Pairing.pairKey('a', 'c')), 2);
  assertEqual(Pairing.count(stats.opponent, Pairing.pairKey('a', 'd')), 1);
  assertEqual(Pairing.count(stats.rest, 'e'), 1);
  assertEqual(Pairing.count(stats.rest, 'd'), 1);
  assertEqual(Pairing.count(stats.borrower, 'd'), 1);
  assertEqual(Pairing.count(stats.borrower, 'a'), 0);
});

test('history stats include the rest correction', function () {
  const rounds = [makeTestRound([makeTestCourt(1, ['a', 'b'], ['c', 'd'])], ['e'])];
  const stats = Pairing.historyStats(rounds, { e: 3, f: 2 });
  assertEqual(Pairing.count(stats.rest, 'e'), 4);
  assertEqual(Pairing.count(stats.rest, 'f'), 2);
});

test('highestRestBalance gives the maximum among the given players', function () {
  const stats = { partner: {}, opponent: {}, rest: { a: 1, b: 3, c: 0 }, borrower: {} };
  assertEqual(Pairing.highestRestBalance(stats, ['a', 'b', 'c']), 3);
  assertEqual(Pairing.highestRestBalance(stats, ['a', 'c']), 1);
  assertEqual(Pairing.highestRestBalance(stats, []), 0);
});

function makePlayers(countPerGroup) {
  const players = [];
  countPerGroup.forEach(function (howMany, group) {
    for (let i = 0; i < howMany; i += 1) {
      const id = 'g' + group + 'n' + i;
      players.push({ id: id, name: id, group: group });
    }
  });
  return players;
}

test('countSpots is limited by courts and by foursomes', function () {
  assertEqual(Pairing.countSpots(18, 4), 16);
  assertEqual(Pairing.countSpots(18, 10), 16);
  assertEqual(Pairing.countSpots(11, 4), 8);
  assertEqual(Pairing.countSpots(20, 3), 12);
  assertEqual(Pairing.countSpots(3, 4), 0);
  assertEqual(Pairing.countSpots(8, 0), 0);
});

test('choosePlaying fills exactly the number of spots and rests the others', function () {
  const players = makePlayers([6, 6]);
  const stats = Pairing.historyStats([]);
  const choice = Pairing.choosePlaying(players, 8, stats, Pairing.createRng(1));
  assertEqual(choice.playing.length, 8);
  assertEqual(choice.resting.length, 4);
  const ids = choice.playing.concat(choice.resting).map(function (p) { return p.id; });
  assertEqual(ids.slice().sort(), players.map(function (p) { return p.id; }).sort());
});

test('choosePlaying lets whoever rested most play', function () {
  const players = makePlayers([5]);
  const stats = Pairing.historyStats([], { g0n0: 3, g0n1: 0, g0n2: 0, g0n3: 0, g0n4: 0 });
  const choice = Pairing.choosePlaying(players, 4, stats, Pairing.createRng(1));
  const restingIds = choice.resting.map(function (p) { return p.id; });
  assert(restingIds.indexOf('g0n0') === -1, 'the player with the highest rest balance wrongly rests again');
});

test('choosePlaying breaks equal rest balances at random', function () {
  const players = makePlayers([8]);
  const stats = Pairing.historyStats([]);
  const first = Pairing.choosePlaying(players, 4, stats, Pairing.createRng(1)).resting
    .map(function (p) { return p.id; }).sort();
  let foundDifferent = false;
  for (let seed = 2; seed < 20; seed += 1) {
    const next = Pairing.choosePlaying(players, 4, stats, Pairing.createRng(seed)).resting
      .map(function (p) { return p.id; }).sort();
    if (JSON.stringify(next) !== JSON.stringify(first)) foundDifferent = true;
  }
  assert(foundDifferent, 'the resting players are the same for every seed');
});

test('distributeOverCourts cuts the row into foursomes in level order', function () {
  const players = makePlayers([4, 4, 4]);
  const courts = Pairing.distributeOverCourts(players, Pairing.createRng(5));
  assertEqual(courts.length, 3);
  courts.forEach(function (foursome, index) {
    assertEqual(foursome.length, 4);
    foursome.forEach(function (player) {
      assertEqual(player.group, index, 'court ' + index + ' has a player from group ' + player.group);
    });
  });
});

test('distributeOverCourts lets two neighbouring groups play together at the boundary', function () {
  const players = makePlayers([6, 6]);
  const courts = Pairing.distributeOverCourts(players, Pairing.createRng(5));
  assertEqual(courts.length, 3);
  const spans = courts.map(function (foursome) {
    const groups = foursome.map(function (p) { return p.group; });
    return Math.max.apply(null, groups) - Math.min.apply(null, groups);
  });
  assertEqual(spans, [0, 1, 0]);
});

test('distributeOverCourts ignores players who no longer make a foursome', function () {
  const courts = Pairing.distributeOverCourts(makePlayers([6]), Pairing.createRng(5));
  assertEqual(courts.length, 1);
});

test('distributeOverCourts rotates who lands on the boundary', function () {
  const players = makePlayers([6, 6]);
  const seen = {};
  for (let seed = 1; seed < 30; seed += 1) {
    const middle = Pairing.distributeOverCourts(players, Pairing.createRng(seed))[1];
    for (const player of middle) seen[player.id] = true;
  }
  assert(Object.keys(seen).length > 4, 'always the same players on the boundary');
});

test('findBorrowers marks the minority on a court as borrowers', function () {
  const foursome = [
    { id: 'a', name: 'a', group: 0 },
    { id: 'b', name: 'b', group: 0 },
    { id: 'c', name: 'c', group: 0 },
    { id: 'd', name: 'd', group: 1 },
  ];
  const result = Pairing.findBorrowers(foursome);
  assertEqual(result.homeGroup, 0);
  assertEqual(result.borrowers.map(function (p) { return p.id; }), ['d']);
});

test('findBorrowers picks the strongest group as home group when counts are equal', function () {
  const foursome = [
    { id: 'a', name: 'a', group: 0 },
    { id: 'b', name: 'b', group: 0 },
    { id: 'c', name: 'c', group: 1 },
    { id: 'd', name: 'd', group: 1 },
  ];
  const result = Pairing.findBorrowers(foursome);
  assertEqual(result.homeGroup, 0);
  assertEqual(result.borrowers.map(function (p) { return p.id; }), ['c', 'd']);
});

test('findBorrowers gives no borrowers for a court from one group', function () {
  const foursome = makePlayers([4]);
  assertEqual(Pairing.findBorrowers(foursome).borrowers.length, 0);
});

test('scoreFoursome is zero without history and within one group', function () {
  const players = makePlayers([4]);
  const stats = Pairing.historyStats([]);
  assertEqual(Pairing.scoreFoursome(players.slice(0, 2), players.slice(2), stats), 0);
});

test('scoreFoursome penalises repeated partners quadratically', function () {
  const players = makePlayers([4]);
  const stats = Pairing.historyStats([]);
  stats.partner[Pairing.pairKey('g0n0', 'g0n1')] = 2;
  const score = Pairing.scoreFoursome(players.slice(0, 2), players.slice(2), stats);
  assertEqual(score, Pairing.WEIGHT_PARTNER * 4);
});

test('scoreFoursome penalises repeated opponents less than repeated partners', function () {
  const players = makePlayers([4]);
  const withPartner = Pairing.historyStats([]);
  withPartner.partner[Pairing.pairKey('g0n0', 'g0n1')] = 1;
  const withOpponent = Pairing.historyStats([]);
  withOpponent.opponent[Pairing.pairKey('g0n0', 'g0n2')] = 1;
  const partnerScore = Pairing.scoreFoursome(players.slice(0, 2), players.slice(2), withPartner);
  const opponentScore = Pairing.scoreFoursome(players.slice(0, 2), players.slice(2), withOpponent);
  assert(partnerScore > opponentScore, 'a repeated partner does not weigh more');
});

test('scoreFoursome penalises the level gap on a court', function () {
  const stats = Pairing.historyStats([]);
  const narrow = [
    { id: 'a', name: 'a', group: 0 }, { id: 'b', name: 'b', group: 0 },
    { id: 'c', name: 'c', group: 0 }, { id: 'd', name: 'd', group: 1 },
  ];
  const wide = [
    { id: 'a', name: 'a', group: 0 }, { id: 'b', name: 'b', group: 0 },
    { id: 'c', name: 'c', group: 0 }, { id: 'd', name: 'd', group: 2 },
  ];
  const narrowScore = Pairing.scoreFoursome(narrow.slice(0, 2), narrow.slice(2), stats);
  const wideScore = Pairing.scoreFoursome(wide.slice(0, 2), wide.slice(2), stats);
  assertEqual(narrowScore, Pairing.WEIGHT_LEVEL_GAP * 1);
  assertEqual(wideScore, Pairing.WEIGHT_LEVEL_GAP * 4);
});

test('scoreFoursome penalises whoever has been a borrower more often', function () {
  const stats = Pairing.historyStats([]);
  stats.borrower.d = 2;
  const foursome = [
    { id: 'a', name: 'a', group: 0 }, { id: 'b', name: 'b', group: 0 },
    { id: 'c', name: 'c', group: 0 }, { id: 'd', name: 'd', group: 1 },
  ];
  const score = Pairing.scoreFoursome(foursome.slice(0, 2), foursome.slice(2), stats);
  assertEqual(score, Pairing.WEIGHT_LEVEL_GAP * 1 + Pairing.WEIGHT_BORROWER * 4);
});

test('chooseTeams avoids a partner pairing that already happened', function () {
  const players = makePlayers([4]);
  const stats = Pairing.historyStats([]);
  stats.partner[Pairing.pairKey('g0n0', 'g0n1')] = 3;
  stats.partner[Pairing.pairKey('g0n2', 'g0n3')] = 3;
  const teams = Pairing.chooseTeams(players, stats);
  const pairs = [
    Pairing.pairKey(teams.teamA[0].id, teams.teamA[1].id),
    Pairing.pairKey(teams.teamB[0].id, teams.teamB[1].id),
  ];
  assert(pairs.indexOf(Pairing.pairKey('g0n0', 'g0n1')) === -1, 'repeats an existing pair');
});

test('chooseTeams gives two teams of two with all four players', function () {
  const players = makePlayers([4]);
  const teams = Pairing.chooseTeams(players, Pairing.historyStats([]));
  assertEqual(teams.teamA.length, 2);
  assertEqual(teams.teamB.length, 2);
  const ids = teams.teamA.concat(teams.teamB).map(function (p) { return p.id; }).sort();
  assertEqual(ids, players.map(function (p) { return p.id; }).sort());
});

test('generateRound returns null when no full court can be filled', function () {
  const result = Pairing.generateRound({
    attendees: makePlayers([3]),
    courts: 4,
    rng: Pairing.createRng(1),
    attempts: 5,
  });
  assertEqual(result, null);
});

test('generateRound places every attendee exactly once', function () {
  const players = makePlayers([6, 6, 6]);
  const round = Pairing.generateRound({
    attendees: players,
    courts: 4,
    rng: Pairing.createRng(11),
    attempts: 20,
  });
  const placed = [];
  for (const court of round.courts) {
    for (const id of court.teamA.concat(court.teamB)) placed.push(id);
  }
  for (const id of round.resting) placed.push(id);
  assertEqual(placed.length, players.length);
  assertEqual(placed.slice().sort(), players.map(function (p) { return p.id; }).sort());
});

test('generateRound does not fill more courts than there are spots', function () {
  const round = Pairing.generateRound({
    attendees: makePlayers([18]),
    courts: 3,
    rng: Pairing.createRng(2),
    attempts: 20,
  });
  assertEqual(round.courts.length, 3);
  assertEqual(round.resting.length, 6);
  assertEqual(round.courts.map(function (court) { return court.number; }), [1, 2, 3]);
});

test('generateRound fills in the court description with groups, home group and borrowers', function () {
  const round = Pairing.generateRound({
    attendees: makePlayers([6, 6]),
    courts: 3,
    rng: Pairing.createRng(4),
    attempts: 20,
  });
  const boundary = round.courts[1];
  assertEqual(boundary.groups, [0, 1]);
  assertEqual(boundary.homeGroup, 0);
  assertEqual(boundary.borrowers.length, 2);
  assertEqual(round.courts[0].groups, [0]);
  assertEqual(round.courts[0].borrowers, []);
});

test('generateRound is reproducible for the same seed', function () {
  const players = makePlayers([8, 8]);
  const first = Pairing.generateRound({ attendees: players, courts: 4, rng: Pairing.createRng(9), attempts: 30 });
  const second = Pairing.generateRound({ attendees: players, courts: 4, rng: Pairing.createRng(9), attempts: 30 });
  assertEqual(first, second);
});

test('generateRound avoids the pair that played together last round', function () {
  const players = makePlayers([4]);
  const first = Pairing.generateRound({ attendees: players, courts: 1, rng: Pairing.createRng(6), attempts: 30 });
  const second = Pairing.generateRound({
    attendees: players,
    courts: 1,
    history: [first],
    rng: Pairing.createRng(6),
    attempts: 30,
  });
  const earlierPairs = [
    Pairing.pairKey(first.courts[0].teamA[0], first.courts[0].teamA[1]),
    Pairing.pairKey(first.courts[0].teamB[0], first.courts[0].teamB[1]),
  ];
  const newPairs = [
    Pairing.pairKey(second.courts[0].teamA[0], second.courts[0].teamA[1]),
    Pairing.pairKey(second.courts[0].teamB[0], second.courts[0].teamB[1]),
  ];
  for (const pair of newPairs) {
    assert(earlierPairs.indexOf(pair) === -1, 'pair ' + pair + ' is repeated');
  }
});

function playEvening(players, courts, roundCount, seed) {
  const rounds = [];
  for (let i = 0; i < roundCount; i += 1) {
    const round = Pairing.generateRound({
      attendees: players,
      courts: courts,
      history: rounds,
      rng: Pairing.createRng(seed + i),
      attempts: 50,
    });
    assert(round !== null, 'round ' + i + ' could not be made');
    rounds.push(round);
  }
  return rounds;
}

function countRest(rounds, players) {
  const tally = {};
  for (const player of players) tally[player.id] = 0;
  for (const round of rounds) {
    for (const id of round.resting) tally[id] += 1;
  }
  return tally;
}

test('property: every attendee is placed exactly once per round', function () {
  const players = makePlayers([7, 7, 4]);
  const rounds = playEvening(players, 4, 8, 100);
  for (const round of rounds) {
    const seen = {};
    for (const court of round.courts) {
      for (const id of court.teamA.concat(court.teamB)) {
        assert(seen[id] === undefined, id + ' is placed twice');
        seen[id] = true;
      }
    }
    for (const id of round.resting) {
      assert(seen[id] === undefined, id + ' plays and rests at the same time');
      seen[id] = true;
    }
    assertEqual(Object.keys(seen).length, players.length, 'not everyone is placed');
  }
});

test('property: over twenty rounds the number of rest turns differs by at most one', function () {
  const players = makePlayers([18]);
  const rounds = playEvening(players, 4, 20, 200);
  const tally = countRest(rounds, players);
  const values = Object.keys(tally).map(function (id) { return tally[id]; });
  const difference = Math.max.apply(null, values) - Math.min.apply(null, values);
  assert(difference <= 1, 'rest difference is ' + difference + ': ' + JSON.stringify(tally));
});

test('property: groups divisible by four stay within one level', function () {
  const players = makePlayers([8, 8]);
  const rounds = playEvening(players, 4, 8, 300);
  for (const round of rounds) {
    for (const court of round.courts) {
      assertEqual(court.groups.length, 1, 'court spans several levels: ' + JSON.stringify(court.groups));
    }
  }
});

test('property: a leftover group borrows from at most one neighbouring level', function () {
  const players = makePlayers([6, 6]);
  const rounds = playEvening(players, 3, 8, 400);
  for (const round of rounds) {
    for (const court of round.courts) {
      const gap = court.groups[court.groups.length - 1] - court.groups[0];
      assert(gap <= 1, 'court spans a gap of ' + gap);
    }
  }
});

test('property: who lands on the boundary as a borrower rotates', function () {
  const players = makePlayers([6, 6]);
  const rounds = playEvening(players, 3, 10, 500);
  const seen = {};
  for (const round of rounds) {
    for (const court of round.courts) {
      for (const id of court.borrowers) seen[id] = true;
    }
  }
  assert(Object.keys(seen).length >= 4, 'only ' + Object.keys(seen).length + ' players were ever a borrower');
});

test('property: four to forty players on one to ten courts always give a valid round', function () {
  for (let playerCount = 4; playerCount <= 40; playerCount += 1) {
    const players = [];
    for (let i = 0; i < playerCount; i += 1) {
      players.push({ id: 'p' + i, name: 'p' + i, group: i % 3 });
    }
    for (let courts = 1; courts <= 10; courts += 1) {
      const round = Pairing.generateRound({
        attendees: players,
        courts: courts,
        rng: Pairing.createRng(playerCount * 100 + courts),
        attempts: 3,
      });
      const spots = Pairing.countSpots(playerCount, courts);
      const description = playerCount + ' players on ' + courts + ' courts';
      assert(round !== null, 'no round for ' + description);
      assertEqual(round.courts.length, spots / 4, 'wrong number of courts for ' + description);
      const ids = [];
      for (const court of round.courts) {
        assertEqual(court.teamA.length, 2, 'teamA is not a pair for ' + description);
        assertEqual(court.teamB.length, 2, 'teamB is not a pair for ' + description);
        for (const id of court.teamA.concat(court.teamB)) ids.push(id);
      }
      for (const id of round.resting) ids.push(id);
      assertEqual(ids.length, playerCount, 'not everyone placed for ' + description);
      assertEqual(new Set(ids).size, playerCount, 'double placement for ' + description);
    }
  }
});

test('summarize counts rounds played and rest turns per player', function () {
  const rounds = [
    makeTestRound([makeTestCourt(1, ['a', 'b'], ['c', 'd'])], ['e']),
    makeTestRound([makeTestCourt(1, ['a', 'c'], ['b', 'e'])], ['d']),
  ];
  const summary = Pairing.summarize(rounds, ['a', 'b', 'c', 'd', 'e']);
  assertEqual(summary, [
    { id: 'a', played: 2, rested: 0, paused: 0 },
    { id: 'b', played: 2, rested: 0, paused: 0 },
    { id: 'c', played: 2, rested: 0, paused: 0 },
    { id: 'd', played: 1, rested: 1, paused: 0 },
    { id: 'e', played: 1, rested: 1, paused: 0 },
  ]);
});

test('summarize shows a player without rounds as zero', function () {
  const summary = Pairing.summarize([], ['a']);
  assertEqual(summary, [{ id: 'a', played: 0, rested: 0, paused: 0 }]);
});

function makeFakeStorage() {
  const data = {};
  return {
    data: data,
    getItem: function (key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem: function (key, value) { data[key] = String(value); },
    removeItem: function (key) { delete data[key]; },
  };
}

function makeRefusingStorage() {
  return {
    getItem: function () { throw new Error('refused'); },
    setItem: function () { throw new Error('refused'); },
    removeItem: function () { throw new Error('refused'); },
  };
}

test('store saves and loads the club', function () {
  const store = createStore(makeFakeStorage());
  assertEqual(store.loadClub(), null);
  store.saveClub({ groups: ['A'], players: [{ id: 'x', name: 'X', group: 0 }] });
  assertEqual(store.loadClub(), { groups: ['A'], players: [{ id: 'x', name: 'X', group: 0 }] });
});

test('store saves, loads and clears the evening', function () {
  const store = createStore(makeFakeStorage());
  store.saveEvening({ attendees: ['x'], courts: 2, rounds: [], restCorrection: {} });
  assertEqual(store.loadEvening().courts, 2);
  store.clearEvening();
  assertEqual(store.loadEvening(), null);
});

test('store survives a new store on the same storage', function () {
  const storage = makeFakeStorage();
  createStore(storage).saveClub({ groups: ['A'], players: [] });
  assertEqual(createStore(storage).loadClub(), { groups: ['A'], players: [] });
});

test('store falls back to memory when the storage refuses', function () {
  const store = createStore(makeRefusingStorage());
  assertEqual(store.available(), false);
  store.saveClub({ groups: ['A'], players: [] });
  assertEqual(store.loadClub(), { groups: ['A'], players: [] });
});

test('store without storage reports itself as unavailable', function () {
  const store = createStore(null);
  assertEqual(store.available(), false);
  store.saveEvening({ courts: 3 });
  assertEqual(store.loadEvening().courts, 3);
});

test('store returns null for damaged contents', function () {
  const storage = makeFakeStorage();
  storage.data['hussel.club'] = '{not valid json';
  assertEqual(createStore(storage).loadClub(), null);
});


function allPlaced(round) {
  const ids = [];
  for (const court of round.courts) {
    for (const id of court.teamA.concat(court.teamB)) ids.push(id);
  }
  return ids.concat(round.resting, round.paused || []);
}

test('generateRound never puts a paused player on a court', function () {
  const players = makePlayers([9]);
  for (let seed = 0; seed < 20; seed += 1) {
    const round = Pairing.generateRound({
      attendees: players,
      paused: ['g0n0', 'g0n1'],
      courts: 2,
      rng: Pairing.createRng(seed),
      attempts: 10,
    });
    assertEqual(round.paused, ['g0n0', 'g0n1']);
    for (const court of round.courts) {
      for (const id of court.teamA.concat(court.teamB)) {
        assert(id !== 'g0n0' && id !== 'g0n1', id + ' is on a court while paused');
      }
    }
    assertEqual(round.resting.length, 3, 'seven available on two courts: three rest');
    assertEqual(new Set(allPlaced(round)).size, 9, 'not everyone placed exactly once');
  }
});

test('generateRound returns null when pauses leave no foursome', function () {
  const players = makePlayers([5]);
  const round = Pairing.generateRound({
    attendees: players,
    paused: ['g0n0', 'g0n1'],
    courts: 2,
    rng: Pairing.createRng(1),
  });
  assertEqual(round, null);
});

test('a pause counts as a rest turn and whoever comes back plays the next round', function () {
  const players = makePlayers([10]);
  const rounds = [];
  rounds.push(Pairing.generateRound({
    attendees: players, paused: ['g0n3'], courts: 2, history: rounds, rng: Pairing.createRng(5), attempts: 20,
  }));
  const stats = Pairing.historyStats(rounds);
  assertEqual(Pairing.count(stats.rest, 'g0n3'), 1, 'pause does not count as rest');
  for (let seed = 0; seed < 10; seed += 1) {
    const next = Pairing.generateRound({
      attendees: players, courts: 2, history: rounds, rng: Pairing.createRng(seed), attempts: 20,
    });
    assert(next.resting.indexOf('g0n3') === -1, 'returning player rests again');
  }
});

test('swapPlayers swaps between two courts and works out groups and borrowers again', function () {
  const round = {
    courts: [
      { number: 1, teamA: ['a1', 'a2'], teamB: ['a3', 'a4'], homeGroup: 0, groups: [0], borrowers: [] },
      { number: 2, teamA: ['b1', 'b2'], teamB: ['b3', 'b4'], homeGroup: 1, groups: [1], borrowers: [] },
    ],
    resting: ['r1'],
    paused: [],
  };
  const groupOf = { a1: 0, a2: 0, a3: 0, a4: 0, b1: 1, b2: 1, b3: 1, b4: 1, r1: 1 };
  const swapped = Pairing.swapPlayers(round, 'a1', 'b1', groupOf);
  assertEqual(swapped.courts[0].teamA, ['b1', 'a2']);
  assertEqual(swapped.courts[1].teamA, ['a1', 'b2']);
  assertEqual(swapped.courts[0].groups, [0, 1]);
  assertEqual(swapped.courts[0].borrowers, ['b1']);
  assertEqual(swapped.courts[1].borrowers, ['a1']);
  assertEqual(round.courts[0].teamA, ['a1', 'a2'], 'original was changed');
});

test('swapPlayers swaps a player on a court with a resting player', function () {
  const round = {
    courts: [{ number: 1, teamA: ['a', 'b'], teamB: ['c', 'd'], homeGroup: 0, groups: [0], borrowers: [] }],
    resting: ['e'],
    paused: ['f'],
  };
  const swapped = Pairing.swapPlayers(round, 'e', 'c', { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 });
  assertEqual(swapped.courts[0].teamB, ['e', 'd']);
  assertEqual(swapped.resting, ['c']);
  assertEqual(swapped.paused, ['f']);
  assertEqual(new Set(allPlaced(swapped)).size, 6);
});

test('swapPlayers leaves a paused player alone', function () {
  const round = {
    courts: [{ number: 1, teamA: ['a', 'b'], teamB: ['c', 'd'], homeGroup: 0, groups: [0], borrowers: [] }],
    resting: [],
    paused: ['f'],
  };
  const swapped = Pairing.swapPlayers(round, 'f', 'a', { a: 0, b: 0, c: 0, d: 0, f: 0 });
  assertEqual(swapped.courts[0].teamA, ['a', 'b']);
  assertEqual(swapped.paused, ['f']);
});

function measureEvening(key) {
  const players = makePlayers([6, 6, 6, 6]);
  const rounds = [];
  for (let i = 0; i < 10; i += 1) {
    rounds.push(Pairing.generateRound({
      attendees: players,
      courts: 6,
      history: rounds,
      weights: Presets.weights(key),
      rng: Pairing.createRng(900 + i),
      attempts: 100,
    }));
  }
  let gap = 0;
  let repeats = 0;
  const seen = { partner: {}, opponent: {} };
  for (const round of rounds) {
    for (const court of round.courts) {
      gap += court.groups[court.groups.length - 1] - court.groups[0];
      for (const team of [court.teamA, court.teamB]) {
        const k = Pairing.pairKey(team[0], team[1]);
        if (seen.partner[k]) repeats += 1;
        seen.partner[k] = true;
      }
      for (const a of court.teamA) {
        for (const b of court.teamB) {
          const k = Pairing.pairKey(a, b);
          if (seen.opponent[k]) repeats += 1;
          seen.opponent[k] = true;
        }
      }
    }
  }
  return { gap: gap, repeats: repeats };
}

test('presets: Within level gives a smaller level gap than Social mixing', function () {
  const level = measureEvening('level');
  const social = measureEvening('social');
  assert(level.gap < social.gap, 'gap level ' + level.gap + ', social ' + social.gap);
});

test('presets: Social mixing gives fewer repeats than Within level', function () {
  const level = measureEvening('level');
  const social = measureEvening('social');
  assert(social.repeats < level.repeats, 'repeats social ' + social.repeats + ', level ' + level.repeats);
});

test('presets: an unknown key falls back to the default', function () {
  assertEqual(Presets.get('does-not-exist').key, Presets.DEFAULT);
});

function makeTestClub(count) {
  const players = [];
  for (let i = 0; i < count; i += 1) players.push({ id: 'p' + i, name: 'Player ' + i, group: i % 2 });
  return { groups: ['Strong', 'Weak'], players: players };
}

function idsOf(club, count) {
  return club.players.slice(0, count).map(function (p) { return p.id; });
}

test('session: a claim on a free name succeeds, a second claim is refused', function () {
  const club = makeTestClub(8);
  let evening = Session.newEvening(idsOf(club, 8), 2, 'ABCDEF');
  let result = Session.applyRequest(evening, club, { phone: 't1', type: 'claim', player: 'p0' });
  assertEqual(result.reply, null);
  evening = result.evening;
  result = Session.applyRequest(evening, club, { phone: 't2', type: 'claim', player: 'p0' });
  assertEqual(result.reply, { error: 'taken' });
  evening = Session.unlink(evening, 'p0').evening;
  result = Session.applyRequest(evening, club, { phone: 't2', type: 'claim', player: 'p0' });
  assertEqual(result.reply, null);
  assertEqual(result.evening.links, { t2: 'p0' });
});

test('session: a phone claims one name at a time', function () {
  const club = makeTestClub(8);
  let evening = Session.newEvening(idsOf(club, 8), 2, 'ABCDEF');
  evening = Session.applyRequest(evening, club, { phone: 't1', type: 'claim', player: 'p0' }).evening;
  evening = Session.applyRequest(evening, club, { phone: 't1', type: 'claim', player: 'p1' }).evening;
  assertEqual(evening.links, { t1: 'p1' });
});

test('session: hello with a remembered name links again', function () {
  const club = makeTestClub(8);
  const evening = Session.newEvening(idsOf(club, 8), 2, 'ABCDEF');
  const result = Session.applyRequest(evening, club, { phone: 't1', type: 'hello', player: 'p3' });
  assertEqual(result.evening.links, { t1: 'p3' });
});

test('session: pause, leave and check-in from the phone give the same evening as on the laptop', function () {
  const club = makeTestClub(10);
  let evening = Session.newEvening(idsOf(club, 8), 2, 'ABCDEF');
  evening = Session.publish(Session.createDraft(evening, club, { rng: Pairing.createRng(1), attempts: 5 }).evening);
  evening = Session.applyRequest(evening, club, { phone: 't1', type: 'claim', player: 'p1' }).evening;
  evening = Session.applyRequest(evening, club, { phone: 't9', type: 'claim', player: 'p9' }).evening;

  const viaPhone = Session.applyRequest(evening, club, { phone: 't1', type: 'pause', on: true }).evening;
  assertEqual(viaPhone, Session.setPause(evening, 'p1', true));

  const left = Session.applyRequest(evening, club, { phone: 't1', type: 'leave' }).evening;
  assertEqual(left, Session.leave(evening, club, 'p1').evening);

  const gone = Session.checkOut(evening, 'p9');
  const checkedIn = Session.applyRequest(gone, club, { phone: 't9', type: 'checkIn' }).evening;
  assertEqual(checkedIn, Session.checkIn(gone, 'p9'));
});

test('session: a pause without a linked name is refused', function () {
  const club = makeTestClub(8);
  const evening = Session.newEvening(idsOf(club, 8), 2, 'ABCDEF');
  const result = Session.applyRequest(evening, club, { phone: 't1', type: 'pause', on: true });
  assertEqual(result.reply, { error: 'no-name' });
});

test('session: a latecomer gets the highest rest balance among the attendees', function () {
  const club = makeTestClub(10);
  let evening = Session.newEvening(idsOf(club, 9), 2, 'ABCDEF');
  for (let i = 0; i < 3; i += 1) {
    evening = Session.publish(Session.createDraft(evening, club, { rng: Pairing.createRng(i), attempts: 5 }).evening);
  }
  const stats = Pairing.historyStats(evening.rounds, evening.restCorrection);
  const highest = Pairing.highestRestBalance(stats, evening.attendees);
  evening = Session.checkIn(evening, 'p9');
  const after = Pairing.historyStats(evening.rounds, evening.restCorrection);
  assertEqual(Pairing.count(after.rest, 'p9'), highest);
});

test('session: a new player registers with name and level and plays straight away', function () {
  const club = makeTestClub(8);
  let evening = Session.newEvening([], 2, 'ABCDEF');
  const result = Session.applyRequest(evening, club, { phone: 't7', type: 'register', name: '  Gerda   de  Vries ', group: 1 }, 'new1');
  assertEqual(result.reply, null);
  assertEqual(result.club.players.length, 9);
  assertEqual(result.club.players[8], { id: 'new1', name: 'Gerda de Vries', group: 1 });
  assertEqual(club.players.length, 8, 'original club was changed');
  evening = result.evening;
  assertEqual(evening.attendees, ['new1']);
  assertEqual(evening.links.t7, 'new1');
});

test('session: registering with an existing name points to the list', function () {
  const club = makeTestClub(8);
  const evening = Session.newEvening([], 2, 'ABCDEF');
  const result = Session.applyRequest(evening, club, { phone: 't7', type: 'register', name: 'player 3', group: 0 }, 'new1');
  assertEqual(result.reply, { error: 'name-exists' });
  assertEqual(result.club.players.length, 8);
});

test('session: registering without a name or with an unknown level is refused', function () {
  const club = makeTestClub(8);
  const evening = Session.newEvening([], 2, 'ABCDEF');
  assertEqual(Session.applyRequest(evening, club, { phone: 't7', type: 'register', name: '   ', group: 0 }, 'n1').reply, { error: 'empty-name' });
  assertEqual(Session.applyRequest(evening, club, { phone: 't7', type: 'register', name: 'Bob', group: 5 }, 'n1').reply, { error: 'unknown-level' });
  assertEqual(Session.applyRequest(evening, club, { phone: 't7', type: 'register', name: 'Bob', group: '0' }, 'n1').reply, { error: 'unknown-level' });
});

test('session: a name that is too long is shortened', function () {
  assertEqual(Session.cleanName('x'.repeat(60)).length, 40);
});

test('session: tapping your own name checks you in', function () {
  const club = makeTestClub(8);
  const evening = Session.newEvening([], 2, 'ABCDEF');
  const result = Session.applyRequest(evening, club, { phone: 't1', type: 'claim', player: 'p2' });
  assertEqual(result.evening.attendees, ['p2']);
});

test('session: hello links again but does not check a player who left back in', function () {
  const club = makeTestClub(8);
  let evening = Session.newEvening(['p2'], 2, 'ABCDEF');
  evening = Session.checkOut(evening, 'p2');
  const result = Session.applyRequest(evening, club, { phone: 't1', type: 'hello', player: 'p2' });
  assertEqual(result.evening.links, { t1: 'p2' });
  assertEqual(result.evening.attendees, []);
});

test('session: the draft does not count towards the history', function () {
  const club = makeTestClub(10);
  let evening = Session.newEvening(idsOf(club, 10), 2, 'ABCDEF');
  evening = Session.createDraft(evening, club, { rng: Pairing.createRng(3), attempts: 5 }).evening;
  assert(evening.draft !== null, 'no draft');
  assertEqual(evening.rounds.length, 0);
  evening = Session.publish(evening);
  assertEqual(evening.rounds.length, 1);
  assertEqual(evening.draft, null);
});

test('session: a pause expires when the round it applied to is published', function () {
  const club = makeTestClub(10);
  let evening = Session.newEvening(idsOf(club, 10), 2, 'ABCDEF');
  evening = Session.setPause(evening, 'p2', true);
  evening = Session.createDraft(evening, club, { rng: Pairing.createRng(3), attempts: 5 }).evening;
  assertEqual(evening.draft.paused, ['p2']);
  evening = Session.publish(evening);
  assertEqual(evening.pauses, {});
});

test('session: a pause after the draft is marked and carries over if the draft is published as is', function () {
  const club = makeTestClub(10);
  let evening = Session.newEvening(idsOf(club, 10), 2, 'ABCDEF');
  evening = Session.createDraft(evening, club, { rng: Pairing.createRng(3), attempts: 5 }).evening;
  evening = Session.setPause(evening, 'p4', true);
  assertEqual(evening.stale, { p4: 'pause' });
  evening = Session.publish(evening);
  assertEqual(evening.pauses, { p4: true });
  assertEqual(evening.stale, {});
});

test('session: the phone only sees the published round and its own spot', function () {
  const club = makeTestClub(8);
  let evening = Session.newEvening(idsOf(club, 8), 2, 'ABCDEF');
  evening = Session.applyRequest(evening, club, { phone: 't1', type: 'claim', player: 'p0' }).evening;
  evening = Session.createDraft(evening, club, { rng: Pairing.createRng(3), attempts: 5 }).evening;
  assertEqual(Session.stateFor(evening, club, 't1').round, null, 'draft is visible');
  evening = Session.publish(evening);
  const state = Session.stateFor(evening, club, 't1');
  assertEqual(state.round.number, 1);
  assertEqual(state.myName, 'Player 0');
  assertEqual(state.mine.status, 'playing');
  assertEqual(state.mine.opponents.length, 2);
});

test('session: changing the number of courts leaves played rounds alone and applies at the next draw', function () {
  const club = makeTestClub(16);
  let evening = Session.newEvening(idsOf(club, 16), 2, 'ABCDEF');
  evening = Session.publish(Session.createDraft(evening, club, { rng: Pairing.createRng(1), attempts: 5 }).evening);
  evening = Session.setCourts(evening, 4);
  assertEqual(evening.rounds[0].courts.length, 2, 'played round was changed');
  evening = Session.createDraft(evening, club, { rng: Pairing.createRng(2), attempts: 5 }).evening;
  assertEqual(evening.draft.courts.length, 4);
});

test('session: the number of courts stays between one and twenty', function () {
  const evening = Session.newEvening([], 2, 'ABCDEF');
  assertEqual(Session.setCourts(evening, 0).courts, 1);
  assertEqual(Session.setCourts(evening, 25).courts, 20);
});

test('session: whoever checks in while a draft is open ends up in a refreshed draft', function () {
  const club = makeTestClub(10);
  let evening = Session.newEvening(idsOf(club, 8), 2, 'ABCDEF');
  evening = Session.createDraft(evening, club, { rng: Pairing.createRng(1), attempts: 5 }).evening;
  assertEqual(Session.shouldRefreshDraft(evening), false);
  evening = Session.checkIn(evening, 'p9');
  assertEqual(Session.newcomersOutsideDraft(evening), ['p9']);
  assertEqual(Session.shouldRefreshDraft(evening), true);
  evening = Session.createDraft(evening, club, { rng: Pairing.createRng(2), attempts: 5 }).evening;
  assertEqual(Session.newcomersOutsideDraft(evening), []);
});

test('session: a newcomer plays the very next round', function () {
  const club = makeTestClub(14);
  let evening = Session.newEvening(idsOf(club, 10), 2, 'ABCDEF');
  for (let i = 0; i < 3; i += 1) {
    evening = Session.publish(Session.createDraft(evening, club, { rng: Pairing.createRng(i), attempts: 5 }).evening);
  }
  evening = Session.checkIn(evening, 'p13');
  for (let seed = 0; seed < 15; seed += 1) {
    const draft = Session.createDraft(evening, club, { rng: Pairing.createRng(100 + seed), attempts: 5 }).evening.draft;
    assert(draft.resting.indexOf('p13') === -1, 'newcomer rests straight away for seed ' + seed);
  }
});

test('session: a draft with manual swaps is not refreshed automatically', function () {
  const club = makeTestClub(10);
  let evening = Session.newEvening(idsOf(club, 9), 2, 'ABCDEF');
  evening = Session.createDraft(evening, club, { rng: Pairing.createRng(1), attempts: 5 }).evening;
  const onCourt = evening.draft.courts[0].teamA[0];
  evening = Session.swap(evening, club, onCourt, evening.draft.resting[0]);
  evening = Session.checkIn(evening, 'p9');
  assertEqual(Session.shouldRefreshDraft(evening), false);
  assertEqual(evening.stale, { p9: 'checkIn' });
  evening = Session.publish(evening);
  assertEqual(evening.rounds[0].manual, undefined);
});

test('session: setLevel changes only that player and refuses an unknown level', function () {
  const club = makeTestClub(4);
  const updated = Session.setLevel(club, 'p0', 1);
  assertEqual(updated.players[0].group, 1);
  assertEqual(club.players[0].group, 0, 'original club was changed');
  assertEqual(Session.setLevel(club, 'p0', 7), club);
});

test('session: a different level applies at the next draw, played rounds stay as they are', function () {
  let club = makeTestClub(8);
  let evening = Session.newEvening(idsOf(club, 8), 2, 'ABCDEF');
  evening = Session.publish(Session.createDraft(evening, club, { rng: Pairing.createRng(1), attempts: 5 }).evening);
  const before = JSON.stringify(evening.rounds);
  club = Session.setLevel(club, 'p0', 1);
  assertEqual(JSON.stringify(evening.rounds), before);
  evening = Session.createDraft(evening, club, { rng: Pairing.createRng(2), attempts: 5 }).evening;
  const courtOfP0 = evening.draft.courts.filter(function (c) { return c.teamA.concat(c.teamB).indexOf('p0') !== -1; })[0];
  if (courtOfP0) assert(courtOfP0.groups.indexOf(1) !== -1, 'p0 still counts as level 0');
});

test('session: isOnCourtInDraft only recognises players on a court', function () {
  const club = makeTestClub(9);
  let evening = Session.newEvening(idsOf(club, 9), 2, 'ABCDEF');
  evening = Session.createDraft(evening, club, { rng: Pairing.createRng(1), attempts: 5 }).evening;
  assertEqual(Session.isOnCourtInDraft(evening, evening.draft.courts[0].teamB[1]), true);
  assertEqual(Session.isOnCourtInDraft(evening, evening.draft.resting[0]), false);
  assertEqual(Session.markStale(evening, 'p1', 'level').stale, { p1: 'level' });
});

test('session: whoever joins first with a phone plays every round', function () {
  const club = makeTestClub(11);
  let evening = Session.newEvening(idsOf(club, 6), 2, 'ABCDEF');
  evening = Session.applyRequest(evening, club, { phone: 't1', type: 'claim', player: 'p10' }).evening;
  evening = Session.applyRequest(evening, club, { phone: 't2', type: 'claim', player: 'p9' }).evening;
  evening = Session.applyRequest(evening, club, { phone: 't3', type: 'claim', player: 'p8' }).evening;
  assertEqual(evening.first, 'p10');
  for (let i = 0; i < 12; i += 1) {
    evening = Session.publish(Session.createDraft(evening, club, { rng: Pairing.createRng(700 + i), attempts: 20 }).evening);
    assert(evening.rounds[i].resting.indexOf('p10') === -1, 'p10 rests in round ' + (i + 1));
  }
  assertEqual(Session.stateFor(evening, club, 't2').first, undefined);
});

test('session: a pause by the first player is simply respected', function () {
  const club = makeTestClub(9);
  let evening = Session.newEvening(idsOf(club, 8), 2, 'ABCDEF');
  evening = Session.applyRequest(evening, club, { phone: 't1', type: 'claim', player: 'p8' }).evening;
  evening = Session.setPause(evening, 'p8', true);
  evening = Session.createDraft(evening, club, { rng: Pairing.createRng(3), attempts: 5 }).evening;
  assertEqual(evening.draft.paused, ['p8']);
});

test('session: ticking someone on the laptop makes nobody the first', function () {
  const club = makeTestClub(8);
  let evening = Session.newEvening([], 2, 'ABCDEF');
  evening = Session.checkIn(evening, 'p0');
  evening = Session.applyRequest(evening, club, { phone: 't1', type: 'hello', player: 'p0' }).evening;
  assertEqual(evening.first, undefined);
});

function onCourt(round) {
  return round.courts.flatMap(function (c) { return c.teamA.concat(c.teamB); });
}

function exactlyOnce(round, attendees) {
  const ids = onCourt(round).concat(round.resting, round.paused || []);
  assertEqual(ids.slice().sort(), attendees.slice().sort(), 'not everyone placed exactly once');
}

test('substitutions: a pause in the draft replaces only that player', function () {
  const club = makeTestClub(10);
  let evening = Session.newEvening(idsOf(club, 10), 2, 'ABCDEF');
  evening = Session.createDraft(evening, club, { rng: Pairing.createRng(4), attempts: 5 }).evening;
  const before = evening.draft;
  const out = before.courts[1].teamA[0];
  const outcome = Session.pause(evening, club, out, true, false);
  const after = outcome.evening.draft;
  assertEqual(outcome.substitutions.length, 1);
  assertEqual(outcome.substitutions[0].where, 'draft');
  assert(before.resting.indexOf(outcome.substitutions[0].in) !== -1, 'substitute was not resting');
  assertEqual(after.courts[0].teamA.concat(after.courts[0].teamB), before.courts[0].teamA.concat(before.courts[0].teamB), 'another court changed');
  assertEqual(after.courts[1].teamA[0], outcome.substitutions[0].in);
  assertEqual(after.paused, [out]);
  assertEqual(outcome.evening.stale, {});
  exactlyOnce(after, outcome.evening.attendees);
  assertEqual(Session.publish(outcome.evening).pauses, {}, 'pause not used up on publishing');
});

test('substitutions: manual swaps in the draft stay in place', function () {
  const club = makeTestClub(10);
  let evening = Session.newEvening(idsOf(club, 10), 2, 'ABCDEF');
  evening = Session.createDraft(evening, club, { rng: Pairing.createRng(4), attempts: 5 }).evening;
  const a = evening.draft.courts[0].teamA[0];
  const b = evening.draft.courts[1].teamB[1];
  evening = Session.swap(evening, club, a, b);
  const out = evening.draft.courts[1].teamA[0];
  const after = Session.pause(evening, club, out, true, false).evening.draft;
  assertEqual(after.courts[0].teamA[0], b, 'manual swap is gone');
  assertEqual(after.courts[1].teamB[1], a, 'manual swap is gone');
});

test('substitutions: without resting players the draft is redrawn', function () {
  const club = makeTestClub(8);
  let evening = Session.newEvening(idsOf(club, 8), 2, 'ABCDEF');
  evening = Session.createDraft(evening, club, { rng: Pairing.createRng(4), attempts: 5 }).evening;
  const outcome = Session.pause(evening, club, 'p3', true, false);
  assertEqual(outcome.evening.draft.courts.length, 1);
  assertEqual(outcome.evening.draft.paused, ['p3']);
  exactlyOnce(outcome.evening.draft, outcome.evening.attendees);
});

test('substitutions: pausing right now replaces the player in the running round', function () {
  const club = makeTestClub(10);
  let evening = Session.newEvening(idsOf(club, 10), 2, 'ABCDEF');
  evening = Session.publish(Session.createDraft(evening, club, { rng: Pairing.createRng(4), attempts: 5 }).evening);
  const running = evening.rounds[0];
  const out = running.courts[0].teamB[1];
  const outcome = Session.pause(evening, club, out, true, true);
  const after = outcome.evening.rounds[0];
  assertEqual(outcome.substitutions[0].where, 'round');
  assertEqual(after.courts[0].teamB[1], outcome.substitutions[0].in);
  assertEqual(after.paused, [out]);
  assertEqual(outcome.evening.pauses, {}, 'pause also still applies to the next round');
  exactlyOnce(after, outcome.evening.attendees);
  const stats = Pairing.summarize(outcome.evening.rounds, [out, outcome.substitutions[0].in]);
  assertEqual([stats[0].played, stats[0].paused, stats[1].played], [0, 1, 1]);
});

test('substitutions: whoever goes home is replaced in the draft and the running round', function () {
  const club = makeTestClub(12);
  let evening = Session.newEvening(idsOf(club, 12), 2, 'ABCDEF');
  evening = Session.publish(Session.createDraft(evening, club, { rng: Pairing.createRng(4), attempts: 5 }).evening);
  const out = evening.rounds[0].courts[0].teamA[1];
  evening = Session.createDraft(evening, club, { rng: Pairing.createRng(5), attempts: 5 }).evening;
  const outcome = Session.leave(evening, club, out);
  assert(outcome.evening.attendees.indexOf(out) === -1, 'still present');
  const running = outcome.evening.rounds[0];
  assert(onCourt(running).concat(running.resting, running.paused).indexOf(out) === -1, 'still in the running round');
  const draft = outcome.evening.draft;
  assert(onCourt(draft).concat(draft.resting, draft.paused).indexOf(out) === -1, 'still in the draft');
  exactlyOnce(running, outcome.evening.attendees);
  exactlyOnce(draft, outcome.evening.attendees);
});

test('substitutions: the substitute is whoever rested most, then whoever is closest in level', function () {
  const club = { groups: ['A', 'B', 'C'], players: [
    { id: 'a1', name: 'a1', group: 0 }, { id: 'a2', name: 'a2', group: 0 }, { id: 'a3', name: 'a3', group: 0 }, { id: 'a4', name: 'a4', group: 0 },
    { id: 'b1', name: 'b1', group: 1 }, { id: 'c1', name: 'c1', group: 2 }, { id: 'c2', name: 'c2', group: 2 },
  ] };
  let evening = Session.newEvening(['a1', 'a2', 'a3', 'a4', 'b1', 'c1', 'c2'], 1, 'ABCDEF');
  evening.draft = {
    courts: [{ number: 1, teamA: ['a1', 'a2'], teamB: ['a3', 'a4'], homeGroup: 0, groups: [0], borrowers: [] }],
    resting: ['c1', 'b1', 'c2'], paused: [],
  };
  assertEqual(Session.pause(evening, club, 'a1', true, false).substitutions[0].in, 'b1', 'closest level');
  evening.restCorrection = { c2: 2 };
  assertEqual(Session.pause(evening, club, 'a1', true, false).substitutions[0].in, 'c2', 'most rest comes first');
});

test('substitutions: withdrawing a pause puts the player back with the resting players in the draft', function () {
  const club = makeTestClub(10);
  let evening = Session.newEvening(idsOf(club, 10), 2, 'ABCDEF');
  evening = Session.createDraft(evening, club, { rng: Pairing.createRng(4), attempts: 5 }).evening;
  const out = evening.draft.courts[0].teamA[0];
  evening = Session.pause(evening, club, out, true, false).evening;
  evening = Session.pause(evening, club, out, false, false).evening;
  assertEqual(evening.draft.paused, []);
  assert(evening.draft.resting.indexOf(out) !== -1, 'not back with the resting players');
  exactlyOnce(evening.draft, evening.attendees);
});

test('session: hello recognises a player by name when the id is unknown', function () {
  const club = makeTestClub(4);
  const evening = Session.newEvening([], 2, 'ABCDEF');
  const result = Session.applyRequest(evening, club, { phone: 't1', type: 'hello', player: 'unknown', name: ' player 2 ' });
  assertEqual(result.evening.links, { t1: 'p2' });
  assertEqual(result.evening.attendees, [], 'hello must not check in automatically');
});

test('session: hello by name does not link when that name is already on another phone', function () {
  const club = makeTestClub(4);
  let evening = Session.newEvening([], 2, 'ABCDEF');
  evening = Session.applyRequest(evening, club, { phone: 't1', type: 'claim', player: 'p2' }).evening;
  const result = Session.applyRequest(evening, club, { phone: 't2', type: 'hello', name: 'Player 2' });
  assertEqual(result.evening.links, { t1: 'p2' });
});

test('session: the phone gets its own name and level to remember', function () {
  const club = makeTestClub(4);
  let evening = Session.newEvening([], 2, 'ABCDEF');
  evening = Session.applyRequest(evening, club, { phone: 't1', type: 'claim', player: 'p1' }).evening;
  const state = Session.stateFor(evening, club, 't1');
  assertEqual([state.myName, state.myLevel], ['Player 1', 'Weak']);
});

test('session: an evening that has not changed for twelve hours counts as forgotten', function () {
  const hour = 60 * 60 * 1000;
  const now = 100 * hour;
  assertEqual(Session.isForgotten(null, now), false);
  assertEqual(Session.isForgotten({ updatedAt: now - 3 * hour }, now), false);
  assertEqual(Session.isForgotten({ updatedAt: now - 13 * hour }, now), true);
  assertEqual(Session.isForgotten({}, now), true, 'without a timestamp we ask just to be safe');
});
