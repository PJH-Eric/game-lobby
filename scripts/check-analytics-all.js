'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const games = require('../config/games.json').games;
/* 3D貪吃蛇是 Vite 建置（client/index.html、沒有 seo.config.json），GA4 由自己的 client 單元測試驗證 */
function runSnakeAnalytics(repo) {
  const client = path.join(repo, 'client');
  return spawnSync(process.execPath, [path.join(client, 'node_modules', 'vitest', 'vitest.mjs'), 'run', 'tests/analytics.test.js'], { cwd: client, encoding: 'utf8' });
}
function runIceDuelAnalytics(repo) {
  return spawnSync(process.execPath, [path.join(repo, 'node_modules', 'vitest', 'vitest.mjs'), 'run', 'tests/analytics.test.ts'], { cwd: repo, encoding: 'utf8' });
}
function runDominoAnalytics(repo) {
  return spawnSync(process.execPath, [path.join(repo, 'node_modules', 'vitest', 'vitest.mjs'), 'run'], { cwd: repo, encoding: 'utf8' });
}
let failed = false;
for (const game of [{ id: 'lobby', repo: root }, ...games.map(game => ({ id: game.id, repo: path.resolve(root, '..', game.projectFolder) }))]) {
  if (game.id === 'curling-duel') {
    const result = runIceDuelAnalytics(game.repo);
    if (result.status !== 0) { failed = true; console.error(game.id, result.stdout, result.stderr); }
    else console.log('✓ GA4 ' + game.id);
    const config = JSON.parse(fs.readFileSync(path.join(game.repo, 'seo.config.json'), 'utf8'));
    if (config.id !== game.id) { failed = true; console.error(game.id + ' GA game_id 與大廳 ID 不一致'); }
    continue;
  }
  if (game.id === 'snake-3d') {
    const result = runSnakeAnalytics(game.repo);
    if (result.status !== 0) { failed = true; console.error(game.id, result.stdout, result.stderr); }
    else console.log('✓ GA4 ' + game.id);
    if (!fs.readFileSync(path.join(game.repo, 'client', 'index.html'), 'utf8').includes('"game_id":"' + game.id + '"')) { failed = true; console.error(game.id + ' GA game_id 與大廳 ID 不一致'); }
    continue;
  }
  if (game.id === 'domino-push') {
    const result = runDominoAnalytics(game.repo);
    if (result.status !== 0) { failed = true; console.error(game.id, result.stdout, result.stderr); }
    else console.log('✓ GA4 ' + game.id);
    const config = JSON.parse(fs.readFileSync(path.join(game.repo, 'seo.config.json'), 'utf8'));
    const source = fs.readFileSync(path.join(game.repo, 'src', 'analytics.ts'), 'utf8');
    if (config.id !== game.id || !source.includes('game_id: gameId')) { failed = true; console.error(game.id + ' GA game_id 與大廳 ID 不一致'); }
    continue;
  }
  const analyticsConfigPath = path.join(game.repo, 'seo.config.json');
  const analyticsConfig = game.id === 'lobby'
    ? null
    : JSON.parse(fs.readFileSync(analyticsConfigPath, 'utf8'));
  if (analyticsConfig && analyticsConfig.id !== game.id) {
    failed = true;
    console.error(game.id + ' GA game_id 與大廳 ID 不一致');
  }
  if (game.id !== 'lobby' && !fs.existsSync(path.join(game.repo, 'tests', 'analytics.js'))) {
    const html = fs.readFileSync(path.join(game.repo, 'public', 'index.html'), 'utf8');
    const analyticsSource = fs.readFileSync(path.join(game.repo, 'public', 'js', 'analytics.js'), 'utf8');
    const injectorFiles = ['scripts/inject-seo.js', 'scripts/inject-seo.mjs', 'scripts/inject-seo.cjs'];
    const injector = injectorFiles.map((file) => path.join(game.repo, file)).find((file) => fs.existsSync(file));
    const injectsMatchingGameId = injector && fs.readFileSync(injector, 'utf8').includes('game_id: cfg.id');
    if ((!html.includes('"game_id":"' + game.id + '"') && !injectsMatchingGameId) || !html.includes('analytics.js')) {
      failed = true;
      console.error(game.id + ' 缺少正確的 GA game_id 設定或追蹤入口');
    }
    if (!analyticsSource.includes('game_id: config.game_id')) {
      failed = true;
      console.error(game.id + ' 事件未帶上 GA game_id');
    }
    console.log('✓ GA4 ' + game.id);
    continue;
  }
  const result = spawnSync(process.execPath, ['tests/analytics.js'], { cwd: game.repo, encoding: 'utf8' });
  if (result.status !== 0) { failed = true; console.error(game.id, result.stdout, result.stderr); }
  else console.log('✓ GA4 ' + game.id);
  const html = fs.readFileSync(path.join(game.repo, game.id === 'lobby' ? 'index.html' : 'public/index.html'), 'utf8');
  if (!html.includes('analytics.js')) { failed = true; console.error(game.id + ' 缺少追蹤程式入口'); }
}
process.exitCode = failed ? 1 : 0;
