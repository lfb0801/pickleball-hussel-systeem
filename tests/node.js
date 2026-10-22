const fs = require('fs');
const path = require('path');
const vm = require('vm');

const filter = process.argv[2] || '';
const results = [];

globalThis.test = function (name, fn) {
  if (filter && name.indexOf(filter) === -1) return;
  try {
    fn();
    results.push({ name: name, passed: true });
  } catch (error) {
    results.push({ name: name, passed: false, error: error.message });
  }
};

globalThis.assert = function (condition, message) {
  if (!condition) throw new Error(message || 'assertion failed');
};

globalThis.assertEqual = function (actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error((message || 'not equal') + ': ' + a + ' !== ' + b);
};

const root = path.join(__dirname, '..');
const files = [
  'assets/js/core/pairing.js',
  'assets/js/core/presets.js',
  'assets/js/core/session.js',
  'assets/js/core/pass.js',
  'assets/js/core/migrate.js',
  'assets/js/core/store.js',
  'tests/tests.js',
  'tests/migrate-tests.js',
  'tests/pass-tests.js',
];
for (const file of files) {
  const fullPath = path.join(root, file);
  (0, eval)(fs.readFileSync(fullPath, 'utf8'));
}

// The other scripts only run in a browser; they must at least parse. A
// service worker that does not parse never installs, and devices then keep
// the old release.
const browserOnly = [
  'sw.js',
  'assets/js/core/i18n.js',
  'assets/js/core/locales/en.js',
  'assets/js/core/locales/nl.js',
  'assets/js/core/network.js',
  'assets/js/core/offline.js',
  'assets/js/laptop/app.js',
  'assets/js/laptop/evening-screen.js',
  'assets/js/laptop/players-screen.js',
  'assets/js/laptop/round-screen.js',
  'assets/js/laptop/scanner.js',
  'assets/js/laptop/side-panel.js',
  'assets/js/phone/player.js',
];
for (const file of browserOnly) {
  test('parses: ' + file, function () {
    new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file });
  });
}

let failed = 0;
for (const result of results) {
  if (result.passed) {
    console.log('ok   ' + result.name);
  } else {
    failed += 1;
    console.log('FAIL ' + result.name + ' — ' + result.error);
  }
}
console.log('');
console.log((results.length - failed) + '/' + results.length + ' passed');
process.exit(failed === 0 ? 0 : 1);
