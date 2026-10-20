(function () {
  'use strict';

  // De telefoon-app. Hij bewaart alleen zijn eigen telefoon-id, de
  // sessiecode, de gekozen speler en de laatst geziene ronde. Al het andere
  // komt van de laptop.

  const SLEUTEL = 'hussel.telefoon';

  function leesStaat() {
    try {
      const tekst = localStorage.getItem(SLEUTEL);
      if (tekst) return JSON.parse(tekst);
    } catch (fout) { /* privévenster of geblokkeerde opslag */ }
    return null;
  }

  function bewaarStaat() {
    try {
      localStorage.setItem(SLEUTEL, JSON.stringify(staat));
    } catch (fout) { /* dan onthoudt de telefoon het niet */ }
  }

  const staat = leesStaat() || {};
  if (!staat.telefoon) staat.telefoon = 't' + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36);
  if (staat.laatsteRonde === undefined) staat.laatsteRonde = null;

  let verbinding = null;
  let laatste = null;
  let toastTimer = null;

  function $(id) { return document.getElementById(id); }

  function vulTeksten() {
    for (const element of document.querySelectorAll('[data-t]')) element.textContent = T[element.dataset.t];
    for (const element of document.querySelectorAll('[data-t-placeholder]')) element.placeholder = T[element.dataset.tPlaceholder];
  }

  function toon(naam) {
    for (const sectie of document.querySelectorAll('main > section')) {
      sectie.hidden = sectie.id !== 't-' + naam;
    }
  }

  function toast(tekst) {
    const element = $('toast');
    element.textContent = tekst;
    element.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { element.hidden = true; }, 4000);
  }

  function zend(bericht) {
    if (!verbinding || !verbinding.zend(bericht)) {
      toast(T.tel_status.kwijt);
      return false;
    }
    return true;
  }

  function startVerbinding(code) {
    if (verbinding) verbinding.stop();
    laatste = null;
    toon('verbinden');
    verbinding = Verbinding.gast(code, {
      bijOpen: function () {
        verbinding.zend({ type: 'hallo', telefoon: staat.telefoon, speler: staat.speler || null });
      },
      bijBericht: bijBericht,
      bijStatus: bijStatus,
    });
  }

  function bijStatus(status) {
    const stip = $('tel-stip');
    stip.className = 'tel-stip' + (status === 'verbonden' ? ' aan' : '');
    const balk = $('tel-status');
    if (status === 'verbonden' || (status === 'verbinden' && !laatste)) {
      balk.hidden = true;
      return;
    }
    balk.hidden = false;
    $('tel-status-tekst').textContent = T.tel_status[status] || '';
    $('tel-opnieuw').hidden = status === 'verbinden' || status === 'niet-ondersteund';
  }

  function bijBericht(bericht) {
    if (bericht.type === 'toestand') {
      laatste = bericht;
      if (!bericht.avondLoopt) {
        // De speler blijft bewaard voor de volgende avond.
        staat.laatsteRonde = null;
        bewaarStaat();
        toon('einde');
        return;
      }
      if (staat.speler && !bericht.ik) {
        // De naam is elders gekoppeld of ontkoppeld: opnieuw kiezen.
        staat.speler = null;
      }
      if (bericht.ik) staat.speler = bericht.ik;
      meldNieuweRonde(bericht);
      bewaarStaat();
      render();
    } else if (bericht.type === 'antwoord') {
      toast(T.tel_fouten[bericht.fout] || bericht.fout);
    } else if (bericht.type === 'ontkoppeld') {
      staat.speler = null;
      bewaarStaat();
      toast(T.tel_ontkoppeld);
    }
  }

  function meldNieuweRonde(toestand) {
    const nummer = toestand.ronde ? toestand.ronde.nummer : 0;
    if (staat.laatsteRonde === null) {
      staat.laatsteRonde = nummer;
      return;
    }
    if (nummer > staat.laatsteRonde) {
      staat.laatsteRonde = nummer;
      if (!toestand.ik) return;
      if (navigator.vibrate) navigator.vibrate([250, 120, 250]);
      toast(T.tel_nieuwe_ronde);
      const kaart = $('mijn-kaart');
      kaart.classList.remove('flits');
      void kaart.offsetWidth;
      kaart.classList.add('flits');
    } else if (nummer < staat.laatsteRonde) {
      staat.laatsteRonde = nummer;
    }
  }

  function render() {
    if (!laatste || !laatste.avondLoopt) return;
    if (!laatste.ik) {
      toon('naam');
      renderNamen();
      renderNiveaus();
    } else {
      toon('hoofd');
      renderHoofd();
    }
  }

  function renderNamen() {
    const lijst = $('namen');
    const zoekterm = $('naam-zoek').value.trim().toLowerCase();
    lijst.textContent = '';
    const zichtbaar = laatste.spelers
      .filter(function (s) { return !zoekterm || s.naam.toLowerCase().indexOf(zoekterm) !== -1; })
      .sort(function (a, b) { return a.naam.localeCompare(b.naam, 'nl'); });
    $('naam-zoek').hidden = laatste.spelers.length < 12;
    $('naam-lijst-kop').hidden = laatste.spelers.length === 0;
    for (const speler of zichtbaar.slice(0, 100)) {
      const item = document.createElement('li');
      const knop = document.createElement('button');
      knop.type = 'button';
      knop.textContent = speler.naam;
      knop.addEventListener('click', function () {
        zend({ type: 'claim', speler: speler.id });
      });
      item.appendChild(knop);
      lijst.appendChild(item);
    }
    if (!zichtbaar.length && laatste.spelers.length) {
      const leeg = document.createElement('li');
      leeg.className = 'leeg';
      leeg.textContent = T.geen_treffers;
      lijst.appendChild(leeg);
    }
  }

  // Alleen opnieuw tekenen als de groepen veranderen, zodat een gekozen
  // niveau blijft staan terwijl er berichten binnenkomen.
  let getekendeNiveaus = null;
  function renderNiveaus() {
    const sleutel = JSON.stringify(laatste.groepen);
    if (sleutel === getekendeNiveaus) return;
    getekendeNiveaus = sleutel;
    const houder = $('niveau-keuze');
    const gekozen = houder.querySelector('input:checked');
    houder.textContent = '';
    laatste.groepen.forEach(function (naam, index) {
      const label = document.createElement('label');
      label.className = 'niveau';
      const keuze = document.createElement('input');
      keuze.type = 'radio';
      keuze.name = 'niveau';
      keuze.value = String(index);
      keuze.required = true;
      if (gekozen && gekozen.value === String(index)) keuze.checked = true;
      const tekst = document.createElement('span');
      tekst.textContent = naam;
      label.appendChild(keuze);
      label.appendChild(tekst);
      houder.appendChild(label);
    });
  }

  function regel(klasse, tekst) {
    const element = document.createElement('p');
    element.className = klasse;
    element.textContent = tekst;
    return element;
  }

  function renderMijnKaart() {
    const kaart = $('mijn-kaart');
    const mijn = laatste.mijn;
    const ronde = laatste.ronde;
    kaart.textContent = '';
    kaart.className = 'mijn-kaart' + (kaart.classList.contains('flits') ? ' flits' : '');

    if (!ronde) {
      kaart.classList.add('wacht');
      kaart.appendChild(regel('kop', T.tel_wacht_eerste));
      return;
    }

    kaart.appendChild(regel('ronde', T.tel_ronde(ronde.nummer)));
    if (mijn && mijn.status === 'speelt') {
      kaart.classList.add('speelt');
      kaart.appendChild(regel('baan', T.tel_baan(mijn.baan)));
      const team = document.createElement('div');
      team.className = 'team';
      team.appendChild(regel('label', T.tel_met));
      team.appendChild(regel('wie', mijn.partner));
      const tegen = document.createElement('div');
      tegen.className = 'team';
      tegen.appendChild(regel('label', T.tel_tegen));
      tegen.appendChild(regel('wie', mijn.tegen.join(' & ')));
      kaart.appendChild(team);
      kaart.appendChild(tegen);
    } else if (mijn && mijn.status === 'rust') {
      kaart.classList.add('rust');
      kaart.appendChild(regel('kop', T.tel_rust));
      kaart.appendChild(regel('sub', T.tel_rust_uitleg));
    } else if (mijn && mijn.status === 'pauze') {
      kaart.classList.add('rust');
      kaart.appendChild(regel('kop', T.tel_pauze));
    } else {
      kaart.classList.add('wacht');
      kaart.appendChild(regel('kop', T.tel_niet_ingedeeld));
    }
  }

  function renderHeleRonde() {
    const details = $('hele-ronde');
    const inhoud = $('hele-ronde-inhoud');
    const ronde = laatste.ronde;
    details.hidden = !ronde;
    inhoud.textContent = '';
    if (!ronde) return;
    for (const baan of ronde.banen) {
      const rij = document.createElement('div');
      rij.className = 'ronde-rij';
      const nummer = document.createElement('strong');
      nummer.textContent = T.tel_baan(baan.baan);
      rij.appendChild(nummer);
      rij.appendChild(regel('', baan.teamA.join(' & ') + '  ' + T.tegen + '  ' + baan.teamB.join(' & ')));
      inhoud.appendChild(rij);
    }
    if (ronde.rustend.length) inhoud.appendChild(regel('ronde-rust', T.rust + ': ' + ronde.rustend.join(', ')));
    if (ronde.gepauzeerd.length) inhoud.appendChild(regel('ronde-rust', T.pauzeert + ': ' + ronde.gepauzeerd.join(', ')));
  }

  function renderHoofd() {
    $('hoi').textContent = T.tel_hoi(laatste.ikNaam);
    renderMijnKaart();

    const nietAanwezig = $('niet-aanwezig');
    nietAanwezig.hidden = laatste.aanwezig;
    $('niet-aanwezig-tekst').textContent = staat.vertrokken ? T.tel_vertrokken : T.tel_niet_aanwezig;
    $('ik-ben-er').textContent = staat.vertrokken ? T.tel_toch_terug : T.tel_ik_ben_er;

    $('bediening').hidden = !laatste.aanwezig;
    $('pauze-schakelaar').checked = laatste.pauzeertVolgende;
    $('pauze-uitleg').hidden = !laatste.pauzeertVolgende;
    renderHeleRonde();
  }

  function sessieUitAdres() {
    const code = new URLSearchParams(location.search).get('sessie');
    return code ? code.trim().toUpperCase() : null;
  }

  function start() {
    vulTeksten();

    // De gekozen speler blijft over avonden heen bewaard: volgende week is
    // één tik op 'Ik ben er' genoeg.
    const code = sessieUitAdres() || staat.sessie || null;
    if (code !== staat.sessie) {
      staat.sessie = code;
      staat.laatsteRonde = null;
      staat.vertrokken = false;
      bewaarStaat();
    }

    $('code-formulier').addEventListener('submit', function (gebeurtenis) {
      gebeurtenis.preventDefault();
      const nieuw = $('code-veld').value.trim().toUpperCase();
      if (!nieuw) return;
      staat.sessie = nieuw;
      staat.laatsteRonde = null;
      staat.vertrokken = false;
      bewaarStaat();
      history.replaceState(null, '', '?sessie=' + encodeURIComponent(nieuw));
      startVerbinding(nieuw);
    });

    $('tel-opnieuw').addEventListener('click', function () {
      if (verbinding) verbinding.nuProberen();
    });

    $('tel-andere-code').addEventListener('click', function () {
      if (verbinding) verbinding.stop();
      verbinding = null;
      laatste = null;
      staat.sessie = null;
      bewaarStaat();
      history.replaceState(null, '', location.pathname);
      $('tel-status').hidden = true;
      toon('code');
    });

    $('naam-zoek').addEventListener('input', renderNamen);

    $('nieuw-formulier').addEventListener('submit', function (gebeurtenis) {
      gebeurtenis.preventDefault();
      const naam = $('nieuw-naam').value.trim();
      const niveau = document.querySelector('#niveau-keuze input:checked');
      if (!naam) return;
      if (!niveau) {
        toast(T.tel_fouten['onbekend-niveau']);
        return;
      }
      if (zend({ type: 'registreer', naam: naam, groep: Number(niveau.value) })) {
        staat.vertrokken = false;
        bewaarStaat();
      }
    });

    $('niet-jij').addEventListener('click', function () {
      staat.speler = null;
      bewaarStaat();
      zend({ type: 'loslaten' });
    });

    $('ik-ben-er').addEventListener('click', function () {
      if (zend({ type: 'aanmelden' })) {
        staat.vertrokken = false;
        bewaarStaat();
      }
    });

    $('pauze-schakelaar').addEventListener('change', function () {
      const schakelaar = $('pauze-schakelaar');
      if (!zend({ type: 'pauze', aan: schakelaar.checked })) schakelaar.checked = !schakelaar.checked;
    });

    $('naar-huis').addEventListener('click', function () {
      if (!window.confirm(T.tel_naar_huis_vraag)) return;
      if (zend({ type: 'vertrek' })) {
        staat.vertrokken = true;
        bewaarStaat();
      }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && verbinding) verbinding.nuProberen();
    });

    if (!code) {
      toon('code');
      return;
    }
    startVerbinding(code);
  }

  window.addEventListener('DOMContentLoaded', start);
})();
