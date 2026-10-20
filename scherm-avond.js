(function () {
  'use strict';

  // Het avondscherm is alleen nog de voorbereiding: banen, preset en wie er
  // al is. Zodra de avond loopt, gaat al het beheer via het zijpaneel op
  // het ronde-scherm.
  const SchermAvond = {
    selectie: {},
    banen: 4,

    render: function () {
      document.getElementById('avond-kop').textContent = T.avond_nieuw_titel;
      document.getElementById('aantal-banen').textContent = String(this.banen);
      App.renderPresets(document.getElementById('presets'));
      this.renderAanwezigheid();
      this.renderTeller();
    },

    isGekozen: function (id) {
      return this.selectie[id] === true;
    },

    renderAanwezigheid: function () {
      const houder = document.getElementById('aanwezigheid');
      const zoekterm = document.getElementById('avond-zoek').value.trim().toLowerCase();
      const alleenAanwezig = document.getElementById('alleen-aanwezig').checked;
      const scherm = this;
      houder.textContent = '';

      if (App.club.spelers.length === 0) {
        const leeg = document.createElement('p');
        leeg.className = 'leeg';
        leeg.textContent = T.avond_geen_spelers;
        houder.appendChild(leeg);
        return;
      }

      App.club.groepen.forEach(function (groepsnaam, groep) {
        const inGroep = App.club.spelers
          .filter(function (speler) { return speler.groep === groep; })
          .sort(function (a, b) { return a.naam.localeCompare(b.naam, 'nl'); });
        const zichtbaar = inGroep.filter(function (speler) {
          if (zoekterm && speler.naam.toLowerCase().indexOf(zoekterm) === -1) return false;
          if (alleenAanwezig && !scherm.isGekozen(speler.id)) return false;
          return true;
        });
        if (zichtbaar.length === 0) return;

        const blok = document.createElement('div');
        blok.className = 'groep-blok';

        const kop = document.createElement('div');
        kop.className = 'groep-blok-kop';
        const titel = document.createElement('h3');
        titel.textContent = groepsnaam;
        const telling = document.createElement('span');
        telling.className = 'pil';
        telling.textContent = inGroep.filter(function (s) { return scherm.isGekozen(s.id); }).length + ' / ' + inGroep.length;
        kop.appendChild(titel);
        kop.appendChild(telling);
        kop.appendChild(scherm.groepKnop(T.alles_aan, zichtbaar, true));
        kop.appendChild(scherm.groepKnop(T.alles_uit, zichtbaar, false));
        blok.appendChild(kop);

        const raster = document.createElement('div');
        raster.className = 'spelers-raster';
        for (const speler of zichtbaar) raster.appendChild(scherm.tegel(speler));
        blok.appendChild(raster);
        houder.appendChild(blok);
      });
    },

    groepKnop: function (tekst, spelers, aan) {
      const scherm = this;
      const knop = document.createElement('button');
      knop.type = 'button';
      knop.className = 'knop knop-klein';
      knop.textContent = tekst;
      knop.addEventListener('click', function () {
        for (const speler of spelers) {
          if (aan) scherm.selectie[speler.id] = true;
          else delete scherm.selectie[speler.id];
        }
        scherm.render();
      });
      return knop;
    },

    tegel: function (speler) {
      const scherm = this;
      const gekozen = this.isGekozen(speler.id);
      const tegel = document.createElement('div');
      tegel.className = 'speler-tegel' + (gekozen ? ' aanwezig' : '');
      const label = document.createElement('label');
      const vinkje = document.createElement('input');
      vinkje.type = 'checkbox';
      vinkje.checked = gekozen;
      vinkje.addEventListener('change', function () {
        if (vinkje.checked) scherm.selectie[speler.id] = true;
        else delete scherm.selectie[speler.id];
        scherm.render();
      });
      const naam = document.createElement('span');
      naam.className = 'naam';
      naam.textContent = speler.naam;
      label.appendChild(vinkje);
      label.appendChild(naam);
      tegel.appendChild(label);
      return tegel;
    },

    renderTeller: function () {
      const aanwezig = Object.keys(this.selectie).filter(function (id) { return App.spelerOp(id); }).length;
      const plekken = Hussel.aantalPlekken(aanwezig, this.banen);
      const teller = document.getElementById('avond-teller');
      if (aanwezig === 0) {
        teller.textContent = T.teller_leeg;
      } else if (aanwezig < 4) {
        teller.textContent = T.teller_voorbereiding(aanwezig);
      } else {
        teller.innerHTML = T.teller(aanwezig, plekken, aanwezig - plekken, plekken / 4, this.banen, 0);
      }
    },
  };

  window.SchermAvond = SchermAvond;

  window.addEventListener('DOMContentLoaded', function () {
    function wijzigBanen(stap) {
      SchermAvond.banen = Math.min(20, Math.max(1, SchermAvond.banen + stap));
      document.getElementById('aantal-banen').textContent = String(SchermAvond.banen);
      SchermAvond.renderTeller();
    }
    document.getElementById('banen-min').addEventListener('click', function () { wijzigBanen(-1); });
    document.getElementById('banen-plus').addEventListener('click', function () { wijzigBanen(1); });
    document.getElementById('avond-zoek').addEventListener('input', function () { SchermAvond.renderAanwezigheid(); });
    document.getElementById('alleen-aanwezig').addEventListener('change', function () { SchermAvond.renderAanwezigheid(); });

    // Starten kan ook zonder aanwezigen: spelers melden zich daarna met hun
    // telefoon aan in de wachtruimte.
    document.getElementById('start-avond').addEventListener('click', function () {
      const aanwezigen = Object.keys(SchermAvond.selectie).filter(function (id) { return App.spelerOp(id); });
      App.wijzigAvond(Sessie.nieuweAvond(aanwezigen, SchermAvond.banen, Sessie.maakSessiecode()));
      SchermAvond.selectie = {};
      App.startSessie();
      App.toonScherm('ronde');
    });
  });
})();
