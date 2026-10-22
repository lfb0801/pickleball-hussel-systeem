(function () {
  'use strict';

  // The check-in pass: a QR code on the phone that the laptop camera reads,
  // so a player can check in without any internet in the hall. It holds the
  // phone id, the player id (when a laptop has seen this phone before), the
  // name and the level name. It does not depend on the session, so the same
  // pass (or a screenshot of it) works every week.
  //
  // Every field is percent-encoded, so the whole text is plain ASCII: the QR
  // library and the scanner then never disagree about a character set.

  const PREFIX = 'HUSSEL1';
  const SEPARATOR = ':';
  const MAX_LENGTH = 400;

  function field(value) {
    return encodeURIComponent(value === null || value === undefined ? '' : String(value));
  }

  function encode(pass) {
    return [PREFIX, field(pass.phone), field(pass.player), field(pass.name), field(pass.level)].join(SEPARATOR);
  }

  // Returns null for anything that is not a pass, such as the join link on
  // the hall screen held up to the camera.
  function decode(text) {
    if (typeof text !== 'string' || text.length > MAX_LENGTH) return null;
    const parts = text.split(SEPARATOR);
    if (parts.length !== 5 || parts[0] !== PREFIX) return null;
    let values;
    try {
      values = parts.slice(1).map(decodeURIComponent);
    } catch (error) {
      return null;
    }
    if (!values[0]) return null;
    return {
      phone: values[0],
      player: values[1] || null,
      name: values[2] || null,
      level: values[3] || null,
    };
  }

  globalThis.Pass = {
    encode: encode,
    decode: decode,
  };
})();
