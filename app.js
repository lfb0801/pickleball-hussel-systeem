(function () {
  'use strict';

  const STANDAARD_GROEPEN = ['Gevorderd', 'Midden', 'Beginner'];

  const App = {
    club: { groepen: STANDAARD_GROEPEN.slice(), spelers: [] },
    avond: null,

    bewaarClub: function () {
      Opslag.bewaarClub(this.club);
    },

    bewaarAvond: function () {
      if (this.avond) Opslag.bewaarAvond(this.avond);
      else Opslag.wisAvond();
    },

    spelerOp: function (id) {
      for (const speler of this.club.spelers) {
        if (speler.id === id) return speler;
      }
      return null;
    },

    aanwezigeSpelers: function () {
      if (!this.avond) return [];
      const spelers = [];
      for (const id of this.avond.aanwezigen) {
        const speler = this.spelerOp(id);
        if (speler) spelers.push(speler);
      }
      return spelers;
    },

    toonScherm: function (naam) {
      for (const sectie of document.querySelectorAll('main > section')) {
        sectie.hidden = sectie.id !== 'scherm-' + naam;
      }
      for (const knop of document.querySelectorAll('nav button')) {
        knop.classList.toggle('actief', knop.dataset.scherm === naam);
      }
      const schermen = {
        spelers: window.SchermSpelers,
        avond: window.SchermAvond,
        ronde: window.SchermRonde,
        overzicht: window.SchermOverzicht,
      };
      const scherm = schermen[naam];
      if (scherm && scherm.render) scherm.render();
    },

    waarschuw: function (tekst) {
      const balk = document.getElementById('waarschuwing');
      balk.textContent = tekst;
      balk.hidden = !tekst;
    },

    nieuwId: function () {
      return 's' + Date.now().toString(36) + Math.floor(Math.random() * 1000000).toString(36);
    },

    start: function () {
      const bewaardeClub = Opslag.laadClub();
      if (bewaardeClub && bewaardeClub.groepen && bewaardeClub.spelers) {
        this.club = bewaardeClub;
      }
      this.avond = Opslag.laadAvond();

      if (!Opslag.beschikbaar()) {
        this.waarschuw('De browser bewaart niets. De avond werkt door, maar gaat verloren als je de pagina sluit.');
      }

      for (const knop of document.querySelectorAll('nav button')) {
        knop.addEventListener('click', function () {
          App.toonScherm(knop.dataset.scherm);
        });
      }

      this.toonScherm(this.avond && this.avond.rondes.length ? 'ronde' : 'spelers');
    },
  };

  window.App = App;
  window.addEventListener('DOMContentLoaded', function () { App.start(); });
})();
