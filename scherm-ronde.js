(function () {
  'use strict';

  const SchermRonde = {
    // De eerste aangetikte naam bij handmatig wisselen. Blijft bewaard als
    // het scherm opnieuw tekent door een bericht van een telefoon.
    gekozen: null,
    getekendeCode: null,
    getekendeLobbyCode: null,
    lobbyGezien: {},

    render: function () {
      if (!App.avond) return;
      const avond = App.avond;
      const concept = avond.concept;
      const ronde = concept || (avond.rondes.length ? avond.rondes[avond.rondes.length - 1] : null);
      // Zolang er nog geen ronde is, is dit scherm de wachtruimte.
      const wachtruimte = !ronde;
      if (this.gekozen && (!concept || App.spelerOp(this.gekozen) === null)) this.gekozen = null;

      document.getElementById('ronde-nummer').textContent = String(concept ? avond.rondes.length + 1 : avond.rondes.length);

      const status = document.getElementById('ronde-status');
      status.className = 'pil ' + (concept || wachtruimte ? 'pil-concept' : 'pil-bezig');
      status.textContent = concept ? T.concept : (wachtruimte ? T.lobby_status : T.bezig);
      if (wachtruimte) document.getElementById('ronde-nummer').textContent = '1';

      document.getElementById('ronde-banen').textContent = String(avond.banen);
      this.renderModus();
      document.getElementById('opnieuw-loten').hidden = !concept;
      const start = document.getElementById('start-ronde');
      start.hidden = !concept;
      start.textContent = T.start_ronde(avond.rondes.length + 1);
      const volgende = document.getElementById('volgende-ronde');
      volgende.hidden = Boolean(concept);
      volgende.textContent = wachtruimte ? T.eerste_ronde : T.volgende_voorbereiden;
      volgende.disabled = wachtruimte && this.beschikbaar() < 4;

      document.getElementById('concept-uitleg').textContent = concept
        ? (this.gekozen ? T.gekozen_wissel(App.naam(this.gekozen)) : T.concept_uitleg)
        : '';

      document.getElementById('lobby').hidden = !wachtruimte;
      document.querySelector('#scherm-ronde .ronde-lijf').hidden = wachtruimte;
      document.getElementById('rustbalk').hidden = wachtruimte;
      document.getElementById('banen').classList.toggle('concept', Boolean(concept));
      this.renderVerouderd(concept ? avond.verouderd : {});
      if (wachtruimte) {
        this.renderLobby();
        return;
      }
      this.renderBanen(ronde, Boolean(concept));
      this.renderRustend(ronde, Boolean(concept));
      this.renderAansluiten();
    },

    renderModus: function () {
      const keuze = document.getElementById('ronde-modus');
      if (!keuze.options.length) {
        for (const preset of Presets.lijst) {
          const optie = document.createElement('option');
          optie.value = preset.sleutel;
          optie.textContent = T.presets[preset.sleutel].naam;
          keuze.appendChild(optie);
        }
      }
      keuze.value = Presets.op(App.club.preset).sleutel;
      keuze.title = T.presets[keuze.value].uitleg;
    },

    beschikbaar: function () {
      return App.avond.aanwezigen.filter(function (id) { return !App.avond.pauzes[id]; }).length;
    },

    renderLobby: function () {
      const link = App.aansluitLink();
      document.getElementById('code-lobby').textContent = App.avond.sessiecode;
      if (this.getekendeLobbyCode !== link) {
        App.tekenQr(document.getElementById('qr-lobby'), link);
        this.getekendeLobbyCode = link;
      }

      const aanwezigen = App.avond.aanwezigen.map(function (id) { return App.spelerOp(id); }).filter(Boolean);
      const tekort = 4 - this.beschikbaar();
      document.getElementById('lobby-aantal').textContent = String(aanwezigen.length);
      document.getElementById('lobby-hint').textContent = tekort > 0 ? T.lobby_te_weinig(tekort) : T.lobby_klaar;

      // Het scherm in de zaal toont nooit niveaus: alleen wie er is.
      const houder = document.getElementById('lobby-spelers');
      houder.textContent = '';
      const namen = document.createElement('div');
      namen.className = 'lobby-namen';
      aanwezigen.sort(function (a, b) { return a.naam.localeCompare(b.naam, 'nl'); });
      for (const speler of aanwezigen) {
        const kaartje = document.createElement('span');
        kaartje.className = 'naamkaartje' + (SchermRonde.lobbyGezien[speler.id] ? '' : ' nieuw');
        SchermRonde.lobbyGezien[speler.id] = true;
        kaartje.textContent = speler.naam;
        namen.appendChild(kaartje);
      }
      houder.appendChild(namen);
    },

    naamkaartje: function (id, opties) {
      const scherm = this;
      const element = document.createElement(opties.wisselbaar ? 'button' : 'span');
      element.className = 'naamkaartje';
      if (opties.wisselbaar) {
        element.type = 'button';
        if (this.gekozen === id) element.classList.add('gekozen');
        if (App.avond.verouderd[id]) element.classList.add('badge');
        element.addEventListener('click', function () { scherm.kies(id); });
      }
      element.textContent = App.naam(id);
      return element;
    },

    renderVerouderd: function (verouderd) {
      const kader = document.getElementById('verouderd');
      const ids = Object.keys(verouderd);
      kader.hidden = ids.length === 0;
      kader.textContent = '';
      if (ids.length === 0) return;
      const titel = document.createElement('h3');
      titel.textContent = T.verouderd_titel;
      kader.appendChild(titel);
      const regel = document.createElement('p');
      regel.textContent = ids.map(function (id) {
        return App.naam(id) + ' ' + T.verouderd_reden[verouderd[id]];
      }).join(' · ');
      kader.appendChild(regel);
      const advies = document.createElement('p');
      advies.className = 'uitleg';
      advies.textContent = T.verouderd_advies;
      kader.appendChild(advies);
    },

    renderBanen: function (ronde, wisselbaar) {
      const houder = document.getElementById('banen');
      houder.textContent = '';
      if (!ronde) return;

      for (const baan of ronde.banen) {
        const kaart = document.createElement('article');
        kaart.className = 'baan';

        const kop = document.createElement('header');
        kop.className = 'baan-kop';
        const nummer = document.createElement('span');
        nummer.className = 'baan-nummer';
        nummer.textContent = T.baan + ' ' + baan.baan;
        kop.appendChild(nummer);

        const veld = document.createElement('div');
        veld.className = 'veld';
        veld.setAttribute('aria-label', T.tegen);
        const helften = [['links', baan.teamA], ['rechts', baan.teamB]];
        for (const [kant, team] of helften) {
          const helft = document.createElement('div');
          helft.className = 'helft ' + kant;
          for (const id of team) {
            helft.appendChild(this.naamkaartje(id, {
              wisselbaar: wisselbaar,
            }));
          }
          veld.appendChild(helft);
        }

        kaart.appendChild(kop);
        kaart.appendChild(veld);
        houder.appendChild(kaart);
      }
    },

    renderRustend: function (ronde, wisselbaar) {
      const balk = document.getElementById('rustbalk');
      balk.textContent = '';
      if (!ronde) return;
      const scherm = this;

      function regel(label, ids, klasse, kanWisselen) {
        const rij = document.createElement('div');
        rij.className = 'rustregel ' + klasse;
        const kop = document.createElement('span');
        kop.className = 'label';
        kop.textContent = label;
        rij.appendChild(kop);
        for (const id of ids) rij.appendChild(scherm.naamkaartje(id, { wisselbaar: kanWisselen }));
        balk.appendChild(rij);
      }

      if (ronde.rustend.length) regel(T.rust, ronde.rustend, '', wisselbaar);
      if ((ronde.gepauzeerd || []).length) regel(T.pauzeert, ronde.gepauzeerd, 'pauze', false);
      if (!ronde.rustend.length && !(ronde.gepauzeerd || []).length) {
        const leeg = document.createElement('p');
        leeg.className = 'uitleg';
        leeg.textContent = T.niemand_rust;
        balk.appendChild(leeg);
      }
    },

    renderAansluiten: function () {
      const kaart = document.getElementById('ronde-zij');
      kaart.hidden = !App.avond;
      if (!App.avond) return;
      const link = App.aansluitLink();
      document.getElementById('code-klein').textContent = App.avond.sessiecode;
      if (this.getekendeCode !== link) {
        App.tekenQr(document.getElementById('qr-klein'), link);
        this.getekendeCode = link;
      }
    },

    kies: function (id) {
      if (!App.avond.concept) return;
      if (this.gekozen === null) {
        this.gekozen = id;
      } else if (this.gekozen === id) {
        this.gekozen = null;
      } else {
        App.wijzigAvond(Sessie.wissel(App.avond, App.club, this.gekozen, id));
        this.gekozen = null;
      }
      this.render();
    },

    genereer: function () {
      const uitkomst = Sessie.maakConcept(App.avond, App.club, { gewichten: App.gewichten() });
      if (uitkomst.fout) {
        App.meld(App.avond.aanwezigen.length < 4 ? T.min_vier : T.geen_ronde_mogelijk);
        return;
      }
      this.gekozen = null;
            App.wijzigAvond(uitkomst.avond);
    },

    // Met een open concept wordt meteen opnieuw geloot: een concept met het
    // verkeerde aantal banen heeft geen zin.
    wijzigBanen: function (stap) {
      const nieuw = Sessie.zetBanen(App.avond, App.avond.banen + stap);
      if (nieuw.banen === App.avond.banen) return;
      App.wijzigAvond(nieuw);
      const concept = Boolean(App.avond.concept);
      if (concept) this.genereer();
      App.meld(T.banen_gewijzigd(nieuw.banen, concept));
    },

    publiceer: function () {
      this.gekozen = null;
      App.wijzigAvond(Sessie.publiceer(App.avond));
    },
  };

  window.SchermRonde = SchermRonde;

  window.addEventListener('DOMContentLoaded', function () {
    document.getElementById('volgende-ronde').addEventListener('click', function () {
      SchermRonde.genereer();
      SchermRonde.render();
    });
    document.getElementById('opnieuw-loten').addEventListener('click', function () {
      SchermRonde.genereer();
      SchermRonde.render();
    });
    document.getElementById('start-ronde').addEventListener('click', function () {
      SchermRonde.publiceer();
      SchermRonde.render();
    });
    document.getElementById('ronde-modus').addEventListener('change', function () {
      App.wijzigModus(document.getElementById('ronde-modus').value);
      App.renderHuidig();
    });
    document.getElementById('ronde-banen-min').addEventListener('click', function () {
      SchermRonde.wijzigBanen(-1);
      App.renderHuidig();
    });
    document.getElementById('ronde-banen-plus').addEventListener('click', function () {
      SchermRonde.wijzigBanen(1);
      App.renderHuidig();
    });

  });
})();
