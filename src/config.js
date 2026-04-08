import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const MANIFEST_FILE = 'skillbase.json';
export const PROJECT_AGENTS_DIR = '.agents';
export const PROJECT_SKILLS_DIR = 'skills';
export const DEFAULT_GLOBAL_ROOTNAME = '.skillbase';
export const CONFIG_FILE = 'config.json';

export async function exists(target) {
  try {
    await fsp.access(target);
    return true;
  } catch {
    return false;
  }
}

export function getGlobalRootDir() {
  const fromEnv = process.env.SKILLBASE_HOME;
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(os.homedir(), DEFAULT_GLOBAL_ROOTNAME);
}

export function getGlobalSkillsDir() {
  return path.join(getGlobalRootDir(), PROJECT_SKILLS_DIR);
}

export function getGlobalConfigPath() {
  return path.join(getGlobalRootDir(), CONFIG_FILE);
}

export function getConfig() {
  const configPath = getGlobalConfigPath();
  const defaultConfig = { lang: 'en', autoUpdate: true };
  try {
    if (fs.existsSync(configPath)) {
      return { ...defaultConfig, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
    }
  } catch {
    // Omitir errores de lectura
  }
  return defaultConfig;
}

export function saveConfig(config) {
  const configPath = getGlobalConfigPath();
  const rootDir = getGlobalRootDir();
  if (!fs.existsSync(rootDir)) {
    fs.mkdirSync(rootDir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 * Devuelve las fuentes configuradas por el usuario, o null si no hay filtro.
 */
export function getConfiguredSources() {
  const config = getConfig();
  if (Array.isArray(config.sources) && config.sources.length > 0) {
    return config.sources;
  }
  return null;
}

export function getProjectRoot(cwd = process.cwd()) {
  return cwd;
}

export function getProjectSkillsDir(cwd = process.cwd()) {
  return path.join(getProjectRoot(cwd), PROJECT_AGENTS_DIR, PROJECT_SKILLS_DIR);
}

export function getManifestPath(cwd = process.cwd()) {
  return path.join(getProjectRoot(cwd), MANIFEST_FILE);
}

export const GLOBAL_MIGRATE_PATHS = [
  // Universal / shared (~/.agents, ~/.config/agents)
  '~/.agents/skills',
  '~/.config/agents/skills',
  // Per-agent global dirs (alphabetical by agent name)
  '~/.adal/skills',
  '~/.augment/skills',
  '~/.bob/skills',
  '~/.claude/skills',
  '~/.clawdbot/skills',
  '~/.codex/skills',
  '~/.codebuddy/skills',
  '~/.commandcode/skills',
  '~/.continue/skills',
  '~/.snowflake/cortex/skills',
  '~/.config/crush/skills',
  '~/.cursor/skills',
  '~/.deepagents/agent/skills',
  '~/.factory/skills',
  '~/.firebender/skills',
  '~/.gemini/antigravity/skills',
  '~/.gemini/skills',
  '~/.copilot/skills',
  '~/.config/goose/skills',
  '~/.iflow/skills',
  '~/.junie/skills',
  '~/.kilocode/skills',
  '~/.kiro/skills',
  '~/.kode/skills',
  '~/.mcpjam/skills',
  '~/.moltbot/skills',
  '~/.mux/skills',
  '~/.neovate/skills',
  '~/.openclaw/skills',
  '~/.config/opencode/skills',
  '~/.openhands/skills',
  '~/.pi/agent/skills',
  '~/.pochi/skills',
  '~/.qoder/skills',
  '~/.qwen/skills',
  '~/.roo/skills',
  '~/.trae/skills',
  '~/.trae-cn/skills',
  '~/.vibe/skills',
  '~/.codeium/windsurf/skills',
  '~/.zencoder/skills'
];

export const PROJECT_MIGRATE_PATHS = [
  // Universal
  '.agents/skills',
  '.agents',
  '.agent',
  // Per-agent project dirs (alphabetical)
  '.adal/skills',
  '.augment/skills',
  '.bob/skills',
  '.claude/skills',
  '.codebuddy/skills',
  '.codex/skills',
  '.commandcode/skills',
  '.continue/skills',
  '.cortex/skills',
  '.crush/skills',
  '.factory/skills',
  '.firebender/skills',
  '.goose/skills',
  '.iflow/skills',
  '.junie/skills',
  '.kilocode/skills',
  '.kiro/skills',
  '.kode/skills',
  '.mcpjam/skills',
  '.mux/skills',
  '.neovate/skills',
  '.openhands/skills',
  '.pi/skills',
  '.pochi/skills',
  '.qoder/skills',
  '.qwen/skills',
  '.roo/skills',
  '.trae/skills',
  '.trae-cn/skills',
  '.vibe/skills',
  '.windsurf/skills',
  '.zencoder/skills',
  'skills'
];

