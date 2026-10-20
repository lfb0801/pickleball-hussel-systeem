(function () {
  'use strict';

  // Alle zichtbare tekst van laptop en telefoon. Vaste tekst in de HTML
  // verwijst hiernaar met data-t="sleutel"; tekst met invulling is een
  // functie.

  function meervoud(aantal, een, veel) {
    return aantal + ' ' + (aantal === 1 ? een : veel);
  }

  globalThis.T = {
    club: 'Pickleball Den Bosch',
    app: 'Hussel',

    nav_spelers: 'Spelers',
    nav_avond: 'Avond',
    nav_ronde: 'Ronde',
    nav_overzicht: 'Overzicht',
    volledig_scherm: 'Volledig scherm',

    opslag_weg: 'De browser bewaart niets. De avond werkt door, maar gaat verloren als je de pagina sluit.',

    // Spelers
    spelers_titel: 'Spelers en groepen',
    groepen_titel: 'Groepen',
    groepen_uitleg: 'Van sterk naar minder sterk. Banen worden in deze volgorde gevuld.',
    groep_naam: 'Naam van de groep',
    groep_toevoegen: 'Groep toevoegen',
    omhoog: 'Omhoog',
    omlaag: 'Omlaag',
    verwijder: 'Verwijder',
    spelerslijst_titel: 'Spelerslijst',
    speler_naam: 'Naam van de speler',
    speler_toevoegen: 'Speler toevoegen',
    zoeken: 'Zoek een naam',
    kolom_naam: 'Naam',
    kolom_groep: 'Groep',
    geen_spelers: 'Nog geen spelers. Spelers melden zich zelf aan met hun telefoon; hier kun je er ook een toevoegen.',
    geen_treffers: 'Geen naam gevonden.',
    spelers_aantal: function (n) { return meervoud(n, 'speler', 'spelers'); },
    naam_bestaat_al: function (naam) { return 'Er is al een speler die ' + naam + ' heet.'; },
    naam_leeg: 'Een naam mag niet leeg zijn.',
    min_een_groep: 'Er moet minstens één groep overblijven.',
    groep_heeft_spelers: 'Deze groep heeft nog spelers. Zet die eerst in een andere groep.',
    speler_was_aanwezig: function (naam) {
      return naam + ' deed mee aan de lopende avond. De gespeelde rondes blijven staan; vanaf de volgende ronde doet die speler niet meer mee.';
    },

    // Avond
    avond_titel: 'Avond',
    avond_nieuw_titel: 'Nieuwe avond',
    aanwezig_titel: 'Wie is er?',
    aanwezig_uitleg: 'Vink aan wie er vanavond is. Laatkomers kunnen zich ook later met hun telefoon aanmelden.',
    alles_aan: 'Iedereen',
    alles_uit: 'Niemand',
    alleen_aanwezig: 'Alleen aanwezigen',
    banen: 'Banen',
    preset_titel: 'Hoe husselen?',
    avond_starten: 'Avond starten',
    avond_afsluiten: 'Avond afsluiten',
    afsluiten_vraag: 'Avond afsluiten? De rondes van vanavond worden gewist en telefoons worden losgekoppeld.',
    teller_te_weinig: function (n) { return meervoud(n, 'speler', 'spelers') + ' aanwezig. Er zijn er minstens vier nodig.'; },
    teller: function (aanwezig, spelen, rusten, banenInGebruik, banen, pauzes) {
      let tekst = '<strong>' + aanwezig + '</strong> aanwezig · <strong>' + spelen + '</strong> spelen · <strong>' + rusten + '</strong> rusten';
      if (pauzes) tekst += ' · <strong>' + pauzes + '</strong> pauzeren';
      return tekst + ' · ' + banenInGebruik + ' van de ' + banen + ' banen in gebruik';
    },
    min_vier: 'Er zijn minstens vier aanwezige spelers nodig.',
    min_een_baan: 'Er is minstens één baan nodig.',
    doet_mee: function (naam) { return naam + ' doet mee vanaf de volgende ronde.'; },
    doet_niet_meer_mee: function (naam) { return naam + ' doet niet meer mee. De lopende ronde blijft staan; de wijziging geldt vanaf de volgende ronde.'; },
    pauze_label: 'Pauze',
    pauze_uitleg: 'Slaat de volgende ronde over',
    telefoon_verbonden: 'Telefoon verbonden',
    telefoon_gekoppeld: 'Telefoon gekoppeld, nu niet verbonden',
    ontkoppel: 'Ontkoppel',
    ontkoppeld_melding: function (naam) { return 'De telefoon van ' + naam + ' is ontkoppeld.'; },
    nieuw_aangemeld: function (naam, groep) { return naam + ' heeft zich aangemeld (' + groep + ').'; },
    avond_geen_spelers: 'Nog geen spelers. Start de avond: spelers melden zich aan met hun telefoon via de QR-code.',

    // Wachtruimte voor de eerste ronde
    lobby_status: 'Aanmelden',
    lobby_titel: 'Scan en doe mee',
    lobby_uitleg: 'Vul je naam en niveau in, of tik je naam aan als je al eerder meedeed.',
    lobby_binnen: 'Al binnen',
    lobby_te_weinig: function (n) { return 'Nog ' + n + ' nodig voor de eerste ronde.'; },
    lobby_klaar: 'Genoeg spelers. Bereid de eerste ronde voor zodra iedereen binnen is.',
    eerste_ronde: 'Eerste ronde voorbereiden',

    // Aansluiten
    aansluiten_titel: 'Doe mee met je telefoon',
    aansluiten_uitleg: 'Scan de code of ga naar de link en vul de code in.',
    aansluiten_kort: 'Scan om mee te doen',
    sessiecode: 'Code',
    lokaal_bestand: 'De app draait nu als lokaal bestand. Telefoons kunnen pas aansluiten als de app online staat.',
    verbinding_status: {
      'verbinden': 'Telefoons: verbinden…',
      'online': 'Telefoons kunnen aansluiten',
      'offline': 'Telefoons kunnen nu niet aansluiten — geen verbinding met de server. De avond werkt gewoon door.',
      'code-bezet': 'Telefoons: verbinding herstellen…',
      'niet-ondersteund': 'Deze browser ondersteunt geen telefoonverbinding.',
    },
    verbonden_aantal: function (n) { return meervoud(n, 'telefoon', 'telefoons'); },

    // Ronde
    ronde_titel: 'Ronde',
    concept: 'Concept',
    bezig: 'Bezig',
    concept_uitleg: 'Telefoons zien dit nog niet. Tik twee namen om ze te wisselen.',
    volgende_voorbereiden: 'Volgende ronde voorbereiden',
    opnieuw_loten: 'Opnieuw loten',
    start_ronde: function (n) { return 'Start ronde ' + n; },
    spelers_aanpassen: 'Spelers aanpassen',
    baan: 'Baan',
    tegen: 'tegen',
    rust: 'Rust',
    pauzeert: 'Pauze',
    niemand_rust: 'Deze ronde rust niemand.',
    start_eerst_avond: 'Start eerst een avond.',
    geen_ronde_mogelijk: 'Met dit aantal spelers en banen is er geen volledige baan te vullen.',
    gekozen_wissel: function (naam) { return naam + ' gekozen. Tik een tweede naam om te wisselen.'; },
    verouderd_titel: 'Er is iets veranderd sinds dit concept',
    verouderd_reden: {
      'pauze': 'wil pauzeren',
      'terug': 'speelt toch weer mee',
      'vertrek': 'is vertrokken',
      'aanmelding': 'is erbij gekomen',
    },
    verouderd_advies: 'Loot opnieuw om dit mee te nemen, of start de ronde zo.',
    lener: 'speelt een niveau anders',
    banen_gewijzigd: function (n, concept) {
      return n + (n === 1 ? ' baan' : ' banen') + (concept
        ? '. Het concept is opnieuw geloot.'
        : '. Geldt vanaf de volgende ronde; de lopende ronde blijft staan.');
    },

    // Overzicht
    overzicht_titel: 'Overzicht',
    geen_avond: 'Er loopt geen avond.',
    rondes_gespeeld: function (n) { return meervoud(n, 'ronde', 'rondes') + ' gespeeld.'; },
    kolom_speler: 'Speler',
    kolom_gespeeld: 'Gespeeld',
    kolom_gerust: 'Gerust',
    kolom_gepauzeerd: 'Pauze',

    // Presets
    presets: {
      gebalanceerd: { naam: 'Gebalanceerd', uitleg: 'Op niveau, met zo veel mogelijk nieuwe partners.' },
      sociaal: { naam: 'Sociaal mixen', uitleg: 'Iedereen eens met iedereen. Niveaus lopen meer door elkaar.' },
      niveau: { naam: 'Binnen niveau', uitleg: 'Banen zo zuiver mogelijk op niveau. Herhaling neemt men voor lief.' },
    },

    // Telefoon
    tel_code_titel: 'Doe mee met de avond',
    tel_code_uitleg: 'Vul de code in die op het scherm in de zaal staat.',
    tel_code_knop: 'Meedoen',
    tel_verbinden: 'Verbinden met de zaal…',
    tel_status: {
      'verbinden': 'Verbinden…',
      'verbonden': 'Verbonden',
      'kwijt': 'Verbinding kwijt, opnieuw proberen…',
      'gastheer-weg': 'Het scherm in de zaal is niet bereikbaar. We blijven het proberen.',
      'mislukt': 'Verbinden lukt niet. Gebruik de wifi van de zaal of vraag de organisator je in te delen.',
      'offline': 'Geen internet. We blijven het proberen.',
      'niet-ondersteund': 'Deze browser kan niet verbinden. Vraag de organisator je in te delen.',
    },
    tel_opnieuw: 'Opnieuw proberen',
    tel_andere_code: 'Andere code',
    tel_welkom: 'Doe mee!',
    tel_kies_uitleg: 'Al eerder meegedaan? Tik op je naam om je aan te melden.',
    tel_nieuw_titel: 'Nieuw hier?',
    tel_nieuw_uitleg: 'Vul je naam in en kies je niveau. Je doet mee vanaf de volgende ronde.',
    tel_nieuw_naam: 'Voor- en achternaam',
    tel_niveau: 'Je niveau',
    tel_niveau_uitleg: 'Kies waar je meestal speelt. De organisator kan het later aanpassen.',
    tel_nieuw_knop: 'Aanmelden',
    tel_hoi: function (naam) { return 'Hoi ' + naam; },
    tel_niet_jij: 'Niet jij?',
    tel_ronde: function (n) { return 'Ronde ' + n; },
    tel_baan: function (n) { return 'Baan ' + n; },
    tel_met: 'Met',
    tel_tegen: 'Tegen',
    tel_rust: 'Je rust deze ronde',
    tel_rust_uitleg: 'Je speelt de volgende ronde als eerste weer mee.',
    tel_pauze: 'Je pauzeert deze ronde',
    tel_niet_ingedeeld: 'Je doet mee vanaf de volgende ronde',
    tel_wacht_eerste: 'De eerste ronde begint zo',
    tel_niet_aanwezig: 'Je staat niet op de lijst van vanavond.',
    tel_ik_ben_er: 'Ik ben er',
    tel_vertrokken: 'Je bent afgemeld voor vanavond.',
    tel_toch_terug: 'Ik doe weer mee',
    tel_pauze_schakelaar: 'Volgende ronde sla ik over',
    tel_pauze_aan: 'Je slaat de volgende ronde over.',
    tel_naar_huis: 'Ik ga naar huis',
    tel_naar_huis_vraag: 'Ga je naar huis? Je wordt afgemeld voor de rest van de avond.',
    tel_hele_ronde: 'Hele ronde bekijken',
    tel_einde: 'De avond is afgesloten. Tot de volgende keer!',
    tel_ontkoppeld: 'Je telefoon is ontkoppeld door de organisator. Kies je naam opnieuw.',
    tel_nieuwe_ronde: 'Nieuwe ronde!',
    tel_fouten: {
      'bezet': 'Die naam is al gekoppeld aan een andere telefoon. Vraag de organisator om te ontkoppelen.',
      'onbekend': 'Die naam staat niet meer in de lijst.',
      'geen-naam': 'Kies eerst je naam.',
      'niet-aanwezig': 'Meld je eerst aan.',
      'lege-naam': 'Vul je naam in.',
      'naam-bestaat': 'Die naam staat al in de lijst. Tik hem daar aan, of voeg bijvoorbeeld je achternaam toe.',
      'onbekend-niveau': 'Kies je niveau.',
      'onbekend-verzoek': 'Dat begreep het scherm in de zaal niet.',
    },
  };
})();
