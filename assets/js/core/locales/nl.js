(function () {
  'use strict';

  // All visible Dutch text for the laptop and the phone. Fixed text in the
  // HTML points here with data-t="key"; text with values filled in is a
  // function. Dutch is the default and the fallback for other languages.

  function plural(count, one, many) {
    return count + ' ' + (count === 1 ? one : many);
  }

  globalThis.Locales = globalThis.Locales || {};

  Locales.nl = {
    club: 'Pickleball Den Bosch',
    app: 'Hussel',
    language: 'Taal',
    title_host: 'Hussel — Pickleball Den Bosch',
    title_phone: 'Hussel — meedoen',

    nav_players: 'Spelers',
    nav_evening: 'Avond',
    close: 'Sluiten',
    cancel: 'Annuleren',
    forgotten_evening: function (date) {
      return (date ? 'De avond van ' + date + ' staat nog open.' : 'Er staat nog een avond open.')
        + ' Afsluiten en een nieuwe beginnen? Doorgaan houdt de rondes en de telling van die avond.';
    },
    new_evening: 'Nieuwe avond',
    continue: 'Doorgaan',
    fullscreen: 'Volledig scherm',

    storage_unavailable: 'De browser bewaart niets. De avond werkt door, maar gaat verloren als je de pagina sluit.',

    // Players
    groups_title: 'Groepen',
    groups_help: 'Van sterk naar minder sterk. Banen worden in deze volgorde gevuld.',
    group_name: 'Naam van de groep',
    add_group: 'Groep toevoegen',
    move_up: 'Omhoog',
    move_down: 'Omlaag',
    remove: 'Verwijder',
    player_list_title: 'Spelerslijst',
    player_name: 'Naam van de speler',
    add_player: 'Speler toevoegen',
    search: 'Zoek een naam',
    column_name: 'Naam',
    column_group: 'Groep',
    no_players: 'Nog geen spelers. Spelers melden zich zelf aan met hun telefoon; hier kun je er ook een toevoegen.',
    no_matches: 'Geen naam gevonden.',
    player_count: function (n) { return plural(n, 'speler', 'spelers'); },
    name_exists: function (name) { return 'Er is al een speler die ' + name + ' heet.'; },
    name_empty: 'Een naam mag niet leeg zijn.',
    min_one_group: 'Er moet minstens één groep overblijven.',
    group_has_players: 'Deze groep heeft nog spelers. Zet die eerst in een andere groep.',
    player_was_present: function (name) {
      return name + ' deed mee aan de lopende avond. De gespeelde rondes blijven staan; vanaf de volgende ronde doet die speler niet meer mee.';
    },
    // Only used when a brand-new club is created.
    default_groups: ['Gevorderd', 'Midden', 'Beginner'],

    // Evening
    new_evening_title: 'Nieuwe avond',
    attendance_title: 'Wie is er?',
    attendance_help: 'Vink aan wie er vanavond is. Laatkomers kunnen zich ook later met hun telefoon aanmelden.',
    select_all: 'Iedereen',
    select_none: 'Niemand',
    only_present: 'Alleen aanwezigen',
    courts: 'Banen',
    fewer_courts: 'Minder banen',
    more_courts: 'Meer banen',
    mode: 'Modus',
    mode_changed: function (name) { return 'Modus ' + name + '. Geldt vanaf de volgende loting.'; },
    mode_draft: function (name) { return 'Modus ' + name + '. Het concept is opnieuw geloot.'; },
    preset_title: 'Hoe husselen?',
    start_evening: 'Avond starten',
    start_evening_help: 'Daarna verschijnt de QR-code waarmee spelers zich aanmelden. Starten kan altijd, ook als er nog niemand is.',
    end_evening: 'Avond afsluiten',
    end_evening_confirm: 'Avond afsluiten? De rondes van vanavond worden gewist en telefoons worden losgekoppeld.',
    counter: function (present, playing, resting, courtsInUse, courts, pauses) {
      let text = '<strong>' + present + '</strong> aanwezig · <strong>' + playing + '</strong> spelen · <strong>' + resting + '</strong> rusten';
      if (pauses) text += ' · <strong>' + pauses + '</strong> pauzeren';
      return text + ' · ' + courtsInUse + ' van de ' + courts + ' banen in gebruik';
    },
    min_four: 'Er zijn minstens vier aanwezige spelers nodig.',
    joins: function (name) { return name + (name.indexOf(', ') !== -1 ? ' doen' : ' doet') + ' mee vanaf de volgende ronde.'; },
    no_longer_playing: function (name) { return name + ' doet niet meer mee. De lopende ronde blijft staan; de wijziging geldt vanaf de volgende ronde.'; },
    pause_label: 'Pauze',
    pause_help: 'Slaat de volgende ronde over',
    without_phone: 'Doet mee zonder telefoon',
    phone_connected: 'Telefoon verbonden',
    phone_linked: 'Telefoon gekoppeld, nu niet verbonden',
    unlink: 'Ontkoppelen',
    unlinked_notice: function (name) { return 'De telefoon van ' + name + ' is ontkoppeld.'; },
    change_level: 'Niveau',
    counter_preparing: function (n) {
      return plural(n, 'speler', 'spelers') + ' aangevinkt. Start gerust: de rest meldt zich aan met de QR-code. Voor de eerste ronde zijn er vier nodig.';
    },
    counter_empty: 'Nog niemand aangevinkt. Dat mag: spelers melden zich na de start zelf aan met hun telefoon.',
    panel_button: 'Beheer',
    panel_title: 'Beheer',
    panel_present: 'Aanwezig',
    panel_nobody: 'Nog niemand. Spelers melden zich aan via de QR-code.',
    panel_search: 'Zoek een naam',
    panel_earlier: 'Eerder vanavond',
    panel_evening: 'Avond',
    panel_pick_button: 'Uit de spelerslijst',
    panel_new_button: 'Nieuwe speler',
    panel_pick_title: 'Wie is er zonder telefoon?',
    panel_pick_help: 'Vink aan wie er is maar zich niet met een telefoon aanmeldt.',
    panel_pick_confirm: function (n) { return n ? n + ' aanmelden' : 'Vink iemand aan'; },
    panel_everyone_here: 'Iedereen uit de spelerslijst is er al.',
    panel_new_help: 'Voor wie nog niet in de spelerslijst staat en geen telefoon gebruikt. Doet meteen mee.',
    back: '← Terug',
    panel_already_present: function (names) { return names.join(', ') + (names.length === 1 ? ' is' : ' zijn') + ' er al; zie hieronder bij Aanwezig.'; },
    panel_new_name: 'Nieuwe speler',
    send_home: 'Naar huis',
    unlink_confirm: function (name) { return 'De telefoon van ' + name + ' loskoppelen van deze avond? ' + name + ' blijft aangemeld; de telefoon kan daarna gewoon opnieuw meedoen door een naam te kiezen.'; },
    stats: function (played, rested, paused) {
      let text = played + '× gespeeld · ' + rested + '× rust';
      if (paused) text += ' · ' + paused + '× pauze';
      return text;
    },
    level_changed: function (name, level) { return name + ' speelt vanaf de volgende ronde op niveau ' + level + '.'; },
    level_draft: function (name, level) { return name + ' speelt nu op niveau ' + level + '. Het concept is opnieuw geloot.'; },
    // where is 'round' or 'draft'.
    substitute: function (out, sub, court, where) {
      const place = where === 'round' ? 'in de lopende ronde' : 'in het concept';
      if (!sub && where === 'draft') return out + ' valt uit; het concept is opnieuw geloot.';
      if (!sub) return out + ' valt uit, maar niemand rust om op baan ' + court + ' in te vallen.';
      return out + ' valt uit; ' + sub + ' valt in op baan ' + court + ' ' + place + '.';
    },
    pausing_notice: function (name, now) { return name + (now ? ' stopt deze ronde.' : ' slaat de volgende ronde over.'); },
    draft_updated: function (names) {
      return names.join(', ') + (names.length === 1 ? ' is' : ' zijn') + ' erbij gekomen. Het concept is opnieuw geloot, zodat '
        + (names.length === 1 ? 'die meteen meedoet.' : 'zij meteen meedoen.');
    },
    new_signup: function (name, group) { return name + ' heeft zich aangemeld (' + group + ').'; },
    evening_no_players: 'Nog geen spelers. Start de avond: spelers melden zich aan met hun telefoon via de QR-code.',

    // Lobby before the first round
    lobby_status: 'Aanmelden',
    lobby_title: 'Scan en doe mee',
    lobby_help: 'Vul je naam en niveau in, of tik je naam aan als je al eerder meedeed.',
    lobby_joined: 'Al binnen',
    lobby_too_few: function (n) { return 'Nog ' + n + ' nodig voor de eerste ronde.'; },
    lobby_ready: 'Genoeg spelers. Bereid de eerste ronde voor zodra iedereen binnen is.',
    first_round: 'Eerste ronde voorbereiden',

    // Joining
    join_short: 'Scan om mee te doen',
    session_code: 'Code',
    local_file: 'De app draait nu als lokaal bestand. Telefoons kunnen pas aansluiten als de app online staat.',
    connection_status: {
      'connecting': 'Telefoons: verbinden…',
      'online': 'Telefoons kunnen aansluiten',
      'offline': 'Telefoons kunnen nu niet aansluiten — geen verbinding met de server. De avond werkt gewoon door.',
      'code-taken': 'Telefoons: verbinding herstellen…',
      'unsupported': 'Deze browser ondersteunt geen telefoonverbinding.',
    },
    scanner_help: 'Houd je aanmeldpas voor de camera.',
    camera_on: 'Camera aan voor aanmeldpassen',
    camera_off: 'Camera uit',
    camera_denied: 'De browser mag de camera niet gebruiken. Sta het toe via de adresbalk en zet de camera opnieuw aan.',
    camera_failed: 'De camera start niet. Gebruikt een ander programma hem misschien?',
    camera_unsupported: 'Deze browser kan de camera niet gebruiken.',
    scan_welcome: function (name) { return 'Welkom, ' + name + '!'; },
    scan_already: function (name) { return name + ', je bent al aangemeld.'; },
    scan_level: function (name) { return 'Welkom, ' + name + '! Op welk niveau speel je meestal?'; },
    connected_count: function (n) { return plural(n, 'telefoon', 'telefoons'); },

    // Round
    round_title: 'Ronde',
    draft: 'Concept',
    in_progress: 'Bezig',
    draft_help: 'Telefoons zien dit nog niet. Tik twee namen om ze te wisselen.',
    prepare_next: 'Volgende ronde voorbereiden',
    redraw: 'Opnieuw loten',
    start_round: function (n) { return 'Start ronde ' + n; },
    court: 'Baan',
    versus: 'tegen',
    resting: 'Rust',
    paused: 'Pauze',
    nobody_resting: 'Deze ronde rust niemand.',
    no_round_possible: 'Met dit aantal spelers en banen is er geen volledige baan te vullen.',
    swap_selected: function (name) { return name + ' gekozen. Tik een tweede naam om te wisselen.'; },
    stale_title: 'Er is iets veranderd sinds dit concept',
    stale_reason: {
      'pause': 'wil pauzeren',
      'return': 'speelt toch weer mee',
      'leave': 'is vertrokken',
      'checkIn': 'is erbij gekomen',
      'level': 'speelt nu op een ander niveau',
    },
    stale_advice: 'Je hebt in dit concept met de hand gewisseld, dus het is niet vanzelf opnieuw geloot. Loot opnieuw om dit mee te nemen, of start de ronde zo.',
    courts_changed: function (n, draft) {
      return n + (n === 1 ? ' baan' : ' banen') + (draft
        ? '. Het concept is opnieuw geloot.'
        : '. Geldt vanaf de volgende ronde; de lopende ronde blijft staan.');
    },

    // Presets
    presets: {
      balanced: { name: 'Gebalanceerd', help: 'Op niveau, met zo veel mogelijk nieuwe partners.' },
      social: { name: 'Sociaal mixen', help: 'Iedereen eens met iedereen. Niveaus lopen meer door elkaar.' },
      level: { name: 'Binnen niveau', help: 'Banen zo zuiver mogelijk op niveau. Herhaling neemt men voor lief.' },
    },

    // Phone
    phone_code_title: 'Doe mee met de avond',
    phone_code_help: 'Vul de code in die op het scherm in de zaal staat.',
    phone_code_button: 'Meedoen',
    phone_connecting: 'Verbinden met de zaal…',
    phone_status: {
      'connecting': 'Verbinden…',
      'connected': 'Verbonden',
      'lost': 'Verbinding kwijt, opnieuw proberen…',
      'host-gone': 'Het scherm in de zaal is niet bereikbaar. We blijven het proberen.',
      'failed': 'Verbinden lukt niet. Houd je aanmeldpas voor de camera van de laptop, of vraag de organisator je in te delen.',
      'offline': 'Geen internet. We blijven het proberen.',
      'unsupported': 'Deze browser kan niet verbinden. Houd je aanmeldpas voor de camera van de laptop, of vraag de organisator je in te delen.',
    },
    phone_retry: 'Opnieuw proberen',
    phone_other_code: 'Andere code',
    phone_welcome: 'Doe mee!',
    phone_pick_help: 'Al eerder meegedaan? Tik op je naam om je aan te melden.',
    phone_new_title: 'Nieuw hier?',
    phone_new_help: 'Vul je naam in en kies je niveau. Je doet mee vanaf de volgende ronde.',
    phone_new_name: 'Voor- en achternaam',
    phone_level: 'Je niveau',
    phone_level_help: 'Kies waar je meestal speelt. De organisator kan het later aanpassen.',
    phone_new_button: 'Aanmelden',
    phone_hello: function (name) { return 'Hoi ' + name; },
    phone_not_you: 'Niet jij?',
    phone_round: function (n) { return 'Ronde ' + n; },
    phone_court: function (n) { return 'Baan ' + n; },
    phone_with: 'Met',
    phone_against: 'Tegen',
    phone_resting: 'Je rust deze ronde',
    phone_resting_help: 'Je speelt de volgende ronde als eerste weer mee.',
    phone_paused: 'Je pauzeert deze ronde',
    phone_unassigned: 'Je doet mee vanaf de volgende ronde',
    phone_wait_first: 'De eerste ronde begint zo',
    phone_not_present: 'Je staat niet op de lijst van vanavond.',
    phone_im_here: 'Ik ben er',
    phone_left: 'Je bent afgemeld voor vanavond.',
    phone_back_in: 'Ik doe weer mee',
    phone_pause_toggle: 'Volgende ronde sla ik over',
    phone_pause_on: 'Je slaat de volgende ronde over.',
    phone_pause_when: function (court) { return 'Je staat nu op baan ' + court + '. Wanneer stop je?'; },
    phone_pause_now: 'Nu meteen, iemand valt in',
    phone_pause_later: 'Na deze ronde',
    phone_pause_cancel: 'Toch niet',
    phone_substitute: function (court) { return 'Je valt in op baan ' + court + '!'; },
    phone_go_home: 'Ik ga naar huis',
    phone_go_home_confirm: 'Ga je naar huis? Je wordt afgemeld voor de rest van de avond.',
    phone_whole_round: 'Hele ronde bekijken',
    phone_ended: 'De avond is afgesloten. Tot de volgende keer!',
    phone_unlinked: 'Je telefoon is ontkoppeld door de organisator. Kies je naam opnieuw.',
    phone_new_round: 'Nieuwe ronde!',
    // Check-in pass
    pass_open: 'Mijn aanmeldpas',
    pass_teaser_title: 'Slechte wifi in de zaal?',
    pass_teaser_help: 'Maak thuis alvast je aanmeldpas. In de zaal houd je hem voor de camera van de laptop en ben je aangemeld, ook zonder internet.',
    pass_no_connection: 'Lukt verbinden niet? Houd je aanmeldpas voor de camera van de laptop.',
    pass_title: 'Je aanmeldpas',
    pass_form_help: 'Vul je naam in zoals je altijd meedoet. De pas werkt elke week, ook zonder internet.',
    pass_make: 'Maak mijn pas',
    pass_help: 'Houd deze code voor de camera van de laptop in de zaal. Een helder scherm helpt.',
    pass_screenshot: 'Tip: maak een screenshot. Dan heb je de pas altijd bij de hand, ook als de site niet laadt.',
    pass_edit: 'Andere naam of niveau',
    pass_checked_in: 'Je bent aangemeld!',
    phone_errors: {
      'taken': 'Die naam is al gekoppeld aan een andere telefoon. Vraag de organisator om te ontkoppelen.',
      'unknown': 'Die naam staat niet meer in de lijst.',
      'no-name': 'Kies eerst je naam.',
      'not-present': 'Meld je eerst aan.',
      'empty-name': 'Vul je naam in.',
      'name-exists': 'Die naam staat al in de lijst. Tik hem daar aan, of voeg bijvoorbeeld je achternaam toe.',
      'unknown-level': 'Kies je niveau.',
      'unknown-request': 'Dat begreep het scherm in de zaal niet.',
    },
  };
})();
