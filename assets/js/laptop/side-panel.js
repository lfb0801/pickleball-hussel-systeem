(function () {
  'use strict';

  const PLAYER_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4.5 21c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const PHONE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="18" r="1.3" fill="currentColor"/></svg>';

  // The management side panel next to the round screen: all management
  // during the evening in one place, so the organiser never has to switch
  // screens. It slides over the courts and is closed by default, so the
  // screen in the hall only shows the courts.
  //
  // The panel has three views: the overview, picking players from the list
  // (several at once, for those playing without a phone) and adding a new
  // player.
  const SidePanel = {
    isOpen: false,
    view: 'overview',
    picked: {},
    added: [],

    open: function () {
      this.isOpen = true;
      this.show('overview');
    },

    close: function () {
      this.isOpen = false;
      document.getElementById('panel').hidden = true;
      document.getElementById('panel-backdrop').hidden = true;
    },

    show: function (view) {
      this.view = view;
      if (view === 'pick') {
        this.picked = {};
        document.getElementById('panel-search').value = '';
      }
      if (view === 'new') this.added = [];
      this.render();
      document.querySelector('.panel-content').scrollTop = 0;
      if (view === 'pick') document.getElementById('panel-search').focus();
      if (view === 'new') document.getElementById('panel-new-name').focus();
    },

    render: function () {
      const count = document.getElementById('panel-button-count');
      count.textContent = App.evening ? String(App.evening.attendees.length) : '';
      const visible = this.isOpen && Boolean(App.evening);
      document.getElementById('panel').hidden = !visible;
      document.getElementById('panel-backdrop').hidden = !visible;
      if (!visible) return;

      document.getElementById('panel-overview').hidden = this.view !== 'overview';
      document.getElementById('panel-pick').hidden = this.view !== 'pick';
      document.getElementById('panel-new-view').hidden = this.view !== 'new';

      if (this.view === 'pick') {
        this.renderPick();
      } else if (this.view === 'new') {
        this.renderNew();
      } else {
        document.getElementById('panel-count').textContent = String(App.evening.attendees.length);
        document.getElementById('mode-hint').textContent = T.presets[Presets.get(App.club.preset).key].help;
        this.renderPresent();
        this.renderConnection();
        document.getElementById('local-warning').hidden = !App.isLocal();
      }
    },

    renderConnection: function () {
      document.getElementById('panel-connection').textContent = T.connection_status[App.networkStatus] || '';
    },

    stats: function () {
      const lines = {};
      for (const line of Pairing.summarize(App.evening.rounds, App.evening.attendees)) lines[line.id] = line;
      return lines;
    },

    renderPresent: function () {
      const container = document.getElementById('panel-present');
      const screen = this;
      const stats = this.stats();
      container.textContent = '';
      const attendees = App.evening.attendees.map(function (id) { return App.playerById(id); }).filter(Boolean);

      if (!attendees.length) {
        const empty = document.createElement('p');
        empty.className = 'hint';
        empty.textContent = T.panel_nobody;
        container.appendChild(empty);
        return;
      }

      App.club.groups.forEach(function (groupName, group) {
        const inGroup = attendees
          .filter(function (player) { return player.group === group; })
          .sort(function (a, b) { return I18n.compare(a.name, b.name); });
        if (!inGroup.length) return;
        const heading = document.createElement('h4');
        heading.className = 'panel-group';
        heading.textContent = groupName + ' · ' + inGroup.length;
        container.appendChild(heading);
        for (const player of inGroup) container.appendChild(screen.row(player, stats[player.id]));
      });
    },

    row: function (player, stat) {
      const paused = Boolean(App.evening.pauses[player.id]);
      const row = document.createElement('div');
      row.className = 'panel-row' + (paused ? ' paused' : '');

      const phone = App.phoneOf(player.id);
      const icon = document.createElement(phone ? 'button' : 'span');
      // Only those playing with a phone get a phone icon; the rest a plain
      // player icon.
      icon.className = 'phone' + (phone === 'connected' ? ' on' : '') + (phone ? '' : ' none');
      icon.innerHTML = phone ? PHONE_ICON : PLAYER_ICON;
      if (!phone) icon.title = T.without_phone;
      if (phone) {
        icon.type = 'button';
        icon.title = (phone === 'connected' ? T.phone_connected : T.phone_linked) + ' · ' + T.unlink;
        icon.addEventListener('click', function () {
          App.confirm(T.unlink_confirm(player.name), T.unlink, function () {
            App.unlink(player.id);
            App.renderCurrent();
          });
        });
      }
      row.appendChild(icon);

      const middle = document.createElement('div');
      middle.className = 'row-name';
      const name = document.createElement('input');
      name.type = 'text';
      name.className = 'name-field';
      name.value = player.name;
      name.maxLength = 40;
      name.setAttribute('aria-label', T.column_name);
      name.addEventListener('change', function () {
        if (!App.rename(player.id, name.value)) name.value = player.name;
      });
      const numbers = document.createElement('small');
      numbers.textContent = T.stats(stat ? stat.played : 0, stat ? stat.rested : 0, stat ? stat.paused : 0);
      middle.appendChild(name);
      middle.appendChild(numbers);
      row.appendChild(middle);

      const level = document.createElement('select');
      level.className = 'level-select';
      level.setAttribute('aria-label', T.change_level + ': ' + player.name);
      PlayersScreen.fillGroupSelect(level, player.group);
      level.addEventListener('change', function () {
        App.changeLevel(player.id, Number(level.value));
        App.renderCurrent();
      });
      row.appendChild(level);

      const pause = document.createElement('button');
      pause.type = 'button';
      pause.className = 'pause-btn' + (paused ? ' on' : '');
      pause.textContent = T.pause_label;
      pause.title = T.pause_help;
      pause.addEventListener('click', function () {
        App.pause(player.id, !paused, false);
        App.renderCurrent();
      });
      row.appendChild(pause);

      const leave = document.createElement('button');
      leave.type = 'button';
      leave.className = 'btn-link btn-leave';
      leave.textContent = T.send_home;
      leave.addEventListener('click', function () {
        App.sendHome(player.id);
        App.renderCurrent();
      });
      row.appendChild(leave);
      return row;
    },

    // Everyone from the player list who is not here, per level, to tick.
    // Those who played earlier this evening and left are at the top.
    renderPick: function () {
      const container = document.getElementById('panel-absent');
      const query = document.getElementById('panel-search').value.trim().toLowerCase();
      const screen = this;
      container.textContent = '';

      const playedBefore = {};
      for (const round of App.evening.rounds) {
        for (const court of round.courts) {
          for (const id of court.teamA.concat(court.teamB)) playedBefore[id] = true;
        }
        for (const id of round.resting.concat(round.paused || [])) playedBefore[id] = true;
      }

      const absent = App.club.players
        .filter(function (player) { return App.evening.attendees.indexOf(player.id) === -1; })
        .filter(function (player) { return !query || player.name.toLowerCase().indexOf(query) !== -1; })
        .sort(function (a, b) { return I18n.compare(a.name, b.name); });

      if (!absent.length) {
        const hint = document.createElement('p');
        hint.className = 'hint';
        const alreadyPresent = query ? App.evening.attendees.map(function (id) { return App.playerById(id); }).filter(function (player) {
          return player && player.name.toLowerCase().indexOf(query) !== -1;
        }) : [];
        if (alreadyPresent.length) hint.textContent = T.panel_already_present(alreadyPresent.map(function (p) { return p.name; }));
        else hint.textContent = query ? T.no_matches : T.panel_everyone_here;
        container.appendChild(hint);
      }

      function block(title, players, withLevel) {
        if (!players.length) return;
        const heading = document.createElement('h4');
        heading.className = 'panel-group';
        heading.textContent = title;
        container.appendChild(heading);
        for (const player of players) {
          const label = document.createElement('label');
          label.className = 'pick-row';
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = screen.picked[player.id] === true;
          checkbox.addEventListener('change', function () {
            if (checkbox.checked) screen.picked[player.id] = true;
            else delete screen.picked[player.id];
            screen.renderConfirm();
          });
          const name = document.createElement('span');
          name.textContent = player.name;
          const level = document.createElement('small');
          level.textContent = App.club.groups[player.group];
          label.appendChild(checkbox);
          label.appendChild(name);
          if (withLevel) label.appendChild(level);
          container.appendChild(label);
        }
      }

      block(T.panel_earlier, absent.filter(function (p) { return playedBefore[p.id]; }), true);
      const others = absent.filter(function (p) { return !playedBefore[p.id]; });
      App.club.groups.forEach(function (groupName, group) {
        block(groupName, others.filter(function (p) { return p.group === group; }));
      });
      this.renderConfirm();
    },

    renderConfirm: function () {
      const count = Object.keys(this.picked).length;
      const button = document.getElementById('pick-confirm');
      button.disabled = count === 0;
      button.textContent = T.panel_pick_confirm(count);
    },

    confirmPick: function () {
      const ids = Object.keys(this.picked).filter(function (id) { return App.playerById(id); });
      if (!ids.length) return;
      let evening = App.evening;
      for (const id of ids) evening = Session.checkIn(evening, id);
      App.setEvening(evening);
      App.notify(T.joins(ids.map(function (id) { return App.name(id); }).join(', ')));
      App.refreshDraft();
      this.show('overview');
      App.renderCurrent();
    },

    renderNew: function () {
      const select = document.getElementById('panel-new-group');
      PlayersScreen.fillGroupSelect(select, Number(select.value) || 0);
      const list = document.getElementById('panel-added');
      list.textContent = '';
      for (const name of this.added) {
        const item = document.createElement('li');
        item.textContent = '✓ ' + name;
        list.appendChild(item);
      }
    },

    // Someone without a phone: the organiser adds them with name and
    // level, and they play straight away. The form stays open for the
    // next one.
    addNew: function () {
      const field = document.getElementById('panel-new-name');
      const name = Session.cleanName(field.value);
      if (!name) return;
      if (Session.nameExists(App.club, name)) {
        App.notify(T.name_exists(name));
        return;
      }
      const id = App.newId();
      App.club.players.push({ id: id, name: name, group: Number(document.getElementById('panel-new-group').value) });
      App.saveClub();
      App.setEvening(Session.checkIn(App.evening, id));
      App.notify(T.joins(name));
      App.refreshDraft();
      this.added.push(name);
      field.value = '';
      App.renderCurrent();
      field.focus();
    },
  };

  window.SidePanel = SidePanel;

  window.addEventListener('DOMContentLoaded', function () {
    document.getElementById('open-panel').addEventListener('click', function () { SidePanel.open(); });
    document.getElementById('panel-close').addEventListener('click', function () { SidePanel.close(); });
    document.getElementById('panel-backdrop').addEventListener('click', function () { SidePanel.close(); });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !SidePanel.isOpen) return;
      if (document.getElementById('confirm').open) return;
      if (SidePanel.view === 'overview') SidePanel.close();
      else SidePanel.show('overview');
    });
    document.getElementById('to-pick').addEventListener('click', function () { SidePanel.show('pick'); });
    document.getElementById('to-new').addEventListener('click', function () { SidePanel.show('new'); });
    for (const back of document.querySelectorAll('.panel-back')) {
      back.addEventListener('click', function () { SidePanel.show('overview'); });
    }
    document.getElementById('panel-search').addEventListener('input', function () { SidePanel.renderPick(); });
    document.getElementById('pick-confirm').addEventListener('click', function () { SidePanel.confirmPick(); });
    document.getElementById('panel-new').addEventListener('submit', function (event) {
      event.preventDefault();
      SidePanel.addNew();
    });

    document.getElementById('stop-evening').addEventListener('click', function () {
      App.confirm(T.end_evening_confirm, T.end_evening, function () { App.endEvening(); }, true);
    });
  });
})();
