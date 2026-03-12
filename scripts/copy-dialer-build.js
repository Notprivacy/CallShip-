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

// Marca de build para verificar en producción (abre https://www.callship.us/build.txt)
const buildId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
fs.writeFileSync(path.join(dest, 'build.txt'), `CallShip frontend build\n${buildId}\n`, 'utf8');

// Comentario en index.html para "Ver código fuente" en el navegador
const indexPath = path.join(dest, 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');
if (!indexHtml.includes('build:')) {
  indexHtml = indexHtml.replace('<head>', '<head>\n    <!-- build: ' + buildId + ' -->');
  fs.writeFileSync(indexPath, indexHtml, 'utf8');
}

console.log('Build del dialer copiado a server/public');
console.log('Build ID:', buildId);
console.log('Para producción: sube server/public a Git (ver DEPLOY-PASOS.txt) y luego cd server && npm start');
