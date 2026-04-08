import fs from 'node:fs/promises';
import { getManifestPath, exists } from './config.js';

const manifestCache = new Map();

async function safeReadJson(file, fallback) {
  if (!(await exists(file))) return fallback;
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Warning: Failed to parse JSON at ${file}. Using fallback.`);
    return fallback;
  }
}

export async function writeJson(file, data) {
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export async function readManifest(cwd = process.cwd()) {
  const path = getManifestPath(cwd);
  if (manifestCache.has(path)) {
    return JSON.parse(JSON.stringify(manifestCache.get(path)));
  }
  const manifest = await safeReadJson(path, { skills: [] });
  if (!Array.isArray(manifest.skills)) manifest.skills = [];
  manifestCache.set(path, JSON.parse(JSON.stringify(manifest)));
  return manifest;
}

export async function writeManifest(manifest, cwd = process.cwd()) {
  const path = getManifestPath(cwd);
  await writeJson(path, manifest);
  manifestCache.set(path, JSON.parse(JSON.stringify(manifest)));
}

export function upsertSkill(manifest, record) {
  const idx = manifest.skills.findIndex((skill) => skill.name === record.name);
  if (idx === -1) manifest.skills.push(record);
  else manifest.skills[idx] = { ...manifest.skills[idx], ...record };
}

export function removeSkillFromManifest(manifest, skillName) {
  manifest.skills = manifest.skills.filter((skill) => skill.name !== skillName);
}
