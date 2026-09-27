(function () {
  'use strict';

  const SchermRonde = {
    huidigeRonde: function () {
      if (!App.avond || App.avond.rondes.length === 0) return null;
      return App.avond.rondes[App.avond.rondes.length - 1];
    },

    naam: function (id) {
      const speler = App.spelerOp(id);
      return speler ? speler.naam : 'onbekend';
    },

    render: function () {
      if (!App.avond) {
        App.waarschuw('Start eerst een avond.');
        App.toonScherm('avond');
        return;
      }
      if (App.avond.rondes.length === 0) this.genereer(false);

      const ronde = this.huidigeRonde();
      document.getElementById('ronde-nummer').textContent = ronde ? String(App.avond.rondes.length) : '';
      this.renderBanen(ronde);
      this.renderRustend(ronde);
    },

    renderBanen: function (ronde) {
      const houder = document.getElementById('banen');
      const scherm = this;
      houder.textContent = '';
      if (!ronde) return;

      for (const baan of ronde.banen) {
        const kaart = document.createElement('article');
        kaart.className = 'baan';

        const kop = document.createElement('h3');
        kop.textContent = 'Baan ' + baan.baan;

        const niveau = document.createElement('p');
        niveau.className = 'niveau';
        niveau.textContent = baan.groepen.map(function (groep) {
          return App.club.groepen[groep];
        }).join(' + ');

        const teamA = document.createElement('p');
        teamA.className = 'team';
        teamA.textContent = baan.teamA.map(function (id) { return scherm.naam(id); }).join(' & ');

        const tegen = document.createElement('p');
        tegen.className = 'tegen';
        tegen.textContent = 'tegen';

        const teamB = document.createElement('p');
        teamB.className = 'team';
        teamB.textContent = baan.teamB.map(function (id) { return scherm.naam(id); }).join(' & ');

        kaart.appendChild(kop);
        kaart.appendChild(niveau);
        kaart.appendChild(teamA);
        kaart.appendChild(tegen);
        kaart.appendChild(teamB);
        houder.appendChild(kaart);
      }
    },

    renderRustend: function (ronde) {
      const regel = document.getElementById('rustend');
      const scherm = this;
      if (!ronde || ronde.rustend.length === 0) {
        regel.textContent = 'Deze ronde rust niemand.';
        return;
      }
      regel.textContent = 'Rust deze ronde: ' + ronde.rustend.map(function (id) {
        return scherm.naam(id);
      }).join(', ');
    },

    // vervangHuidige: true laat de zichtbare ronde opnieuw loten in plaats
    // van er een volgende achter te zetten.
    genereer: function (vervangHuidige) {
      const aanwezigen = App.aanwezigeSpelers();
      if (aanwezigen.length < 4) {
        App.waarschuw('Er zijn minstens vier aanwezige spelers nodig.');
        return;
      }
      const historie = vervangHuidige ? App.avond.rondes.slice(0, -1) : App.avond.rondes;
      const ronde = Hussel.genereerRonde({
        aanwezigen: aanwezigen,
        banen: App.avond.banen,
        historie: historie,
        rustcorrectie: App.avond.rustcorrectie,
      });
      if (!ronde) {
        App.waarschuw('Met dit aantal spelers en banen is er geen volledige baan te vullen.');
        return;
      }
      App.avond.rondes = historie.concat([ronde]);
      App.bewaarAvond();
      App.waarschuw('');
    },
  };

  window.SchermRonde = SchermRonde;

  window.addEventListener('DOMContentLoaded', function () {
    document.getElementById('volgende-ronde').addEventListener('click', function () {
      SchermRonde.genereer(false);
      SchermRonde.render();
    });
    document.getElementById('opnieuw-genereren').addEventListener('click', function () {
      SchermRonde.genereer(true);
      SchermRonde.render();
    });
    document.getElementById('naar-avond').addEventListener('click', function () {
      App.toonScherm('avond');
    });
    document.getElementById('naar-afsluiten').addEventListener('click', function () {
      App.toonScherm('avond');
      document.getElementById('stop-avond').scrollIntoView({ block: 'center' });
    });
  });
})();
