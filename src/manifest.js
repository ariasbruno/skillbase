import fs from 'node:fs/promises';
import { getManifestPath } from './config.js';

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function safeReadJson(file, fallback) {
  if (!(await exists(file))) return fallback;
  const raw = await fs.readFile(file, 'utf8');
  return JSON.parse(raw);
}

export async function writeJson(file, data) {
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export async function readManifest(cwd = process.cwd()) {
  const manifest = await safeReadJson(getManifestPath(cwd), { skills: [] });
  if (!Array.isArray(manifest.skills)) manifest.skills = [];
  return manifest;
}

export async function writeManifest(manifest, cwd = process.cwd()) {
  await writeJson(getManifestPath(cwd), manifest);
}

export function upsertSkill(manifest, record) {
  const idx = manifest.skills.findIndex((skill) => skill.name === record.name);
  if (idx === -1) manifest.skills.push(record);
  else manifest.skills[idx] = { ...manifest.skills[idx], ...record };
}

export function removeSkillFromManifest(manifest, skillName) {
  manifest.skills = manifest.skills.filter((skill) => skill.name !== skillName);
}
