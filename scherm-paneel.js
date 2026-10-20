(function () {
  'use strict';

  const SPELER_ICOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4.5 21c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const TELEFOON_ICOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="18" r="1.3" fill="currentColor"/></svg>';

  // Het zijpaneel Beheer bij het ronde-scherm: al het beheer tijdens de
  // avond op één plek, zodat de organisator nooit van scherm hoeft te
  // wisselen. Het schuift over de banen heen en is standaard dicht, zodat
  // het scherm in de zaal alleen de banen toont.
  //
  // Het paneel kent drie weergaven: het overzicht, spelers uit de lijst
  // kiezen (meerdere tegelijk, voor wie zonder telefoon meedoet) en een
  // nieuwe speler toevoegen.
  const SchermPaneel = {
    open: false,
    weergave: 'overzicht',
    gekozen: {},
    toegevoegd: [],

    openen: function () {
      this.open = true;
      this.toon('overzicht');
    },

    sluit: function () {
      this.open = false;
      document.getElementById('paneel').hidden = true;
      document.getElementById('paneel-achtergrond').hidden = true;
    },

    toon: function (weergave) {
      this.weergave = weergave;
      if (weergave === 'kiezen') {
        this.gekozen = {};
        document.getElementById('paneel-zoek').value = '';
      }
      if (weergave === 'nieuw') this.toegevoegd = [];
      this.render();
      document.querySelector('.paneel-inhoud').scrollTop = 0;
      if (weergave === 'kiezen') document.getElementById('paneel-zoek').focus();
      if (weergave === 'nieuw') document.getElementById('paneel-nieuw-naam').focus();
    },

    render: function () {
      const aantal = document.getElementById('paneel-knop-aantal');
      aantal.textContent = App.avond ? String(App.avond.aanwezigen.length) : '';
      const zichtbaar = this.open && Boolean(App.avond);
      document.getElementById('paneel').hidden = !zichtbaar;
      document.getElementById('paneel-achtergrond').hidden = !zichtbaar;
      if (!zichtbaar) return;

      document.getElementById('paneel-overzicht').hidden = this.weergave !== 'overzicht';
      document.getElementById('paneel-kiezen').hidden = this.weergave !== 'kiezen';
      document.getElementById('paneel-nieuw-weergave').hidden = this.weergave !== 'nieuw';

      if (this.weergave === 'kiezen') {
        this.renderKiezen();
      } else if (this.weergave === 'nieuw') {
        this.renderNieuw();
      } else {
        document.getElementById('paneel-aantal').textContent = String(App.avond.aanwezigen.length);
        document.getElementById('modus-uitleg').textContent = T.presets[Presets.op(App.club.preset).sleutel].uitleg;
        this.renderAanwezig();
        this.renderVerbinding();
        document.getElementById('lokaal-waarschuwing').hidden = !App.isLokaal();
      }
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
      // Alleen wie met een telefoon meedoet, krijgt een telefoonicoon; de
      // rest een gewoon spelersicoon.
      icoon.className = 'telefoon' + (telefoon === 'aan' ? ' aan' : '') + (telefoon ? '' : ' geen');
      icoon.innerHTML = telefoon ? TELEFOON_ICOON : SPELER_ICOON;
      if (!telefoon) icoon.title = T.zonder_telefoon;
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

    // Iedereen uit de spelerslijst die er niet is, per niveau, om aan te
    // vinken. Wie eerder vanavond meedeed en vertrok, staat bovenaan.
    renderKiezen: function () {
      const houder = document.getElementById('paneel-afwezig');
      const zoekterm = document.getElementById('paneel-zoek').value.trim().toLowerCase();
      const scherm = this;
      houder.textContent = '';

      const speeldeMee = {};
      for (const ronde of App.avond.rondes) {
        for (const baan of ronde.banen) {
          for (const id of baan.teamA.concat(baan.teamB)) speeldeMee[id] = true;
        }
        for (const id of ronde.rustend.concat(ronde.gepauzeerd || [])) speeldeMee[id] = true;
      }

      const afwezig = App.club.spelers
        .filter(function (speler) { return App.avond.aanwezigen.indexOf(speler.id) === -1; })
        .filter(function (speler) { return !zoekterm || speler.naam.toLowerCase().indexOf(zoekterm) !== -1; })
        .sort(function (a, b) { return a.naam.localeCompare(b.naam, 'nl'); });

      if (!afwezig.length) {
        const hint = document.createElement('p');
        hint.className = 'uitleg';
        const alAanwezig = zoekterm ? App.avond.aanwezigen.map(function (id) { return App.spelerOp(id); }).filter(function (speler) {
          return speler && speler.naam.toLowerCase().indexOf(zoekterm) !== -1;
        }) : [];
        if (alAanwezig.length) hint.textContent = T.paneel_al_aanwezig(alAanwezig.map(function (s) { return s.naam; }));
        else hint.textContent = zoekterm ? T.geen_treffers : T.paneel_iedereen_er;
        houder.appendChild(hint);
      }

      function blok(titel, spelers, metNiveau) {
        if (!spelers.length) return;
        const kop = document.createElement('h4');
        kop.className = 'paneel-groep';
        kop.textContent = titel;
        houder.appendChild(kop);
        for (const speler of spelers) {
          const label = document.createElement('label');
          label.className = 'kies-rij';
          const vinkje = document.createElement('input');
          vinkje.type = 'checkbox';
          vinkje.checked = scherm.gekozen[speler.id] === true;
          vinkje.addEventListener('change', function () {
            if (vinkje.checked) scherm.gekozen[speler.id] = true;
            else delete scherm.gekozen[speler.id];
            scherm.renderBevestig();
          });
          const naam = document.createElement('span');
          naam.textContent = speler.naam;
          const niveau = document.createElement('small');
          niveau.textContent = App.club.groepen[speler.groep];
          label.appendChild(vinkje);
          label.appendChild(naam);
          if (metNiveau) label.appendChild(niveau);
          houder.appendChild(label);
        }
      }

      blok(T.paneel_eerder, afwezig.filter(function (s) { return speeldeMee[s.id]; }), true);
      const overig = afwezig.filter(function (s) { return !speeldeMee[s.id]; });
      App.club.groepen.forEach(function (groepsnaam, groep) {
        blok(groepsnaam, overig.filter(function (s) { return s.groep === groep; }));
      });
      this.renderBevestig();
    },

    renderBevestig: function () {
      const aantal = Object.keys(this.gekozen).length;
      const knop = document.getElementById('kiezen-bevestig');
      knop.disabled = aantal === 0;
      knop.textContent = T.paneel_kiezen_bevestig(aantal);
    },

    bevestigKiezen: function () {
      const ids = Object.keys(this.gekozen).filter(function (id) { return App.spelerOp(id); });
      if (!ids.length) return;
      let avond = App.avond;
      for (const id of ids) avond = Sessie.meldAan(avond, id);
      App.wijzigAvond(avond);
      App.meld(T.doet_mee(ids.map(function (id) { return App.naam(id); }).join(', ')));
      App.werkConceptBij();
      this.toon('overzicht');
      App.renderHuidig();
    },

    renderNieuw: function () {
      const keuze = document.getElementById('paneel-nieuw-groep');
      SchermSpelers.vulGroepKeuze(keuze, Number(keuze.value) || 0);
      const lijst = document.getElementById('paneel-toegevoegd');
      lijst.textContent = '';
      for (const naam of this.toegevoegd) {
        const item = document.createElement('li');
        item.textContent = '✓ ' + naam;
        lijst.appendChild(item);
      }
    },

    // Iemand zonder telefoon: de organisator voegt hem toe met naam en
    // niveau, en hij doet meteen mee. Het formulier blijft open voor de
    // volgende.
    voegNieuweToe: function () {
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
      this.toegevoegd.push(naam);
      veld.value = '';
      App.renderHuidig();
      veld.focus();
    },
  };

  window.SchermPaneel = SchermPaneel;

  window.addEventListener('DOMContentLoaded', function () {
    document.getElementById('open-paneel').addEventListener('click', function () { SchermPaneel.openen(); });
    document.getElementById('paneel-sluit').addEventListener('click', function () { SchermPaneel.sluit(); });
    document.getElementById('paneel-achtergrond').addEventListener('click', function () { SchermPaneel.sluit(); });
    document.addEventListener('keydown', function (gebeurtenis) {
      if (gebeurtenis.key !== 'Escape' || !SchermPaneel.open) return;
      if (SchermPaneel.weergave === 'overzicht') SchermPaneel.sluit();
      else SchermPaneel.toon('overzicht');
    });
    document.getElementById('naar-kiezen').addEventListener('click', function () { SchermPaneel.toon('kiezen'); });
    document.getElementById('naar-nieuw').addEventListener('click', function () { SchermPaneel.toon('nieuw'); });
    for (const terug of document.querySelectorAll('.paneel-terug')) {
      terug.addEventListener('click', function () { SchermPaneel.toon('overzicht'); });
    }
    document.getElementById('paneel-zoek').addEventListener('input', function () { SchermPaneel.renderKiezen(); });
    document.getElementById('kiezen-bevestig').addEventListener('click', function () { SchermPaneel.bevestigKiezen(); });
    document.getElementById('paneel-nieuw').addEventListener('submit', function (gebeurtenis) {
      gebeurtenis.preventDefault();
      SchermPaneel.voegNieuweToe();
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
