const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const files = [
  'index.html',
  'styles.css',
  'app.js',
  'favicon.svg',
  path.join('config', 'games.json'),
  path.join('assets', 'og-image.png'),
];

const config = JSON.parse(fs.readFileSync(path.join(root, 'config', 'games.json'), 'utf8'));
const siteUrl = String(config.siteUrl || '').replace(/\/?$/, '/');
if (!/^https:\/\//.test(siteUrl)) throw new Error('config/games.json 的 siteUrl 必須是 https 網址');

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
));
/* JSON-LD 放進 <script> 時要避開 "</script>" 與 "<!--" */
const safeJson = (value) => JSON.stringify(value, null, 2).replace(/</g, '\\u003c');

const games = config.games;
const names = games.map((game) => game.title);
const pageTitle = `${config.title}｜${games.length} 個可愛小遊戲`;
const description = `${config.title}：${names.join('、')}的可愛遊戲大廳，單機、電腦對戰與線上房間，點一下就開始玩。`;
const ogImage = `${siteUrl}assets/og-image.png`;

/* Google Search Console 的 HTML 標籤驗證碼（選填）：
 * 在 GitHub repo 的 Settings → Secrets and variables → Actions → Variables 新增
 * GOOGLE_SITE_VERIFICATION，值只放 content 的那串字，不用改程式。 */
const verification = String(process.env.GOOGLE_SITE_VERIFICATION || '').trim();

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}#website`,
      url: siteUrl,
      name: config.title,
      description,
      inLanguage: 'zh-Hant',
    },
    {
      '@type': 'ItemList',
      '@id': `${siteUrl}#games`,
      name: `${config.title}的遊戲清單`,
      numberOfItems: games.length,
      itemListElement: games.map((game, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: game.launchUrl,
        name: game.title,
      })),
    },
  ],
};

const headTags = [
  verification ? `<meta name="google-site-verification" content="${escapeHtml(verification)}">` : '',
  `<link rel="canonical" href="${escapeHtml(siteUrl)}">`,
  '<meta name="robots" content="index, follow, max-image-preview:large">',
  '<meta property="og:type" content="website">',
  '<meta property="og:locale" content="zh_TW">',
  `<meta property="og:site_name" content="${escapeHtml(config.title)}">`,
  `<meta property="og:title" content="${escapeHtml(pageTitle)}">`,
  `<meta property="og:description" content="${escapeHtml(description)}">`,
  `<meta property="og:url" content="${escapeHtml(siteUrl)}">`,
  `<meta property="og:image" content="${escapeHtml(ogImage)}">`,
  '<meta property="og:image:width" content="1200">',
  '<meta property="og:image:height" content="630">',
  `<meta property="og:image:alt" content="${escapeHtml(config.title)}">`,
  '<meta name="twitter:card" content="summary_large_image">',
  `<meta name="twitter:title" content="${escapeHtml(pageTitle)}">`,
  `<meta name="twitter:description" content="${escapeHtml(description)}">`,
  `<meta name="twitter:image" content="${escapeHtml(ogImage)}">`,
  `<script type="application/ld+json">\n${safeJson(jsonLd)}\n</script>`,
].filter(Boolean).join('\n  ');

/* 沒執行 JS 的爬蟲也看得到每款遊戲的名稱、說明與連結 */
const gamesFallback = `<noscript><ul class="seo-games">\n${games.map((game) => (
  `            <li><a href="${escapeHtml(game.launchUrl)}">${escapeHtml(game.title)}</a>：${escapeHtml(game.description)}</li>`
)).join('\n')}\n          </ul></noscript>`;

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeHtml(siteUrl)}</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(path.join(output, 'config'), { recursive: true });
fs.mkdirSync(path.join(output, 'assets'), { recursive: true });

for (const relativeFile of files) {
  fs.copyFileSync(path.join(root, relativeFile), path.join(output, relativeFile));
}

const indexPath = path.join(output, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
for (const marker of ['<!--SEO:HEAD-->', '<!--SEO:GAMES-->']) {
  if (!html.includes(marker)) throw new Error(`index.html 缺少標記 ${marker}`);
}
html = html
  .replace('<!--SEO:HEAD-->', () => headTags)
  .replace('<!--SEO:GAMES-->', () => gamesFallback);
fs.writeFileSync(indexPath, html, 'utf8');

fs.writeFileSync(path.join(output, 'sitemap.xml'), sitemap, 'utf8');
fs.writeFileSync(path.join(output, '.nojekyll'), '', 'utf8');
console.log(`GitHub Pages 建置完成：${path.relative(root, output)}（含 SEO 標籤、sitemap.xml）`);
