(function () {
  'use strict';

  const WEIGHT_PARTNER = 10;
  const WEIGHT_OPPONENT = 3;
  const WEIGHT_LEVEL_GAP = 8;
  const WEIGHT_BORROWER = 4;
  const ATTEMPTS = 300;

  // Mixing 0 keeps the courts strictly in level order. Higher values let
  // players drift across the boundary into a neighbouring group by chance,
  // so the presets can actually mix.
  const DEFAULT_WEIGHTS = {
    partner: WEIGHT_PARTNER,
    opponent: WEIGHT_OPPONENT,
    levelGap: WEIGHT_LEVEL_GAP,
    borrower: WEIGHT_BORROWER,
    mixing: 0,
  };

  function fillWeights(weights) {
    const complete = {};
    for (const name of Object.keys(DEFAULT_WEIGHTS)) {
      complete[name] = weights && typeof weights[name] === 'number'
        ? weights[name]
        : DEFAULT_WEIGHTS[name];
    }
    return complete;
  }

  // Mulberry32: small, fast and reproducible. Needed because every round is
  // generated hundreds of times with different randomness, and tests must be
  // able to repeat that.
  function createRng(seed) {
    let state = seed >>> 0;
    return function () {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, rng) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  function pairKey(a, b) {
    return a < b ? a + '|' + b : b + '|' + a;
  }

  function count(tally, key) {
    const value = tally[key];
    return value === undefined ? 0 : value;
  }

  function increment(tally, key) {
    tally[key] = count(tally, key) + 1;
  }

  function historyStats(rounds, restCorrection) {
    const stats = { partner: {}, opponent: {}, rest: {}, borrower: {} };

    if (restCorrection) {
      for (const id of Object.keys(restCorrection)) {
        stats.rest[id] = restCorrection[id];
      }
    }

    for (const round of rounds) {
      // A voluntary pause counts as a rest turn, so whoever comes back plays
      // first again.
      for (const id of round.resting.concat(round.paused || [])) {
        increment(stats.rest, id);
      }
      for (const court of round.courts) {
        increment(stats.partner, pairKey(court.teamA[0], court.teamA[1]));
        increment(stats.partner, pairKey(court.teamB[0], court.teamB[1]));
        for (const a of court.teamA) {
          for (const b of court.teamB) {
            increment(stats.opponent, pairKey(a, b));
          }
        }
        for (const id of court.borrowers) {
          increment(stats.borrower, id);
        }
      }
    }

    return stats;
  }

  function highestRestBalance(stats, ids) {
    let highest = 0;
    for (const id of ids) {
      const balance = count(stats.rest, id);
      if (balance > highest) highest = balance;
    }
    return highest;
  }

  function countSpots(attendeeCount, courts) {
    const byCourts = Math.max(0, courts) * 4;
    const byFoursomes = Math.floor(attendeeCount / 4) * 4;
    return Math.min(byCourts, byFoursomes);
  }

  // Hard rule: whoever has rested the most so far plays. Shuffling first and
  // then sorting stably gives a random tiebreak.
  function choosePlaying(attendees, spots, stats, rng, always) {
    const priority = always || {};
    const byRestBalance = shuffle(attendees, rng).sort(function (a, b) {
      const difference = (priority[b.id] ? 1 : 0) - (priority[a.id] ? 1 : 0);
      if (difference) return difference;
      return count(stats.rest, b.id) - count(stats.rest, a.id);
    });
    return {
      playing: byRestBalance.slice(0, spots),
      resting: byRestBalance.slice(spots),
    };
  }

  // Shuffle first, then sort stably by group: the group order is fixed, but
  // within a group the order changes every round. That way who lands on the
  // boundary between two groups rotates by itself.
  function distributeOverCourts(playing, rng, mixing, always) {
    const shuffled = shuffle(playing, rng);
    const fixed = always || {};
    const rank = {};
    for (const player of shuffled) {
      rank[player.id] = mixing > 0 && !fixed[player.id] ? player.group + rng() * mixing : player.group;
    }
    const row = shuffled.sort(function (a, b) {
      return rank[a.id] - rank[b.id];
    });
    const courts = [];
    for (let i = 0; i + 4 <= row.length; i += 4) {
      courts.push(row.slice(i, i + 4));
    }
    return courts;
  }

  function findBorrowers(foursome) {
    const tally = {};
    for (const player of foursome) {
      tally[player.group] = (tally[player.group] === undefined ? 0 : tally[player.group]) + 1;
    }
    const groups = Object.keys(tally).map(Number).sort(function (a, b) { return a - b; });
    let homeGroup = groups[0];
    for (const group of groups) {
      if (tally[group] > tally[homeGroup]) homeGroup = group;
    }
    return {
      homeGroup: homeGroup,
      borrowers: foursome.filter(function (player) { return player.group !== homeGroup; }),
    };
  }

  const TEAM_SPLITS = [
    [[0, 1], [2, 3]],
    [[0, 2], [1, 3]],
    [[0, 3], [1, 2]],
  ];

  function square(value) {
    return value * value;
  }

  function scoreFoursome(teamA, teamB, stats, weights) {
    const w = weights === undefined ? DEFAULT_WEIGHTS : weights;
    let score = 0;

    score += w.partner * square(count(stats.partner, pairKey(teamA[0].id, teamA[1].id)));
    score += w.partner * square(count(stats.partner, pairKey(teamB[0].id, teamB[1].id)));

    for (const a of teamA) {
      for (const b of teamB) {
        score += w.opponent * square(count(stats.opponent, pairKey(a.id, b.id)));
      }
    }

    const foursome = teamA.concat(teamB);
    const groups = foursome.map(function (player) { return player.group; });
    const gap = Math.max.apply(null, groups) - Math.min.apply(null, groups);
    score += w.levelGap * square(gap);

    for (const borrower of findBorrowers(foursome).borrowers) {
      score += w.borrower * square(count(stats.borrower, borrower.id));
    }

    return score;
  }

  function chooseTeams(foursome, stats, weights) {
    let best = null;
    let bestScore = Infinity;
    for (const split of TEAM_SPLITS) {
      const teamA = [foursome[split[0][0]], foursome[split[0][1]]];
      const teamB = [foursome[split[1][0]], foursome[split[1][1]]];
      const score = scoreFoursome(teamA, teamB, stats, weights);
      if (score < bestScore) {
        bestScore = score;
        best = { teamA: teamA, teamB: teamB };
      }
    }
    return best;
  }

  function createCourt(number, teams) {
    const foursome = teams.teamA.concat(teams.teamB);
    const split = findBorrowers(foursome);
    const groups = [];
    for (const player of foursome) {
      if (groups.indexOf(player.group) === -1) groups.push(player.group);
    }
    groups.sort(function (a, b) { return a - b; });
    return {
      number: number,
      teamA: teams.teamA.map(function (player) { return player.id; }),
      teamB: teams.teamB.map(function (player) { return player.id; }),
      homeGroup: split.homeGroup,
      groups: groups,
      borrowers: split.borrowers.map(function (player) { return player.id; }),
    };
  }

  function generateRound(input) {
    const attendees = input.attendees;
    const history = input.history === undefined ? [] : input.history;
    const attempts = Math.max(1, input.attempts === undefined ? ATTEMPTS : input.attempts);
    const rng = input.rng === undefined
      ? createRng(Math.floor(Math.random() * 4294967296))
      : input.rng;

    const weights = fillWeights(input.weights);
    const paused = input.paused === undefined ? [] : input.paused;
    const isPaused = {};
    for (const id of paused) isPaused[id] = true;
    const available = attendees.filter(function (player) { return !isPaused[player.id]; });
    const always = {};
    for (const id of input.always || []) always[id] = true;

    const stats = historyStats(history, input.restCorrection);
    const spots = countSpots(available.length, input.courts);
    if (spots === 0) return null;

    let best = null;
    let bestScore = Infinity;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const choice = choosePlaying(available, spots, stats, rng, always);
      const foursomes = distributeOverCourts(choice.playing, rng, weights.mixing, always);
      const teamsPerCourt = foursomes.map(function (foursome) { return chooseTeams(foursome, stats, weights); });

      let score = 0;
      for (const teams of teamsPerCourt) {
        score += scoreFoursome(teams.teamA, teams.teamB, stats, weights);
      }

      if (score < bestScore) {
        bestScore = score;
        best = { teamsPerCourt: teamsPerCourt, resting: choice.resting };
      }
    }

    return {
      courts: best.teamsPerCourt.map(function (teams, index) { return createCourt(index + 1, teams); }),
      resting: best.resting.map(function (player) { return player.id; }),
      paused: attendees
        .filter(function (player) { return isPaused[player.id]; })
        .map(function (player) { return player.id; }),
    };
  }

  // Swaps two players' places: within a court, between courts, or between a
  // court and the resting list. groupOf gives the group index per id, so
  // groups, homeGroup and borrowers are correct again for every court.
  function swapPlayers(round, idA, idB, groupOf) {
    const copy = JSON.parse(JSON.stringify(round));
    if (idA === idB) return copy;

    const lists = [copy.resting];
    for (const court of copy.courts) lists.push(court.teamA, court.teamB);

    function find(id) {
      for (const list of lists) {
        const index = list.indexOf(id);
        if (index !== -1) return { list: list, index: index };
      }
      return null;
    }

    const spotA = find(idA);
    const spotB = find(idB);
    if (!spotA || !spotB) return copy;
    spotA.list[spotA.index] = idB;
    spotB.list[spotB.index] = idA;

    function asPlayer(id) {
      return { id: id, group: groupOf[id] === undefined ? 0 : groupOf[id] };
    }

    copy.courts = copy.courts.map(function (court) {
      return createCourt(court.number, {
        teamA: court.teamA.map(asPlayer),
        teamB: court.teamB.map(asPlayer),
      });
    });
    return copy;
  }

  function summarize(rounds, ids) {
    const played = {};
    const rested = {};
    const paused = {};
    for (const round of rounds) {
      for (const court of round.courts) {
        for (const id of court.teamA.concat(court.teamB)) increment(played, id);
      }
      for (const id of round.resting) increment(rested, id);
      for (const id of round.paused || []) increment(paused, id);
    }
    return ids.map(function (id) {
      return {
        id: id,
        played: count(played, id),
        rested: count(rested, id),
        paused: count(paused, id),
      };
    });
  }

  globalThis.Pairing = {
    summarize: summarize,
    generateRound: generateRound,
    swapPlayers: swapPlayers,
    DEFAULT_WEIGHTS: DEFAULT_WEIGHTS,
    scoreFoursome: scoreFoursome,
    chooseTeams: chooseTeams,
    distributeOverCourts: distributeOverCourts,
    findBorrowers: findBorrowers,
    countSpots: countSpots,
    choosePlaying: choosePlaying,
    WEIGHT_PARTNER: WEIGHT_PARTNER,
    WEIGHT_OPPONENT: WEIGHT_OPPONENT,
    WEIGHT_LEVEL_GAP: WEIGHT_LEVEL_GAP,
    WEIGHT_BORROWER: WEIGHT_BORROWER,
    ATTEMPTS: ATTEMPTS,
    createRng: createRng,
    shuffle: shuffle,
    pairKey: pairKey,
    count: count,
    historyStats: historyStats,
    highestRestBalance: highestRestBalance,
  };
})();
