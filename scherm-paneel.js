(function () {
  'use strict';

  const TELEFOON_ICOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="18" r="1.3" fill="currentColor"/></svg>';

  // Het zijpaneel bij het ronde-scherm: al het beheer tijdens de avond op
  // één plek, zodat de organisator nooit van scherm hoeft te wisselen. Het
  // schuift over de banen heen en is standaard dicht, zodat het scherm in
  // de zaal alleen de banen toont.
  const SchermPaneel = {
    open: false,

    openen: function () {
      this.open = true;
      this.render();
      document.getElementById('paneel-zoek').focus();
    },

    sluit: function () {
      this.open = false;
      document.getElementById('paneel').hidden = true;
      document.getElementById('paneel-achtergrond').hidden = true;
    },

    render: function () {
      const aantal = document.getElementById('paneel-knop-aantal');
      aantal.textContent = App.avond ? String(App.avond.aanwezigen.length) : '';
      const zichtbaar = this.open && Boolean(App.avond);
      document.getElementById('paneel').hidden = !zichtbaar;
      document.getElementById('paneel-achtergrond').hidden = !zichtbaar;
      if (!zichtbaar) return;

      document.getElementById('paneel-aantal').textContent = String(App.avond.aanwezigen.length);
      this.renderAanwezig();
      this.renderAfwezig();
      SchermSpelers.vulGroepKeuze(document.getElementById('paneel-nieuw-groep'),
        Number(document.getElementById('paneel-nieuw-groep').value) || 0);
      this.renderVerbinding();
      document.getElementById('lokaal-waarschuwing').hidden = !App.isLokaal();
    },

    renderVerbinding: function () {
      document.getElementById('paneel-verbinding').textContent = T.verbinding_status[App.verbindingStatus] || '';
    },

    statistiek: function () {
      const regels = {};
      for (const regel of Hussel.maakOverzicht(App.avond.rondes, App.avond.aanwezigen)) regels[regel.id] = regel;
      return regels;
    },

    renderAanwezig: function () {
      const houder = document.getElementById('paneel-aanwezig');
      const scherm = this;
      const stat = this.statistiek();
      houder.textContent = '';
      const aanwezigen = App.avond.aanwezigen.map(function (id) { return App.spelerOp(id); }).filter(Boolean);

      if (!aanwezigen.length) {
        const leeg = document.createElement('p');
        leeg.className = 'uitleg';
        leeg.textContent = T.paneel_niemand;
        houder.appendChild(leeg);
        return;
      }

      App.club.groepen.forEach(function (groepsnaam, groep) {
        const inGroep = aanwezigen
          .filter(function (speler) { return speler.groep === groep; })
          .sort(function (a, b) { return a.naam.localeCompare(b.naam, 'nl'); });
        if (!inGroep.length) return;
        const kop = document.createElement('h4');
        kop.className = 'paneel-groep';
        kop.textContent = groepsnaam + ' · ' + inGroep.length;
        houder.appendChild(kop);
        for (const speler of inGroep) houder.appendChild(scherm.rij(speler, stat[speler.id]));
      });
    },

    rij: function (speler, stat) {
      const pauzeert = Boolean(App.avond.pauzes[speler.id]);
      const rij = document.createElement('div');
      rij.className = 'paneel-rij' + (pauzeert ? ' pauzeert' : '');

      const telefoon = App.telefoonVan(speler.id);
      const icoon = document.createElement(telefoon ? 'button' : 'span');
      icoon.className = 'telefoon' + (telefoon === 'aan' ? ' aan' : '') + (telefoon ? '' : ' geen');
      icoon.innerHTML = TELEFOON_ICOON;
      if (telefoon) {
        icoon.type = 'button';
        icoon.title = (telefoon === 'aan' ? T.telefoon_verbonden : T.telefoon_gekoppeld) + ' · ' + T.ontkoppel;
        icoon.addEventListener('click', function () {
          if (!window.confirm(T.ontkoppel_vraag(speler.naam))) return;
          App.ontkoppel(speler.id);
          SchermPaneel.render();
        });
      }
      rij.appendChild(icoon);

      const midden = document.createElement('div');
      midden.className = 'rij-naam';
      const naam = document.createElement('input');
      naam.type = 'text';
      naam.className = 'naam-veld';
      naam.value = speler.naam;
      naam.maxLength = 40;
      naam.setAttribute('aria-label', T.kolom_naam);
      naam.addEventListener('change', function () {
        if (!App.hernoem(speler.id, naam.value)) naam.value = speler.naam;
      });
      const cijfers = document.createElement('small');
      cijfers.textContent = T.statistiek(stat ? stat.gespeeld : 0, stat ? stat.gerust : 0, stat ? stat.gepauzeerd : 0);
      midden.appendChild(naam);
      midden.appendChild(cijfers);
      rij.appendChild(midden);

      const niveau = document.createElement('select');
      niveau.className = 'niveau-keuze';
      niveau.setAttribute('aria-label', T.niveau_wijzigen + ': ' + speler.naam);
      SchermSpelers.vulGroepKeuze(niveau, speler.groep);
      niveau.addEventListener('change', function () {
        App.wijzigNiveau(speler.id, Number(niveau.value));
        App.renderHuidig();
      });
      rij.appendChild(niveau);

      const pauze = document.createElement('button');
      pauze.type = 'button';
      pauze.className = 'pauze-knop' + (pauzeert ? ' aan' : '');
      pauze.textContent = T.pauze_label;
      pauze.title = T.pauze_uitleg;
      pauze.addEventListener('click', function () {
        App.pauzeer(speler.id, !pauzeert, false);
        App.renderHuidig();
      });
      rij.appendChild(pauze);

      const weg = document.createElement('button');
      weg.type = 'button';
      weg.className = 'knop-link knop-weg';
      weg.textContent = T.naar_huis;
      weg.addEventListener('click', function () {
        App.stuurNaarHuis(speler.id);
        App.renderHuidig();
      });
      rij.appendChild(weg);
      return rij;
    },

    // Zonder zoekterm: wie eerder vanavond meedeed en vertrok. Met
    // zoekterm: iedereen uit de spelerslijst die niet aanwezig is.
    renderAfwezig: function () {
      const lijst = document.getElementById('paneel-afwezig');
      const zoekterm = document.getElementById('paneel-zoek').value.trim().toLowerCase();
      lijst.textContent = '';

      const speeldeMee = {};
      for (const ronde of App.avond.rondes) {
        for (const baan of ronde.banen) {
          for (const id of baan.teamA.concat(baan.teamB)) speeldeMee[id] = true;
        }
        for (const id of ronde.rustend.concat(ronde.gepauzeerd || [])) speeldeMee[id] = true;
      }

      const kandidaten = App.club.spelers
        .filter(function (speler) { return App.avond.aanwezigen.indexOf(speler.id) === -1; })
        .filter(function (speler) {
          return zoekterm ? speler.naam.toLowerCase().indexOf(zoekterm) !== -1 : speeldeMee[speler.id];
        })
        .sort(function (a, b) { return a.naam.localeCompare(b.naam, 'nl'); })
        .slice(0, 30);

      if (!kandidaten.length) {
        const hint = document.createElement('li');
        hint.className = 'uitleg';
        hint.textContent = zoekterm ? T.geen_treffers : T.paneel_zoek_hint;
        lijst.appendChild(hint);
        return;
      }
      if (!zoekterm) {
        const kop = document.createElement('li');
        kop.className = 'paneel-groep';
        kop.textContent = T.paneel_eerder;
        lijst.appendChild(kop);
      }
      for (const speler of kandidaten) {
        const item = document.createElement('li');
        const naam = document.createElement('span');
        naam.textContent = speler.naam;
        const niveau = document.createElement('small');
        niveau.textContent = App.club.groepen[speler.groep];
        const erbij = document.createElement('button');
        erbij.type = 'button';
        erbij.className = 'knop knop-klein knop-primair';
        erbij.textContent = T.erbij;
        erbij.addEventListener('click', function () {
          App.wijzigAvond(Sessie.meldAan(App.avond, speler.id));
          App.meld(T.doet_mee(speler.naam));
          App.werkConceptBij();
          App.renderHuidig();
        });
        item.appendChild(naam);
        item.appendChild(niveau);
        item.appendChild(erbij);
        lijst.appendChild(item);
      }
    },
  };

  window.SchermPaneel = SchermPaneel;

  window.addEventListener('DOMContentLoaded', function () {
    document.getElementById('open-paneel').addEventListener('click', function () { SchermPaneel.openen(); });
    document.getElementById('paneel-sluit').addEventListener('click', function () { SchermPaneel.sluit(); });
    document.getElementById('paneel-achtergrond').addEventListener('click', function () { SchermPaneel.sluit(); });
    document.addEventListener('keydown', function (gebeurtenis) {
      if (gebeurtenis.key === 'Escape' && SchermPaneel.open) SchermPaneel.sluit();
    });
    document.getElementById('paneel-zoek').addEventListener('input', function () { SchermPaneel.renderAfwezig(); });

    // Iemand zonder telefoon: de organisator voegt hem toe met naam en
    // niveau, en hij doet meteen mee.
    document.getElementById('paneel-nieuw').addEventListener('submit', function (gebeurtenis) {
      gebeurtenis.preventDefault();
      const veld = document.getElementById('paneel-nieuw-naam');
      const naam = Sessie.schoneNaam(veld.value);
      if (!naam) return;
      if (Sessie.naamBestaat(App.club, naam)) {
        App.meld(T.naam_bestaat_al(naam));
        return;
      }
      const id = App.nieuwId();
      App.club.spelers.push({ id: id, naam: naam, groep: Number(document.getElementById('paneel-nieuw-groep').value) });
      App.bewaarClub();
      App.wijzigAvond(Sessie.meldAan(App.avond, id));
      App.meld(T.doet_mee(naam));
      App.werkConceptBij();
      veld.value = '';
      App.renderHuidig();
    });

    document.getElementById('stop-avond').addEventListener('click', function () {
      if (!window.confirm(T.afsluiten_vraag)) return;
      App.stopSessie();
      App.avond = null;
      Opslag.wisAvond();
      SchermRonde.getekendeCode = null;
      SchermRonde.getekendeLobbyCode = null;
      SchermPaneel.sluit();
      App.toonScherm('avond');
    });
  });
})();
