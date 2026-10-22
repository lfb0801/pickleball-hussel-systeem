(function () {
  'use strict';

  // All visible English text for the laptop and the phone. Same keys and
  // function signatures as the Dutch locale; any key missing here falls back
  // to Dutch (see i18n.js).

  function plural(count, one, many) {
    return count + ' ' + (count === 1 ? one : many);
  }

  globalThis.Locales = globalThis.Locales || {};

  Locales.en = {
    club: 'Pickleball Den Bosch',
    app: 'Hussel',
    language: 'Language',
    title_host: 'Hussel — Pickleball Den Bosch',
    title_phone: 'Hussel — join',

    nav_players: 'Players',
    nav_evening: 'Evening',
    close: 'Close',
    cancel: 'Cancel',
    forgotten_evening: function (date) {
      return (date ? 'The evening of ' + date + ' is still open.' : 'An evening is still open.')
        + ' End it and start a new one? Continue keeps the rounds and counts from that evening.';
    },
    new_evening: 'New evening',
    continue: 'Continue',
    fullscreen: 'Full screen',

    storage_unavailable: 'This browser isn\'t saving anything. The evening keeps working, but is lost if you close the page.',

    // Players
    groups_title: 'Groups',
    groups_help: 'From strongest to least strong. Courts are filled in this order.',
    group_name: 'Group name',
    add_group: 'Add group',
    move_up: 'Move up',
    move_down: 'Move down',
    remove: 'Remove',
    player_list_title: 'Player list',
    player_name: 'Player name',
    add_player: 'Add player',
    search: 'Search for a name',
    column_name: 'Name',
    column_group: 'Group',
    no_players: 'No players yet. Players sign themselves up on their phones; you can also add one here.',
    no_matches: 'No name found.',
    player_count: function (n) { return plural(n, 'player', 'players'); },
    name_exists: function (name) { return 'There is already a player called ' + name + '.'; },
    name_empty: 'A name can\'t be empty.',
    min_one_group: 'At least one group has to remain.',
    group_has_players: 'This group still has players. Move them to another group first.',
    player_was_present: function (name) {
      return name + ' was playing tonight. The rounds already played stay as they are; from the next round on, this player no longer plays.';
    },
    // Only used when a brand-new club is created.
    default_groups: ['Advanced', 'Intermediate', 'Beginner'],

    // Evening
    new_evening_title: 'New evening',
    attendance_title: 'Who\'s here?',
    attendance_help: 'Tick everyone who\'s here tonight. Latecomers can also check in later on their phones.',
    select_all: 'Everyone',
    select_none: 'No one',
    only_present: 'Only those present',
    courts: 'Courts',
    fewer_courts: 'Fewer courts',
    more_courts: 'More courts',
    mode: 'Mode',
    mode_changed: function (name) { return 'Mode ' + name + '. Applies from the next draw.'; },
    mode_draft: function (name) { return 'Mode ' + name + '. The draft has been redrawn.'; },
    preset_title: 'How to mix?',
    start_evening: 'Start evening',
    start_evening_help: 'Next, the QR code appears that players use to check in. You can always start, even if nobody is here yet.',
    end_evening: 'End evening',
    end_evening_confirm: 'End the evening? Tonight\'s rounds will be cleared and phones disconnected.',
    counter: function (present, playing, resting, courtsInUse, courts, pauses) {
      let text = '<strong>' + present + '</strong> present · <strong>' + playing + '</strong> playing · <strong>' + resting + '</strong> resting';
      if (pauses) text += ' · <strong>' + pauses + '</strong> paused';
      return text + ' · ' + courtsInUse + ' of ' + courts + ' courts in use';
    },
    min_four: 'You need at least four players present.',
    joins: function (name) { return name + (name.indexOf(', ') !== -1 ? ' join' : ' joins') + ' from the next round.'; },
    no_longer_playing: function (name) { return name + ' is no longer playing. The current round stays as it is; the change applies from the next round.'; },
    pause_label: 'Pause',
    pause_help: 'Skips the next round',
    without_phone: 'Playing without a phone',
    phone_connected: 'Phone connected',
    phone_linked: 'Phone linked, not connected right now',
    unlink: 'Unlink',
    unlinked_notice: function (name) { return name + '\'s phone has been unlinked.'; },
    change_level: 'Level',
    counter_preparing: function (n) {
      return plural(n, 'player', 'players') + ' ticked. Go ahead and start: the rest check in with the QR code. The first round needs four.';
    },
    counter_empty: 'Nobody ticked yet. That\'s fine: once you start, players check in themselves on their phones.',
    panel_button: 'Manage',
    panel_title: 'Manage',
    panel_present: 'Present',
    panel_nobody: 'Nobody yet. Players check in with the QR code.',
    panel_search: 'Search for a name',
    panel_earlier: 'Earlier tonight',
    panel_evening: 'Evening',
    panel_pick_button: 'From the player list',
    panel_new_button: 'New player',
    panel_pick_title: 'Who\'s here without a phone?',
    panel_pick_help: 'Tick everyone who\'s here but isn\'t checking in with a phone.',
    panel_pick_confirm: function (n) { return n ? 'Check in ' + n : 'Tick someone'; },
    panel_everyone_here: 'Everyone on the player list is already here.',
    panel_new_help: 'For someone who isn\'t on the player list yet and doesn\'t use a phone. Joins straight away.',
    back: '← Back',
    panel_already_present: function (names) { return names.join(', ') + (names.length === 1 ? ' is' : ' are') + ' already here; see Present below.'; },
    panel_new_name: 'New player',
    send_home: 'Going home',
    unlink_confirm: function (name) { return 'Unlink ' + name + '\'s phone from this evening? ' + name + ' stays checked in; the phone can simply join again afterwards by picking a name.'; },
    stats: function (played, rested, paused) {
      let text = played + '× played · ' + rested + '× rested';
      if (paused) text += ' · ' + paused + '× paused';
      return text;
    },
    level_changed: function (name, level) { return name + ' plays at level ' + level + ' from the next round.'; },
    level_draft: function (name, level) { return name + ' now plays at level ' + level + '. The draft has been redrawn.'; },
    // where is 'round' or 'draft'.
    substitute: function (out, sub, court, where) {
      const place = where === 'round' ? 'in the current round' : 'in the draft';
      if (!sub && where === 'draft') return out + ' drops out; the draft has been redrawn.';
      if (!sub) return out + ' drops out, but nobody is resting to step in on court ' + court + '.';
      return out + ' drops out; ' + sub + ' steps in on court ' + court + ' ' + place + '.';
    },
    pausing_notice: function (name, now) { return name + (now ? ' stops this round.' : ' skips the next round.'); },
    draft_updated: function (names) {
      return names.join(', ') + (names.length === 1 ? ' has' : ' have') + ' joined. The draft has been redrawn so '
        + (names.length === 1 ? 'they can play straight away.' : 'they can all play straight away.');
    },
    new_signup: function (name, group) { return name + ' has checked in (' + group + ').'; },
    evening_no_players: 'No players yet. Start the evening: players check in on their phones with the QR code.',

    // Lobby before the first round
    lobby_status: 'Check-in',
    lobby_title: 'Scan and join',
    lobby_help: 'Enter your name and level, or tap your name if you\'ve played before.',
    lobby_joined: 'Already in',
    lobby_too_few: function (n) { return n + ' more needed for the first round.'; },
    lobby_ready: 'Enough players. Prepare the first round once everyone is in.',
    first_round: 'Prepare first round',

    // Joining
    join_short: 'Scan to join',
    session_code: 'Code',
    local_file: 'The app is running as a local file. Phones can only join once the app is online.',
    connection_status: {
      'connecting': 'Phones: connecting…',
      'online': 'Phones can join',
      'offline': 'Phones can\'t join right now — no connection to the server. The evening carries on as normal.',
      'code-taken': 'Phones: restoring the connection…',
      'unsupported': 'This browser doesn\'t support phone connections.',
    },
    scanner_help: 'Hold your check-in pass up to the camera.',
    camera_on: 'Camera on for check-in passes',
    camera_off: 'Camera off',
    camera_denied: 'The browser isn\'t allowed to use the camera. Allow it in the address bar and switch the camera on again.',
    camera_failed: 'The camera won\'t start. Is another app using it?',
    camera_unsupported: 'This browser can\'t use the camera.',
    scan_welcome: function (name) { return 'Welcome, ' + name + '! You play from the next round.'; },
    scan_registered: function (name) { return 'Welcome, ' + name + '! You\'re signed up and play from the next round.'; },
    scan_already: function (name) { return name + ', you\'re already checked in.'; },
    scan_level: function (name) { return 'Welcome, ' + name + '! Which level do you usually play at?'; },
    connected_count: function (n) { return plural(n, 'phone', 'phones'); },

    // Round
    round_title: 'Round',
    draft: 'Draft',
    in_progress: 'In progress',
    draft_help: 'Phones can\'t see this yet. Tap two names to swap them.',
    prepare_next: 'Prepare next round',
    redraw: 'Redraw',
    start_round: function (n) { return 'Start round ' + n; },
    court: 'Court',
    versus: 'vs',
    resting: 'Resting',
    paused: 'Paused',
    nobody_resting: 'Nobody is resting this round.',
    no_round_possible: 'With this number of players and courts, not a single court can be filled.',
    swap_selected: function (name) { return name + ' selected. Tap a second name to swap.'; },
    stale_title: 'Something has changed since this draft',
    stale_reason: {
      'pause': 'wants to pause',
      'return': 'is playing again',
      'leave': 'has left',
      'checkIn': 'has joined',
      'level': 'now plays at a different level',
    },
    stale_advice: 'You swapped players by hand in this draft, so it hasn\'t been redrawn automatically. Redraw to include this, or start the round as it is.',
    courts_changed: function (n, draft) {
      return n + (n === 1 ? ' court' : ' courts') + (draft
        ? '. The draft has been redrawn.'
        : '. Applies from the next round; the current round stays as it is.');
    },

    // Presets
    presets: {
      balanced: { name: 'Balanced', help: 'By level, with as many new partners as possible.' },
      social: { name: 'Social mix', help: 'Everyone plays with everyone at some point. Levels mix more.' },
      level: { name: 'Within level', help: 'Courts as even in level as possible, even if that means some repeats.' },
    },

    // Phone
    phone_code_title: 'Join the evening',
    phone_code_help: 'Enter the code shown on the screen in the hall.',
    phone_code_button: 'Join',
    phone_connecting: 'Connecting to the hall…',
    phone_status: {
      'connecting': 'Connecting…',
      'connected': 'Connected',
      'lost': 'Connection lost, trying again…',
      'host-gone': 'The screen in the hall can\'t be reached. We\'ll keep trying.',
      'failed': 'Can\'t connect. Hold your check-in pass up to the laptop camera, or ask the organiser to add you to the rounds.',
      'offline': 'No internet. We\'ll keep trying.',
      'unsupported': 'This browser can\'t connect. Hold your check-in pass up to the laptop camera, or ask the organiser to add you to the rounds.',
    },
    phone_retry: 'Try again',
    phone_other_code: 'Different code',
    phone_welcome: 'Join in!',
    phone_pick_help: 'Played before? Tap your name to check in.',
    phone_new_title: 'New here?',
    phone_new_help: 'Enter your name and choose your level. You\'ll join from the next round.',
    phone_new_name: 'First and last name',
    phone_level: 'Your level',
    phone_level_help: 'Choose where you usually play. The organiser can change it later.',
    phone_new_button: 'Check in',
    phone_hello: function (name) { return 'Hi ' + name; },
    phone_not_you: 'Not you?',
    phone_round: function (n) { return 'Round ' + n; },
    phone_court: function (n) { return 'Court ' + n; },
    phone_with: 'With',
    phone_against: 'Against',
    phone_resting: 'You\'re resting this round',
    phone_resting_help: 'You\'re first in line to play next round.',
    phone_paused: 'You\'re taking a break this round',
    phone_unassigned: 'You\'ll join from the next round',
    phone_wait_first: 'The first round starts soon',
    phone_not_present: 'You\'re not on tonight\'s list.',
    phone_im_here: 'I\'m here',
    phone_left: 'You\'ve checked out for tonight.',
    phone_back_in: 'I\'m playing again',
    phone_pause_toggle: 'I\'ll skip the next round',
    phone_pause_on: 'You\'re skipping the next round.',
    phone_pause_when: function (court) { return 'You\'re on court ' + court + ' right now. When do you want to stop?'; },
    phone_pause_now: 'Right now, someone steps in',
    phone_pause_later: 'After this round',
    phone_pause_cancel: 'Never mind',
    phone_substitute: function (court) { return 'You\'re stepping in on court ' + court + '!'; },
    phone_go_home: 'I\'m going home',
    phone_go_home_confirm: 'Going home? You\'ll be checked out for the rest of the evening.',
    phone_whole_round: 'See the whole round',
    phone_ended: 'The evening has ended. See you next time!',
    phone_unlinked: 'The organiser has unlinked your phone. Pick your name again.',
    phone_new_round: 'New round!',
    // Check-in pass
    pass_open: 'My check-in pass',
    pass_teaser_title: 'Bad wifi in the hall?',
    pass_teaser_help: 'Make your check-in pass at home. In the hall, hold it up to the laptop camera and you\'re checked in, even without internet.',
    pass_no_connection: 'Can\'t connect? Hold your check-in pass up to the laptop camera.',
    pass_title: 'Your check-in pass',
    pass_form_help: 'Enter your name as you always play under. The pass works every week, even without internet.',
    pass_make: 'Make my pass',
    pass_help: 'Hold this code up to the laptop camera in the hall. A bright screen helps.',
    pass_screenshot: 'Tip: take a screenshot. Then you always have your pass at hand, even if the site won\'t load.',
    pass_edit: 'Different name or level',
    pass_checked_in: 'You\'re checked in!',
    phone_errors: {
      'taken': 'That name is already linked to another phone. Ask the organiser to unlink it.',
      'unknown': 'That name is no longer on the list.',
      'no-name': 'Pick your name first.',
      'not-present': 'Check in first.',
      'empty-name': 'Enter your name.',
      'name-exists': 'That name is already on the list. Tap it there, or add your last name, for example.',
      'unknown-level': 'Choose your level.',
      'unknown-request': 'The screen in the hall didn\'t understand that.',
    },
  };
})();
