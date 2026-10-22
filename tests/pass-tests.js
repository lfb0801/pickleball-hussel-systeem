// Tests for the check-in pass and for checking in by scanning it. Uses
// makeTestClub from tests.js.

test('pass: encode and decode give back the same pass', function () {
  const pass = { phone: 't1abc', player: 's9x', name: 'Zoë van der Berg', level: 'Gevorderd' };
  assertEqual(Pass.decode(Pass.encode(pass)), pass);
});

test('pass: the text is plain ASCII, also for names with accents or colons', function () {
  const text = Pass.encode({ phone: 't1', player: null, name: 'Zoë: "José"', level: 'Niveau 1' });
  assert(/^[\x20-\x7e]+$/.test(text), 'not ASCII: ' + text);
  assertEqual(Pass.decode(text).name, 'Zoë: "José"');
});

test('pass: empty fields come back as null', function () {
  assertEqual(Pass.decode(Pass.encode({ phone: 't1', name: 'Bob' })), { phone: 't1', player: null, name: 'Bob', level: null });
});

test('pass: anything that is not a pass is ignored', function () {
  assertEqual(Pass.decode('https://example.org/player.html?session=ABCDEF'), null);
  assertEqual(Pass.decode('HUSSEL1:t1:x:y'), null);
  assertEqual(Pass.decode('HUSSEL1::p1:Bob:'), null, 'a pass needs a phone id');
  assertEqual(Pass.decode('HUSSEL1:t1:%E0%A4%A:Bob:'), null, 'broken percent-encoding');
  assertEqual(Pass.decode('HUSSEL1:t1:p1:' + 'x'.repeat(500) + ':'), null);
  assertEqual(Pass.decode(null), null);
});

test('scan: a known player is checked in and the phone is linked', function () {
  const club = makeTestClub(8);
  const evening = Session.newEvening([], 2, 'ABCDEF');
  const result = Session.scanPass(evening, club, { phone: 't1', player: 'p3', name: 'Player 3', level: 'Weak' }, 'n1');
  assertEqual(result.outcome, 'checked-in');
  assertEqual(result.player, 'p3');
  assertEqual(result.evening.attendees, ['p3']);
  assertEqual(result.evening.links, { t1: 'p3' });
  assertEqual(result.club, club, 'the club stays the same');
});

test('scan: checking in by scan gives the same evening as tapping your name', function () {
  const club = makeTestClub(10);
  let evening = Session.newEvening(['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'], 2, 'ABCDEF');
  evening = Session.publish(Session.createDraft(evening, club, { rng: Pairing.createRng(4), attempts: 5 }).evening);
  const scanned = Session.scanPass(evening, club, { phone: 't9', player: 'p9' }, 'n1').evening;
  const claimed = Session.applyRequest(evening, club, { phone: 't9', type: 'claim', player: 'p9' }).evening;
  assertEqual(scanned, claimed);
});

test('scan: a player this laptop does not know by id is found by name', function () {
  const club = makeTestClub(8);
  const evening = Session.newEvening([], 2, 'ABCDEF');
  const result = Session.scanPass(evening, club, { phone: 't1', player: 'elsewhere', name: ' player 5 ' }, 'n1');
  assertEqual(result.outcome, 'checked-in');
  assertEqual(result.player, 'p5');
});

test('scan: a second scan of someone who is here changes nothing', function () {
  const club = makeTestClub(8);
  const evening = Session.newEvening(['p2'], 2, 'ABCDEF');
  const result = Session.scanPass(evening, club, { phone: 't1', player: 'p2' }, 'n1');
  assertEqual(result.outcome, 'already-here');
  assertEqual(result.evening.attendees, ['p2']);
});

test('scan: whoever went home is checked back in', function () {
  const club = makeTestClub(8);
  let evening = Session.newEvening(['p2'], 2, 'ABCDEF');
  evening = Session.checkOut(evening, 'p2');
  const result = Session.scanPass(evening, club, { phone: 't1', player: 'p2' }, 'n1');
  assertEqual(result.outcome, 'checked-in');
  assertEqual(result.evening.attendees, ['p2']);
});

test('scan: a name already on another phone is checked in, the link stays', function () {
  const club = makeTestClub(8);
  let evening = Session.newEvening([], 2, 'ABCDEF');
  evening = Session.applyRequest(evening, club, { phone: 't1', type: 'hello', player: 'p2' }).evening;
  const result = Session.scanPass(evening, club, { phone: 't2', player: 'p2' }, 'n1');
  assertEqual(result.outcome, 'checked-in');
  assertEqual(result.evening.attendees, ['p2']);
  assertEqual(result.evening.links, { t1: 'p2' });
});

test('scan: a new player with a level this laptop knows is signed up', function () {
  const club = makeTestClub(8);
  const evening = Session.newEvening([], 2, 'ABCDEF');
  const result = Session.scanPass(evening, club, { phone: 't7', name: 'Gerda', level: 'Weak' }, 'n1');
  assertEqual(result.outcome, 'registered');
  assertEqual(result.club.players[8], { id: 'n1', name: 'Gerda', group: 1 });
  assertEqual(result.evening.attendees, ['n1']);
  assertEqual(result.evening.links, { t7: 'n1' });
});

test('scan: a new player without a known level is asked for one', function () {
  const club = makeTestClub(8);
  const evening = Session.newEvening([], 2, 'ABCDEF');
  const pass = { phone: 't7', name: 'Gerda', level: 'Some other club level' };
  const asked = Session.scanPass(evening, club, pass, 'n1');
  assertEqual(asked.outcome, 'needs-level');
  assertEqual(asked.evening, evening);
  const chosen = Session.scanPass(evening, club, pass, 'n1', 0);
  assertEqual(chosen.outcome, 'registered');
  assertEqual(chosen.club.players[8].group, 0);
});

test('scan: a pass without a name for someone unknown is refused', function () {
  const club = makeTestClub(8);
  const evening = Session.newEvening([], 2, 'ABCDEF');
  const result = Session.scanPass(evening, club, { phone: 't7', name: '  ' }, 'n1', 0);
  assertEqual([result.outcome, result.error], ['error', 'empty-name']);
});

test('scan: the first player to join by scan is remembered like a phone', function () {
  const club = makeTestClub(8);
  const evening = Session.newEvening([], 2, 'ABCDEF');
  const viaScan = Session.scanPass(evening, club, { phone: 't1', player: 'p4' }, 'n1').evening;
  const viaPhone = Session.applyRequest(evening, club, { phone: 't1', type: 'claim', player: 'p4' }).evening;
  assertEqual(viaScan.first, 'p4');
  assertEqual(viaScan.first, viaPhone.first);
});
