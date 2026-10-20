(function () {
  'use strict';

  // The phone app. It keeps only its own phone id, the session code, the
  // chosen player and the last round it saw. Everything else comes from the
  // laptop.

  const STORAGE_KEY = 'hussel.phone';
  const OLD_STORAGE_KEY = 'hussel.telefoon';

  function readState() {
    try {
      const text = localStorage.getItem(STORAGE_KEY);
      if (text) return JSON.parse(text);
      // Phones from before the translation kept their data under the Dutch
      // key: convert it once, so a returning player is still recognised.
      const old = localStorage.getItem(OLD_STORAGE_KEY);
      if (old) {
        const converted = Migrate.phone(JSON.parse(old));
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(converted));
          localStorage.removeItem(OLD_STORAGE_KEY);
        } catch (error) { /* then we convert again next time */ }
        return converted;
      }
    } catch (error) { /* private window or blocked storage */ }
    return null;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) { /* then the phone won't remember it */ }
  }

  const state = readState() || {};
  // Ask the browser not to clear this data, so the phone still knows who it
  // is next week.
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
  if (!state.phone) state.phone = 't' + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36);
  if (state.lastRound === undefined) state.lastRound = null;

  let connection = null;
  let latest = null;
  let lastStatus = null;
  let toastTimer = null;
  // Remembered so the pause question can be redrawn in another language.
  let pauseChoiceCourt = null;

  function $(id) { return document.getElementById(id); }

  function show(name) {
    for (const section of document.querySelectorAll('main > section')) {
      section.hidden = section.id !== 'view-' + name;
    }
  }

  function toast(text) {
    const element = $('toast');
    element.textContent = text;
    element.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { element.hidden = true; }, 4000);
  }

  function send(message) {
    if (!connection || !connection.send(message)) {
      toast(T.phone_status.lost);
      return false;
    }
    return true;
  }

  function startConnection(code) {
    if (connection) connection.stop();
    latest = null;
    show('connecting');
    connection = Network.guest(code, {
      onOpen: function () {
        connection.send({ type: 'hello', phone: state.phone, player: state.player || null, name: state.name || null });
      },
      onMessage: onMessage,
      onStatus: onStatus,
    });
  }

  function onStatus(status) {
    lastStatus = status;
    const dot = $('phone-dot');
    dot.className = 'phone-dot' + (status === 'connected' ? ' on' : '');
    const bar = $('phone-status');
    if (status === 'connected' || (status === 'connecting' && !latest)) {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    $('phone-status-text').textContent = T.phone_status[status] || '';
    $('phone-retry').hidden = status === 'connecting' || status === 'unsupported';
  }

  function onMessage(message) {
    if (message.type === 'state') {
      latest = message;
      if (!message.eveningRunning) {
        // The player stays remembered for the next evening.
        state.lastRound = null;
        saveState();
        show('end');
        return;
      }
      if (state.player && !message.me) {
        // The name was linked elsewhere or unlinked: pick again.
        state.player = null;
      }
      if (message.me) {
        state.player = message.me;
        state.name = message.myName;
        state.level = message.myLevel;
      }
      announceNewRound(message);
      saveState();
      render();
    } else if (message.type === 'reply') {
      toast(T.phone_errors[message.error] || message.error);
    } else if (message.type === 'unlinked') {
      // Unlinked by the organiser: forget name and level too, otherwise the
      // phone links itself again on the next connect.
      state.player = null;
      state.name = null;
      state.level = null;
      $('new-name').value = '';
      saveState();
      toast(T.phone_unlinked);
    }
  }

  function buzz() {
    if (navigator.vibrate) navigator.vibrate([250, 120, 250]);
    const card = $('my-card');
    card.classList.remove('flash');
    void card.offsetWidth;
    card.classList.add('flash');
  }

  let previousStatus = null;
  function announceNewRound(update) {
    const number = update.round ? update.round.number : 0;
    const status = update.mine ? update.mine.status : null;
    // Same round, but suddenly on a court: the player is substituting.
    if (update.me && number === state.lastRound && previousStatus && previousStatus !== 'playing' && status === 'playing') {
      buzz();
      toast(T.phone_substitute(update.mine.court));
    }
    previousStatus = status;
    if (state.lastRound === null) {
      state.lastRound = number;
      return;
    }
    if (number > state.lastRound) {
      state.lastRound = number;
      if (!update.me) return;
      buzz();
      toast(T.phone_new_round);
    } else if (number < state.lastRound) {
      state.lastRound = number;
    }
  }

  function render() {
    if (!latest || !latest.eveningRunning) return;
    if (!latest.me) {
      show('name');
      renderNames();
      renderLevels();
      fillRemembered();
    } else {
      show('main');
      renderMain();
    }
  }

  function renderNames() {
    const list = $('names');
    const term = $('name-search').value.trim().toLowerCase();
    list.textContent = '';
    const visible = latest.players
      .filter(function (p) { return !term || p.name.toLowerCase().indexOf(term) !== -1; })
      .sort(function (a, b) { return I18n.compare(a.name, b.name); });
    $('name-search').hidden = latest.players.length < 12;
    $('name-list-head').hidden = latest.players.length === 0;
    for (const player of visible.slice(0, 100)) {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = player.name;
      button.addEventListener('click', function () {
        send({ type: 'claim', player: player.id });
      });
      item.appendChild(button);
      list.appendChild(item);
    }
    if (!visible.length && latest.players.length) {
      const empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = T.no_matches;
      list.appendChild(empty);
    }
  }

  // Only redraw when the groups change, so a chosen level stays selected
  // while messages come in.
  let drawnLevels = null;
  function renderLevels() {
    const key = JSON.stringify(latest.groups);
    if (key === drawnLevels) return;
    drawnLevels = key;
    const holder = $('level-choice');
    const chosen = holder.querySelector('input:checked');
    holder.textContent = '';
    latest.groups.forEach(function (name, index) {
      const label = document.createElement('label');
      label.className = 'level';
      const choice = document.createElement('input');
      choice.type = 'radio';
      choice.name = 'level';
      choice.value = String(index);
      choice.required = true;
      if (chosen && chosen.value === String(index)) choice.checked = true;
      const text = document.createElement('span');
      text.textContent = name;
      label.appendChild(choice);
      label.appendChild(text);
      holder.appendChild(label);
    });
  }

  // If this laptop didn't know us, the form is already filled in with the
  // remembered name and level: one tap on Sign up.
  function fillRemembered() {
    const field = $('new-name');
    if (state.name && !field.value) field.value = state.name;
    if (!state.level || document.querySelector('#level-choice input:checked')) return;
    const index = latest.groups.indexOf(state.level);
    const choices = document.querySelectorAll('#level-choice input');
    if (index !== -1 && choices[index]) choices[index].checked = true;
  }

  function line(className, text) {
    const element = document.createElement('p');
    element.className = className;
    element.textContent = text;
    return element;
  }

  function renderMyCard() {
    const card = $('my-card');
    const mine = latest.mine;
    const round = latest.round;
    card.textContent = '';
    card.className = 'my-card' + (card.classList.contains('flash') ? ' flash' : '');

    if (!round) {
      card.classList.add('waiting');
      card.appendChild(line('title', T.phone_wait_first));
      return;
    }

    card.appendChild(line('round', T.phone_round(round.number)));
    if (mine && mine.status === 'playing') {
      card.classList.add('playing');
      card.appendChild(line('court', T.phone_court(mine.court)));
      const team = document.createElement('div');
      team.className = 'team';
      team.appendChild(line('label', T.phone_with));
      team.appendChild(line('who', mine.partner));
      const against = document.createElement('div');
      against.className = 'team';
      against.appendChild(line('label', T.phone_against));
      against.appendChild(line('who', mine.opponents.join(' & ')));
      card.appendChild(team);
      card.appendChild(against);
    } else if (mine && mine.status === 'resting') {
      card.classList.add('resting');
      card.appendChild(line('title', T.phone_resting));
      card.appendChild(line('sub', T.phone_resting_help));
    } else if (mine && mine.status === 'paused') {
      card.classList.add('resting');
      card.appendChild(line('title', T.phone_paused));
    } else {
      card.classList.add('waiting');
      card.appendChild(line('title', T.phone_unassigned));
    }
  }

  function renderWholeRound() {
    const details = $('whole-round');
    const content = $('whole-round-content');
    const round = latest.round;
    details.hidden = !round;
    content.textContent = '';
    if (!round) return;
    for (const court of round.courts) {
      const row = document.createElement('div');
      row.className = 'round-row';
      const number = document.createElement('strong');
      number.textContent = T.phone_court(court.number);
      row.appendChild(number);
      row.appendChild(line('', court.teamA.join(' & ') + '  ' + T.versus + '  ' + court.teamB.join(' & ')));
      content.appendChild(row);
    }
    if (round.resting.length) content.appendChild(line('round-resting', T.resting + ': ' + round.resting.join(', ')));
    if (round.paused.length) content.appendChild(line('round-resting', T.paused + ': ' + round.paused.join(', ')));
  }

  function renderMain() {
    $('hello').textContent = T.phone_hello(latest.myName);
    renderMyCard();

    const notPresent = $('not-present');
    notPresent.hidden = latest.present;
    $('not-present-text').textContent = state.left ? T.phone_left : T.phone_not_present;
    $('im-here').textContent = state.left ? T.phone_back_in : T.phone_im_here;

    $('controls').hidden = !latest.present;
    $('pause-switch').checked = latest.pausingNext;
    $('pause-hint').hidden = !latest.pausingNext;
    renderWholeRound();
  }

  function showPauseChoice(court) {
    pauseChoiceCourt = court;
    $('pause-choice-text').textContent = T.phone_pause_when(court);
    $('pause-choice').hidden = false;
  }

  // Fixed text is filled by I18n.apply; everything drawn from code is drawn
  // again here, so switching language takes effect without a reload.
  function onLanguageChange() {
    I18n.apply(document);
    if (lastStatus) $('phone-status-text').textContent = T.phone_status[lastStatus] || '';
    if (!$('pause-choice').hidden) $('pause-choice-text').textContent = T.phone_pause_when(pauseChoiceCourt);
    render();
  }

  function sessionFromAddress() {
    const code = new URLSearchParams(location.search).get('session');
    return code ? code.trim().toUpperCase() : null;
  }

  function start() {
    I18n.apply(document);
    I18n.renderSwitcher($('language-switch'));
    I18n.onChange(onLanguageChange);

    // The chosen player is kept across evenings: next week one tap on
    // 'I'm here' is enough.
    const code = sessionFromAddress() || state.session || null;
    if (code !== state.session) {
      state.session = code;
      state.lastRound = null;
      state.left = false;
      saveState();
    }

    $('code-form').addEventListener('submit', function (event) {
      event.preventDefault();
      const entered = $('code-field').value.trim().toUpperCase();
      if (!entered) return;
      state.session = entered;
      state.lastRound = null;
      state.left = false;
      saveState();
      history.replaceState(null, '', '?session=' + encodeURIComponent(entered));
      startConnection(entered);
    });

    $('phone-retry').addEventListener('click', function () {
      if (connection) connection.retryNow();
    });

    $('phone-other-code').addEventListener('click', function () {
      if (connection) connection.stop();
      connection = null;
      latest = null;
      state.session = null;
      saveState();
      history.replaceState(null, '', location.pathname);
      $('phone-status').hidden = true;
      show('code');
    });

    $('name-search').addEventListener('input', renderNames);

    $('new-form').addEventListener('submit', function (event) {
      event.preventDefault();
      const name = $('new-name').value.trim();
      const level = document.querySelector('#level-choice input:checked');
      if (!name) return;
      if (!level) {
        toast(T.phone_errors['unknown-level']);
        return;
      }
      if (send({ type: 'register', name: name, group: Number(level.value) })) {
        state.left = false;
        saveState();
      }
    });

    $('not-you').addEventListener('click', function () {
      state.player = null;
      state.name = null;
      state.level = null;
      $('new-name').value = '';
      saveState();
      send({ type: 'release' });
    });

    $('im-here').addEventListener('click', function () {
      if (send({ type: 'checkIn' })) {
        state.left = false;
        saveState();
      }
    });

    // If the player is already on a court in the current round, 'pause' is
    // ambiguous: stop right now or after this round. They choose themselves.
    $('pause-switch').addEventListener('change', function () {
      const toggle = $('pause-switch');
      const mine = latest && latest.mine;
      if (toggle.checked && mine && mine.status === 'playing') {
        showPauseChoice(mine.court);
        return;
      }
      if (!send({ type: 'pause', on: toggle.checked })) toggle.checked = !toggle.checked;
    });

    function choosePause(now) {
      $('pause-choice').hidden = true;
      const sent = send({ type: 'pause', on: true, now: now });
      $('pause-switch').checked = sent && !now;
    }
    $('pause-now').addEventListener('click', function () { choosePause(true); });
    $('pause-later').addEventListener('click', function () { choosePause(false); });
    $('pause-cancel').addEventListener('click', function () {
      $('pause-choice').hidden = true;
      $('pause-switch').checked = false;
    });

    $('go-home').addEventListener('click', function () {
      if (!window.confirm(T.phone_go_home_confirm)) return;
      if (send({ type: 'leave' })) {
        state.left = true;
        saveState();
      }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && connection) connection.retryNow();
    });

    if (!code) {
      show('code');
      return;
    }
    startConnection(code);
  }

  window.addEventListener('DOMContentLoaded', start);
})();
