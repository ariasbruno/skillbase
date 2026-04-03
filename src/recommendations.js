import fs from 'node:fs/promises';
import path from 'node:path';

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function readJsonIfExists(file) {
  if (!(await exists(file))) return null;
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function readTextIfExists(file) {
  if (!(await exists(file))) return '';
  return fs.readFile(file, 'utf8');
}

/**
 * Detecta tecnologías del proyecto. En modo hard hace una inspección más profunda.
 */
export async function detectProjectTechnologies(cwd = process.cwd(), { hard = false } = {}) {
  const technologies = new Set();

  const add = (...values) => values.filter(Boolean).forEach((value) => technologies.add(String(value).toLowerCase()));
  const packageJson = await readJsonIfExists(path.join(cwd, 'package.json'));
  if (packageJson) {
    add('javascript', 'node', 'npm');
    const deps = {
      ...(packageJson.dependencies ?? {}),
      ...(packageJson.devDependencies ?? {})
    };
    if (deps.react) add('react');
    if (deps.vue) add('vue');
    if (deps.svelte) add('svelte');
    if (deps.next) add('nextjs', 'next');
    if (deps.express || deps.fastify || deps.koa) add('api', 'backend');
    if (deps.typescript) add('typescript', 'ts');
    if (deps.tailwindcss) add('tailwind', 'css');
  }

  if (await exists(path.join(cwd, 'requirements.txt'))) add('python');
  if (await exists(path.join(cwd, 'pyproject.toml'))) add('python');
  if (await exists(path.join(cwd, 'go.mod'))) add('go', 'golang');
  if (await exists(path.join(cwd, 'Cargo.toml'))) add('rust');
  if (await exists(path.join(cwd, 'Dockerfile'))) add('docker', 'devops');
  if (await exists(path.join(cwd, 'docker-compose.yml'))) add('docker', 'compose', 'devops');

  if (hard) {
    const readme = await readTextIfExists(path.join(cwd, 'README.md'));
    const content = readme.toLowerCase();
    if (content.includes('kubernetes') || content.includes('k8s')) add('kubernetes', 'k8s');
    if (content.includes('postgres')) add('postgres', 'postgresql');
    if (content.includes('mysql')) add('mysql');
    if (content.includes('mongodb')) add('mongodb');
  }

  return Array.from(technologies);
}
