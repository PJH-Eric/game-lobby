const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const files = [
  'index.html',
  'styles.css',
  'app.js',
  path.join('config', 'games.json'),
];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(path.join(output, 'config'), { recursive: true });

for (const relativeFile of files) {
  const source = path.join(root, relativeFile);
  const destination = path.join(output, relativeFile);
  fs.copyFileSync(source, destination);
}

fs.writeFileSync(path.join(output, '.nojekyll'), '', 'utf8');
console.log(`GitHub Pages 建置完成：${path.relative(root, output)}`);
