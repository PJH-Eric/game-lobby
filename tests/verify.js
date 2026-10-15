const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { createReportRequest, getTotalUsers } = require('../scripts/update-ga-visitor-count');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'config', 'games.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

assert.equal(config.version, 1);
assert.equal(config.games.length, 15);
assert.equal(new Set(config.games.map((game) => game.id)).size, config.games.length);
assert.ok(config.games.some((game) => game.id === config.featuredGameId));
assert.ok(!config.games.some((game) => game.id === 'chinese-checkers'), '大廳不列出跳棋小島');
const drawGuess = config.games.find((game) => game.id === 'draw-guess');
assert.ok(drawGuess, '清單要包含你畫我猜');
assert.equal(drawGuess.launchUrl, 'https://pjh-eric.github.io/draw-guess/');
assert.equal(drawGuess.presenceUrl, 'https://draw-guess-sg.onrender.com/api/presence');
assert.equal(drawGuess.icon, 'drawguess');
const bombSquad = config.games.find((game) => game.id === 'bomb-squad');
assert.ok(bombSquad, '清單要包含炸彈小隊');
assert.equal(bombSquad.launchUrl, 'https://pjh-eric.github.io/bomb-squad/');
assert.equal(bombSquad.presenceUrl, 'https://bomb-squad-sg.onrender.com/api/presence');
assert.equal(bombSquad.icon, 'bomb');
const rainbowBubble = config.games.find((game) => game.id === 'rainbow-bubble');
assert.ok(rainbowBubble, '清單要包含彩虹泡泡砲');
assert.equal(rainbowBubble.launchUrl, 'https://pjh-eric.github.io/rainbow-bubble/');
assert.equal(rainbowBubble.presenceUrl, 'https://rainbow-bubble-server.onrender.com/api/presence');
assert.equal(rainbowBubble.icon, 'rainbow');
const reversi = config.games.find((game) => game.id === 'reversi');
assert.ok(reversi, '清單要包含黑白棋');
assert.equal(reversi.launchUrl, 'https://pjh-eric.github.io/reversi');
const amazeGo = config.games.find((game) => game.id === 'amaze-go');
assert.ok(amazeGo, '清單要包含箭頭解密');
assert.equal(amazeGo.launchUrl, 'https://pjh-eric.github.io/amaze-go/');
assert.equal(amazeGo.presenceUrl, 'https://amaze-go-server.onrender.com/api/presence');
assert.ok(!config.games.some((game) => game.id === 'little-supermarket'));
assert.ok(!config.games.some((game) => game.id === 'bubble-battle'));
assert.ok(!config.games.some((game) => game.id === 'cat-dog-war'));
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
assert.ok(appSource.includes('drawguess: `<svg'), '你畫我猜要有專屬圖示');
assert.ok(appSource.includes('bomb: `<svg'), '炸彈小隊要有專屬圖示');
assert.ok(appSource.includes('rainbow: `<svg'), '彩虹泡泡砲要有專屬圖示');
assert.ok(appSource.includes('pinball: `<svg'), '彈珠籃球要有專屬圖示');
assert.ok(appSource.includes('balloon: `<svg'), '射氣球要有專屬圖示');
const shootBalloon = config.games.find((game) => game.id === 'shoot-balloon');
assert.ok(shootBalloon, '清單要包含射氣球');
assert.equal(shootBalloon.launchUrl, 'https://pjh-eric.github.io/shoot-balloon/');
assert.equal(shootBalloon.presenceUrl, 'https://shoot-balloon.onrender.com/api/presence');
assert.equal(shootBalloon.icon, 'balloon');
assert.ok(!indexHtml.includes('target="_blank"'), '遊戲入口不應開啟新分頁');
assert.ok(!appSource.includes('window.open('), '遊戲卡片不應另外開啟新分頁');
assert.ok(/PRESENCE_TIMEOUT_MS\s*=\s*15000/.test(appSource), '在線人數請求要給冷啟動足夠時間');
assert.ok(/PRESENCE_RETRIES\s*=\s*3/.test(appSource), '在線人數失敗要自動重試');
assert.ok(appSource.includes('伺服器啟動中'), '在線人數冷啟動要顯示可理解狀態');
assert.ok(/presenceRefreshing/.test(appSource), '在線人數輪詢不可重疊');

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

/* SEO：建置時會把 canonical／OG／JSON-LD 與無 JS 後備清單塞進這兩個標記，
 * 並產生 sitemap.xml；標記或 siteUrl 被改掉就不會被 Google 收錄得完整。 */
assert.match(config.siteUrl || '', /^https:\/\/.+\/$/, 'config 要有以 / 結尾的 https siteUrl（供 canonical 與 sitemap）');
assert.ok(indexHtml.includes('<!--SEO:HEAD-->'), 'index.html 缺少 SEO:HEAD 標記');
assert.ok(indexHtml.includes('<!--SEO:GAMES-->'), 'index.html 缺少 SEO:GAMES 標記');
assert.ok(fs.existsSync(path.join(root, 'assets', 'og-image.png')), '要有社群分享圖 assets/og-image.png');
assert.ok(fs.existsSync(path.join(root, 'favicon.svg')), '要有 favicon.svg');

