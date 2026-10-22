(function () {
  'use strict';

  // The evening screen is only the preparation now: courts, preset and who
  // is already here. Once the evening is running, all management goes
  // through the side panel on the round screen.
  const EveningScreen = {
    selection: {},
    courts: 4,

    render: function () {
      document.getElementById('evening-heading').textContent = T.new_evening_title;
      document.getElementById('court-count').textContent = String(this.courts);
      App.renderPresets(document.getElementById('presets'));
      this.renderAttendance();
      this.renderCounter();
    },

    isSelected: function (id) {
      return this.selection[id] === true;
    },

    renderAttendance: function () {
      const container = document.getElementById('attendance');
      const query = document.getElementById('evening-search').value.trim().toLowerCase();
      const onlyPresent = document.getElementById('only-present').checked;
      const screen = this;
      container.textContent = '';
      document.getElementById('attendance-help').hidden = App.club.players.length === 0;

      if (App.club.players.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'empty';
        empty.textContent = T.evening_no_players;
        container.appendChild(empty);
        return;
      }

      App.club.groups.forEach(function (groupName, group) {
        const inGroup = App.club.players
          .filter(function (player) { return player.group === group; })
          .sort(function (a, b) { return I18n.compare(a.name, b.name); });
        const visible = inGroup.filter(function (player) {
          if (query && player.name.toLowerCase().indexOf(query) === -1) return false;
          if (onlyPresent && !screen.isSelected(player.id)) return false;
          return true;
        });
        if (visible.length === 0) return;

        const block = document.createElement('div');
        block.className = 'group-block';

        const header = document.createElement('div');
        header.className = 'group-block-header';
        const title = document.createElement('h3');
        title.textContent = groupName;
        const tally = document.createElement('span');
        tally.className = 'pill';
        tally.textContent = inGroup.filter(function (p) { return screen.isSelected(p.id); }).length + ' / ' + inGroup.length;
        header.appendChild(title);
        header.appendChild(tally);
        header.appendChild(screen.groupButton(T.select_all, visible, true));
        header.appendChild(screen.groupButton(T.select_none, visible, false));
        block.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'player-grid';
        for (const player of visible) grid.appendChild(screen.tile(player));
        block.appendChild(grid);
        container.appendChild(block);
      });
    },

    groupButton: function (text, players, on) {
      const screen = this;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-small';
      button.textContent = text;
      button.addEventListener('click', function () {
        for (const player of players) {
          if (on) screen.selection[player.id] = true;
          else delete screen.selection[player.id];
        }
        screen.render();
      });
      return button;
    },

    tile: function (player) {
      const screen = this;
      const selected = this.isSelected(player.id);
      const tile = document.createElement('div');
      tile.className = 'player-tile' + (selected ? ' present' : '');
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = selected;
      checkbox.addEventListener('change', function () {
        if (checkbox.checked) screen.selection[player.id] = true;
        else delete screen.selection[player.id];
        screen.render();
      });
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = player.name;
      label.appendChild(checkbox);
      label.appendChild(name);
      tile.appendChild(label);
      return tile;
    },

    renderCounter: function () {
      const present = Object.keys(this.selection).filter(function (id) { return App.playerById(id); }).length;
      const spots = Pairing.countSpots(present, this.courts);
      const counter = document.getElementById('evening-counter');
      if (present === 0) {
        counter.textContent = T.counter_empty;
      } else if (present < 4) {
        counter.textContent = T.counter_preparing(present);
      } else {
        counter.innerHTML = T.counter(present, spots, present - spots, spots / 4, this.courts, 0);
      }
    },
  };

  window.EveningScreen = EveningScreen;

  window.addEventListener('DOMContentLoaded', function () {
    function changeCourts(step) {
      EveningScreen.courts = Math.min(20, Math.max(1, EveningScreen.courts + step));
      document.getElementById('court-count').textContent = String(EveningScreen.courts);
      EveningScreen.renderCounter();
    }
    document.getElementById('courts-minus').addEventListener('click', function () { changeCourts(-1); });
    document.getElementById('courts-plus').addEventListener('click', function () { changeCourts(1); });
    document.getElementById('evening-search').addEventListener('input', function () { EveningScreen.renderAttendance(); });
    document.getElementById('only-present').addEventListener('change', function () { EveningScreen.renderAttendance(); });

    // Starting also works without attendees: players then check in with
    // their phone in the lobby.
    document.getElementById('start-evening').addEventListener('click', function () {
      const attendees = Object.keys(EveningScreen.selection).filter(function (id) { return App.playerById(id); });
      App.setEvening(Session.newEvening(attendees, EveningScreen.courts, Session.createSessionCode()));
      EveningScreen.selection = {};
      App.startSession();
      App.showScreen('round');
    });
  });
})();
