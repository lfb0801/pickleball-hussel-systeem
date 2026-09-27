(function () {
  'use strict';

  const SchermAvond = {
    render: function () {
      if (App.avond) {
        document.getElementById('aantal-banen').value = String(App.avond.banen);
      }
      this.renderAanwezigheid();
      this.renderTeller();
      document.getElementById('start-avond').hidden = Boolean(App.avond);
      document.getElementById('stop-avond').hidden = !App.avond;
    },

    geselecteerdeIds: function () {
      const vinkjes = document.querySelectorAll('#aanwezigheid-lijst input:checked');
      return Array.prototype.map.call(vinkjes, function (vinkje) { return vinkje.value; });
    },

    renderAanwezigheid: function () {
      const lijst = document.getElementById('aanwezigheid-lijst');
      const scherm = this;
      const aangevinkt = {};
      const bronnen = App.avond ? App.avond.aanwezigen : this.geselecteerdeIds();
      for (const id of bronnen) aangevinkt[id] = true;

      lijst.textContent = '';
      const gesorteerd = App.club.spelers.slice().sort(function (a, b) {
        if (a.groep !== b.groep) return a.groep - b.groep;
        return a.naam.localeCompare(b.naam, 'nl');
      });

      for (const speler of gesorteerd) {
        const item = document.createElement('li');
        const label = document.createElement('label');
        const vinkje = document.createElement('input');
        vinkje.type = 'checkbox';
        vinkje.value = speler.id;
        vinkje.checked = aangevinkt[speler.id] === true;
        vinkje.disabled = Boolean(App.avond);
        vinkje.addEventListener('change', function () {
          scherm.bijWijziging(speler.id, vinkje.checked);
        });
        label.appendChild(vinkje);
        label.appendChild(document.createTextNode(' ' + speler.naam + ' — ' + App.club.groepen[speler.groep]));
        item.appendChild(label);
        lijst.appendChild(item);
      }
    },

    bijWijziging: function (id, aanwezig) {
      this.renderTeller();
    },

    renderTeller: function () {
      const banen = Number(document.getElementById('aantal-banen').value) || 0;
      const aanwezig = App.avond ? App.avond.aanwezigen.length : this.geselecteerdeIds().length;
      const plekken = Hussel.aantalPlekken(aanwezig, banen);
      const teller = document.getElementById('avond-teller');
      if (aanwezig < 4) {
        teller.textContent = aanwezig + ' aanwezig. Er zijn minstens vier spelers nodig.';
      } else {
        teller.textContent = aanwezig + ' aanwezig: ' + plekken + ' spelen, '
          + (aanwezig - plekken) + ' rusten, ' + (plekken / 4) + ' van de ' + banen + ' banen in gebruik.';
      }
    },
  };

  window.SchermAvond = SchermAvond;

  window.addEventListener('DOMContentLoaded', function () {
    document.getElementById('aantal-banen').addEventListener('input', function () {
      if (App.avond) {
        App.avond.banen = Number(document.getElementById('aantal-banen').value) || 1;
        App.bewaarAvond();
      }
      SchermAvond.renderTeller();
    });

    document.getElementById('start-avond').addEventListener('click', function () {
      const aanwezigen = SchermAvond.geselecteerdeIds();
      const banen = Number(document.getElementById('aantal-banen').value) || 0;
      if (aanwezigen.length < 4) {
        App.waarschuw('Er zijn minstens vier aanwezige spelers nodig.');
        return;
      }
      if (banen < 1) {
        App.waarschuw('Er is minstens één baan nodig.');
        return;
      }
      App.waarschuw('');
      App.avond = { aanwezigen: aanwezigen, banen: banen, rondes: [], rustcorrectie: {} };
      App.bewaarAvond();
      App.toonScherm('ronde');
    });

    document.getElementById('stop-avond').addEventListener('click', function () {
      if (!window.confirm('Avond afsluiten? De rondes van vanavond worden gewist.')) return;
      App.avond = null;
      Opslag.wisAvond();
      App.waarschuw('');
      App.toonScherm('avond');
    });
  });
})();
