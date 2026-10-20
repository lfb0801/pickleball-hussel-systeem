(function () {
  'use strict';

  const SchermSpelers = {
    render: function () {
      this.renderGroepen();
      this.vulGroepKeuze(document.getElementById('nieuwe-speler-groep'), 0);
      this.renderSpelers();
    },

    knop: function (tekst, bijKlik, klasse) {
      const knop = document.createElement('button');
      knop.type = 'button';
      knop.className = 'knop ' + (klasse || '');
      knop.textContent = tekst;
      knop.addEventListener('click', bijKlik);
      return knop;
    },

    vulGroepKeuze: function (keuze, geselecteerd) {
      keuze.textContent = '';
      App.club.groepen.forEach(function (naam, index) {
        const optie = document.createElement('option');
        optie.value = String(index);
        optie.textContent = naam;
        if (index === geselecteerd) optie.selected = true;
        keuze.appendChild(optie);
      });
    },

    renderGroepen: function () {
      const lijst = document.getElementById('groepen-lijst');
      const scherm = this;
      lijst.textContent = '';
      App.club.groepen.forEach(function (naam, index) {
        const item = document.createElement('li');
        const label = document.createElement('span');
        label.className = 'groep-naam';
        label.textContent = naam;
        item.appendChild(label);
        item.appendChild(scherm.knop('↑', function () { scherm.verplaatsGroep(index, -1); }));
        item.lastChild.title = T.omhoog;
        item.appendChild(scherm.knop('↓', function () { scherm.verplaatsGroep(index, 1); }));
        item.lastChild.title = T.omlaag;
        item.appendChild(scherm.knop(T.verwijder, function () { scherm.verwijderGroep(index); }, 'knop-gevaar'));
        lijst.appendChild(item);
      });
    },

    gesorteerdeSpelers: function () {
      return App.club.spelers.slice().sort(function (a, b) {
        if (a.groep !== b.groep) return a.groep - b.groep;
        return a.naam.localeCompare(b.naam, 'nl');
      });
    },

    renderSpelers: function () {
      const lichaam = document.querySelector('#spelers-tabel tbody');
      const zoekterm = document.getElementById('spelers-zoek').value.trim().toLowerCase();
      const scherm = this;
      lichaam.textContent = '';

      const zichtbaar = this.gesorteerdeSpelers().filter(function (speler) {
        return !zoekterm || speler.naam.toLowerCase().indexOf(zoekterm) !== -1;
      });

      for (const speler of zichtbaar) {
        const rij = document.createElement('tr');

        // Spelers typen hun naam zelf in; hier is een tikfout te herstellen.
        const naamCel = document.createElement('td');
        const naamVeld = document.createElement('input');
        naamVeld.type = 'text';
        naamVeld.className = 'naam-veld';
        naamVeld.value = speler.naam;
        naamVeld.maxLength = 40;
        naamVeld.setAttribute('aria-label', T.kolom_naam);
        naamVeld.addEventListener('change', function () {
          const nieuw = Sessie.schoneNaam(naamVeld.value);
          if (!nieuw || Sessie.naamBestaat(App.club, nieuw, speler.id)) {
            App.waarschuw(nieuw ? T.naam_bestaat_al(nieuw) : T.naam_leeg);
            naamVeld.value = speler.naam;
            return;
          }
          speler.naam = nieuw;
          App.bewaarClub();
          App.zendToestand();
          scherm.renderSpelers();
        });
        naamCel.appendChild(naamVeld);

        const groepCel = document.createElement('td');
        const keuze = document.createElement('select');
        this.vulGroepKeuze(keuze, speler.groep);
        keuze.addEventListener('change', function () {
          speler.groep = Number(keuze.value);
          App.bewaarClub();
          App.zendToestand();
          scherm.renderSpelers();
        });
        groepCel.appendChild(keuze);

        const actieCel = document.createElement('td');
        actieCel.appendChild(this.knop(T.verwijder, function () { scherm.verwijderSpeler(speler.id); }, 'knop-klein knop-gevaar'));

        rij.appendChild(naamCel);
        rij.appendChild(groepCel);
        rij.appendChild(actieCel);
        lichaam.appendChild(rij);
      }

      document.getElementById('spelers-aantal').textContent = T.spelers_aantal(App.club.spelers.length);
      const leeg = document.getElementById('spelers-leeg');
      leeg.hidden = zichtbaar.length > 0;
      leeg.textContent = App.club.spelers.length ? T.geen_treffers : T.geen_spelers;
      document.querySelector('#spelers-tabel').hidden = zichtbaar.length === 0;
    },

    verplaatsGroep: function (index, richting) {
      const doel = index + richting;
      if (doel < 0 || doel >= App.club.groepen.length) return;
      const groepen = App.club.groepen;
      const tussen = groepen[index];
      groepen[index] = groepen[doel];
      groepen[doel] = tussen;
      for (const speler of App.club.spelers) {
        if (speler.groep === index) speler.groep = doel;
        else if (speler.groep === doel) speler.groep = index;
      }
      App.bewaarClub();
      this.render();
    },

    verwijderGroep: function (index) {
      if (App.club.groepen.length === 1) {
        App.waarschuw(T.min_een_groep);
        return;
      }
      for (const speler of App.club.spelers) {
        if (speler.groep === index) {
          App.waarschuw(T.groep_heeft_spelers);
          return;
        }
      }
      App.club.groepen.splice(index, 1);
      for (const speler of App.club.spelers) {
        if (speler.groep > index) speler.groep -= 1;
      }
      App.waarschuw('');
      App.bewaarClub();
      this.render();
    },

    verwijderSpeler: function (id) {
      const naam = App.naam(id);
      if (App.avond && App.avond.aanwezigen.indexOf(id) !== -1) {
        App.avond = Sessie.ontkoppel(Sessie.meldAf(App.avond, id), id).avond;
        App.waarschuw(T.speler_was_aanwezig(naam));
      }
      App.club.spelers = App.club.spelers.filter(function (s) { return s.id !== id; });
      App.bewaarClub();
      if (App.avond) App.bewaarAvond();
      this.renderSpelers();
    },
  };

  window.SchermSpelers = SchermSpelers;

  window.addEventListener('DOMContentLoaded', function () {
    document.getElementById('spelers-zoek').addEventListener('input', function () {
      SchermSpelers.renderSpelers();
    });

    document.getElementById('groep-toevoegen').addEventListener('submit', function (gebeurtenis) {
      gebeurtenis.preventDefault();
      const veld = document.getElementById('groep-naam');
      const naam = veld.value.trim();
      if (!naam) return;
      App.club.groepen.push(naam);
      App.bewaarClub();
      veld.value = '';
      SchermSpelers.render();
    });

    document.getElementById('speler-toevoegen').addEventListener('submit', function (gebeurtenis) {
      gebeurtenis.preventDefault();
      const veld = document.getElementById('nieuwe-speler-naam');
      const naam = veld.value.trim();
      if (!naam) return;
      App.club.spelers.push({
        id: App.nieuwId(),
        naam: naam,
        groep: Number(document.getElementById('nieuwe-speler-groep').value),
      });
      App.bewaarClub();
      App.zendToestand();
      veld.value = '';
      SchermSpelers.render();
      veld.focus();
    });
  });
})();
