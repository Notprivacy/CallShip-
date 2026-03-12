/**
 * Copia el build del dialer (dialer/dist) a server/public para producción.
 * Uso: node scripts/copy-dialer-build.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'dialer', 'dist');
const dest = path.join(root, 'server', 'public');

if (!fs.existsSync(src)) {
  console.error('Primero ejecuta en la raíz: cd dialer && npm run build');
  process.exit(1);
}

function copyRecursive(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    const fromPath = path.join(from, name);
    const toPath = path.join(to, name);
    if (fs.statSync(fromPath).isDirectory()) {
      copyRecursive(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  }
}

if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true });
}
copyRecursive(src, dest);
console.log('Build del dialer copiado a server/public');
console.log('Para producción: cd server && npm start');
