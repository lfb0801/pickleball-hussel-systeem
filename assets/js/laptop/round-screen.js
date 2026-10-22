(function () {
  'use strict';

  const RoundScreen = {
    // The first tapped name when swapping by hand. Kept when the screen
    // redraws because of a message from a phone.
    selected: null,
    drawnCode: null,
    drawnLobbyCode: null,
    lobbySeen: {},

    render: function () {
      if (!App.evening) return;
      const evening = App.evening;
      const draft = evening.draft;
      const round = draft || (evening.rounds.length ? evening.rounds[evening.rounds.length - 1] : null);
      // As long as there is no round yet, this screen is the lobby.
      const lobby = !round;
      if (this.selected && (!draft || App.playerById(this.selected) === null)) this.selected = null;

      document.getElementById('round-number').textContent = String(draft ? evening.rounds.length + 1 : evening.rounds.length);

      const status = document.getElementById('round-status');
      status.className = 'pill ' + (draft || lobby ? 'pill-draft' : 'pill-running');
      status.textContent = draft ? T.draft : (lobby ? T.lobby_status : T.in_progress);
      if (lobby) document.getElementById('round-number').textContent = '1';

      document.getElementById('round-courts').textContent = String(evening.courts);
      this.renderMode();
      document.getElementById('redraw').hidden = !draft;
      const start = document.getElementById('start-round');
      start.hidden = !draft;
      start.textContent = T.start_round(evening.rounds.length + 1);
      const next = document.getElementById('next-round');
      next.hidden = Boolean(draft);
      next.textContent = lobby ? T.first_round : T.prepare_next;
      next.disabled = lobby && this.available() < 4;

      document.getElementById('draft-hint').textContent = draft
        ? (this.selected ? T.swap_selected(App.name(this.selected)) : T.draft_help)
        : '';

      document.getElementById('lobby').hidden = !lobby;
      document.querySelector('#screen-round .round-body').hidden = lobby;
      document.getElementById('rest-bar').hidden = lobby;
      document.getElementById('courts').classList.toggle('draft', Boolean(draft));
      this.renderStale(draft ? evening.stale : {});
      if (window.Scanner) Scanner.mount(lobby ? 'scanner-slot-lobby' : 'scanner-slot-round');
      if (lobby) {
        this.renderLobby();
        return;
      }
      this.renderCourts(round, Boolean(draft));
      this.renderResting(round, Boolean(draft));
      this.renderJoin();
    },

    // The options are only built when the list is empty, so an open list
    // does not close when a phone message redraws the screen. A language
    // change empties it first.
    renderMode: function () {
      const select = document.getElementById('round-mode');
      if (!select.options.length) {
        for (const preset of Presets.list) {
          const option = document.createElement('option');
          option.value = preset.key;
          option.textContent = T.presets[preset.key].name;
          select.appendChild(option);
        }
      }
      select.value = Presets.get(App.club.preset).key;
      select.title = T.presets[select.value].help;
    },

    clearMode: function () {
      document.getElementById('round-mode').textContent = '';
    },

    available: function () {
      return App.evening.attendees.filter(function (id) { return !App.evening.pauses[id]; }).length;
    },

    renderLobby: function () {
      const link = App.joinLink();
      document.getElementById('lobby-code').textContent = App.evening.sessionCode;
      if (this.drawnLobbyCode !== link) {
        App.drawQr(document.getElementById('qr-lobby'), link);
        this.drawnLobbyCode = link;
      }

      const attendees = App.evening.attendees.map(function (id) { return App.playerById(id); }).filter(Boolean);
      const short = 4 - this.available();
      document.getElementById('lobby-count').textContent = String(attendees.length);
      document.getElementById('lobby-hint').textContent = short > 0 ? T.lobby_too_few(short) : T.lobby_ready;

      // The screen in the hall never shows levels: only who is here.
      const container = document.getElementById('lobby-players');
      container.textContent = '';
      const names = document.createElement('div');
      names.className = 'lobby-names';
      attendees.sort(function (a, b) { return I18n.compare(a.name, b.name); });
      for (const player of attendees) {
        const tag = document.createElement('span');
        tag.className = 'name-tag' + (RoundScreen.lobbySeen[player.id] ? '' : ' new');
        RoundScreen.lobbySeen[player.id] = true;
        tag.textContent = player.name;
        names.appendChild(tag);
      }
      container.appendChild(names);
    },

    nameTag: function (id, options) {
      const screen = this;
      const element = document.createElement(options.swappable ? 'button' : 'span');
      element.className = 'name-tag';
      if (options.swappable) {
        element.type = 'button';
        if (this.selected === id) element.classList.add('selected');
        if (App.evening.stale[id]) element.classList.add('badge');
        element.addEventListener('click', function () { screen.pick(id); });
      }
      element.textContent = App.name(id);
      return element;
    },

    renderStale: function (stale) {
      const box = document.getElementById('stale');
      const ids = Object.keys(stale);
      box.hidden = ids.length === 0;
      box.textContent = '';
      if (ids.length === 0) return;
      const title = document.createElement('h3');
      title.textContent = T.stale_title;
      box.appendChild(title);
      const line = document.createElement('p');
      line.textContent = ids.map(function (id) {
        return App.name(id) + ' ' + T.stale_reason[stale[id]];
      }).join(' · ');
      box.appendChild(line);
      const advice = document.createElement('p');
      advice.className = 'hint';
      advice.textContent = T.stale_advice;
      box.appendChild(advice);
    },

    renderCourts: function (round, swappable) {
      const container = document.getElementById('courts');
      container.textContent = '';
      if (!round) return;

      for (const court of round.courts) {
        const card = document.createElement('article');
        card.className = 'court';

        const header = document.createElement('header');
        header.className = 'court-header';
        const number = document.createElement('span');
        number.className = 'court-number';
        number.textContent = T.court + ' ' + court.number;
        header.appendChild(number);

        const field = document.createElement('div');
        field.className = 'field';
        field.setAttribute('aria-label', T.versus);
        const halves = [['left', court.teamA], ['right', court.teamB]];
        for (const [side, team] of halves) {
          const half = document.createElement('div');
          half.className = 'half ' + side;
          for (const id of team) {
            half.appendChild(this.nameTag(id, {
              swappable: swappable,
            }));
          }
          field.appendChild(half);
        }

        card.appendChild(header);
        card.appendChild(field);
        container.appendChild(card);
      }
    },

    renderResting: function (round, swappable) {
      const bar = document.getElementById('rest-bar');
      bar.textContent = '';
      if (!round) return;
      const screen = this;

      function line(label, ids, className, canSwap) {
        const row = document.createElement('div');
        row.className = 'rest-row ' + className;
        const heading = document.createElement('span');
        heading.className = 'label';
        heading.textContent = label;
        row.appendChild(heading);
        for (const id of ids) row.appendChild(screen.nameTag(id, { swappable: canSwap }));
        bar.appendChild(row);
      }

      if (round.resting.length) line(T.resting, round.resting, '', swappable);
      if ((round.paused || []).length) line(T.paused, round.paused, 'paused', false);
      if (!round.resting.length && !(round.paused || []).length) {
        const empty = document.createElement('p');
        empty.className = 'hint';
        empty.textContent = T.nobody_resting;
        bar.appendChild(empty);
      }
    },

    renderJoin: function () {
      const card = document.getElementById('round-side');
      card.hidden = !App.evening;
      if (!App.evening) return;
      const link = App.joinLink();
      document.getElementById('code-small').textContent = App.evening.sessionCode;
      if (this.drawnCode !== link) {
        App.drawQr(document.getElementById('qr-small'), link);
        this.drawnCode = link;
      }
    },

    pick: function (id) {
      if (!App.evening.draft) return;
      if (this.selected === null) {
        this.selected = id;
      } else if (this.selected === id) {
        this.selected = null;
      } else {
        App.setEvening(Session.swap(App.evening, App.club, this.selected, id));
        this.selected = null;
      }
      this.render();
    },

    generate: function () {
      const result = Session.createDraft(App.evening, App.club, { weights: App.weights() });
      if (result.error) {
        App.notify(App.evening.attendees.length < 4 ? T.min_four : T.no_round_possible);
        return;
      }
      this.selected = null;
      App.setEvening(result.evening);
    },

    // With an open draft we redraw straight away: a draft with the wrong
    // number of courts is pointless.
    changeCourts: function (step) {
      const changed = Session.setCourts(App.evening, App.evening.courts + step);
      if (changed.courts === App.evening.courts) return;
      App.setEvening(changed);
      const draft = Boolean(App.evening.draft);
      if (draft) this.generate();
      App.notify(T.courts_changed(changed.courts, draft));
    },

    publish: function () {
      this.selected = null;
      App.setEvening(Session.publish(App.evening));
    },
  };

  window.RoundScreen = RoundScreen;

  window.addEventListener('DOMContentLoaded', function () {
    document.getElementById('next-round').addEventListener('click', function () {
      RoundScreen.generate();
      RoundScreen.render();
    });
    document.getElementById('redraw').addEventListener('click', function () {
      RoundScreen.generate();
      RoundScreen.render();
    });
    document.getElementById('start-round').addEventListener('click', function () {
      RoundScreen.publish();
      RoundScreen.render();
    });
    document.getElementById('round-mode').addEventListener('change', function () {
      App.changeMode(document.getElementById('round-mode').value);
      App.renderCurrent();
    });
    document.getElementById('round-courts-minus').addEventListener('click', function () {
      RoundScreen.changeCourts(-1);
      App.renderCurrent();
    });
    document.getElementById('round-courts-plus').addEventListener('click', function () {
      RoundScreen.changeCourts(1);
      App.renderCurrent();
    });

  });
})();
