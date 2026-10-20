(function () {
  'use strict';

  const STANDAARD_GROEPEN = ['Gevorderd', 'Midden', 'Beginner'];

  const App = {
    club: { groepen: STANDAARD_GROEPEN.slice(), spelers: [], preset: Presets.STANDAARD },
    avond: null,
    huidigScherm: null,
    verbinding: null,
    verbindingStatus: '',
    verbondenTelefoons: [],
    wekslot: null,
    meldingTimer: null,

    bewaarClub: function () {
      Opslag.bewaarClub(this.club);
    },

    // Elke wijziging aan de avond gaat hierlangs, zodat telefoons altijd
    // dezelfde toestand zien als de laptop.
    bewaarAvond: function () {
      if (this.avond) Opslag.bewaarAvond(this.avond);
      else Opslag.wisAvond();
      this.zendToestand();
    },

    wijzigAvond: function (nieuweAvond) {
      this.avond = nieuweAvond;
      this.bewaarAvond();
    },

    spelerOp: function (id) {
      for (const speler of this.club.spelers) {
        if (speler.id === id) return speler;
      }
      return null;
    },

    naam: function (id) {
      const speler = this.spelerOp(id);
      return speler ? speler.naam : '?';
    },

    gewichten: function () {
      return Presets.gewichten(this.club.preset);
    },

    // Zodra de avond loopt, is het ronde-scherm het enige scherm; al het
    // beheer zit in het zijpaneel.
    toonScherm: function (naam) {
      if (this.avond) naam = 'ronde';
      else if (naam === 'ronde') naam = 'avond';
      this.huidigScherm = naam;
      document.body.classList.toggle('avond-loopt', Boolean(this.avond));
      if (!this.avond && window.SchermPaneel) SchermPaneel.sluit();
      for (const sectie of document.querySelectorAll('main > section')) {
        sectie.hidden = sectie.id !== 'scherm-' + naam;
      }
      for (const knop of document.querySelectorAll('nav button')) {
        knop.classList.toggle('actief', knop.dataset.scherm === naam);
      }
      this.renderHuidig();
    },

    renderHuidig: function () {
      const schermen = {
        spelers: window.SchermSpelers,
        avond: window.SchermAvond,
        ronde: window.SchermRonde,
      };
      const scherm = schermen[this.huidigScherm];
      if (scherm && scherm.render) scherm.render();
      if (window.SchermPaneel) SchermPaneel.render();
      this.renderTelefoonStatus();
    },

    // Alleen voor een echt probleem dat blijft, zoals opslag die niet werkt.
    // Blijft staan tot de organisator hem wegklikt.
    waarschuw: function (tekst) {
      document.getElementById('melding-tekst').textContent = tekst || '';
      document.getElementById('melding').hidden = !tekst;
    },

    // Gewone meldingen verschijnen even onderin en schuiven niets op.
    meld: function (tekst) {
      const toast = document.getElementById('toast');
      clearTimeout(this.meldingTimer);
      toast.textContent = tekst || '';
      toast.hidden = !tekst;
      if (tekst) this.meldingTimer = setTimeout(function () { toast.hidden = true; }, 4000);
    },

    renderPresets: function (houder) {
      houder.textContent = '';
      for (const preset of Presets.lijst) {
        const tekst = T.presets[preset.sleutel];
        const label = document.createElement('label');
        label.className = 'preset';
        const keuze = document.createElement('input');
        keuze.type = 'radio';
        keuze.name = houder.id + '-preset';
        keuze.value = preset.sleutel;
        keuze.checked = App.club.preset === preset.sleutel;
        keuze.addEventListener('change', function () {
          App.club.preset = preset.sleutel;
          App.bewaarClub();
        });
        const omschrijving = document.createElement('span');
        const naam = document.createElement('strong');
        naam.textContent = tekst.naam;
        const uitleg = document.createElement('small');
        uitleg.textContent = tekst.uitleg;
        omschrijving.appendChild(naam);
        omschrijving.appendChild(uitleg);
        label.appendChild(keuze);
        label.appendChild(omschrijving);
        houder.appendChild(label);
      }
    },

    nieuwId: function () {
      return 's' + Date.now().toString(36) + Math.floor(Math.random() * 1000000).toString(36);
    },

    vulTeksten: function (wortel) {
      for (const element of wortel.querySelectorAll('[data-t]')) {
        element.textContent = T[element.dataset.t];
      }
      for (const element of wortel.querySelectorAll('[data-t-placeholder]')) {
        element.placeholder = T[element.dataset.tPlaceholder];
      }
      for (const element of wortel.querySelectorAll('[data-t-title]')) {
        element.title = T[element.dataset.tTitle];
      }
    },

    // ---- Live sessie met telefoons ----

    aansluitLink: function () {
      if (!this.avond) return '';
      return new URL('speler.html?sessie=' + this.avond.sessiecode, location.href).href;
    },

    isLokaal: function () {
      return location.protocol === 'file:';
    },

    tekenQr: function (houder, tekst) {
      houder.textContent = '';
      if (typeof qrcode !== 'function' || !tekst) return;
      const qr = qrcode(0, 'M');
      qr.addData(tekst);
      qr.make();
      houder.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    },

    startSessie: function () {
      if (!this.avond || this.verbinding) return;
      const app = this;
      this.verbinding = Verbinding.gastheer(this.avond.sessiecode, {
        bijBericht: function (telefoon, bericht) { app.verwerkTelefoon(telefoon, bericht); },
        bijStatus: function (status) {
          app.verbindingStatus = status;
          app.renderTelefoonStatus();
          if (window.SchermPaneel) SchermPaneel.renderVerbinding();
        },
        bijTelefoons: function (lijst) {
          app.verbondenTelefoons = lijst;
          app.renderHuidig();
        },
      });
      this.houdSchermAan();
    },

    stopSessie: function () {
      if (!this.verbinding) return;
      const verbinding = this.verbinding;
      verbinding.zendAlle(function () { return { type: 'toestand', avondLoopt: false }; });
      this.verbinding = null;
      this.verbondenTelefoons = [];
      this.verbindingStatus = '';
      setTimeout(function () { verbinding.stop(); }, 800);
      this.laatSchermLos();
      this.renderTelefoonStatus();
    },

    zendToestand: function () {
      if (!this.verbinding) return;
      const app = this;
      this.verbinding.zendAlle(function (telefoon) {
        return Sessie.toestandVoor(app.avond, app.club, telefoon);
      });
    },

    verwerkTelefoon: function (telefoon, bericht) {
      if (!this.avond) {
        this.verbinding.zend(telefoon, { type: 'toestand', avondLoopt: false });
        return;
      }
      const verzoek = Object.assign({}, bericht, { telefoon: telefoon });
      const voorAvond = JSON.stringify(this.avond);
      const voorAanwezig = this.avond.aanwezigen.length;
      const uitkomst = Sessie.pasVerzoekToe(this.avond, this.club, verzoek, this.nieuwId(), this.gewichten());
      this.avond = uitkomst.avond;
      if (uitkomst.club !== this.club) {
        this.club = uitkomst.club;
        this.bewaarClub();
      }
      if (uitkomst.antwoord) {
        this.verbinding.zend(telefoon, { type: 'antwoord', fout: uitkomst.antwoord.fout });
      }
      if (JSON.stringify(this.avond) !== voorAvond) {
        this.bewaarAvond();
        this.meldVerzoek(verzoek, this.avond.aanwezigen.length - voorAanwezig);
        this.meldInvallen(uitkomst.invallen);
        this.werkConceptBij();
        this.renderHuidig();
      } else {
        this.verbinding.zend(telefoon, Sessie.toestandVoor(this.avond, this.club, telefoon));
      }
    },

    // Nieuwkomers horen meteen in de volgende ronde: een open concept wordt
    // opnieuw geloot, tenzij er al met de hand in gewisseld is.
    werkConceptBij: function () {
      if (!this.avond || !Sessie.moetConceptVernieuwen(this.avond)) return;
      const namen = Sessie.nieuwkomersBuitenConcept(this.avond).map(this.naam.bind(this));
      const uitkomst = Sessie.maakConcept(this.avond, this.club, { gewichten: this.gewichten() });
      if (uitkomst.fout) return;
      if (window.SchermRonde) SchermRonde.gekozen = null;
      this.wijzigAvond(uitkomst.avond);
      this.meld(T.concept_bijgewerkt(namen));
    },

    // Spelers typen hun naam zelf in; de organisator kan een tikfout
    // herstellen. Geeft false terug als de naam leeg is of al bestaat.
    hernoem: function (id, naam) {
      const nieuw = Sessie.schoneNaam(naam);
      if (!nieuw || Sessie.naamBestaat(this.club, nieuw, id)) {
        this.meld(nieuw ? T.naam_bestaat_al(nieuw) : T.naam_leeg);
        return false;
      }
      const speler = this.spelerOp(id);
      if (!speler) return false;
      speler.naam = nieuw;
      this.bewaarClub();
      this.zendToestand();
      return true;
    },

    // Een ander niveau verandert de baanindeling. Staat de speler op een baan
    // in het open concept, dan wordt dat opnieuw geloot, tenzij er al met de
    // hand in gewisseld is.
    wijzigNiveau: function (id, groep) {
      this.club = Sessie.zetNiveau(this.club, id, groep);
      this.bewaarClub();
      const naam = this.naam(id);
      const niveau = this.club.groepen[groep];
      if (!this.avond || !Sessie.staatOpBaanInConcept(this.avond, id)) {
        this.zendToestand();
        if (this.avond) this.meld(T.niveau_gewijzigd(naam, niveau));
        return;
      }
      if (this.avond.concept.handmatig) {
        this.wijzigAvond(Sessie.markeerVerouderd(this.avond, id, 'niveau'));
        this.meld(T.niveau_gewijzigd(naam, niveau));
        return;
      }
      const uitkomst = Sessie.maakConcept(this.avond, this.club, { gewichten: this.gewichten() });
      if (uitkomst.fout) return;
      if (window.SchermRonde) SchermRonde.gekozen = null;
      this.wijzigAvond(uitkomst.avond);
      this.meld(T.niveau_concept(naam, niveau));
    },

    meldInvallen: function (invallen) {
      if (!invallen || !invallen.length) return;
      const app = this;
      this.meld(invallen.map(function (inval) {
        return T.invaller(app.naam(inval.uit), inval.in ? app.naam(inval.in) : null, inval.baan, inval.waar);
      }).join(' '));
    },

    // Pauze of naar huis vanaf de laptop: dezelfde regels als vanaf een
    // telefoon, met een invaller waar nodig.
    pauzeer: function (id, aan, nu) {
      const gevolg = Sessie.pauzeer(this.avond, this.club, id, aan, nu, this.gewichten());
      this.wijzigAvond(gevolg.avond);
      this.meldInvallen(gevolg.invallen);
    },

    stuurNaarHuis: function (id) {
      const gevolg = Sessie.vertrek(this.avond, this.club, id, this.gewichten());
      this.wijzigAvond(gevolg.avond);
      if (gevolg.invallen.length) this.meldInvallen(gevolg.invallen);
      else this.meld(T.doet_niet_meer_mee(this.naam(id)));
    },

    meldVerzoek: function (verzoek, erbij) {
      const id = this.avond.koppelingen[verzoek.telefoon];
      const speler = id ? this.spelerOp(id) : null;
      if (!speler) return;
      if (verzoek.type === 'vertrek') this.meld(T.doet_niet_meer_mee(speler.naam));
      else if (verzoek.type === 'pauze' && verzoek.aan) this.meld(T.pauzeert_melding(speler.naam, verzoek.nu === true));
      else if (verzoek.type === 'registreer') this.meld(T.nieuw_aangemeld(speler.naam, this.club.groepen[speler.groep]));
      else if (erbij > 0) this.meld(T.doet_mee(speler.naam));
    },

    ontkoppel: function (spelerId) {
      const uitkomst = Sessie.ontkoppel(this.avond, spelerId);
      this.avond = uitkomst.avond;
      if (uitkomst.telefoon && this.verbinding) {
        this.verbinding.zend(uitkomst.telefoon, { type: 'ontkoppeld' });
      }
      this.bewaarAvond();
      this.meld(T.ontkoppeld_melding(this.naam(spelerId)));
    },

    // Per speler: 'aan' als een telefoon verbonden is, 'gekoppeld' als er
    // een telefoon bij hoort die nu niet verbonden is, anders null.
    telefoonVan: function (spelerId) {
      if (!this.avond) return null;
      const telefoon = Sessie.telefoonVan(this.avond, spelerId);
      if (!telefoon) return null;
      return this.verbondenTelefoons.indexOf(telefoon) !== -1 ? 'aan' : 'gekoppeld';
    },

    renderTelefoonStatus: function () {
      const pil = document.getElementById('telefoon-status');
      if (!this.avond || !this.verbinding) {
        pil.hidden = true;
        return;
      }
      pil.hidden = false;
      const online = this.verbindingStatus === 'online';
      pil.innerHTML = '';
      const stip = document.createElement('span');
      stip.className = 'stip ' + (online ? 'aan' : 'uit');
      pil.appendChild(stip);
      pil.appendChild(document.createTextNode(online
        ? T.verbonden_aantal(this.verbondenTelefoons.length)
        : (T.verbinding_status[this.verbindingStatus] || '').split(' — ')[0]));
    },

    // Het scherm in de zaal mag tijdens een avond niet op slot gaan.
    houdSchermAan: function () {
      const app = this;
      if (!('wakeLock' in navigator) || this.wekslot) return;
      navigator.wakeLock.request('screen').then(function (slot) {
        app.wekslot = slot;
        slot.addEventListener('release', function () { app.wekslot = null; });
      }).catch(function () {});
    },

    laatSchermLos: function () {
      if (this.wekslot) this.wekslot.release();
      this.wekslot = null;
    },

    start: function () {
      const bewaardeClub = Opslag.laadClub();
      if (bewaardeClub && bewaardeClub.groepen && bewaardeClub.spelers) {
        this.club = bewaardeClub;
        if (!this.club.preset) this.club.preset = Presets.STANDAARD;
      }
      const bewaardeAvond = Opslag.laadAvond();
      this.avond = bewaardeAvond ? Sessie.vulAan(bewaardeAvond) : null;

      this.vulTeksten(document);

      if (!Opslag.beschikbaar()) this.waarschuw(T.opslag_weg);

      for (const knop of document.querySelectorAll('nav button')) {
        knop.addEventListener('click', function () {
          App.toonScherm(knop.dataset.scherm);
        });
      }

      document.getElementById('melding-sluit').addEventListener('click', function () { App.waarschuw(''); });

      document.getElementById('volledig-scherm').addEventListener('click', function () {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
      });

      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && App.avond) App.houdSchermAan();
      });

      if (this.avond) this.startSessie();

      this.toonScherm(this.avond ? 'ronde' : 'avond');
    },
  };

  window.App = App;
  window.addEventListener('DOMContentLoaded', function () { App.start(); });
})();
