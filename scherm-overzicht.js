(function () {
  'use strict';

  const SchermOverzicht = {
    render: function () {
      const melding = document.getElementById('overzicht-melding');
      const tabel = document.getElementById('overzicht-tabel');
      const lichaam = tabel.querySelector('tbody');
      lichaam.textContent = '';

      if (!App.avond) {
        melding.textContent = T.geen_avond;
        tabel.parentElement.hidden = true;
        return;
      }

      melding.textContent = T.rondes_gespeeld(App.avond.rondes.length);
      tabel.parentElement.hidden = false;

      // Ook wie vertrokken is maar al rondes speelde, blijft in de tabel.
      const ids = App.avond.aanwezigen.slice();
      for (const ronde of App.avond.rondes) {
        for (const baan of ronde.banen) {
          for (const id of baan.teamA.concat(baan.teamB)) {
            if (ids.indexOf(id) === -1) ids.push(id);
          }
        }
      }

      const regels = Hussel.maakOverzicht(App.avond.rondes, ids).map(function (regel) {
        const speler = App.spelerOp(regel.id);
        return {
          naam: speler ? speler.naam : '?',
          groep: speler ? App.club.groepen[speler.groep] : '',
          gespeeld: regel.gespeeld,
          gerust: regel.gerust,
          gepauzeerd: regel.gepauzeerd,
        };
      });

      regels.sort(function (a, b) {
        if (a.gerust !== b.gerust) return b.gerust - a.gerust;
        return a.naam.localeCompare(b.naam, 'nl');
      });

      for (const regel of regels) {
        const rij = document.createElement('tr');
        const cellen = [
          [regel.naam, ''],
          [regel.groep, ''],
          [String(regel.gespeeld), 'getal'],
          [String(regel.gerust), 'getal'],
          [String(regel.gepauzeerd), 'getal'],
        ];
        for (const [waarde, klasse] of cellen) {
          const cel = document.createElement('td');
          cel.textContent = waarde;
          cel.className = klasse;
          rij.appendChild(cel);
        }
        lichaam.appendChild(rij);
      }
    },
  };

  window.SchermOverzicht = SchermOverzicht;
})();