/* 分類與標籤規則：
 * 1. 每款遊戲的 category 都要有對應的篩選鈕與中文名稱，而且每個篩選鈕底下至少有一款遊戲（不留空分類）。
 * 2. 標籤用統一詞彙，不再出現「AI 對戰／AI 對手／四段 AI」這類同義不同寫法。
 * 3. 「新遊戲」徽章只給最新上架的少數幾款，避免全部都是新遊戲而失去辨識度。 */
const chipCategories = [...indexHtml.matchAll(/data-filter="([a-z]+)"/g)].map((match) => match[1]).filter((key) => key !== 'all');
const labelMatch = appSource.match(/const categoryLabels = \{([^}]*)\}/);
assert.ok(labelMatch, 'app.js 要有 categoryLabels');
const labelKeys = [...labelMatch[1].matchAll(/(\w+):/g)].map((match) => match[1]);
assert.deepEqual([...chipCategories].sort(), [...labelKeys].sort(), '篩選鈕與 categoryLabels 的分類要一致');
for (const key of chipCategories) {
  assert.ok(config.games.some((game) => game.category === key), `分類 ${key} 底下沒有任何遊戲`);
}
for (const game of config.games) {
  assert.ok(chipCategories.includes(game.category), `${game.id} 的分類 ${game.category} 沒有對應篩選鈕`);
}
const allowedTags = new Set(['記憶', '邏輯', '消除', '畫畫', '策略', '3D', '棋類', '卡牌', '反應', '闖關', '動作', '射擊', '運動',
  '幼幼班', '單機', '電腦對戰', '線上多人', '線上雙人', '觀戰']);
/* 線上固定只能兩個人的遊戲（各遊戲 repo 的規劃書／README 寫明 2 人）寫「線上雙人」，其餘寫「線上多人」 */
const twoPlayerOnly = new Set(['stair-kids', 'pool-duel', 'reversi']);
for (const game of config.games) {
  assert.equal(game.tags.includes('線上雙人'), twoPlayerOnly.has(game.id), `${game.id} 的人數標籤要寫${twoPlayerOnly.has(game.id) ? '線上雙人' : '線上多人'}`);
  assert.ok(!(game.tags.includes('線上雙人') && game.tags.includes('線上多人')), `${game.id} 不可同時是雙人與多人`);
}
for (const game of config.games) {
  assert.ok(game.tags.length <= 5, `${game.id} 的標籤不要超過 5 個`);
  assert.equal(new Set(game.tags).size, game.tags.length, `${game.id} 的標籤有重複`);
  for (const tag of game.tags) {
    assert.ok(allowedTags.has(tag), `${game.id} 的標籤「${tag}」不在統一詞彙裡（新增標籤請同步更新 tests/verify.js 與 README）`);
  }
}
assert.ok(config.games.filter((game) => /^新/.test(game.badge)).length <= 2, '「新遊戲」徽章最多給兩款');

async function verifyGaVisitorCountApi() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const serviceAccount = {
    client_email: 'ga-reader@example.iam.gserviceaccount.com',
    private_key: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
    token_uri: 'https://oauth2.googleapis.com/token',
  };
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url === serviceAccount.token_uri) {
      const form = new URLSearchParams(options.body);
      const assertion = form.get('assertion');
      const [header, payload, signature] = assertion.split('.');
      const unsigned = `${header}.${payload}`;
      assert.equal(form.get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer');
      assert.ok(crypto.verify('RSA-SHA256', Buffer.from(unsigned), publicKey, Buffer.from(signature, 'base64url')));
      assert.equal(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).scope,
        'https://www.googleapis.com/auth/analytics.readonly');
      return { ok: true, json: async () => ({ access_token: 'mock-access-token' }) };
    }

    assert.equal(url, 'https://analyticsdata.googleapis.com/v1beta/properties/123456789:runReport');
    assert.equal(options.headers.authorization, 'Bearer mock-access-token');
    assert.deepEqual(JSON.parse(options.body), createReportRequest());
    return { ok: true, json: async () => ({ rows: [{ metricValues: [{ value: '42' }] }] }) };
  };

  const count = await getTotalUsers({ propertyId: '123456789', serviceAccount, fetchImpl });
  assert.equal(count, 42);
  assert.equal(calls.length, 2);
  await assert.rejects(getTotalUsers({ propertyId: 'G-PG79WZK8Y', serviceAccount, fetchImpl }), /numeric GA4 property ID/);
}

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
    await verifyGaVisitorCountApi();
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
    assert.equal(JSON.parse(servedConfig.body).games.length, 15);
    const missing = await request(`http://127.0.0.1:${port}/missing-file.txt`);
    assert.equal(missing.status, 404);
    console.log('game-lobby verify passed');
  } finally {
    child.kill();
  }
})().catch((error) => { console.error(error); child.kill(); process.exitCode = 1; });
