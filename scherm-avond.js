(function () {
  'use strict';

  const TELEFOON_ICOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="18" r="1.3" fill="currentColor"/></svg>';

  const SchermAvond = {
    // Vóór de start van de avond leeft de keuze alleen hier.
    selectie: {},
    banen: 4,
    getekendeCode: null,

    render: function () {
      document.getElementById('avond-kop').textContent = App.avond ? T.avond_titel : T.avond_nieuw_titel;
      document.getElementById('aantal-banen').textContent = String(this.aantalBanen());
      document.getElementById('start-avond').hidden = Boolean(App.avond);
      document.getElementById('stop-avond').hidden = !App.avond;
      this.renderPresets();
      this.renderAanwezigheid();
      this.renderTeller();
      this.renderAansluiten();
    },

    aantalBanen: function () {
      return App.avond ? App.avond.banen : this.banen;
    },

    isAanwezig: function (id) {
      return App.avond ? App.avond.aanwezigen.indexOf(id) !== -1 : this.selectie[id] === true;
    },

    renderPresets: function () {
      const houder = document.getElementById('presets');
      houder.textContent = '';
      for (const preset of Presets.lijst) {
        const tekst = T.presets[preset.sleutel];
        const label = document.createElement('label');
        label.className = 'preset';
        const keuze = document.createElement('input');
        keuze.type = 'radio';
        keuze.name = 'preset';
        keuze.value = preset.sleutel;
        keuze.checked = App.club.preset === preset.sleutel;
        keuze.addEventListener('change', function () {
          App.club.preset = preset.sleutel;
          App.bewaarClub();
        });
        const omschrijving = document.createElement('span');
        const naam = document.createElement('strong');
        naam.textContent = tekst.naam;
        const uitleg = document.createElement('small');
        uitleg.textContent = tekst.uitleg;
        omschrijving.appendChild(naam);
        omschrijving.appendChild(uitleg);
        label.appendChild(keuze);
        label.appendChild(omschrijving);
        houder.appendChild(label);
      }
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
          if (alleenAanwezig && !scherm.isAanwezig(speler.id)) return false;
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
        telling.textContent = inGroep.filter(function (s) { return scherm.isAanwezig(s.id); }).length + ' / ' + inGroep.length;
        kop.appendChild(titel);
        kop.appendChild(telling);
        if (!App.avond) {
          kop.appendChild(scherm.groepKnop(T.alles_aan, zichtbaar, true));
          kop.appendChild(scherm.groepKnop(T.alles_uit, zichtbaar, false));
        }
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
      const aanwezig = this.isAanwezig(speler.id);
      const pauzeert = Boolean(App.avond && App.avond.pauzes[speler.id]);

      const tegel = document.createElement('div');
      tegel.className = 'speler-tegel' + (aanwezig ? ' aanwezig' : '') + (pauzeert ? ' pauzeert' : '');

      const label = document.createElement('label');
      const vinkje = document.createElement('input');
      vinkje.type = 'checkbox';
      vinkje.checked = aanwezig;
      vinkje.addEventListener('change', function () { scherm.bijWijziging(speler.id, vinkje.checked); });
      const naam = document.createElement('span');
      naam.className = 'naam';
      naam.textContent = speler.naam;
      label.appendChild(vinkje);
      label.appendChild(naam);
      tegel.appendChild(label);

      if (!App.avond) return tegel;

      const telefoon = App.telefoonVan(speler.id);
      const acties = document.createElement('span');
      acties.className = 'tegel-acties';
      if (telefoon) {
        const icoon = document.createElement('span');
        icoon.className = 'telefoon' + (telefoon === 'aan' ? ' aan' : '');
        icoon.title = telefoon === 'aan' ? T.telefoon_verbonden : T.telefoon_gekoppeld;
        icoon.innerHTML = TELEFOON_ICOON;
        acties.appendChild(icoon);
        const los = document.createElement('button');
        los.type = 'button';
        los.className = 'knop-link';
        los.textContent = T.ontkoppel;
        los.addEventListener('click', function () {
          App.ontkoppel(speler.id);
          scherm.render();
        });
        acties.appendChild(los);
      }
      if (aanwezig) {
        const pauze = document.createElement('button');
        pauze.type = 'button';
        pauze.className = 'pauze-knop' + (pauzeert ? ' aan' : '');
        pauze.textContent = T.pauze_label;
        pauze.title = T.pauze_uitleg;
        pauze.addEventListener('click', function () {
          App.wijzigAvond(Sessie.zetPauze(App.avond, speler.id, !pauzeert));
          scherm.render();
        });
        acties.appendChild(pauze);
      }
      tegel.appendChild(acties);
      return tegel;
    },

    bijWijziging: function (id, aanwezig) {
      if (!App.avond) {
        if (aanwezig) this.selectie[id] = true;
        else delete this.selectie[id];
        this.render();
        return;
      }
      if (aanwezig) {
        App.wijzigAvond(Sessie.meldAan(App.avond, id));
        App.meld(T.doet_mee(App.naam(id)));
        App.werkConceptBij();
      } else {
        App.wijzigAvond(Sessie.meldAf(App.avond, id));
        App.meld(T.doet_niet_meer_mee(App.naam(id)));
      }
      this.render();
    },

    renderTeller: function () {
      const banen = this.aantalBanen();
      const aanwezig = App.avond
        ? App.avond.aanwezigen.length
        : Object.keys(this.selectie).filter(function (id) { return App.spelerOp(id); }).length;
      const pauzes = App.avond
        ? Object.keys(App.avond.pauzes).filter(function (id) { return App.avond.aanwezigen.indexOf(id) !== -1; }).length
        : 0;
      const plekken = Hussel.aantalPlekken(aanwezig - pauzes, banen);
      const teller = document.getElementById('avond-teller');
      if (aanwezig - pauzes < 4) {
        teller.textContent = T.teller_te_weinig(aanwezig - pauzes);
      } else {
        teller.innerHTML = T.teller(aanwezig, plekken, aanwezig - pauzes - plekken, plekken / 4, banen, pauzes);
      }
    },

    renderAansluiten: function () {
      const kaart = document.getElementById('aansluiten-kaart');
      kaart.hidden = !App.avond;
      if (!App.avond) return;
      const link = App.aansluitLink();
      document.getElementById('code-groot').textContent = App.avond.sessiecode;
      const anker = document.getElementById('aansluit-link');
      anker.href = link;
      anker.textContent = link;
      document.getElementById('lokaal-waarschuwing').hidden = !App.isLokaal();
      if (this.getekendeCode !== link) {
        App.tekenQr(document.getElementById('qr-groot'), link);
        this.getekendeCode = link;
      }
      this.renderVerbinding();
    },

    renderVerbinding: function () {
      const tekst = document.getElementById('verbinding-tekst');
      tekst.textContent = T.verbinding_status[App.verbindingStatus] || '';
    },
  };

  window.SchermAvond = SchermAvond;

  function wijzigBanen(stap) {
    if (App.avond) {
      SchermRonde.wijzigBanen(stap);
    } else {
      SchermAvond.banen = Math.min(20, Math.max(1, SchermAvond.banen + stap));
    }
    document.getElementById('aantal-banen').textContent = String(SchermAvond.aantalBanen());
    SchermAvond.renderTeller();
  }

  window.addEventListener('DOMContentLoaded', function () {
    document.getElementById('banen-min').addEventListener('click', function () { wijzigBanen(-1); });
    document.getElementById('banen-plus').addEventListener('click', function () { wijzigBanen(1); });
    document.getElementById('avond-zoek').addEventListener('input', function () { SchermAvond.renderAanwezigheid(); });
    document.getElementById('alleen-aanwezig').addEventListener('change', function () { SchermAvond.renderAanwezigheid(); });

    document.getElementById('start-avond').addEventListener('click', function () {
      // Starten kan ook zonder aanwezigen: spelers melden zich daarna met
      // hun telefoon aan in de wachtruimte.
      const aanwezigen = Object.keys(SchermAvond.selectie).filter(function (id) { return App.spelerOp(id); });
      App.waarschuw('');
      App.wijzigAvond(Sessie.nieuweAvond(aanwezigen, SchermAvond.banen, Sessie.maakSessiecode()));
      SchermAvond.selectie = {};
      App.startSessie();
      App.toonScherm('ronde');
    });

    document.getElementById('stop-avond').addEventListener('click', function () {
      if (!window.confirm(T.afsluiten_vraag)) return;
      App.stopSessie();
      App.avond = null;
      Opslag.wisAvond();
      SchermAvond.getekendeCode = null;
      App.waarschuw('');
      App.toonScherm('avond');
    });
  });
})();
