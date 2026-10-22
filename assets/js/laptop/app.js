(function () {
  'use strict';

  const App = {
    club: { groups: T.default_groups.slice(), players: [], preset: Presets.DEFAULT },
    // False until the club is loaded or saved: only then are the group
    // names user data. Until that moment they follow the language.
    clubSaved: false,
    evening: null,
    currentScreen: null,
    network: null,
    networkStatus: '',
    connectedPhones: [],
    wakeLock: null,
    toastTimer: null,

    saveClub: function () {
      Store.saveClub(this.club);
      this.clubSaved = true;
    },

    // Every change to the evening goes through here, so phones always see
    // the same state as the laptop.
    saveEvening: function () {
      if (this.evening) this.evening.updatedAt = Date.now();
      if (this.evening) Store.saveEvening(this.evening);
      else Store.clearEvening();
      this.sendState();
    },

    setEvening: function (newEvening) {
      this.evening = newEvening;
      this.saveEvening();
    },

    playerById: function (id) {
      for (const player of this.club.players) {
        if (player.id === id) return player;
      }
      return null;
    },

    name: function (id) {
      const player = this.playerById(id);
      return player ? player.name : '?';
    },

    weights: function () {
      return Presets.weights(this.club.preset);
    },

    // Once the evening is running, the round screen is the only screen; all
    // management lives in the side panel.
    showScreen: function (name) {
      if (this.evening) name = 'round';
      else if (name === 'round') name = 'evening';
      this.currentScreen = name;
      document.body.classList.toggle('evening-running', Boolean(this.evening));
      if (!this.evening && window.SidePanel) SidePanel.close();
      for (const section of document.querySelectorAll('main > section')) {
        section.hidden = section.id !== 'screen-' + name;
      }
      for (const button of document.querySelectorAll('nav button')) {
        button.classList.toggle('active', button.dataset.screen === name);
      }
      this.renderCurrent();
    },

    renderCurrent: function () {
      const screens = {
        players: window.PlayersScreen,
        evening: window.EveningScreen,
        round: window.RoundScreen,
      };
      const screen = screens[this.currentScreen];
      if (screen && screen.render) screen.render();
      if (window.SidePanel) SidePanel.render();
      this.renderPhoneStatus();
    },

    // Only for a real problem that stays, such as storage that does not
    // work. Stays until the organiser dismisses it.
    warn: function (text) {
      document.getElementById('notice-text').textContent = text || '';
      document.getElementById('notice').hidden = !text;
    },

    // Ordinary messages appear briefly at the bottom and push nothing aside.
    notify: function (text) {
      const toast = document.getElementById('toast');
      clearTimeout(this.toastTimer);
      toast.textContent = text || '';
      toast.hidden = !text;
      if (text) this.toastTimer = setTimeout(function () { toast.hidden = true; }, 4000);
    },

    endEvening: function () {
      this.stopSession();
      if (window.Scanner) Scanner.stop();
      this.evening = null;
      Store.clearEvening();
      if (window.RoundScreen) {
        RoundScreen.drawnCode = null;
        RoundScreen.drawnLobbyCode = null;
      }
      if (window.SidePanel) SidePanel.close();
      this.showScreen('evening');
    },

    askAboutForgottenEvening: function () {
      const app = this;
      const date = typeof this.evening.updatedAt === 'number'
        ? new Date(this.evening.updatedAt).toLocaleDateString(I18n.locale(), { weekday: 'long', day: 'numeric', month: 'long' })
        : null;
      this.confirm(T.forgotten_evening(date), T.new_evening, function () {
        app.endEvening();
      }, false, T.continue, function () {
        app.saveEvening();
      });
    },

    // Our own confirmation instead of window.confirm: that does not appear
    // in every browser (in an embedded browser it answers 'no' at once).
    confirm: function (text, yesText, action, dangerous, noText, noAction) {
      const dialog = document.getElementById('confirm');
      document.getElementById('confirm-text').textContent = text;
      const yes = document.getElementById('confirm-yes');
      yes.textContent = yesText;
      yes.className = 'btn ' + (dangerous ? 'btn-danger-solid' : 'btn-primary');
      document.getElementById('confirm-no').textContent = noText || T.cancel;
      this.confirmAction = action;
      this.confirmNoAction = noAction || null;
      dialog.showModal();
      yes.focus();
    },

    renderPresets: function (container) {
      container.textContent = '';
      for (const preset of Presets.list) {
        const text = T.presets[preset.key];
        const label = document.createElement('label');
        label.className = 'preset';
        const choice = document.createElement('input');
        choice.type = 'radio';
        choice.name = container.id + '-preset';
        choice.value = preset.key;
        choice.checked = App.club.preset === preset.key;
        choice.addEventListener('change', function () {
          App.club.preset = preset.key;
          App.saveClub();
        });
        const description = document.createElement('span');
        const name = document.createElement('strong');
        name.textContent = text.name;
        const help = document.createElement('small');
        help.textContent = text.help;
        description.appendChild(name);
        description.appendChild(help);
        label.appendChild(choice);
        label.appendChild(description);
        container.appendChild(label);
      }
    },

    newId: function () {
      return 's' + Date.now().toString(36) + Math.floor(Math.random() * 1000000).toString(36);
    },

    // Everything switches live, without a reload. Fixed texts come from
    // I18n.apply; what is built in code is rebuilt by rendering again.
    applyLanguage: function () {
      I18n.apply(document);
      if (!this.clubSaved) this.club.groups = T.default_groups.slice();
      if (window.RoundScreen) RoundScreen.clearMode();
      if (!document.getElementById('notice').hidden && !Store.available()) this.warn(T.storage_unavailable);
      this.renderCurrent();
    },

    // ---- Live session with phones ----

    joinLink: function () {
      if (!this.evening) return '';
      return new URL('../?session=' + this.evening.sessionCode, location.href).href;
    },

    isLocal: function () {
      return location.protocol === 'file:';
    },

    drawQr: function (container, text) {
      container.textContent = '';
      if (typeof qrcode !== 'function' || !text) return;
      const qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      container.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    },

    startSession: function () {
      if (!this.evening || this.network) return;
      const app = this;
      this.network = Network.host(this.evening.sessionCode, {
        onMessage: function (phone, msg) { app.handlePhone(phone, msg); },
        onStatus: function (status) {
          app.networkStatus = status;
          app.renderPhoneStatus();
          if (window.SidePanel) SidePanel.renderConnection();
        },
        onPhones: function (list) {
          app.connectedPhones = list;
          app.renderCurrent();
        },
      });
      this.keepScreenOn();
    },

    stopSession: function () {
      if (!this.network) return;
      const network = this.network;
      network.broadcast(function () { return { type: 'state', eveningRunning: false }; });
      this.network = null;
      this.connectedPhones = [];
      this.networkStatus = '';
      setTimeout(function () { network.stop(); }, 800);
      this.releaseScreen();
      this.renderPhoneStatus();
    },

    sendState: function () {
      if (!this.network) return;
      const app = this;
      this.network.broadcast(function (phone) {
        return Session.stateFor(app.evening, app.club, phone);
      });
    },

    handlePhone: function (phone, msg) {
      if (!this.evening) {
        this.network.send(phone, { type: 'state', eveningRunning: false });
        return;
      }
      const request = Object.assign({}, msg, { phone: phone });
      const eveningBefore = JSON.stringify(this.evening);
      const presentBefore = this.evening.attendees.length;
      const result = Session.applyRequest(this.evening, this.club, request, this.newId(), this.weights());
      this.evening = result.evening;
      if (result.club !== this.club) {
        this.club = result.club;
        this.saveClub();
      }
      if (result.reply) {
        this.network.send(phone, { type: 'reply', error: result.reply.error });
      }
      if (JSON.stringify(this.evening) !== eveningBefore) {
        this.saveEvening();
        this.notifyRequest(request, this.evening.attendees.length - presentBefore);
        this.notifySubstitutions(result.substitutions);
        this.refreshDraft();
        this.renderCurrent();
      } else {
        this.network.send(phone, Session.stateFor(this.evening, this.club, phone));
      }
    },

    // A check-in pass read by the camera: the same rules as a phone that
    // taps its name, without any network. Returns the outcome so the
    // scanner can announce the player; that notice replaces the toast.
    scanPass: function (pass, group) {
      if (!this.evening) return null;
      const eveningBefore = JSON.stringify(this.evening);
      const result = Session.scanPass(this.evening, this.club, pass, this.newId(), group);
      this.evening = result.evening;
      if (result.club !== this.club) {
        this.club = result.club;
        this.saveClub();
      }
      if (JSON.stringify(this.evening) !== eveningBefore) {
        this.saveEvening();
        this.refreshDraft();
        this.renderCurrent();
      }
      return result;
    },

    // Newcomers belong in the next round straight away: an open draft is
    // redrawn, unless someone already swapped in it by hand.
    refreshDraft: function () {
      if (!this.evening || !Session.shouldRefreshDraft(this.evening)) return;
      const names = Session.newcomersOutsideDraft(this.evening).map(this.name.bind(this));
      const result = Session.createDraft(this.evening, this.club, { weights: this.weights() });
      if (result.error) return;
      if (window.RoundScreen) RoundScreen.selected = null;
      this.setEvening(result.evening);
      this.notify(T.draft_updated(names));
    },

    // The mode may change during the evening. An open draft without manual
    // swaps is redrawn straight away with the new mode.
    changeMode: function (key) {
      this.club.preset = Presets.get(key).key;
      this.saveClub();
      const name = T.presets[this.club.preset].name;
      if (this.evening && this.evening.draft && !this.evening.draft.manual) {
        const result = Session.createDraft(this.evening, this.club, { weights: this.weights() });
        if (!result.error) {
          if (window.RoundScreen) RoundScreen.selected = null;
          this.setEvening(result.evening);
          this.notify(T.mode_draft(name));
          return;
        }
      }
      this.notify(T.mode_changed(name));
    },

    // Players type their own name; the organiser can fix a typo. Returns
    // false when the name is empty or already exists.
    rename: function (id, name) {
      const clean = Session.cleanName(name);
      if (!clean || Session.nameExists(this.club, clean, id)) {
        this.notify(clean ? T.name_exists(clean) : T.name_empty);
        return false;
      }
      const player = this.playerById(id);
      if (!player) return false;
      player.name = clean;
      this.saveClub();
      this.sendState();
      return true;
    },

    // Another level changes the court layout. If the player is on a court
    // in the open draft, it is redrawn, unless someone already swapped in
    // it by hand.
    changeLevel: function (id, group) {
      this.club = Session.setLevel(this.club, id, group);
      this.saveClub();
      const name = this.name(id);
      const level = this.club.groups[group];
      if (!this.evening || !Session.isOnCourtInDraft(this.evening, id)) {
        this.sendState();
        if (this.evening) this.notify(T.level_changed(name, level));
        return;
      }
      if (this.evening.draft.manual) {
        this.setEvening(Session.markStale(this.evening, id, 'level'));
        this.notify(T.level_changed(name, level));
        return;
      }
      const result = Session.createDraft(this.evening, this.club, { weights: this.weights() });
      if (result.error) return;
      if (window.RoundScreen) RoundScreen.selected = null;
      this.setEvening(result.evening);
      this.notify(T.level_draft(name, level));
    },

    notifySubstitutions: function (substitutions) {
      if (!substitutions || !substitutions.length) return;
      const app = this;
      this.notify(substitutions.map(function (sub) {
        return T.substitute(app.name(sub.out), sub.in ? app.name(sub.in) : null, sub.court, sub.where);
      }).join(' '));
    },

    // Pause or going home from the laptop: the same rules as from a phone,
    // with a substitute where needed.
    pause: function (id, on, now) {
      const outcome = Session.pause(this.evening, this.club, id, on, now, this.weights());
      this.setEvening(outcome.evening);
      this.notifySubstitutions(outcome.substitutions);
    },

    sendHome: function (id) {
      const outcome = Session.leave(this.evening, this.club, id, this.weights());
      this.setEvening(outcome.evening);
      if (outcome.substitutions.length) this.notifySubstitutions(outcome.substitutions);
      else this.notify(T.no_longer_playing(this.name(id)));
    },

    notifyRequest: function (request, joined) {
      const id = this.evening.links[request.phone];
      const player = id ? this.playerById(id) : null;
      if (!player) return;
      if (request.type === 'leave') this.notify(T.no_longer_playing(player.name));
      else if (request.type === 'pause' && request.on) this.notify(T.pausing_notice(player.name, request.now === true));
      else if (request.type === 'register') this.notify(T.new_signup(player.name, this.club.groups[player.group]));
      else if (joined > 0) this.notify(T.joins(player.name));
    },

    unlink: function (playerId) {
      const result = Session.unlink(this.evening, playerId);
      this.evening = result.evening;
      if (result.phone && this.network) {
        this.network.send(result.phone, { type: 'unlinked' });
      }
      this.saveEvening();
      this.notify(T.unlinked_notice(this.name(playerId)));
    },

    // Per player: 'connected' when a phone is connected, 'linked' when a
    // phone belongs to them that is not connected right now, else null.
    phoneOf: function (playerId) {
      if (!this.evening) return null;
      const phone = Session.phoneOf(this.evening, playerId);
      if (!phone) return null;
      return this.connectedPhones.indexOf(phone) !== -1 ? 'connected' : 'linked';
    },

    renderPhoneStatus: function () {
      const pill = document.getElementById('phone-status');
      if (!this.evening || !this.network) {
        pill.hidden = true;
        return;
      }
      pill.hidden = false;
      const online = this.networkStatus === 'online';
      pill.innerHTML = '';
      const dot = document.createElement('span');
      dot.className = 'dot ' + (online ? 'on' : 'off');
      pill.appendChild(dot);
      pill.appendChild(document.createTextNode(online
        ? T.connected_count(this.connectedPhones.length)
        : (T.connection_status[this.networkStatus] || '').split(' — ')[0]));
    },

    // The screen in the hall must not lock during an evening.
    keepScreenOn: function () {
      const app = this;
      if (!('wakeLock' in navigator) || this.wakeLock) return;
      navigator.wakeLock.request('screen').then(function (lock) {
        app.wakeLock = lock;
        lock.addEventListener('release', function () { app.wakeLock = null; });
      }).catch(function () {});
    },

    releaseScreen: function () {
      if (this.wakeLock) this.wakeLock.release();
      this.wakeLock = null;
    },

    start: function () {
      // The player list has to stay for months; ask the browser not to
      // clear it when space is needed.
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});

      const savedClub = Store.loadClub();
      if (savedClub && savedClub.groups && savedClub.players) {
        this.club = savedClub;
        this.clubSaved = true;
        if (!this.club.preset) this.club.preset = Presets.DEFAULT;
      }
      const savedEvening = Store.loadEvening();
      this.evening = savedEvening ? Session.fillIn(savedEvening) : null;

      I18n.apply(document);
      I18n.renderSwitcher(document.getElementById('language-switch'));
      I18n.onChange(function () { App.applyLanguage(); });

      if (!Store.available()) this.warn(T.storage_unavailable);

      for (const button of document.querySelectorAll('nav button')) {
        button.addEventListener('click', function () {
          App.showScreen(button.dataset.screen);
        });
      }

      document.getElementById('notice-close').addEventListener('click', function () { App.warn(''); });
      document.getElementById('confirm-no').addEventListener('click', function () {
        document.getElementById('confirm').close();
      });
      // Closing without 'yes' (Escape too) runs the no action.
      document.getElementById('confirm').addEventListener('close', function () {
        const action = App.confirmNoAction;
        App.confirmNoAction = null;
        if (action && App.confirmAction) {
          App.confirmAction = null;
          action();
        }
      });
      document.getElementById('confirm-yes').addEventListener('click', function () {
        const action = App.confirmAction;
        App.confirmAction = null;
        App.confirmNoAction = null;
        document.getElementById('confirm').close();
        if (action) action();
      });

      document.getElementById('fullscreen').addEventListener('click', function () {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
      });

      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && App.evening) App.keepScreenOn();
      });

      if (this.evening) this.startSession();

      this.showScreen(this.evening ? 'round' : 'evening');
      if (Session.isForgotten(this.evening, Date.now())) this.askAboutForgottenEvening();
    },
  };

  window.App = App;
  window.addEventListener('DOMContentLoaded', function () { App.start(); });
})();
