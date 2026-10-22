'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { inject } = require('./seo/inject-seo');
const root = path.resolve(__dirname, '..');
const workspace = path.dirname(root);
const config = require('../config/games.json');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'game-icons-'));

function png(file, width, height) {
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', file + ' PNG signature');
  assert.equal(bytes.readUInt32BE(16), width, file + ' width');
  assert.equal(bytes.readUInt32BE(20), height, file + ' height');
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)=("[^"]*"|'[^']*')/g)].map(match => [match[1], match[2].slice(1, -1)]));
}

function check(id, html, folder, siteUrl, sharePath) {
  const head = html.slice(0, html.indexOf('</head>'));
  const links = (head.match(/<link\b[^>]*>/gi) || []).map(attributes);
  const icon = links.find(link => link.rel === 'icon' && link.type === 'image/png' && link.sizes === '96x96');
  assert.ok(icon && !icon.href.startsWith('data:'), id + ' has a crawlable PNG favicon in static HTML');
  assert.equal(new URL(icon.href, siteUrl).href, siteUrl + 'favicon-96.png');
  assert.ok(links.some(link => link.rel === 'apple-touch-icon' && link.sizes === '180x180'));
  assert.equal(links.filter(link => link.rel === 'icon' && link.type === 'image/png').length, 1);
  for (const [file, size] of [['favicon-96.png', 96], ['apple-touch-icon.png', 180], ['icons/icon-192.png', 192], ['icons/icon-512.png', 512]]) png(path.join(folder, file), size, size);
  const ico = fs.readFileSync(path.join(folder, 'favicon.ico'));
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 3);
  const svg = fs.readFileSync(path.join(folder, 'favicon.svg'), 'utf8');
  const box = svg.match(/viewBox=["']([\d.\s-]+)["']/)[1].trim().split(/\s+/).map(Number);
  assert.equal(box[2], box[3], id + ' SVG must be square');
  png(path.join(folder, sharePath), 1200, 630);
  const metas = (head.match(/<meta\b[^>]*>/gi) || []).map(attributes);
  const og = metas.filter(meta => meta.property === 'og:image');
  assert.equal(og.length, 1, id + ' has one social image');
  assert.equal(og[0].content, new URL(sharePath, siteUrl).href);
  assert.ok(metas.some(meta => meta.property === 'og:image:width' && meta.content === '1200'));
  assert.ok(metas.some(meta => meta.property === 'og:image:height' && meta.content === '630'));
  assert.ok(metas.some(meta => meta.name === 'twitter:image' && meta.content === og[0].content));
  const manifest = links.find(link => link.rel === 'manifest');
  if (manifest) {
    const data = JSON.parse(fs.readFileSync(path.join(folder, manifest.href), 'utf8'));
    for (const size of [192, 512]) assert.ok(data.icons.some(icon => icon.type === 'image/png' && icon.sizes === size + 'x' + size));
  }
  console.log('✓ icons ' + id + ': static tags, PNG/SVG/ICO, touch/PWA assets, social image');
}

try {
  for (const game of config.games) {
    const folder = path.join(workspace, game.projectFolder, 'public');
    let html = fs.readFileSync(path.join(folder, 'index.html'), 'utf8');
    const seoFile = path.join(workspace, game.projectFolder, 'seo.config.json');
    assert.equal(game.iconUrl, game.launchUrl + 'favicon-96.png');
    assert.equal(game.imageUrl, game.launchUrl + 'og-image.png');
    if (fs.existsSync(seoFile)) {
      const copy = path.join(temp, game.id);
      fs.mkdirSync(path.join(copy, 'public'), { recursive: true });
      fs.copyFileSync(seoFile, path.join(copy, 'seo.config.json'));
      fs.writeFileSync(path.join(copy, 'public/index.html'), html, 'utf8');
      inject(copy, {});
      html = fs.readFileSync(path.join(copy, 'public/index.html'), 'utf8');
      inject(copy, {});
      assert.equal(fs.readFileSync(path.join(copy, 'public/index.html'), 'utf8'), html, 'Repeated builds must not duplicate image metadata');
      const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
      assert.equal(ld.image, game.imageUrl);
      assert.equal(ld.thumbnailUrl, game.iconUrl);
    }
    check(game.id, html, folder, game.launchUrl, 'og-image.png');
  }
  check('game-lobby', fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8'), path.join(root, 'dist'), config.siteUrl, 'assets/og-image.png');
  const host = path.join(workspace, 'pjh-eric.github.io/dist');
  check('hostname-root', fs.readFileSync(path.join(host, 'index.html'), 'utf8'), host, 'https://pjh-eric.github.io/', 'og-image.png');
  assert.match(fs.readFileSync(path.join(host, 'robots.txt'), 'utf8'), /Allow: \//);
} finally {
  if (path.dirname(temp) === path.resolve(os.tmpdir()) && path.basename(temp).startsWith('game-icons-')) fs.rmSync(temp, { recursive: true, force: true });
}
