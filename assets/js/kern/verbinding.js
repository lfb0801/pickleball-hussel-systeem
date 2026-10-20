(function () {
  'use strict';

  // De netwerklaag. De laptop is gastheer onder een vaste id die uit de
  // sessiecode volgt, zodat telefoons na een ververste laptop dezelfde
  // gastheer terugvinden. Telefoons krijgen een willekeurige peer-id en
  // stellen zich voor met hun eigen, bewaarde telefoon-id.

  const VOORVOEGSEL = 'pbdb-hussel-';
  const WACHTTIJD_VERBINDEN = 12000;

  function peerId(code) {
    return VOORVOEGSEL + String(code).toLowerCase();
  }

  function bibliotheekAanwezig() {
    return typeof Peer === 'function';
  }

  function gastheer(code, handlers) {
    let peer = null;
    let gestopt = false;
    let herstartTimer = null;
    const verbindingen = {};

    function status(waarde) {
      if (handlers.bijStatus) handlers.bijStatus(waarde);
    }

    function meldTelefoons() {
      if (handlers.bijTelefoons) handlers.bijTelefoons(Object.keys(verbindingen));
    }

    function herstart(wachttijd) {
      if (gestopt) return;
      clearTimeout(herstartTimer);
      if (peer && !peer.destroyed) peer.destroy();
      herstartTimer = setTimeout(start, wachttijd);
    }

    function nieuweVerbinding(conn) {
      conn.on('data', function (data) {
        if (!data || typeof data !== 'object') return;
        if (data.type === 'hallo' && typeof data.telefoon === 'string') {
          const oud = verbindingen[data.telefoon];
          if (oud && oud !== conn) oud.close();
          conn.telefoon = data.telefoon;
          verbindingen[data.telefoon] = conn;
          meldTelefoons();
        }
        if (!conn.telefoon) return;
        handlers.bijBericht(conn.telefoon, data);
      });
      conn.on('close', function () {
        if (conn.telefoon && verbindingen[conn.telefoon] === conn) {
          delete verbindingen[conn.telefoon];
          meldTelefoons();
        }
      });
      conn.on('error', function () {});
    }

    function start() {
      if (gestopt) return;
      if (!bibliotheekAanwezig()) {
        status('niet-ondersteund');
        return;
      }
      status('verbinden');
      peer = new Peer(peerId(code), { debug: 0 });
      peer.on('open', function () { status('online'); });
      peer.on('connection', nieuweVerbinding);
      peer.on('disconnected', function () {
        if (gestopt || peer.destroyed) return;
        status('verbinden');
        setTimeout(function () {
          if (!gestopt && !peer.destroyed && peer.disconnected) peer.reconnect();
        }, 2000);
      });
      peer.on('error', function (fout) {
        if (gestopt) return;
        if (fout.type === 'unavailable-id') {
          // Na een ververste pagina houdt de server de oude id nog even vast.
          status('code-bezet');
          herstart(3000);
        } else if (fout.type === 'browser-incompatible') {
          status('niet-ondersteund');
        } else if (['network', 'server-error', 'socket-error', 'socket-closed'].indexOf(fout.type) !== -1) {
          status('offline');
          herstart(6000);
        }
      });
    }

    start();

    return {
      zend: function (telefoon, bericht) {
        const conn = verbindingen[telefoon];
        if (conn && conn.open) conn.send(bericht);
      },
      zendAlle: function (maakBericht) {
        for (const telefoon of Object.keys(verbindingen)) {
          const conn = verbindingen[telefoon];
          if (conn.open) conn.send(maakBericht(telefoon));
        }
      },
      verbonden: function () { return Object.keys(verbindingen); },
      stop: function () {
        gestopt = true;
        clearTimeout(herstartTimer);
        if (peer && !peer.destroyed) peer.destroy();
      },
    };
  }

  function gast(code, handlers) {
    let peer = null;
    let conn = null;
    let gestopt = false;
    let timer = null;
    let huidigeStatus = '';

    function status(waarde) {
      huidigeStatus = waarde;
      if (handlers.bijStatus) handlers.bijStatus(waarde);
    }

    function later(wachttijd, actie) {
      clearTimeout(timer);
      timer = setTimeout(actie, wachttijd);
    }

    function verbind() {
      if (gestopt) return;
      if (!peer || peer.destroyed) {
        maakPeer();
        return;
      }
      if (!peer.open) return;
      if (conn) {
        const oud = conn;
        conn = null;
        oud.close();
      }
      const nieuw = peer.connect(peerId(code), { reliable: true, serialization: 'json' });
      conn = nieuw;
      if (huidigeStatus !== 'mislukt') status('verbinden');
      later(WACHTTIJD_VERBINDEN, function () {
        if (conn === nieuw && !nieuw.open) {
          status('mislukt');
          verbind();
        }
      });
      nieuw.on('open', function () {
        if (conn !== nieuw) return;
        clearTimeout(timer);
        status('verbonden');
        handlers.bijOpen();
      });
      nieuw.on('data', function (data) {
        if (conn === nieuw && data && typeof data === 'object') handlers.bijBericht(data);
      });
      nieuw.on('close', function () {
        if (conn !== nieuw || gestopt) return;
        conn = null;
        status('kwijt');
        later(3000, verbind);
      });
      nieuw.on('error', function () {});
    }

    function maakPeer() {
      if (!bibliotheekAanwezig()) {
        status('niet-ondersteund');
        return;
      }
      status('verbinden');
      peer = new Peer({ debug: 0 });
      peer.on('open', verbind);
      peer.on('disconnected', function () {
        if (!gestopt && !peer.destroyed) {
          setTimeout(function () {
            if (!gestopt && !peer.destroyed && peer.disconnected) peer.reconnect();
          }, 2000);
        }
      });
      peer.on('error', function (fout) {
        if (gestopt) return;
        if (fout.type === 'peer-unavailable') {
          status('gastheer-weg');
          later(4000, verbind);
        } else if (fout.type === 'browser-incompatible') {
          status('niet-ondersteund');
        } else if (['network', 'server-error', 'socket-error', 'socket-closed'].indexOf(fout.type) !== -1) {
          status('offline');
          if (!peer.destroyed) peer.destroy();
          later(5000, maakPeer);
        }
      });
    }

    maakPeer();

    return {
      zend: function (bericht) {
        if (conn && conn.open) {
          conn.send(bericht);
          return true;
        }
        return false;
      },
      verbonden: function () { return Boolean(conn && conn.open); },
      nuProberen: function () {
        if (conn && conn.open) return;
        clearTimeout(timer);
        verbind();
      },
      stop: function () {
        gestopt = true;
        clearTimeout(timer);
        if (peer && !peer.destroyed) peer.destroy();
      },
    };
  }

  globalThis.Verbinding = {
    gastheer: gastheer,
    gast: gast,
    peerId: peerId,
  };
})();
