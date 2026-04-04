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
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch {
    // Omitir errores de lectura
  }
  return { lang: 'en' };
}

export function saveConfig(config) {
  const configPath = getGlobalConfigPath();
  const rootDir = getGlobalRootDir();
  if (!fs.existsSync(rootDir)) {
    fs.mkdirSync(rootDir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
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
