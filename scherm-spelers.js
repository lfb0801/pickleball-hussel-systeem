(function () {
  'use strict';

  const SchermSpelers = {
    render: function () {
      this.renderGroepen();
      this.vulGroepKeuze(document.getElementById('nieuwe-speler-groep'), 0);
      this.vulGroepKeuze(document.getElementById('import-groep'), 0);
      this.renderSpelers();
    },

    knop: function (tekst, bijKlik) {
      const knop = document.createElement('button');
      knop.type = 'button';
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
        label.textContent = naam + ' ';
        item.appendChild(label);
        item.appendChild(scherm.knop('Omhoog', function () { scherm.verplaatsGroep(index, -1); }));
        item.appendChild(scherm.knop('Omlaag', function () { scherm.verplaatsGroep(index, 1); }));
        item.appendChild(scherm.knop('Verwijder', function () { scherm.verwijderGroep(index); }));
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
      const scherm = this;
      lichaam.textContent = '';
      for (const speler of this.gesorteerdeSpelers()) {
        const rij = document.createElement('tr');

        const naamCel = document.createElement('td');
        naamCel.textContent = speler.naam;

        const groepCel = document.createElement('td');
        const keuze = document.createElement('select');
        this.vulGroepKeuze(keuze, speler.groep);
        keuze.addEventListener('change', function () {
          speler.groep = Number(keuze.value);
          App.bewaarClub();
          scherm.renderSpelers();
        });
        groepCel.appendChild(keuze);

        const actieCel = document.createElement('td');
        actieCel.appendChild(this.knop('Verwijder', function () { scherm.verwijderSpeler(speler.id); }));

        rij.appendChild(naamCel);
        rij.appendChild(groepCel);
        rij.appendChild(actieCel);
        lichaam.appendChild(rij);
      }
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
        App.waarschuw('Er moet minstens één groep overblijven.');
        return;
      }
      for (const speler of App.club.spelers) {
        if (speler.groep === index) {
          App.waarschuw('Deze groep heeft nog spelers. Zet die eerst in een andere groep.');
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

    importeerNamen: function (namen, groep) {
      if (namen.length === 0) {
        App.waarschuw('In dit bestand staan geen namen.');
        return;
      }

      const bestaande = App.club.spelers.map(function (speler) { return speler.naam; });
      const verdeling = filterNieuweNamen(namen, bestaande);

      for (const naam of verdeling.nieuw) {
        App.club.spelers.push({ id: App.nieuwId(), naam: naam, groep: groep });
      }
      App.bewaarClub();
      this.render();

      const groepsnaam = App.club.groepen[groep];
      let melding = verdeling.nieuw.length === 1
        ? '1 speler toegevoegd in groep ' + groepsnaam + '.'
        : verdeling.nieuw.length + ' spelers toegevoegd in groep ' + groepsnaam + '.';
      if (verdeling.overgeslagen.length) {
        melding += ' ' + verdeling.overgeslagen.length
          + (verdeling.overgeslagen.length === 1 ? ' overgeslagen: die naam' : ' overgeslagen: die namen')
          + ' stond er al.';
      }
      App.waarschuw(melding);
    },

    verwijderSpeler: function (id) {
      if (App.avond && App.avond.aanwezigen.indexOf(id) !== -1) {
        App.avond.aanwezigen = App.avond.aanwezigen.filter(function (a) { return a !== id; });
        App.bewaarAvond();
        App.waarschuw('Deze speler deed mee aan de lopende avond. De gespeelde rondes blijven staan; vanaf de volgende ronde doet hij niet meer mee.');
      }
      App.club.spelers = App.club.spelers.filter(function (s) { return s.id !== id; });
      App.bewaarClub();
      this.renderSpelers();
    },
  };

  window.SchermSpelers = SchermSpelers;

  window.addEventListener('DOMContentLoaded', function () {
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

    document.getElementById('spelers-importeren').addEventListener('submit', function (gebeurtenis) {
      gebeurtenis.preventDefault();
      const veld = document.getElementById('csv-bestand');
      const bestand = veld.files[0];
      if (!bestand) {
        App.waarschuw('Kies eerst een bestand.');
        return;
      }
      const groep = Number(document.getElementById('import-groep').value);
      const lezer = new FileReader();
      lezer.addEventListener('load', function () {
        SchermSpelers.importeerNamen(leesNamen(String(lezer.result)), groep);
        veld.value = '';
      });
      lezer.addEventListener('error', function () {
        App.waarschuw('Het bestand kon niet gelezen worden.');
      });
      lezer.readAsText(bestand);
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
      veld.value = '';
      SchermSpelers.render();
    });
  });
})();
