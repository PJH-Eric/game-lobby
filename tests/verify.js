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
assert.ok(!config.games.some((game) => game.id === 'bubble-battle'));
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

/* 大廳的名字要跟著設定檔走。以前四個地方各寫死一份「遊戲小小島」，
 * 改 config 的 title 不會有任何反應；<title> 上那句「六個可愛小遊戲」
 * 在上架第七款（小朋友下樓梯）之後也數錯了。 */
assert.ok(config.title, 'config 要有 title');
assert.ok(appSource.includes('applyLobbyTitle(config)'), '讀完設定檔要套用標題');
assert.ok(appSource.includes('document.title'), 'applyLobbyTitle 要改分頁標題');
for (const id of ['brand-title', 'brand-link', 'footer-brand', 'page-description']) {
  assert.ok(indexHtml.includes(`id="${id}"`), `index.html 缺少可套用標題的節點：${id}`);
}
/* 備援字串（設定檔還沒讀到前顯示的那一份）不可以寫遊戲數量或列遊戲名字 ——
 * 那兩樣每次上架新遊戲都會過期，這次就是這樣壞的。 */
const head = indexHtml.slice(0, indexHtml.indexOf('</head>'));
assert.ok(!/[一二三四五六七八九十\d]+\s*個(?:可愛)?(?:小)?遊戲/.test(head),
  'index.html 的備援標題不可以寫死遊戲數量（數量由 applyLobbyTitle 從清單數出來）');
assert.deepEqual(config.games.filter((game) => head.includes(game.title)).map((game) => game.title), [],
  'index.html 的備援說明不可以列出遊戲名字');
assert.ok(head.includes(config.title), '備援標題要跟 config 的 title 同名');

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
