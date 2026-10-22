(function () {
  'use strict';

  // Keeps a copy of the app on this device (see sw.js), so the page opens
  // in the hall without internet once it has been opened before. A local
  // file cannot have one; the app then simply works as before.

  const script = document.currentScript;
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;

  // A page that came from an older copy reloads once the new release has
  // taken over, so nobody keeps looking at the old version until the next
  // visit. The evening is saved on the device and the host keeps its id, so
  // a reload loses nothing. The very first install has no older copy.
  if (navigator.serviceWorker.controller) {
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloading) return;
      reloading = true;
      location.reload();
    });
  }

  window.addEventListener('load', function () {
    navigator.serviceWorker.register(new URL('../../../sw.js', script.src).href, { updateViaCache: 'none' }).catch(function () {});
  });
})();
