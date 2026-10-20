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

    toonScherm: function (naam) {
      this.huidigScherm = naam;
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
        overzicht: window.SchermOverzicht,
      };
      const scherm = schermen[this.huidigScherm];
      if (scherm && scherm.render) scherm.render();
      this.renderTelefoonStatus();
    },

    // Een melding die blijft staan tot de volgende, of na een paar seconden
    // verdwijnt als blijvend false is.
    waarschuw: function (tekst, blijvend) {
      const balk = document.getElementById('melding');
      clearTimeout(this.meldingTimer);
      balk.textContent = tekst || '';
      balk.hidden = !tekst;
      if (tekst && blijvend === false) {
        this.meldingTimer = setTimeout(function () { balk.hidden = true; }, 6000);
      }
    },

    meld: function (tekst) {
      this.waarschuw(tekst, false);
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
          if (app.huidigScherm === 'avond') SchermAvond.renderVerbinding();
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
      const uitkomst = Sessie.pasVerzoekToe(this.avond, this.club, verzoek, this.nieuwId());
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

    meldVerzoek: function (verzoek, erbij) {
      const id = this.avond.koppelingen[verzoek.telefoon];
      const speler = id ? this.spelerOp(id) : null;
      if (!speler) return;
      if (verzoek.type === 'vertrek') this.meld(T.doet_niet_meer_mee(speler.naam));
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
