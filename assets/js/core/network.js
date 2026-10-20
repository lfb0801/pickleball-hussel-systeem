(function () {
  'use strict';

  // The network layer. The laptop is the host under a fixed id derived from
  // the session code, so phones find the same host again after the laptop
  // reloads. Phones get a random peer id and introduce themselves with their
  // own saved phone id.

  const PREFIX = 'pbdb-hussel-';
  const CONNECT_TIMEOUT = 12000;

  function peerId(code) {
    return PREFIX + String(code).toLowerCase();
  }

  function libraryPresent() {
    return typeof Peer === 'function';
  }

  function host(code, handlers) {
    let peer = null;
    let stopped = false;
    let restartTimer = null;
    const connections = {};

    function status(value) {
      if (handlers.onStatus) handlers.onStatus(value);
    }

    function reportPhones() {
      if (handlers.onPhones) handlers.onPhones(Object.keys(connections));
    }

    function restart(delay) {
      if (stopped) return;
      clearTimeout(restartTimer);
      if (peer && !peer.destroyed) peer.destroy();
      restartTimer = setTimeout(start, delay);
    }

    function newConnection(conn) {
      conn.on('data', function (data) {
        if (!data || typeof data !== 'object') return;
        if (data.type === 'hello' && typeof data.phone === 'string') {
          const old = connections[data.phone];
          if (old && old !== conn) old.close();
          conn.phone = data.phone;
          connections[data.phone] = conn;
          reportPhones();
        }
        if (!conn.phone) return;
        handlers.onMessage(conn.phone, data);
      });
      conn.on('close', function () {
        if (conn.phone && connections[conn.phone] === conn) {
          delete connections[conn.phone];
          reportPhones();
        }
      });
      conn.on('error', function () {});
    }

    function start() {
      if (stopped) return;
      if (!libraryPresent()) {
        status('unsupported');
        return;
      }
      status('connecting');
      peer = new Peer(peerId(code), { debug: 0 });
      peer.on('open', function () { status('online'); });
      peer.on('connection', newConnection);
      peer.on('disconnected', function () {
        if (stopped || peer.destroyed) return;
        status('connecting');
        setTimeout(function () {
          if (!stopped && !peer.destroyed && peer.disconnected) peer.reconnect();
        }, 2000);
      });
      peer.on('error', function (error) {
        if (stopped) return;
        if (error.type === 'unavailable-id') {
          // After a reload the server holds on to the old id for a while.
          status('code-taken');
          restart(3000);
        } else if (error.type === 'browser-incompatible') {
          status('unsupported');
        } else if (['network', 'server-error', 'socket-error', 'socket-closed'].indexOf(error.type) !== -1) {
          status('offline');
          restart(6000);
        }
      });
    }

    start();

    return {
      send: function (phone, message) {
        const conn = connections[phone];
        if (conn && conn.open) conn.send(message);
      },
      broadcast: function (makeMessage) {
        for (const phone of Object.keys(connections)) {
          const conn = connections[phone];
          if (conn.open) conn.send(makeMessage(phone));
        }
      },
      connected: function () { return Object.keys(connections); },
      stop: function () {
        stopped = true;
        clearTimeout(restartTimer);
        if (peer && !peer.destroyed) peer.destroy();
      },
    };
  }

  function guest(code, handlers) {
    let peer = null;
    let conn = null;
    let stopped = false;
    let timer = null;
    let currentStatus = '';

    function status(value) {
      currentStatus = value;
      if (handlers.onStatus) handlers.onStatus(value);
    }

    function later(delay, action) {
      clearTimeout(timer);
      timer = setTimeout(action, delay);
    }

    function connect() {
      if (stopped) return;
      if (!peer || peer.destroyed) {
        createPeer();
        return;
      }
      if (!peer.open) return;
      if (conn) {
        const old = conn;
        conn = null;
        old.close();
      }
      const fresh = peer.connect(peerId(code), { reliable: true, serialization: 'json' });
      conn = fresh;
      if (currentStatus !== 'failed') status('connecting');
      later(CONNECT_TIMEOUT, function () {
        if (conn === fresh && !fresh.open) {
          status('failed');
          connect();
        }
      });
      fresh.on('open', function () {
        if (conn !== fresh) return;
        clearTimeout(timer);
        status('connected');
        handlers.onOpen();
      });
      fresh.on('data', function (data) {
        if (conn === fresh && data && typeof data === 'object') handlers.onMessage(data);
      });
      fresh.on('close', function () {
        if (conn !== fresh || stopped) return;
        conn = null;
        status('lost');
        later(3000, connect);
      });
      fresh.on('error', function () {});
    }

    function createPeer() {
      if (!libraryPresent()) {
        status('unsupported');
        return;
      }
      status('connecting');
      peer = new Peer({ debug: 0 });
      peer.on('open', connect);
      peer.on('disconnected', function () {
        if (!stopped && !peer.destroyed) {
          setTimeout(function () {
            if (!stopped && !peer.destroyed && peer.disconnected) peer.reconnect();
          }, 2000);
        }
      });
      peer.on('error', function (error) {
        if (stopped) return;
        if (error.type === 'peer-unavailable') {
          status('host-gone');
          later(4000, connect);
        } else if (error.type === 'browser-incompatible') {
          status('unsupported');
        } else if (['network', 'server-error', 'socket-error', 'socket-closed'].indexOf(error.type) !== -1) {
          status('offline');
          if (!peer.destroyed) peer.destroy();
          later(5000, createPeer);
        }
      });
    }

    createPeer();

    return {
      send: function (message) {
        if (conn && conn.open) {
          conn.send(message);
          return true;
        }
        return false;
      },
      connected: function () { return Boolean(conn && conn.open); },
      retryNow: function () {
        if (conn && conn.open) return;
        clearTimeout(timer);
        connect();
      },
      stop: function () {
        stopped = true;
        clearTimeout(timer);
        if (peer && !peer.destroyed) peer.destroy();
      },
    };
  }

  globalThis.Network = {
    host: host,
    guest: guest,
    peerId: peerId,
  };
})();
