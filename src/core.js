import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import * as readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getGlobalSkillsDir, getProjectRoot, getProjectSkillsDir, PROJECT_AGENTS_DIR, PROJECT_SKILLS_DIR } from './config.js';
import { readManifest, removeSkillFromManifest, upsertSkill, writeJson, writeManifest } from './manifest.js';
import { detectProjectTechnologies } from './recommendations.js';
const execFileAsync = promisify(execFile);

function nowISO() {
  return new Date().toISOString();
}

export { getGlobalSkillsDir, getProjectRoot, getProjectSkillsDir, readManifest };

export async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export async function listGlobalSkills() {
  const globalDir = getGlobalSkillsDir();
  await ensureDir(globalDir);
  const entries = await fs.readdir(globalDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

export async function listProjectSkills(cwd = process.cwd()) {
  const projectSkillsDir = getProjectSkillsDir(cwd);
  if (!(await exists(projectSkillsDir))) return [];
  const entries = await fs.readdir(projectSkillsDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

async function copyDir(src, dst) {
  await fs.cp(src, dst, { recursive: true, force: true });
}

async function readSkillVersion(skillPath) {
  const skillMeta = path.join(skillPath, 'skill.json');
  if (!(await exists(skillMeta))) return null;
  const data = JSON.parse(await fs.readFile(skillMeta, 'utf8'));
  return typeof data.version === 'string' ? data.version : null;
}

function compareVersion(a, b) {
  if (!a || !b) return 0;
  const aa = a.split('.').map((x) => Number.parseInt(x, 10) || 0);
  const bb = b.split('.').map((x) => Number.parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(aa.length, bb.length); i += 1) {
    const av = aa[i] ?? 0;
    const bv = bb[i] ?? 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

export async function addSkill(skillName, { sym = false, cwd = process.cwd() } = {}) {
  const globalPath = path.join(getGlobalSkillsDir(), skillName);
  if (!(await exists(globalPath))) {
    throw new Error(`La skill global "${skillName}" no existe en ${getGlobalSkillsDir()}`);
  }

  const projectSkillsDir = getProjectSkillsDir(cwd);
  await ensureDir(projectSkillsDir);
  const target = path.join(projectSkillsDir, skillName);

  if (await exists(target)) {
    await fs.rm(target, { recursive: true, force: true });
  }

  if (sym) await fs.symlink(globalPath, target, 'dir');
  else await copyDir(globalPath, target);

  const manifest = await readManifest(cwd);
  const version = await readSkillVersion(globalPath);
  upsertSkill(manifest, {
    name: skillName,
    source: 'global',
    linked: sym,
    version,
    installedAt: nowISO()
  });
  await writeManifest(manifest, cwd);
}

export async function addSkillsInteractive({ cwd = process.cwd(), sym = false } = {}) {
  const skills = await listGlobalSkills();
  if (!skills.length) return { selected: [], cancelled: false };
  const selection = await selectSkillsFromList(skills, {
    title: 'Selecciona skills para instalar',
    requireTTYMessage: 'La selección interactiva requiere una terminal TTY. Usa: skillbase add <skill>.'
  });
  if (selection.cancelled) return { selected: [], cancelled: true };
  const selectedSkills = selection.selected;
  for (const skill of selectedSkills) {
    await addSkill(skill, { cwd, sym });
  }
  output.write(`\nInstaladas: ${selectedSkills.join(', ') || 'ninguna'}\n`);
  return { selected: selectedSkills, cancelled: false };
}

async function selectSkillsFromList(skills, { title, requireTTYMessage } = {}) {
  if (!input.isTTY || !output.isTTY) {
    throw new Error(requireTTYMessage || 'La selección interactiva requiere una terminal TTY.');
  }

  const selected = new Set();
  let cursor = 0;
  let offset = 0;
  let renderedLines = 0;
  let firstRender = true;

  // Tamaño de página adaptativo (mínimo 5, máximo 15 por defecto)
  const getPageSize = () => {
    const terminalRows = output.rows || 24;
    const reservedRows = 8; // Header (5) + Footer (2) + Margen (1)
    return Math.max(5, Math.min(15, terminalRows - reservedRows));
  };

  readline.emitKeypressEvents(input);
  input.resume();
  if (typeof input.setRawMode === 'function') input.setRawMode(true);

  const render = () => {
    const pageSize = getPageSize();
    
    // Ajustar ventana (offset) según el cursor
    if (cursor < offset) {
      offset = cursor;
    } else if (cursor >= offset + pageSize) {
      offset = cursor - pageSize + 1;
    }

    const lines = [
      '\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m',
      `\x1b[1m${title || 'Selecciona skills'}\x1b[0m`,
      '\x1b[2m↑/↓ navegar · espacio seleccionar · enter confirmar · esc cancelar\x1b[0m',
      '\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m',
      ''
    ];

    // Indicador superior si hay más arriba
    if (offset > 0) {
      lines.push('\x1b[2m  ▲  y más...\x1b[0m');
    } else {
      lines.push('');
    }

    const visibleSkills = skills.slice(offset, offset + pageSize);
    visibleSkills.forEach((skill, index) => {
      const realIndex = index + offset;
      const isSelected = selected.has(skill);
      const isCursor = realIndex === cursor;
      const mark = isSelected ? '[x]' : '[ ]';
      const pointer = isCursor ? '\x1b[32m❯\x1b[0m' : ' ';
      const line = `${mark} ${skill}`;
      lines.push(isCursor ? `${pointer} \x1b[1m${line}\x1b[0m` : `${pointer} ${line}`);
    });

    // Rellenar hasta pageSize para mantener altura constante (evita parpadeos)
    for (let i = visibleSkills.length; i < pageSize; i += 1) {
      lines.push('');
    }

    // Indicador inferior si hay más abajo
    if (offset + pageSize < skills.length) {
      lines.push('\x1b[2m  ▼  y más...\x1b[0m');
    } else {
      lines.push('');
    }

    if (!firstRender) {
      readline.moveCursor(output, 0, -renderedLines);
    }

    for (let i = 0; i < lines.length; i += 1) {
      readline.clearLine(output, 0);
      readline.cursorTo(output, 0);
      output.write(lines[i]);
      if (i < lines.length - 1) output.write('\n');
    }

    // Limpiar líneas residuales si el tamaño de renderizado cambió (vía redimensionado de terminal)
    if (!firstRender && renderedLines > lines.length) {
      for (let i = lines.length; i < renderedLines; i += 1) {
        output.write('\n');
        readline.clearLine(output, 0);
      }
    }

    output.write('\n');
    renderedLines = lines.length + 1;
    firstRender = false;
  };

  render();
  let onKeypress;
  const outcome = await new Promise((resolve) => {
    onKeypress = (_, key) => {
      if (key.name === 'up') {
        cursor = (cursor - 1 + skills.length) % skills.length;
        render();
        return;
      }
      if (key.name === 'down') {
        cursor = (cursor + 1) % skills.length;
        render();
        return;
      }
      if (key.name === 'space') {
        const skill = skills[cursor];
        if (selected.has(skill)) selected.delete(skill);
        else selected.add(skill);
        render();
        return;
      }
      if (key.name === 'return' || key.name === 'enter') {
        resolve({ cancelled: false });
        return;
      }
      if (key.name === 'escape' || (key.name === 'c' && key.ctrl)) {
        resolve({ cancelled: true });
      }
    };
    input.on('keypress', onKeypress);
  });

  if (onKeypress) input.off('keypress', onKeypress);
  if (typeof input.setRawMode === 'function') input.setRawMode(false);
  input.pause();
  output.write('\n');

  if (outcome.cancelled) {
    return { selected: [], cancelled: true };
  }

  return { selected: Array.from(selected), cancelled: false };
}

async function tryFetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function parseRemoteSkillRef(skillRef) {
  const trimmed = skillRef.trim();
  if (!trimmed) return { canonicalName: '', lookupKeys: [] };

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const parts = url.pathname.split('/').filter(Boolean);
      // Formato esperado en skills.sh: /<owner>/skills/<skill>
      const skillIdx = parts.indexOf('skills');
      if (skillIdx > 0 && parts[skillIdx + 1]) {
        const owner = parts[skillIdx - 1];
        const name = parts[skillIdx + 1];
        const scoped = `${owner}/${name}`;
        return { canonicalName: scoped, lookupKeys: [scoped, name] };
      }
      const last = parts.at(-1) ?? trimmed;
      return { canonicalName: last, lookupKeys: [last] };
    } catch {
      return { canonicalName: trimmed, lookupKeys: [trimmed] };
    }
  }

  return { canonicalName: trimmed, lookupKeys: [trimmed] };
}

async function fetchRemoteMetadata(skillRef) {
  const parsed = parseRemoteSkillRef(skillRef);
  if (!parsed.lookupKeys.length) {
    throw new Error('Debes indicar una skill remota válida.');
  }

  for (const key of parsed.lookupKeys) {
    const encoded = encodeURIComponent(key);
    const escapedPath = key.split('/').map(encodeURIComponent).join('/');
    const candidates = [
      `https://skills.sh/api/skills/${encoded}.json`,
      `https://skills.sh/${escapedPath}/skill.json`,
      `https://skills.sh/${escapedPath}/skills/${encodeURIComponent(parsed.canonicalName.split('/').at(-1) ?? key)}/skill.json`
    ];

    for (const url of candidates) {
      try {
        const data = await tryFetchJson(url);
        return { ...data, _fetchedFrom: url, _resolvedName: parsed.canonicalName };
      } catch {
        // next
      }
    }
  }

  throw new Error(
    `No se pudo obtener metadata remota para "${skillRef}". Usa slug tipo "owner/skill" o URL de skills.sh.`
  );
}

async function downloadSkillFromRemote(skillRef, tmpDir) {
  const metadata = await fetchRemoteMetadata(skillRef);
  const resolvedName = metadata._resolvedName || skillRef;
  const localName = resolvedName.split('/').at(-1) || resolvedName;
  const sourceUrl = metadata.downloadUrl || metadata.sourceUrl || metadata.repo || metadata.url;

  if (!sourceUrl) {
    throw new Error(`La metadata remota de "${skillRef}" no contiene downloadUrl/sourceUrl/repo/url`);
  }

  if (metadata.archiveUrl) {
    const archiveResponse = await fetch(metadata.archiveUrl);
    if (!archiveResponse.ok) throw new Error(`No se pudo descargar archiveUrl (${archiveResponse.status})`);
    const archivePath = path.join(tmpDir, `${localName}.tgz`);
    const buffer = Buffer.from(await archiveResponse.arrayBuffer());
    await fs.writeFile(archivePath, buffer);
    throw new Error('archiveUrl descargado, pero falta extractor .tgz (pendiente de implementación)');
  }

  const skillPath = path.join(tmpDir, localName);
  await ensureDir(skillPath);
  await writeJson(path.join(skillPath, 'skill.json'), {
    name: resolvedName,
    version: metadata.version ?? '0.0.0',
    sourceUrl,
    fetchedFrom: metadata._fetchedFrom
  });
  return { path: skillPath, metadata, localName, resolvedName };
}

export async function installRemoteSkill(skillName, { cwd = process.cwd(), force = false } = {}) {
  const projectSkillsDir = getProjectSkillsDir(cwd);
  await ensureDir(projectSkillsDir);

  if (/^https?:\/\/github\.com\//i.test(skillName)) {
    throw new Error('Para instalar desde GitHub usa: skillbase install <repo-url> --remote --skill <nombre-skill>.');
  }

  const tempBase = await fs.mkdtemp(path.join(os.tmpdir(), 'skillbase-'));
  try {
    const downloaded = await downloadSkillFromRemote(skillName, tempBase);
    const target = path.join(projectSkillsDir, downloaded.localName);
    if ((await exists(target)) && !force) {
      throw new Error(`La skill "${downloaded.localName}" ya existe en el proyecto. Usa --force para reinstalar.`);
    }
    if (await exists(target)) await fs.rm(target, { recursive: true, force: true });
    await copyDir(downloaded.path, target);

    const manifest = await readManifest(cwd);
    upsertSkill(manifest, {
      name: downloaded.resolvedName,
      localName: downloaded.localName,
      source: 'remote',
      linked: false,
      version: downloaded.metadata.version ?? '0.0.0',
      remoteUrl: downloaded.metadata.sourceUrl || downloaded.metadata.repo || downloaded.metadata.url || null,
      installedAt: nowISO()
    });
    await writeManifest(manifest, cwd);
  } finally {
    await fs.rm(tempBase, { recursive: true, force: true });
  }
}

async function installRemoteFromGitHub(repoUrl, selectedSkill, { cwd = process.cwd(), force = false } = {}) {
  if (!selectedSkill) {
    throw new Error('Falta --skill <nombre>. Ejemplo: skillbase install <repo-url> --remote --skill find-skills');
  }

  const projectSkillsDir = getProjectSkillsDir(cwd);
  await ensureDir(projectSkillsDir);

  const tempBase = await fs.mkdtemp(path.join(os.tmpdir(), 'skillbase-git-'));
  const repoPath = path.join(tempBase, 'repo');
  try {
    await execFileAsync('git', ['clone', '--depth', '1', repoUrl, repoPath], { maxBuffer: 1024 * 1024 * 10 });
    const candidates = [path.join(repoPath, 'skills', selectedSkill), path.join(repoPath, selectedSkill)];
    let sourcePath = null;
    for (const candidate of candidates) {
      if (await exists(candidate)) {
        sourcePath = candidate;
        break;
      }
    }
    if (!sourcePath) {
      throw new Error(`No se encontró la skill "${selectedSkill}" en el repo remoto.`);
    }

    const target = path.join(projectSkillsDir, selectedSkill);
    if ((await exists(target)) && !force) {
      throw new Error(`La skill "${selectedSkill}" ya existe en el proyecto. Usa --force para reinstalar.`);
    }
    if (await exists(target)) await fs.rm(target, { recursive: true, force: true });
    await copyDir(sourcePath, target);

    const manifest = await readManifest(cwd);
    const version = await readSkillVersion(sourcePath);
    upsertSkill(manifest, {
      name: selectedSkill,
      source: 'remote',
      linked: false,
      version: version ?? '0.0.0',
      remoteUrl: repoUrl,
      installedAt: nowISO()
    });
    await writeManifest(manifest, cwd);
  } finally {
    await fs.rm(tempBase, { recursive: true, force: true });
  }
}

export async function installRemoteSkillRef(skillRef, options = {}) {
  if (/^https?:\/\/github\.com\//i.test(skillRef)) {
    return installRemoteFromGitHub(skillRef, options.skill, options);
  }
  return installRemoteSkill(skillRef, options);
}

export async function installFromManifest({ cwd = process.cwd(), remote = false, force = false } = {}) {
  const manifest = await readManifest(cwd);
  if (!manifest.skills.length) {
    throw new Error('No hay skills en skillbase.json. Usa "skillbase add <skill>" o "skillbase install <skill> --remote".');
  }
  for (const skill of manifest.skills) {
    if (remote || skill.source === 'remote') await installRemoteSkill(skill.name, { cwd, force });
    else await addSkill(skill.name, { cwd, sym: Boolean(skill.linked) });
  }
}

export async function removeSkill(skillName, { cwd = process.cwd(), global = false } = {}) {
  if (global) {
    await fs.rm(path.join(getGlobalSkillsDir(), skillName), { recursive: true, force: true });
    return;
  }

  await fs.rm(path.join(getProjectSkillsDir(cwd), skillName), { recursive: true, force: true });
  const manifest = await readManifest(cwd);
  removeSkillFromManifest(manifest, skillName);
  await writeManifest(manifest, cwd);
}

async function getRemoteVersion(skillName) {
  const metadata = await fetchRemoteMetadata(skillName);
  return metadata.version ?? null;
}

export async function checkUpdates({ cwd = process.cwd(), remoteOnly = false } = {}) {
  const manifest = await readManifest(cwd);
  const updates = [];

  for (const skill of manifest.skills) {
    if (remoteOnly && skill.source !== 'remote') continue;

    if (skill.source === 'remote') {
      const latest = await getRemoteVersion(skill.name);
      if (latest && compareVersion(latest, skill.version) > 0) {
        updates.push({ name: skill.name, current: skill.version, latest, source: 'remote' });
      }
      continue;
    }

    const globalPath = path.join(getGlobalSkillsDir(), skill.name);
    if (!(await exists(globalPath))) continue;
    const latest = await readSkillVersion(globalPath);
    if (latest && compareVersion(latest, skill.version) > 0) {
      updates.push({ name: skill.name, current: skill.version, latest, source: 'global' });
    }
  }

  return updates;
}

export async function updateSkills({ cwd = process.cwd(), skillName = null, remoteOnly = false } = {}) {
  const manifest = await readManifest(cwd);
  const selected = manifest.skills.filter((skill) => {
    if (skillName && skill.name !== skillName) return false;
    if (remoteOnly && skill.source !== 'remote') return false;
    return true;
  });

  for (const skill of selected) {
    if (skill.source === 'remote') {
      await installRemoteSkill(skill.name, { cwd, force: true });
    } else {
      await addSkill(skill.name, { cwd, sym: Boolean(skill.linked) });
      const globalVersion = await readSkillVersion(path.join(getGlobalSkillsDir(), skill.name));
      const nextManifest = await readManifest(cwd);
      upsertSkill(nextManifest, { ...skill, version: globalVersion || skill.version, installedAt: nowISO() });
      await writeManifest(nextManifest, cwd);
    }
  }
}

async function getSkillTags(skillDir) {
  const metaPath = path.join(skillDir, 'skill.json');
  if (!(await exists(metaPath))) return [];
  try {
    const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
    if (Array.isArray(meta.tags)) return meta.tags.map((tag) => String(tag).toLowerCase());
    if (typeof meta.tags === 'string') return meta.tags.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean);
    return [];
  } catch {
    return [];
  }
}

export async function initProject({ cwd = process.cwd(), hard = false } = {}) {
  const technologies = await detectProjectTechnologies(cwd, { hard });
  if (!technologies.length) return { technologies: [], suggested: [], installed: [], cancelled: false };

  const globalSkills = await listGlobalSkills();
  const suggested = [];
  for (const skill of globalSkills) {
    const skillLower = skill.toLowerCase();
    const matchesByName = technologies.some((tech) => skillLower.includes(tech));
    if (matchesByName) {
      suggested.push(skill);
      continue;
    }
    if (!hard) continue;
    const tags = await getSkillTags(path.join(getGlobalSkillsDir(), skill));
    if (tags.some((tag) => technologies.some((tech) => tag.includes(tech)))) {
      suggested.push(skill);
    }
  }

  if (!suggested.length) return { technologies, suggested: [], installed: [], cancelled: false };

  const selection = await selectSkillsFromList(suggested, {
    title: hard
      ? 'Init --hard: selecciona skills recomendadas por nombre y tags'
      : 'Init: selecciona skills recomendadas por nombre'
  });
  if (selection.cancelled) return { technologies, suggested, installed: [], cancelled: true };

  for (const skill of selection.selected) {
    await addSkill(skill, { cwd, sym: false });
  }

  return { technologies, suggested, installed: selection.selected, cancelled: false };
}

export async function migrateAgentsSkillsToSkillbase({ cwd = process.cwd(), force = false, fromProject = false } = {}) {
  const globalDir = getGlobalSkillsDir();
  await ensureDir(globalDir);

  const agentsDir = fromProject ? path.join(getProjectRoot(cwd), PROJECT_AGENTS_DIR) : path.join(os.homedir(), '.agents');
  const agentsSkillsDir = path.join(agentsDir, PROJECT_SKILLS_DIR);
  const toMigrate = new Map();

  if (await exists(agentsSkillsDir)) {
    const entries = await fs.readdir(agentsSkillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) toMigrate.set(entry.name, path.join(agentsSkillsDir, entry.name));
    }
  }

  const migrated = [];
  const skipped = [];

  for (const [skillName, sourcePath] of toMigrate.entries()) {
    const targetPath = path.join(globalDir, skillName);
    if ((await exists(targetPath)) && !force) {
      skipped.push(skillName);
      continue;
    }
    if (await exists(targetPath)) await fs.rm(targetPath, { recursive: true, force: true });
    await copyDir(sourcePath, targetPath);
    migrated.push(skillName);
  }

  return { migrated, skipped, totalFound: toMigrate.size, sourceRoot: agentsDir };
}
