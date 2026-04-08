#!/usr/bin/env node

let runCLI;
try {
  ({ runCLI } = await import('../dist/cli.js'));
} catch {
  ({ runCLI } = await import('../src/cli.js'));
}

async function run() {
  try {
    await runCLI(process.argv);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  } finally {
    try {
      const { getConfig } = await import('../src/config.js');
      const config = getConfig();
      
      if (config.updateAvailable) {
        const path = await import('node:path');
        const fs = await import('node:fs/promises');
        const { fileURLToPath } = await import('node:url');
        
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const pkg = JSON.parse(await fs.readFile(path.join(__dirname, '../package.json'), 'utf8'));
        
        const parseV = v => typeof v === 'string' ? v.replace(/^v/, '').split('.').map(Number) : [0,0,0];
        const cv = parseV(pkg.version);
        const tv = parseV(config.updateAvailable);
        let isNewer = false;
        for (let i = 0; i < 3; i++) {
          const nv = tv[i] || 0;
          const oc = cv[i] || 0;
          if (nv > oc) { isNewer = true; break; }
          if (nv < oc) { break; }
        }

        if (isNewer) {
          const { t } = await import('../src/i18n.js');
          console.log(`\n\x1b[33m${t('UPDATE_AVAILABLE', { version: config.updateAvailable })}\x1b[0m`);
        } else {
          const { saveConfig } = await import('../src/config.js');
          delete config.updateAvailable;
          saveConfig(config);
        }
      }
      
      if (config.autoUpdate !== false) {
        const lastCheck = config.lastUpdateCheck || 0;
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        if (Date.now() - lastCheck > TWENTY_FOUR_HOURS) {
          const { spawn } = await import('node:child_process');
          const { fileURLToPath } = await import('node:url');
          const path = await import('node:path');
          
          const __dirname = path.dirname(fileURLToPath(import.meta.url));
          const checkerPath = path.join(__dirname, '../src/update-checker.js');
          
          const child = spawn(process.execPath, [checkerPath], {
            detached: true,
            stdio: 'ignore'
          });
          child.unref();
        }
      }
    } catch {
      // Fallar silenciosamente
    }
  }
}

run();
