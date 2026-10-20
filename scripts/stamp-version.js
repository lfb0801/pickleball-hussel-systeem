// Appends a version to every local script and stylesheet in the HTML, so a
// browser never mixes old and new files after a release. GitHub Pages lets
// browsers cache files for ten minutes.
//
// Usage: npm run stamp   (before every commit you are going to push)
const fs = require('fs');
const path = require('path');

const version = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const root = path.join(__dirname, '..');
const pages = ['index.html', 'player.html', 'tests/index.html'];
const localFile = /((?:src|href)=")([a-z0-9./-]+\.(?:js|css))(?:\?v=[0-9]+)?(")/g;

for (const page of pages) {
  const file = path.join(root, page);
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(localFile, function (_, start, name, end) {
    return start + name + '?v=' + version + end;
  });
  fs.writeFileSync(file, after);
}
console.log('version ' + version);
