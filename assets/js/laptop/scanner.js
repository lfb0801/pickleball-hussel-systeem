(function () {
  'use strict';

  // The laptop camera reads check-in passes, so players can check in
  // without any internet in the hall. Once switched on it keeps scanning as
  // long as the evening runs; the choice is remembered on this laptop, so
  // after a reload it starts by itself. The camera picture is not shown on
  // the hall screen; every scan is announced with a notice at the top.

  const STORAGE_KEY = 'hussel.camera';
  const SCAN_EVERY = 250;
  // A pass held still in front of the camera is read many times a second:
  // the same pass only counts again after this long.
  const REPEAT_AFTER = 8000;
  const SCAN_WIDTH = 640;
  const NOTICE_FOR = 4000;

  function $(id) { return document.getElementById(id); }

  function storedChoice() {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'on';
    } catch (error) {
      return false;
    }
  }

  function storeChoice(on) {
    try {
      localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
    } catch (error) { /* then the camera has to be switched on again next time */ }
  }

  const Scanner = {
    wanted: storedChoice(),
    stream: null,
    starting: false,
    problem: null,
    timer: null,
    canvas: null,
    lastText: null,
    lastAt: 0,
    // The pass of a new player who is choosing a level in the dialog.
    asking: null,
    audio: null,
    noticeTimer: null,

    supported: function () {
      return Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && typeof jsQR === 'function';
    },

    // The camera switch sits in the lobby before the first round and next
    // to the courts after it; the round screen says where.
    mount: function (slotId) {
      const scanner = $('scanner');
      const slot = $(slotId);
      if (slot && scanner.parentNode !== slot) slot.appendChild(scanner);
      if (this.wanted && !this.problem) this.start();
      this.render();
    },

    render: function () {
      $('scanner-on').hidden = !this.stream;
      $('scanner-message').hidden = !this.problem;
      $('scanner-message').textContent = this.problem || '';
      const toggle = $('scanner-toggle');
      toggle.textContent = this.wanted ? T.camera_off : T.camera_on;
      toggle.className = 'btn btn-small' + (this.wanted ? '' : ' btn-primary');
    },

    switchTo: function (on) {
      this.wanted = on;
      this.problem = null;
      storeChoice(on);
      if (on) {
        this.unlockSound();
        this.start();
      } else {
        this.stop();
      }
      this.render();
    },

    start: function () {
      if (this.stream || this.starting) return;
      if (!this.supported()) {
        this.problem = T.camera_unsupported;
        this.render();
        return;
      }
      const scanner = this;
      this.starting = true;
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      }).then(function (stream) {
        scanner.starting = false;
        if (!scanner.wanted || !App.evening) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        scanner.stream = stream;
        const video = $('scanner-video');
        video.srcObject = stream;
        video.play().catch(function () {});
        scanner.scanLater();
        scanner.render();
      }).catch(function (error) {
        scanner.starting = false;
        scanner.problem = error && error.name === 'NotAllowedError' ? T.camera_denied : T.camera_failed;
        scanner.render();
      });
    },

    // When the evening ends the camera goes off, but the choice stays for
    // the next evening.
    stop: function () {
      clearTimeout(this.timer);
      if (this.stream) {
        for (const track of this.stream.getTracks()) track.stop();
      }
      this.stream = null;
      $('scanner-video').srcObject = null;
      this.render();
    },

    scanLater: function () {
      const scanner = this;
      clearTimeout(this.timer);
      this.timer = setTimeout(function () {
        if (!scanner.stream) return;
        scanner.scan();
        scanner.scanLater();
      }, SCAN_EVERY);
    },

    scan: function () {
      const video = $('scanner-video');
      if (video.readyState < 2 || !video.videoWidth) return;
      const width = Math.min(SCAN_WIDTH, video.videoWidth);
      const height = Math.round(video.videoHeight * width / video.videoWidth);
      if (!this.canvas) this.canvas = document.createElement('canvas');
      this.canvas.width = width;
      this.canvas.height = height;
      const context = this.canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(video, 0, 0, width, height);
      const image = context.getImageData(0, 0, width, height);
      const code = jsQR(image.data, width, height, { inversionAttempts: 'dontInvert' });
      if (code && code.data) this.read(code.data);
    },

    read: function (text) {
      const now = Date.now();
      if (text === this.lastText && now - this.lastAt < REPEAT_AFTER) return;
      this.lastText = text;
      this.lastAt = now;
      // Anything else, such as the join link on the hall screen, is ignored.
      const pass = Pass.decode(text);
      if (!pass || this.asking || !App.evening) return;
      this.handle(App.scanPass(pass), pass);
    },

    handle: function (result, pass) {
      if (!result) return;
      if (result.outcome === 'needs-level') {
        this.askLevel(pass);
        return;
      }
      if (result.outcome === 'error') {
        this.showNotice(T.phone_errors[result.error] || result.error, 'error');
        return;
      }
      const name = App.name(result.player);
      if (result.outcome === 'already-here') this.showNotice(T.scan_already(name), 'again');
      else if (result.outcome === 'registered') this.showNotice(T.scan_registered(name), 'ok');
      else this.showNotice(T.scan_welcome(name), 'ok');
    },

    // A player no laptop has seen before chooses a level themselves, right
    // here at the laptop.
    askLevel: function (pass) {
      const scanner = this;
      this.asking = pass;
      $('scan-level-text').textContent = T.scan_level(Session.cleanName(pass.name));
      const choice = $('scan-level-choice');
      choice.textContent = '';
      App.club.groups.forEach(function (group, index) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-large';
        button.textContent = group;
        button.addEventListener('click', function () {
          const waiting = scanner.asking;
          $('scan-level').close();
          if (waiting) scanner.handle(App.scanPass(waiting, index), waiting);
        });
        choice.appendChild(button);
      });
      this.beep(660);
      $('scan-level').showModal();
    },

    showNotice: function (text, kind) {
      const element = $('scan-notice');
      element.textContent = text;
      // Restart the animation when a second player follows straight away.
      element.className = 'scan-notice';
      void element.offsetWidth;
      element.className = 'scan-notice ' + kind;
      element.hidden = false;
      clearTimeout(this.noticeTimer);
      this.noticeTimer = setTimeout(function () { element.hidden = true; }, NOTICE_FOR);
      this.beep(kind === 'ok' ? 880 : kind === 'again' ? 660 : 220);
    },

    // Browsers only allow sound after a click on the page, so the sound is
    // unlocked on the first click after a reload.
    unlockSound: function () {
      try {
        if (!this.audio) this.audio = new (window.AudioContext || window.webkitAudioContext)();
        if (this.audio.state === 'suspended') this.audio.resume();
      } catch (error) {
        this.audio = null;
      }
    },

    beep: function (frequency) {
      if (!this.audio || this.audio.state !== 'running') return;
      const oscillator = this.audio.createOscillator();
      const gain = this.audio.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.2, this.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audio.currentTime + 0.25);
      oscillator.connect(gain);
      gain.connect(this.audio.destination);
      oscillator.start();
      oscillator.stop(this.audio.currentTime + 0.25);
    },
  };

  window.Scanner = Scanner;

  window.addEventListener('DOMContentLoaded', function () {
    $('scanner-toggle').addEventListener('click', function () {
      Scanner.switchTo(!Scanner.wanted);
    });
    $('scan-level-cancel').addEventListener('click', function () {
      $('scan-level').close();
    });
    // Closing in any way (Escape too) ends the question. The same pass is
    // only read again after a while, so it does not pop up straight away.
    $('scan-level').addEventListener('close', function () {
      Scanner.asking = null;
      Scanner.lastAt = Date.now();
    });
    document.addEventListener('pointerdown', function () {
      if (Scanner.wanted) Scanner.unlockSound();
    });
  });
})();
