const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'config', 'games.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

assert.equal(config.version, 1);
assert.equal(config.games.length, 7);
assert.equal(new Set(config.games.map((game) => game.id)).size, 7);
assert.ok(!config.games.some((game) => game.id === 'little-supermarket'));
for (const game of config.games) {
  assert.ok(game.title && game.description && game.icon && game.launchUrl);
  assert.match(game.launchUrl, /^https?:\/\//);
  assert.match(game.presenceUrl, /^https?:\/\/[^/]+\/api\/presence$/);
  assert.ok(Array.isArray(game.tags) && game.tags.length > 0);
}
for (const file of ['index.html', 'styles.css', 'app.js', 'server.js']) {
  assert.ok(fs.existsSync(path.join(root, file)), `${file} should exist`);
}

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
assert.ok(!indexHtml.includes('target="_blank"'), '遊戲入口不應開啟新分頁');
assert.ok(!appSource.includes('window.open('), '遊戲卡片不應另外開啟新分頁');

const port = 3187;
const child = spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'] });

function request(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body, type: response.headers['content-type'] || '' }));
    });
    request.on('error', reject);
  });
}

(async () => {
  try {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try { await request(`http://127.0.0.1:${port}/health`); break; } catch { await new Promise((resolve) => setTimeout(resolve, 50)); }
    }
    const health = await request(`http://127.0.0.1:${port}/health`);
    assert.equal(health.status, 200);
    assert.equal(JSON.parse(health.body).service, 'game-lobby');
    const home = await request(`http://127.0.0.1:${port}/`);
    assert.equal(home.status, 200);
    assert.match(home.body, /遊戲小小島/);
    const servedConfig = await request(`http://127.0.0.1:${port}/config/games.json`);
    assert.equal(servedConfig.status, 200);
    assert.equal(JSON.parse(servedConfig.body).games.length, 7);
    const missing = await request(`http://127.0.0.1:${port}/missing-file.txt`);
    assert.equal(missing.status, 404);
    console.log('game-lobby verify passed');
  } finally {
    child.kill();
  }
})().catch((error) => { console.error(error); child.kill(); process.exitCode = 1; });
