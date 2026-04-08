import path from 'node:path';
import {
  selectSkillsInteractive,
  migrateAgentsSkillsToSkillbase,
  performMigration,
  getGlobalSkillsDir,
  compareVersion,
} from '../core.js';
import { bold, dim2, cyan, green, yellow, S_CHECK, S_BAR, S_BAR_START, S_BAR_END, S_POINTER, S_WARNING } from '../styles.js';
import { t } from '../i18n.js';
import { hasFlag } from '../args.js';

export async function run(args) {
  const fromProject = hasFlag(args, '--promote', '-p');
  const autoMode = hasFlag(args, '--all', '-y', '--yes');

  console.log(`${cyan(S_BAR_START)}  ${dim2(t('MIGRATE_SCANNING'))}`);
  const { conflicts, uniques, duplicates, totalFound } = await migrateAgentsSkillsToSkillbase({
    fromProject,
    cwd: process.cwd(),
  });

  console.log(`${cyan(S_BAR)}  ${bold(t('MIGRATE_FOUND', { count: totalFound }))}`);

  if (totalFound === 0) {
    console.log(`${cyan(S_BAR_END)}  ${dim2(t('MIGRATE_NONE'))}\n`);
    return;
  }

  let migratedCount = 0;

  // Fase 0: Conflictos (skills que ya existen en el destino global)
  let selectedFromConflicts = [];
  if (conflicts.length > 0) {
    if (autoMode) {
      selectedFromConflicts = conflicts;
    } else {
      console.log(`${cyan(S_BAR)}`);
      const { selected, cancelled } = await selectSkillsInteractive({
        skills: conflicts.map((s) => s.name),
        title: t('MIGRATE_CONFLICTS_TITLE'),
        subtitle: t('MIGRATE_CONFLICTS_HINT'),
        actionLabel: t('UI_ACTION_CONFIRM')
      });

      if (cancelled) {
        console.log(`${cyan(S_BAR_END)}  ${dim2(t('CANCELLED'))}\n`);
        return;
      }

      selectedFromConflicts = conflicts.filter((c) => selected.includes(c.name));
    }
  }

  // Fase 1: Skills nuevas únicas (no están en global)
  let selectedFromUniques = [];
  if (uniques.length > 0) {
    if (autoMode) {
      selectedFromUniques = uniques;
    } else {
      console.log(`${cyan(S_BAR)}`);
      const { selected, cancelled } = await selectSkillsInteractive({
        skills: uniques.map((s) => s.name),
        title: t('MIGRATE_UNIQUES_TITLE', { count: uniques.length }),
        actionLabel: t('UI_ACTION_CONFIRM')
      });

      if (cancelled) {
        console.log(`${cyan(S_BAR_END)}  ${dim2(t('CANCELLED'))}\n`);
        return;
      }

      selectedFromUniques = uniques.filter((s) => selected.includes(s.name));
    }
  }

  // Fase de Resolución y Migración Progresiva

  // 1. Migración Directa (Uniques + Conflictos únicos seleccionados)
  const easyMigrate = [
    ...selectedFromUniques,
    ...selectedFromConflicts.filter((g) => g.matches.length === 1).map((g) => g.matches[0]),
  ];

  if (easyMigrate.length > 0) {
    const list = await performMigration(easyMigrate);
    migratedCount += list.length;
  }

  // 2. Resolución de Duplicados
  const toResolveGroups = [...selectedFromConflicts.filter((g) => g.matches.length > 1)];
  const seenNames = new Set(toResolveGroups.map((g) => g.name));

  for (const g of duplicates) {
    if (!seenNames.has(g.name)) {
      toResolveGroups.push(g);
      seenNames.add(g.name);
    }
  }

  if (toResolveGroups.length > 0) {
    if (autoMode) {
      const autoResolved = [];
      for (const group of toResolveGroups) {
        const { skill } = resolveWinner(group.matches, 'latest_ver');
        autoResolved.push(skill);
        console.log(
          `${cyan(S_BAR)}  ${green(S_CHECK)} ${t('MIGRATE_RESOLVED', { skill: bold(group.name), strategy: t('MIGRATE_ACTION_LATEST_VER') })}`
        );
      }
      if (autoResolved.length > 0) {
        const list = await performMigration(autoResolved);
        migratedCount += list.length;
      }
    } else {
      console.log(`${cyan(S_BAR)}`);
      const resolved = await resolveDuplicatesFlow(toResolveGroups);
      if (resolved.length > 0) {
        const list = await performMigration(resolved);
        migratedCount += list.length;
      }
    }
  }

  console.log(`${cyan(S_BAR)}`);
  if (migratedCount > 0) {
    console.log(`${cyan(S_BAR)}  ${bold(t('INIT_RESUMEN'))}`);
    console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${t('MIGRATE_RESUMEN_SUCCESS', { count: bold(migratedCount) })}`);
    console.log(`${cyan(S_BAR)}  ${dim2(S_POINTER)} ${t('MIGRATE_RESUMEN_DEST', { dir: bold(getGlobalSkillsDir()) })}`);
    console.log(`${cyan(S_BAR_END)}\n`);
  } else {
    console.log(`${cyan(S_BAR_END)}  ${dim2(t('MIGRATE_NONE'))}\n`);
  }
}

// ─── Helpers privados ────────────────────────────────────────────────────────

/**
 * Flujo interactivo para resolver duplicados.
 */
async function resolveDuplicatesFlow(duplicates) {
  const resolved = [];
  let remaining = [...duplicates];

  while (remaining.length > 0) {
    const { selected: selectedNames, cancelled } = await selectSkillsInteractive({
      skills: remaining.map((d) => {
        const origins = d.matches.map((m) => {
          const home = process.env.HOME || '';
          let rel = m.originPath.replace(home, '~');

          if (rel.startsWith('~/.')) {
            const parts = rel.split(path.sep === '\\' ? '\\' : '/');
            if (parts[1] === '.config' && parts.length > 2) {
              return `${parts[0]}${path.sep}${parts[1]}${path.sep}${parts[2]}${path.sep}`;
            }
            return `${parts[0]}${path.sep}${parts[1]}${path.sep}`;
          }

          return rel.length > 30 ? '...' + rel.slice(-27) : rel;
        });

        const uniqueOrigins = [...new Set(origins)];
        return { name: d.name, detail: uniqueOrigins.join(', ') };
      }),
      title: t('MIGRATE_DUPLICATES_TITLE', { count: remaining.length }),
      subtitle: t('MIGRATE_RESOLVE_SELECT'),
      actionLabel: t('UI_ACTION_RESOLVE')
    });

    if (cancelled || selectedNames.length === 0) break;

    const action = await selectActionMenu();
    if (!action || action === 'ignore') {
      remaining = remaining.filter((d) => !selectedNames.includes(d.name));
      continue;
    }

    for (const name of selectedNames) {
      const duplicateGroup = remaining.find((d) => d.name === name);
      const winner = resolveWinner(duplicateGroup.matches, action);

      if (winner.fallbackUsed) {
        console.log(`${cyan('│')}  ${yellow('⚠')} ${t('MIGRATE_FALLBACK_VER', { skill: bold(name) })}`);
      }

      resolved.push(winner.skill);
      console.log(
        `${cyan('│')}  ${green('✓')} ${t('MIGRATE_RESOLVED', { skill: bold(name), strategy: t(`MIGRATE_ACTION_${action.toUpperCase()}`) })}`
      );

      remaining = remaining.filter((d) => d.name !== name);
    }
  }

  return resolved;
}

/**
 * Menú de selección de estrategia de resolución.
 */
async function selectActionMenu() {
  const actions = [
    { id: 'latest_ver', label: t('MIGRATE_ACTION_LATEST_VER') },
    { id: 'oldest_ver', label: t('MIGRATE_ACTION_OLDEST_VER') },
    { id: 'latest_fs',  label: t('MIGRATE_ACTION_LATEST_FS') },
    { id: 'oldest_fs',  label: t('MIGRATE_ACTION_OLDEST_FS') },
    { id: 'ignore',     label: t('MIGRATE_ACTION_IGNORE') },
  ];

  const { selected, cancelled } = await selectSkillsInteractive({
    skills: actions.map((a) => a.label),
    title: t('MIGRATE_ACTION_MENU'),
    radio: true,
    clearOnExit: true,
    actionLabel: t('UI_ACTION_CONFIRM')
  });

  if (cancelled || selected.length === 0) return null;

  return actions.find((a) => a.label === selected[0]).id;
}

/**
 * Resuelve el ganador dentro de un grupo de matches según la estrategia.
 */
function resolveWinner(matches, strategy) {
  let fallbackUsed = false;
  let sorted = [...matches];

  const compareTime = (a, b) => {
    const tA = new Date(a.updatedAt || a.mtime || 0).getTime() || 0;
    const tB = new Date(b.updatedAt || b.mtime || 0).getTime() || 0;
    return tA - tB;
  };

  switch (strategy) {
    case 'latest_ver':
      if (!matches.some((m) => m.hasVersion || m.hasLock)) {
        fallbackUsed = true;
        sorted.sort((a, b) => compareTime(b, a));
      } else {
        sorted.sort((a, b) => compareVersion(b.version || '0.0.0', a.version || '0.0.0'));
      }
      break;
    case 'oldest_ver':
      if (!matches.some((m) => m.hasVersion || m.hasLock)) {
        fallbackUsed = true;
        sorted.sort((a, b) => compareTime(a, b));
      } else {
        sorted.sort((a, b) => compareVersion(a.version || '0.0.0', b.version || '0.0.0'));
      }
      break;
    case 'latest_fs':
      sorted.sort((a, b) => compareTime(b, a));
      break;
    case 'oldest_fs':
      sorted.sort((a, b) => compareTime(a, b));
      break;
  }

  return { skill: sorted[0], fallbackUsed };
}
