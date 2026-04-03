import os from 'node:os';
import path from 'node:path';

export const MANIFEST_FILE = 'skillbase.json';
export const PROJECT_AGENTS_DIR = '.agents';
export const PROJECT_SKILLS_DIR = 'skills';
export const DEFAULT_GLOBAL_ROOTNAME = '.skillbase';

export function getGlobalRootDir() {
  const fromEnv = process.env.SKILLBASE_HOME;
  if (fromEnv) return path.resolve(fromEnv);
  return path.join(os.homedir(), DEFAULT_GLOBAL_ROOTNAME);
}

export function getGlobalSkillsDir() {
  return path.join(getGlobalRootDir(), PROJECT_SKILLS_DIR);
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
