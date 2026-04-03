import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { detectProjectTechnologies } from '../src/recommendations.js';

async function withTempDir(testFn) {
  const tempBase = await fs.mkdtemp(path.join(os.tmpdir(), 'skillbase-test-'));
  try {
    await testFn(tempBase);
  } finally {
    await fs.rm(tempBase, { recursive: true, force: true });
  }
}

async function runTests() {
  console.log('🧪 Ejecutando pruebas de detección de tecnologías...');

  // Caso 1: Detección de todas las dependencias en package.json
  await withTempDir(async (tmp) => {
    const pkg = {
      dependencies: {
        'lodash': '^4.0.0',
        'prisma': '^5.0.0'
      },
      devDependencies: {
        'vitest': '^1.0.0'
      }
    };
    await fs.writeFile(path.join(tmp, 'package.json'), JSON.stringify(pkg));
    
    const techs = await detectProjectTechnologies(tmp);
    
    // Debería incluir las dependencias arbitrarias
    assert.ok(techs.includes('lodash'), 'Debe incluir lodash');
    assert.ok(techs.includes('prisma'), 'Debe incluir prisma');
    assert.ok(techs.includes('vitest'), 'Debe incluir vitest');
    
    // Debería incluir los core detectados automáticamente por package.json
    assert.ok(techs.includes('javascript'), 'Debe incluir javascript');
    assert.ok(techs.includes('node'), 'Debe incluir node');
  });

  // Caso 2: Mappings especiales siguen funcionando
  await withTempDir(async (tmp) => {
    const pkg = {
      dependencies: {
        'next': 'latest'
      }
    };
    await fs.writeFile(path.join(tmp, 'package.json'), JSON.stringify(pkg));
    
    const techs = await detectProjectTechnologies(tmp);
    assert.ok(techs.includes('next'), 'Debe incluir next');
    assert.ok(techs.includes('nextjs'), 'Debe seguir incluyendo el alias nextjs');
  });

  // Caso 3: Otros archivos de señales
  await withTempDir(async (tmp) => {
    await fs.writeFile(path.join(tmp, 'requirements.txt'), 'flask');
    await fs.writeFile(path.join(tmp, 'Dockerfile'), 'FROM node');
    
    const techs = await detectProjectTechnologies(tmp);
    assert.ok(techs.includes('python'), 'Debe detectar python por requirements.txt');
    assert.ok(techs.includes('docker'), 'Debe detectar docker por Dockerfile');
  });

  console.log('✅ Todas las pruebas de detección pasaron.');
}

runTests().catch(err => {
  console.error('❌ Error en las pruebas:');
  console.error(err);
  process.exit(1);
});
