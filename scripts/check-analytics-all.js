'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const games = require('../config/games.json').games;
let failed = false;
for (const game of [{ id: 'lobby', repo: root }, ...games.map(game => ({ id: game.id, repo: path.resolve(root, '..', game.projectFolder) }))]) {
  const result = spawnSync(process.execPath, ['tests/analytics.js'], { cwd: game.repo, encoding: 'utf8' });
  if (result.status !== 0) { failed = true; console.error(game.id, result.stdout, result.stderr); }
  else console.log('✓ GA4 ' + game.id);
  const html = fs.readFileSync(path.join(game.repo, game.id === 'lobby' ? 'index.html' : 'public/index.html'), 'utf8');
  if (!html.includes('analytics.js')) { failed = true; console.error(game.id + ' 缺少追蹤程式入口'); }
}
process.exitCode = failed ? 1 : 0;
