'use strict';

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const games = JSON.parse(fs.readFileSync(path.join(root, 'config/games.json'), 'utf8')).games;
const files = [['inject-seo.js', 'scripts/inject-seo.js'], ['analytics.js', 'public/js/analytics.js'], ['seo-test.js', 'tests/seo.js']];
let failed = false;
for (const game of games) {
  const repo = path.resolve(root, '..', game.projectFolder);
  for (const [source, dest] of files) {
    const expected = fs.readFileSync(path.join(__dirname, 'seo', source), 'utf8');
    const target = path.join(repo, dest);
    if (process.argv.includes('--write')) fs.writeFileSync(target, expected, 'utf8');
    else if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== expected) {
      console.error('共用檔案不同步：' + game.id + '/' + dest);
      failed = true;
    }
  }
}
process.exitCode = failed ? 1 : 0;
if (!failed) console.log('✓ ' + games.length + ' 款遊戲 SEO 共用檔案一致');
