import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import * as readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { 
  getGlobalSkillsDir, 
  getProjectRoot, 
  getProjectSkillsDir, 
  getConfiguredSources,
  PROJECT_AGENTS_DIR, 
  PROJECT_SKILLS_DIR,
  GLOBAL_MIGRATE_PATHS,
  PROJECT_MIGRATE_PATHS,
  exists 
} from './config.js';
import { readManifest, removeSkillFromManifest, upsertSkill, writeJson, writeManifest } from './manifest.js';
import { detectProjectTechnologies } from './recommendations.js';
import { t } from './i18n.js';
import {
  bold,
  dim,
  dim2,
  text,
  cyan,
  green,
  yellow,
  S_DIAMOND,
  S_POINTER,
  S_STEP,
  S_SQUARE,
  S_SQUARE_FILL,
  S_RADIO,
  S_RADIO_FILL,
  S_BAR,
  S_BAR_START,
  S_BAR_END,
  H_HIDE_CURSOR,
  H_SHOW_CURSOR,
  H_CLEAR_DOWN,
  H_MOVE_UP
} from './styles.js';
const execFileAsync = promisify(execFile);

function nowISO() {
  return new Date().toISOString();
}

export { getGlobalSkillsDir, getProjectRoot, getProjectSkillsDir, readManifest, GLOBAL_MIGRATE_PATHS, PROJECT_MIGRATE_PATHS };

