(function () {
  'use strict';

  const SchermOverzicht = {
    render: function () {
      const melding = document.getElementById('overzicht-melding');
      const tabel = document.getElementById('overzicht-tabel');
      const lichaam = tabel.querySelector('tbody');
      lichaam.textContent = '';

      if (!App.avond) {
        melding.textContent = 'Er loopt geen avond.';
        tabel.hidden = true;
        return;
      }

      melding.textContent = App.avond.rondes.length + ' gespeelde rondes.';
      tabel.hidden = false;

      const regels = Hussel.maakOverzicht(App.avond.rondes, App.avond.aanwezigen).map(function (regel) {
        const speler = App.spelerOp(regel.id);
        return {
          naam: speler ? speler.naam : 'onbekend',
          gespeeld: regel.gespeeld,
          gerust: regel.gerust,
        };
      });

      regels.sort(function (a, b) {
        if (a.gerust !== b.gerust) return b.gerust - a.gerust;
        return a.naam.localeCompare(b.naam, 'nl');
      });

      for (const regel of regels) {
        const rij = document.createElement('tr');
        for (const waarde of [regel.naam, String(regel.gespeeld), String(regel.gerust)]) {
          const cel = document.createElement('td');
          cel.textContent = waarde;
          rij.appendChild(cel);
        }
        lichaam.appendChild(rij);
      }
    },
  };

  window.SchermOverzicht = SchermOverzicht;
})();
