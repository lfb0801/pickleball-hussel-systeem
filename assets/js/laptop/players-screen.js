(function () {
  'use strict';

  const PlayersScreen = {
    render: function () {
      this.renderGroups();
      this.fillGroupSelect(document.getElementById('new-player-group'), 0);
      this.renderPlayers();
    },

    button: function (text, onClick, className) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn ' + (className || '');
      button.textContent = text;
      button.addEventListener('click', onClick);
      return button;
    },

    fillGroupSelect: function (select, selected) {
      select.textContent = '';
      App.club.groups.forEach(function (name, index) {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = name;
        if (index === selected) option.selected = true;
        select.appendChild(option);
      });
    },

    renderGroups: function () {
      const list = document.getElementById('group-list');
      const screen = this;
      list.textContent = '';
      App.club.groups.forEach(function (name, index) {
        const item = document.createElement('li');
        const label = document.createElement('span');
        label.className = 'group-name';
        label.textContent = name;
        item.appendChild(label);
        item.appendChild(screen.button('↑', function () { screen.moveGroup(index, -1); }));
        item.lastChild.title = T.move_up;
        item.appendChild(screen.button('↓', function () { screen.moveGroup(index, 1); }));
        item.lastChild.title = T.move_down;
        item.appendChild(screen.button(T.remove, function () { screen.removeGroup(index); }, 'btn-danger'));
        list.appendChild(item);
      });
    },

    sortedPlayers: function () {
      return App.club.players.slice().sort(function (a, b) {
        if (a.group !== b.group) return a.group - b.group;
        return I18n.compare(a.name, b.name);
      });
    },

    renderPlayers: function () {
      const body = document.querySelector('#players-table tbody');
      const query = document.getElementById('players-search').value.trim().toLowerCase();
      const screen = this;
      body.textContent = '';

      const visible = this.sortedPlayers().filter(function (player) {
        return !query || player.name.toLowerCase().indexOf(query) !== -1;
      });

      for (const player of visible) {
        const row = document.createElement('tr');

        // Players type their own name; a typo can be fixed here.
        const nameCell = document.createElement('td');
        const nameField = document.createElement('input');
        nameField.type = 'text';
        nameField.className = 'name-field';
        nameField.value = player.name;
        nameField.maxLength = 40;
        nameField.setAttribute('aria-label', T.column_name);
        nameField.addEventListener('change', function () {
          if (App.rename(player.id, nameField.value)) screen.renderPlayers();
          else nameField.value = player.name;
        });
        nameCell.appendChild(nameField);

        const groupCell = document.createElement('td');
        const select = document.createElement('select');
        this.fillGroupSelect(select, player.group);
        select.addEventListener('change', function () {
          App.changeLevel(player.id, Number(select.value));
          screen.renderPlayers();
        });
        groupCell.appendChild(select);

        const actionCell = document.createElement('td');
        actionCell.appendChild(this.button(T.remove, function () { screen.removePlayer(player.id); }, 'btn-small btn-danger'));

        row.appendChild(nameCell);
        row.appendChild(groupCell);
        row.appendChild(actionCell);
        body.appendChild(row);
      }

      document.getElementById('player-count').textContent = T.player_count(App.club.players.length);
      const empty = document.getElementById('players-empty');
      empty.hidden = visible.length > 0;
      empty.textContent = App.club.players.length ? T.no_matches : T.no_players;
      document.querySelector('#players-table').hidden = visible.length === 0;
    },

    moveGroup: function (index, direction) {
      const target = index + direction;
      if (target < 0 || target >= App.club.groups.length) return;
      const groups = App.club.groups;
      const swap = groups[index];
      groups[index] = groups[target];
      groups[target] = swap;
      for (const player of App.club.players) {
        if (player.group === index) player.group = target;
        else if (player.group === target) player.group = index;
      }
      App.saveClub();
      this.render();
    },

    removeGroup: function (index) {
      if (App.club.groups.length === 1) {
        App.notify(T.min_one_group);
        return;
      }
      for (const player of App.club.players) {
        if (player.group === index) {
          App.notify(T.group_has_players);
          return;
        }
      }
      App.club.groups.splice(index, 1);
      for (const player of App.club.players) {
        if (player.group > index) player.group -= 1;
      }
      App.saveClub();
      this.render();
    },

    removePlayer: function (id) {
      const name = App.name(id);
      if (App.evening && App.evening.attendees.indexOf(id) !== -1) {
        App.evening = Session.unlink(Session.checkOut(App.evening, id), id).evening;
        App.notify(T.player_was_present(name));
      }
      App.club.players = App.club.players.filter(function (p) { return p.id !== id; });
      App.saveClub();
      if (App.evening) App.saveEvening();
      this.renderPlayers();
    },
  };

  window.PlayersScreen = PlayersScreen;

  window.addEventListener('DOMContentLoaded', function () {
    document.getElementById('players-search').addEventListener('input', function () {
      PlayersScreen.renderPlayers();
    });

    document.getElementById('add-group').addEventListener('submit', function (event) {
      event.preventDefault();
      const field = document.getElementById('new-group-name');
      const name = field.value.trim();
      if (!name) return;
      App.club.groups.push(name);
      App.saveClub();
      field.value = '';
      PlayersScreen.render();
    });

    document.getElementById('add-player').addEventListener('submit', function (event) {
      event.preventDefault();
      const field = document.getElementById('new-player-name');
      const name = field.value.trim();
      if (!name) return;
      App.club.players.push({
        id: App.newId(),
        name: name,
        group: Number(document.getElementById('new-player-group').value),
      });
      App.saveClub();
      App.sendState();
      field.value = '';
      PlayersScreen.render();
      field.focus();
    });
  });
})();
