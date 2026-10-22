(function () {
  'use strict';

  // Keeps a copy of the app on this device (see sw.js), so the page opens
  // in the hall without internet once it has been opened before. A local
  // file cannot have one; the app then simply works as before.

  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(function () {});
  });
})();
