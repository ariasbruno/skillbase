import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getGlobalConfigPath } from './config.js';

// No dependencias externas
const NPM_REGISTRY = 'https://registry.npmjs.org/@ariasbruno/skillbase/latest';

function parseVersion(v) {
  return typeof v === 'string' ? v.replace(/^v/, '').split('.').map(Number) : [0, 0, 0];
}

function compareVersion(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

async function checkUpdate() {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
    const currentVersion = pkg.version;
  
    const response = await fetch(NPM_REGISTRY);
    if (!response.ok) return;

    const data = await response.json();
    const latestVersion = data.version;

    if (latestVersion && compareVersion(latestVersion, currentVersion) > 0) {
      const configPath = getGlobalConfigPath();
      let config = {};
      try {
        if (fs.existsSync(configPath)) {
          config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
      } catch {
        // Ignorar
      }
      
      // Actualizar config
      config.updateAvailable = latestVersion;
      config.lastUpdateCheck = Date.now();
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } else {
      // Registrar que comprobamos y estamos al día
      const configPath = getGlobalConfigPath();
      let config = {};
      try {
        if (fs.existsSync(configPath)) {
          config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
      } catch {
        // Ignorar
      }
      
      delete config.updateAvailable;
      config.lastUpdateCheck = Date.now();
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
  } catch {
    // Falla silenciosamente (sin internet, etc)
  }
}

checkUpdate();