export async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function sanitizeSkillName(name) {
  if (typeof name !== 'string') return '';

  return name
    .replace(/\0/g, '')        // Null bytes
    .replace(/[\\/]/g, '_')    // Path separators → underscore
    .replace(/\.\./g, '')      // Traversal sequences
    .replace(/^[.~/]+/, '')    // Leading dots/tildes/slashes
    .trim();
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

export function compareVersion(a, b) {
  if (!a || !b) return 0;
  const parse = (v) => v.replace(/^v/, '').split('.').map((x) => Number.parseInt(x, 10) || 0);
  const aa = parse(a);
  const bb = parse(b);
  for (let i = 0; i < Math.max(aa.length, bb.length); i += 1) {
    const av = aa[i] ?? 0;
    const bv = bb[i] ?? 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

export async function addSkill(skillName, { sym = false, cwd = process.cwd() } = {}) {
  const safeName = sanitizeSkillName(skillName);
  if (!safeName) throw new Error(t('ERR_INVALID_SKILL_NAME', { name: skillName }));
  const globalPath = path.join(getGlobalSkillsDir(), safeName);
  if (!(await exists(globalPath))) {
    throw new Error(t('ERR_GLOBAL_NOT_FOUND', { name: skillName, dir: getGlobalSkillsDir() }));
  }

  const projectSkillsDir = getProjectSkillsDir(cwd);
  await ensureDir(projectSkillsDir);
  const target = path.join(projectSkillsDir, safeName);

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

export async function selectSkillsInteractive({ skills = null, title = null, subtitle = null, radio = false, clearOnExit = false } = {}) {
  const skillsList = skills || await listGlobalSkills();
  if (!skillsList.length) return { selected: [], cancelled: false };

  const selection = await selectSkillsFromList(skillsList, {
    title: title || t('UI_SELECT_MULTIPLE'),
    requireTTYMessage: t('UI_REQUIRED_TTY'),
    radio,
    clearOnExit
  });

  if (selection.cancelled) return selection;

  // Si pasamos objetos {name, detail}, devolvemos solo el nombre para compatibilidad
  const selectedNames = selection.selected.map(item => 
    typeof item === 'object' ? item.name : item
  );

  return { selected: selectedNames, cancelled: false };
}

export async function addSkillsInteractive({ cwd = process.cwd(), sym = false, overrideSkills = null, title = null } = {}) {
  const selection = await selectSkillsInteractive({ 
    skills: overrideSkills, 
    title: title || t('UI_SELECT_MULTIPLE') 
  });
  
  if (selection.cancelled) return { selected: [], cancelled: true };
  const selectedSkills = selection.selected;

  for (const skill of selectedSkills) {
    await addSkill(skill, { cwd, sym });
  }

  return { selected: selectedSkills, cancelled: false };
}

async function selectSkillsFromList(skills, { title, subtitle, requireTTYMessage, radio = false, clearOnExit = false } = {}) {
  if (!input.isTTY || !output.isTTY) {
    throw new Error(requireTTYMessage || t('UI_REQUIRED_TTY'));
  }

  const selected = new Set();
  // En modo radio, pre-seleccionamos el primero para que no haya nada pulsado
  if (radio && skills.length > 0) {
    selected.add(skills[0]);
  }

  let cursor = 0;
  let offset = 0;
  let renderedLines = 0;
  let firstRender = true;

  const getPageSize = () => {
    const terminalRows = output.rows || 24;
    const reservedRows = 10;
    return Math.max(5, Math.min(12, terminalRows - reservedRows));
  };

  readline.emitKeypressEvents(input);
  input.resume();
  if (typeof input.setRawMode === 'function') input.setRawMode(true);

  output.write(H_HIDE_CURSOR);

  const render = () => {
    const pageSize = getPageSize();

    if (cursor < offset) offset = cursor;
    else if (cursor >= offset + pageSize) offset = cursor - pageSize + 1;

    const lines = [
      `${cyan(S_BAR_START)}  ${bold(title || t('UI_SELECT_MULTIPLE'))}`,
      `${cyan(S_BAR)}  ${dim2(subtitle || t('UI_AVAILABLE', { count: skills.length }))}`,
      `${cyan(S_BAR)}`
    ];

    const visibleSkills = skills.slice(offset, offset + pageSize);
    visibleSkills.forEach((skill, index) => {
      const realIndex = index + offset;
      const isSelected = selected.has(skill);
      const isCursor = realIndex === cursor;

      const skillName = typeof skill === 'object' ? skill.name : skill;
      const skillDetail = typeof skill === 'object' ? skill.detail : null;

      const check = isSelected
        ? cyan(radio ? S_RADIO_FILL : S_SQUARE_FILL)
        : dim2(radio ? S_RADIO : S_SQUARE);

      const pointer = isCursor
        ? cyan(S_POINTER)
        : ' ';

      // Formatear nombre: owner › name (si tiene /)
      let label = skillName;
      if (skillName.includes('/')) {
        const [owner, ...nameParts] = skillName.split('/');
        const name = nameParts.join('/');
        const ownerPart = isCursor ? bold(owner) : dim2(owner);
        const namePart = isSelected ? cyan(name) : (isCursor ? bold(name) : text(name));
        label = `${ownerPart} ${dim2(S_STEP)} ${namePart}`;
      } else {
        label = isCursor ? bold(skillName) : (isSelected ? cyan(skillName) : text(skillName));
      }

      const detail = skillDetail ? ` ${dim2(skillDetail)}` : '';
      lines.push(`${cyan(S_BAR)}  ${pointer} ${check} ${label}${detail}`);
    });

    for (let i = visibleSkills.length; i < pageSize; i += 1) {
      lines.push(`${cyan(S_BAR)}`);
    }

    lines.push(`${cyan(S_BAR)}`);
    const status = `(${selected.size}/${skills.length})`;
    const page = t('UI_PAGE', { current: Math.floor(offset / pageSize) + 1, total: Math.ceil(skills.length / pageSize) });
    const controls = t('UI_CONTROLS', { status });
    lines.push(`${cyan(S_BAR_END)}  ${dim2(`${page} · ${controls}`)}`);

    const outputContent = lines.join('\n');
    if (!firstRender) {
      output.write('\r' + H_MOVE_UP(renderedLines));
    }
    output.write(H_CLEAR_DOWN + outputContent);

    renderedLines = lines.length - 1;
    firstRender = false;
  };

  try {
    render();
  } catch (err) {
    output.write(H_SHOW_CURSOR);
    if (typeof input.setRawMode === 'function') input.setRawMode(false);
    input.pause();
    throw err;
  }
  const cleanup = () => {
    if (clearOnExit) {
      output.write('\r' + H_MOVE_UP(renderedLines) + H_CLEAR_DOWN);
    } else {
      output.write('\n');
    }
    output.write(H_SHOW_CURSOR);
    if (typeof input.setRawMode === 'function') input.setRawMode(false);
    input.pause();
    input.removeListener('keypress', onKeypress);
  };

  let onKeypress;
  const outcome = await new Promise((resolve) => {
    onKeypress = (_, key) => {
      if (!key) return;
      if (key.ctrl && key.name === 'c') {
        cleanup();
        resolve({ cancelled: true });
        return;
      }
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
        if (radio) {
          selected.clear();
          selected.add(skill);
        } else {
          if (selected.has(skill)) selected.delete(skill);
          else selected.add(skill);
        }
        render();
        return;
      }
      if (key.name === 'a' && !radio) {
        if (selected.size === skills.length) {
          selected.clear();
        } else {
          skills.forEach((s) => selected.add(s));
        }
        render();
        return;
      }
      if (key.name === 'return' || key.name === 'enter') {
        if (radio && selected.size === 0) return; // Forzar selección en radio
        cleanup();
        resolve({ cancelled: false });
        return;
      }
      if (key.name === 'escape') {
        cleanup();
        resolve({ cancelled: true });
      }
    };
    input.on('keypress', onKeypress);
  });

  if (outcome.cancelled) {
    return { selected: [], cancelled: true };
  }

  return { selected: Array.from(selected), cancelled: false };
}

async function tryFetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
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
    throw new Error(t('ERR_REMOTE_INVALID'));
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
    t('ERR_REMOTE_METADATA', { ref: skillRef })
  );
}

async function downloadSkillFromRemote(skillRef, tmpDir) {
  const metadata = await fetchRemoteMetadata(skillRef);
  const resolvedName = metadata._resolvedName || skillRef;
  const localName = resolvedName.split('/').at(-1) || resolvedName;
  const sourceUrl = metadata.downloadUrl || metadata.sourceUrl || metadata.repo || metadata.url;

  if (!sourceUrl) {
    throw new Error(t('ERR_REMOTE_NO_URL', { ref: skillRef }));
  }

  if (metadata.archiveUrl) {
    const archiveResponse = await fetch(metadata.archiveUrl, { signal: AbortSignal.timeout(30000) });
    if (!archiveResponse.ok) throw new Error(t('ERR_REMOTE_DOWNLOAD', { status: archiveResponse.status }));
    const archivePath = path.join(tmpDir, `${localName}.tgz`);
    const buffer = Buffer.from(await archiveResponse.arrayBuffer());
    await fs.writeFile(archivePath, buffer);
    throw new Error(t('ERR_ARCHIVE_NOT_SUPPORTED', { ref: skillRef }));
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
    throw new Error(t('ERR_GITHUB_USAGE'));
  }

  const tempBase = await fs.mkdtemp(path.join(os.tmpdir(), 'skillbase-'));
  try {
    const downloaded = await downloadSkillFromRemote(skillName, tempBase);
    const target = path.join(projectSkillsDir, downloaded.localName);
    if ((await exists(target)) && !force) {
      throw new Error(t('ERR_SKILL_EXISTS', { name: downloaded.localName }));
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
  if (!/^https?:\/\//i.test(repoUrl)) {
    throw new Error(t('ERR_INVALID_REPO_URL'));
  }
  if (!selectedSkill) {
    throw new Error(t('ERR_SKILL_REQUIRED'));
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
      throw new Error(t('ERR_SKILL_NOT_FOUND_REMOTE', { name: selectedSkill }));
    }

    const target = path.join(projectSkillsDir, selectedSkill);
    if ((await exists(target)) && !force) {
      throw new Error(t('ERR_SKILL_EXISTS', { name: selectedSkill }));
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
    throw new Error(t('ERR_MANIFEST_EMPTY'));
  }
  for (const skill of manifest.skills) {
    if (remote || skill.source === 'remote') await installRemoteSkill(skill.name, { cwd, force });
    else await addSkill(skill.name, { cwd, sym: Boolean(skill.linked) });
  }
}

export async function removeSkill(skillName, { cwd = process.cwd(), global = false } = {}) {
  const safeName = sanitizeSkillName(skillName);
  if (!safeName) throw new Error(t('ERR_INVALID_SKILL_NAME', { name: skillName }));
  if (global) {
    await fs.rm(path.join(getGlobalSkillsDir(), safeName), { recursive: true, force: true });
    return;
  }

  await fs.rm(path.join(getProjectSkillsDir(cwd), safeName), { recursive: true, force: true });
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
      ? t('INIT_HARD_TITLE')
      : t('INIT_TITLE')
  });
  if (selection.cancelled) return { technologies, suggested, installed: [], cancelled: true };

  for (const skill of selection.selected) {
    await addSkill(skill, { cwd, sym: false });
  }

  return { technologies, suggested, installed: selection.selected, cancelled: false };
}

/**
 * Extrae metadata de una skill (versión en YAML, updatedAt en lock, mtime).
 */
export async function extractSkillMetadata(skillPath) {
  const metadata = {
    version: null,
    updatedAt: null,
    mtime: null,
    hasVersion: false,
    hasLock: false
  };

  try {
    const stats = await fs.stat(skillPath);
    metadata.mtime = stats.mtime;
  } catch {
    return metadata;
  }

  // 1. Prioridad: YAML frontmatter en SKILL.md
  const skillMdPath = path.join(skillPath, 'SKILL.md');
  if (await exists(skillMdPath)) {
    try {
      const content = await fs.readFile(skillMdPath, 'utf8');
      // Regex para buscar el bloque frontmatter y capturar la versión de forma robusta
      const yamlMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
      if (yamlMatch) {
        const versionMatch = yamlMatch[1].match(/^version:\s*["']?([vV]?([0-9.]+))["']?$/m);
        if (versionMatch) {
          metadata.version = versionMatch[1];
          metadata.hasVersion = true;
        }
      }
    } catch {
      // Ignorar errores de lectura
    }
  }

  // 2. Prioridad: updatedAt en .skill-lock.json
  const lockPath = path.join(skillPath, '.skill-lock.json');
  if (await exists(lockPath)) {
    try {
      const lockData = JSON.parse(await fs.readFile(lockPath, 'utf8'));
      if (lockData.updatedAt) {
        metadata.updatedAt = lockData.updatedAt;
        metadata.hasLock = true;
      }
      // Si no hay versión en YAML, intentar sacar del lock si existe un campo version ahí (opcional)
      if (!metadata.version && lockData.version) {
        metadata.version = lockData.version;
      }
    } catch {
      // Ignorar errores de lectura
    }
  }

  return metadata;
}

/**
 * Lista todas las rutas de migración disponibles con su estado.
 */
export async function listAvailableSources({ fromProject = false } = {}) {
  const rawPaths = fromProject ? PROJECT_MIGRATE_PATHS : GLOBAL_MIGRATE_PATHS;
  const home = os.homedir();
  const results = [];

  for (const rawPath of rawPaths) {
    const fullPath = rawPath.startsWith('~') 
      ? path.join(home, rawPath.slice(1)) 
      : rawPath;

    let skillCount = 0;
    let pathExists = false;

    try {
      if (await exists(fullPath)) {
        pathExists = true;
        const entries = await fs.readdir(fullPath, { withFileTypes: true });
        skillCount = entries.filter(e => e.isDirectory() && !e.name.startsWith('.')).length;
      }
    } catch {
      // Ignorar errores de acceso
    }

    results.push({
      path: rawPath,
      fullPath,
      exists: pathExists,
      skillCount
    });
  }

  return results;
}

/**
 * Escanea múltiples rutas en busca de skills.
 */
export async function scanMigrationSources({ fromProject = false, cwd = process.cwd() } = {}) {
  const allPaths = fromProject ? PROJECT_MIGRATE_PATHS : GLOBAL_MIGRATE_PATHS;
  const configuredSources = getConfiguredSources();
  const rawPaths = configuredSources 
    ? allPaths.filter(p => configuredSources.includes(p))
    : allPaths;
  const home = os.homedir();
  const root = getProjectRoot(cwd);

  const sources = [];
  for (const rawPath of rawPaths) {
    const fullPath = rawPath.startsWith('~') 
      ? path.join(home, rawPath.slice(1)) 
      : path.resolve(root, rawPath);

    if (!(await exists(fullPath))) continue;

    try {
      const stats = await fs.stat(fullPath);
      if (!stats.isDirectory()) continue;

      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const skillPath = path.join(fullPath, entry.name);
        // Evitar carpetas ocultas comunes o utilitarias
        if (entry.name.startsWith('.') && entry.name !== '.agents') {
           // Si el nombre es exactamente .agents y está dentro de una ruta de proyecto, 
           // suele ser la carpeta raíz de agentes, no una skill.
           // Pero en PROJECT_MIGRATE_PATHS tenemos '.agents', así que debemos decidir.
           // Si '.agents' tiene una subcarpeta 'skills', preferimos esa si está en la lista.
           continue; 
        }

        const metadata = await extractSkillMetadata(skillPath);
        sources.push({
          name: entry.name,
          sourcePath: skillPath,
          originPath: fullPath,
          ...metadata
        });
      }
    } catch {
      // Ignorar
    }
  }
  return sources;
}

export async function migrateAgentsSkillsToSkillbase({ fromProject = false, cwd = process.cwd() } = {}) {
  const sources = await scanMigrationSources({ fromProject, cwd });
  const globalDir = getGlobalSkillsDir();
  const rawEntries = (await exists(globalDir)) 
    ? await fs.readdir(globalDir, { withFileTypes: true }).catch(() => []) 
    : [];
  const alreadyInstalled = rawEntries
    .filter(e => typeof e === 'object' && e.isDirectory())
    .map(e => e.name);
  
  // Agrupar por nombre
  const grouped = new Map();
  for (const s of sources) {
    if (!grouped.has(s.name)) grouped.set(s.name, []);
    grouped.get(s.name).push(s);
  }

  const conflicts = [];
  const uniques = [];
  const duplicates = [];

  for (const [name, matches] of grouped.entries()) {
    const existsGlobally = alreadyInstalled.includes(name);
    
    if (existsGlobally) {
      conflicts.push({ name, matches });
    } else if (matches.length === 1) {
      uniques.push(matches[0]);
    } else {
      duplicates.push({ name, matches });
    }
  }

  return { conflicts, uniques, duplicates, totalFound: sources.length };
}

export async function performMigration(skillsToMigrate) {
  const globalDir = getGlobalSkillsDir();
  await ensureDir(globalDir);
  const migrated = [];

  for (const skill of skillsToMigrate) {
    const safeName = sanitizeSkillName(skill.name);
    if (!safeName) continue; // Nombre inválido, omitir
    const targetPath = path.join(globalDir, safeName);
    // Para migración masiva siempre sobreescribimos si el usuario ya lo decidió/seleccionó
    if (await exists(targetPath)) {
      await fs.rm(targetPath, { recursive: true, force: true });
    }
    await copyDir(skill.sourcePath, targetPath);
    migrated.push(safeName);
  }

  return migrated;
}
