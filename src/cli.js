import {
  selectSkillsInteractive,
  addSkillsInteractive,
  addSkill,
  checkUpdates,
  compareVersion,
  getGlobalSkillsDir,
  getProjectSkillsDir,
  initProject,
  installFromManifest,
  installRemoteSkillRef,
  listAvailableSources,
  listGlobalSkills,
  listProjectSkills,
  migrateAgentsSkillsToSkillbase,
  performMigration,
  readManifest,
  removeSkill,
  updateSkills
} from './core.js';
import {
  bold,
  dim,
  dim2,
  text,
  grayLogo,
  cyan,
  yellow,
  green,
  red,
  S_DIAMOND,
  S_BULLET,
  S_CHECK,
  S_POINTER,
  S_WARNING,
  S_BAR,
  S_BAR_START,
  S_BAR_END,
  S_STEP
} from './styles.js';
import path from 'node:path';
import { createRequire } from 'node:module';
import { t, setLanguage } from './i18n.js';
import { getConfig, saveConfig } from './config.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

function printLogo() {
  const LOGO_LINES = [
    ' ███████╗██╗  ██╗██╗██╗     ██╗     ██████╗  █████╗ ███████╗███████╗',
    ' ██╔════╝██║ ██╔╝██║██║     ██║     ██╔══██╗██╔══██╗██╔════╝██╔════╝',
    ' ███████╗█████╔╝ ██║██║     ██║     ██████╔╝███████║███████╗█████╗  ',
    ' ╚════██║██╔═██╗ ██║██║     ██║     ██╔══██╗██╔══██║╚════██║██╔══╝  ',
    ' ███████║██║  ██╗██║███████╗███████╗██████╔╝██║  ██║███████║███████╗',
    ' ╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝',
  ];

  console.log();
  LOGO_LINES.forEach((line, i) => {
    console.log(grayLogo(line, i));
  });
  console.log(`  ${dim2(pkg.description)} ${dim2(`v${pkg.version}`)}`);
  console.log();
}

/**
 * Muestra la ayuda principal de la CLI con el estilo Clack.
 */
function printHelp() {
  printLogo();
  console.log(`${cyan(S_BAR_START)}  ${bold(t('USAGE'))}`);
  console.log(`${cyan(S_BAR)}  ${green('skillbase')} ${text('<command> [args] [options]')}`);
  console.log(`${cyan(S_BAR)}`);

  console.log(`${cyan(S_BAR)}  ${bold(t('COMMANDS'))}`);
  const commands = [
    ['ls', `[args]`, t('DESC_LS')],
    ['init', ``, t('DESC_INIT')],
    ['add', `<skill>`, t('DESC_ADD')],
    ['install', `[url]`, t('DESC_INSTALL')],
    ['remove', `[skill]`, t('DESC_REMOVE')],
    ['check', ``, t('DESC_CHECK')],
    ['update', `[skill]`, t('DESC_UPDATE')],
    ['migrate', ``, t('DESC_MIGRATE')],
    ['config', `[sub]`, t('DESC_CONFIG')],
    ['lang', `<lang>`, t('DESC_LANG')],
  ];

  commands.forEach(([cmd, args, desc]) => {
    const fullCmd = `${bold(cmd.padEnd(8))} ${dim2(args.padEnd(8))}`;
    console.log(`${cyan(S_BAR)}  ${fullCmd} ${text(desc)}`);
  });

  console.log(`${cyan(S_BAR)}`);
  console.log(`${cyan(S_BAR)}  ${bold(t('OPTIONS'))}`);
  const options = [
    ['-r, --remote ', t('OPT_REMOTE')],
    ['-f, --force  ', t('OPT_FORCE')],
    ['-s, --sym    ', t('OPT_SYM')],
    ['-g, --global ', t('OPT_GLOBAL')],
    ['-y, --all    ', t('OPT_ALL')],
    ['-h, --help   ', t('OPT_HELP')],
  ];

  options.forEach(([opt, desc]) => {
    console.log(`${cyan(S_BAR)}  ${dim2(opt.padEnd(14))}  ${dim2(desc)}`);
  });

  console.log(`${cyan(S_BAR)}`);
  console.log(`${cyan(S_BAR_END)}  ${dim2(t('SHORTCUTS'))}\n`);
}

/**
 * Muestra una lista resumida de comandos cuando no se indica ninguno.
 */
function printCommandList() {
  printLogo();
  console.log(`${cyan(S_BAR_START)}  ${bold(t('COMMANDS_AVAILABLE'))}`);
  
  const quickList = [
    ['ls', t('DESC_LS_SHORT')],
    ['init', t('DESC_INIT_SHORT')],
    ['add', t('DESC_ADD_SHORT')],
    ['install', t('DESC_INSTALL_SHORT')],
    ['migrate', t('DESC_MIGRATE_SHORT')],
    ['config', t('DESC_CONFIG_SHORT')],
    ['lang', t('DESC_LANG_SHORT')],
  ];

  quickList.forEach(([cmd, desc]) => {
    console.log(`${cyan(S_BAR)}  ${bold(cmd.padEnd(12))} ${dim2(desc)}`);
  });

  console.log(`${cyan(S_BAR)}`);
  console.log(`${cyan(S_BAR_END)}  ${dim2(t('USE_HELP', { cmd: yellow('skillbase --help') }))}\n`);
}

function hasFlag(args, ...flags) {
  return args.some((arg) => flags.includes(arg));
}

function getFlagValue(args, ...flags) {
  for (let i = 0; i < args.length; i += 1) {
    if (flags.includes(args[i])) return args[i + 1] ?? null;
  }
  return null;
}

/**
 * Punto de entrada principal de la CLI.
 */
export async function runCLI(argv) {
  const args = argv.slice(2);
  const [rawCommand, maybeSkill] = args;
  const commandAliases = {
    h: '-h',
    l: 'ls',
    a: 'add',
    i: 'install',
    rm: 'remove',
    c: 'check',
    up: 'update',
    m: 'migrate',
    cfg: 'config'
  };
  const command = commandAliases[rawCommand] ?? rawCommand;

  if (!command) {
    printCommandList();
    return;
  }

  if (command === '-h' || command === '--help' || hasFlag(args, '-h', '--help')) {
    printHelp();
    return;
  }

  switch (command) {
    case 'ls': {
      const showGlobal = hasFlag(args, '--global', '-g');
      if (showGlobal) {
        const skills = await listGlobalSkills();
        if (!skills.length) {
          console.log(`${yellow(S_WARNING)} ${t('LS_GLOBAL_EMPTY', { dir: dim2(getGlobalSkillsDir()) })}`);
        } else {
          console.log(`${cyan(S_BAR_START)}  ${bold(t('LS_GLOBAL_TITLE', { dir: dim2(getGlobalSkillsDir()) }))}`);
          skills.forEach((skill) => console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${text(skill)}`));
          console.log(`${cyan(S_BAR_END)}\n`);
        }
      } else {
        const skills = await listProjectSkills();
        if (!skills.length) {
          console.log(`${yellow(S_WARNING)} ${t('LS_PROJECT_EMPTY', { dir: dim2(getProjectSkillsDir()) })}`);
        } else {
          console.log(`${cyan(S_BAR_START)}  ${bold(t('LS_PROJECT_TITLE', { dir: dim2(getProjectSkillsDir()) }))}`);
          skills.forEach((skill) => console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${text(skill)}`));
          console.log(`${cyan(S_BAR_END)}\n`);
        }
      }
      return;
    }

    case 'init': {
      printLogo();
      const result = await initProject({ hard: hasFlag(args, '--hard') });
      
      if (result.cancelled) {
        console.log(`${cyan(S_BAR_START)}  ${dim2(t('CANCELLED'))}`);
        console.log(`${cyan(S_BAR_END)}`);
        return;
      }

      if (!result.technologies.length) {
        console.log(`${yellow(S_WARNING)} ${t('INIT_NO_STACK')}`);
        return;
      }

      console.log(`${cyan(S_BAR_START)}  ${bold(t('INIT_ANALYSIS'))}`);
      result.technologies.forEach((tech) => {
        console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${text(tech)}`);
      });
      console.log(`${cyan(S_BAR)}`);

      if (result.installed.length) {
        console.log(`${cyan(S_BAR_START)}  ${bold(t('INIT_RESUMEN'))}`);
        console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${t('INIT_INSTALLED', { list: bold(result.installed.join(', ')) })}`);
        console.log(`${cyan(S_BAR_END)}\n`);
      } else {
        console.log(`${cyan(S_BAR_END)}  ${dim2(t('INIT_NONE'))}\n`);
      }
      return;
    }

    case 'add': {
      if (!maybeSkill) {
        printLogo();
        const result = await addSkillsInteractive({ sym: hasFlag(args, '--sym', '-s') });
        if (result.cancelled) {
          console.log(`${cyan(S_BAR_START)}  ${dim2(t('SELECTION_CANCELLED'))}`);
          console.log(`${cyan(S_BAR_END)}`);
          return;
        }
        if (!result.selected.length) {
          console.log(`${cyan(S_BAR_END)}  ${dim2(t('ADD_NO_SELECTED'))}\n`);
          return;
        }
        console.log(`${cyan(S_BAR_START)}  ${bold(t('ADD_RESUMEN'))}`);
        console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${t('INIT_INSTALLED', { list: bold(result.selected.join(', ')) })}`);
        console.log(`${cyan(S_BAR_END)}\n`);
        return;
      }
      await addSkill(maybeSkill, { sym: hasFlag(args, '--sym', '-s') });
      console.log(`${cyan(S_BAR_START)}  ${bold(t('ADD_RESUMEN'))}`);
      console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${t('ADD_SUCCESS', { skill: bold(maybeSkill) })}`);
      console.log(`${cyan(S_BAR_END)}\n`);
      return;
    }

    case 'install': {
      if (maybeSkill && hasFlag(args, '--remote', '-r')) {
        await installRemoteSkillRef(maybeSkill, {
          force: hasFlag(args, '--force', '-f'),
          skill: getFlagValue(args, '--skill', '-k')
        });
        console.log(`${cyan(S_BAR_START)}  ${bold(t('INIT_RESUMEN'))}`);
        console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${t('ADD_REMOTE_SUCCESS', { skill: bold(maybeSkill) })}`);
        console.log(`${cyan(S_BAR_END)}\n`);
        return;
      }
      if (maybeSkill && !hasFlag(args, '--remote', '-r')) {
        throw new Error(t('INSTALL_ERROR_SINGLE'));
      }
      await installFromManifest({ remote: hasFlag(args, '--remote', '-r'), force: hasFlag(args, '--force', '-f') });
      const manifest = await readManifest();
      console.log(`${cyan(S_BAR_START)}  ${bold(t('INIT_RESUMEN'))}`);
      console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${t('INSTALL_MANIFEST_SUCCESS', { count: bold(manifest.skills.length) })}`);
      console.log(`${cyan(S_BAR_END)}\n`);
      return;
    }

    case 'remove': {
      const isGlobal = hasFlag(args, '-g', '--global');
      const removeAll = hasFlag(args, '-a', '--all');

      let skillsToRemove = (maybeSkill && !maybeSkill.startsWith('-')) ? [maybeSkill] : null;

      if (removeAll) {
        printLogo();
        const skills = isGlobal ? await listGlobalSkills() : await listProjectSkills();

        if (!skills.length) {
          console.log(`${yellow(S_WARNING)} ${t('REMOVE_NO_SKILLS')}`);
          return;
        }

        const scope = isGlobal ? t('REMOVE_SCOPE_GLOBAL') : t('REMOVE_SCOPE_PROJECT');
        console.log(`${cyan(S_BAR_START)}  ${red(bold(t('REMOVE_ALL_CONFIRM_TITLE', { count: bold(skills.length), scope })))}`);
        skills.forEach(s => console.log(`${cyan(S_BAR)}  ${dim2(S_POINTER)} ${text(s)}`));
        console.log(`${cyan(S_BAR)}`);

        const { selected: answer, cancelled } = await selectSkillsInteractive({
          skills: [t('REMOVE_ALL_NO'), t('REMOVE_ALL_YES')],
          title: t('REMOVE_ALL_CONFIRM_PROMPT'),
          radio: true,
          clearOnExit: true
        });

        if (cancelled || !answer.length || answer[0] === t('REMOVE_ALL_NO')) {
          console.log(`${cyan(S_BAR_START)}  ${dim2(t('CANCELLED'))}`);
          console.log(`${cyan(S_BAR_END)}`);
          return;
        }

        skillsToRemove = skills;
      }

      if (!skillsToRemove) {
        printLogo();
        const skills = isGlobal ? await listGlobalSkills() : await listProjectSkills();

        if (!skills.length) {
          console.log(`${yellow(S_WARNING)} ${t('REMOVE_NO_SKILLS')}`);
          return;
        }

        const { selected, cancelled } = await selectSkillsInteractive({
          skills,
          title: t('REMOVE_SELECT_TITLE'),
          clearOnExit: true
        });

        if (cancelled || !selected.length) {
          console.log(`${cyan(S_BAR_START)}  ${dim2(t('REMOVE_NO_SELECTED'))}`);
          console.log(`${cyan(S_BAR_END)}`);
          return;
        }

        skillsToRemove = selected;
      }

      console.log(`${cyan(S_BAR_START)}  ${bold(t('INIT_RESUMEN'))}`);
      for (const skill of skillsToRemove) {
        await removeSkill(skill, { global: isGlobal });
        if (isGlobal) {
          console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${t('REMOVE_GLOBAL_SUCCESS', { skill: bold(skill) })}`);
        } else {
          console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${t('REMOVE_PROJECT_SUCCESS', { skill: bold(skill) })}`);
        }
      }
      console.log(`${cyan(S_BAR_END)}\n`);
      return;
    }

    case 'check': {
      console.log(`${cyan(S_BAR_START)}  ${dim2(t('CHECK_SEARCHING'))}`);
      const updates = await checkUpdates({ remoteOnly: hasFlag(args, '--remote', '-r') });
      if (!updates.length) {
        console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${t('CHECK_UP_TO_DATE')}`);
        console.log(`${cyan(S_BAR_END)}\n`);
        return;
      }
      console.log(`${cyan(S_BAR)}  ${bold(t('CHECK_UPDATES_FOUND'))}`);
      updates.forEach((item) => {
        console.log(`${cyan(S_BAR)}  ${yellow(S_POINTER)} ${item.name}: ${dim2(item.current ?? '?')} ${dim2(S_STEP)} ${green(item.latest)} ${dim2(`(${item.source})`)}`);
      });
      console.log(`${cyan(S_BAR)}`);
      console.log(`${cyan(S_BAR_END)}  ${dim2(t('CHECK_UPDATE_HINT', { cmd: yellow('skillbase update') }))}\n`);
      return;
    }

    case 'update': {
      const skill = maybeSkill && !maybeSkill.startsWith('-') ? maybeSkill : null;
      console.log(`${cyan(S_BAR_START)}  ${dim2(t('UPDATE_START'))}`);
      await updateSkills({
        skillName: skill,
        remoteOnly: hasFlag(args, '--remote', '-remote', '-r'),
        force: hasFlag(args, '--force', '-f')
      });
      console.log(`${cyan(S_BAR)}  ${bold(t('INIT_RESUMEN'))}`);
      if (skill) {
        console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${t('UPDATE_SINGLE_SUCCESS', { skill: bold(skill) })}`);
      } else {
        console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${t('UPDATE_SUCCESS')}`);
      }
      console.log(`${cyan(S_BAR_END)}\n`);
      return;
    }

    case 'migrate': {
      const fromProject = hasFlag(args, '--promote', '-p');
      const autoMode = hasFlag(args, '--all', '-y', '--yes');
      
      console.log(`${cyan(S_BAR_START)}  ${dim2(t('MIGRATE_SCANNING'))}`);
      const { conflicts, uniques, duplicates, totalFound } = await migrateAgentsSkillsToSkillbase({
        fromProject,
        cwd: process.cwd()
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
                skills: conflicts.map(s => s.name),
                title: t('MIGRATE_CONFLICTS_TITLE'),
                hint: t('MIGRATE_CONFLICTS_HINT')
            });

            if (cancelled) {
                console.log(`${cyan(S_BAR_END)}  ${dim2(t('CANCELLED'))}\n`);
                return;
            }

            selectedFromConflicts = conflicts.filter(c => selected.includes(c.name));
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
                skills: uniques.map(s => s.name),
                title: t('MIGRATE_UNIQUES_TITLE', { count: uniques.length })
            });
            
            if (cancelled) {
                console.log(`${cyan(S_BAR_END)}  ${dim2(t('CANCELLED'))}\n`);
                return;
            }

            selectedFromUniques = uniques.filter(s => selected.includes(s.name));
        }
      }

      // Fase de Resolución y Migración Progresiva
      
      // 1. Migración Directa (Uniques seleccionadas + Conflictos únicos seleccionados)
      const easyMigrate = [
          ...selectedFromUniques,
          ...selectedFromConflicts.filter(g => g.matches.length === 1).map(g => g.matches[0])
      ];

      if (easyMigrate.length > 0) {
          const list = await performMigration(easyMigrate);
          migratedCount += list.length;
      }

      // 2. Resolución de Duplicados (Conflictos duplicados seleccionados + Todos los nuevos duplicados)
      const toResolveGroups = [...selectedFromConflicts.filter(g => g.matches.length > 1)];
      const seenNames = new Set(toResolveGroups.map(g => g.name));

      for (const g of duplicates) {
          if (!seenNames.has(g.name)) {
              toResolveGroups.push(g);
              seenNames.add(g.name);
          }
      }

      if (toResolveGroups.length > 0) {
        if (autoMode) {
            // Resolución Automática: Siempre usamos 'latest_ver'
            const autoResolved = [];
            for (const group of toResolveGroups) {
                const { skill } = resolveWinner(group.matches, 'latest_ver');
                autoResolved.push(skill);
                console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${t('MIGRATE_RESOLVED', { skill: bold(group.name), strategy: t('MIGRATE_ACTION_LATEST_VER') })}`);
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
      return;
    }

    case 'config': {
      const subcommand = maybeSkill;
      const resetFlag = hasFlag(args, '--reset');

      if (!subcommand || subcommand === 'show') {
        // Mostrar configuración actual
        const config = getConfig();
        console.log(`${cyan(S_BAR_START)}  ${bold(t('CONFIG_CURRENT_TITLE'))}`);
        console.log(`${cyan(S_BAR)}  ${t('CONFIG_CURRENT_LANG', { lang: bold(config.lang || 'en') })}`);
        if (Array.isArray(config.sources) && config.sources.length > 0) {
          console.log(`${cyan(S_BAR)}  ${t('CONFIG_CURRENT_SOURCES', { list: '' })}`);
          for (const src of config.sources) {
            console.log(`${cyan(S_BAR)}    ${dim2(S_POINTER)} ${text(src)}`);
          }
        } else {
          console.log(`${cyan(S_BAR)}  ${t('CONFIG_CURRENT_SOURCES_ALL')}`);
        }
        console.log(`${cyan(S_BAR_END)}\n`);
        return;
      }

      if (subcommand === 'sources') {
        if (resetFlag) {
          const config = getConfig();
          delete config.sources;
          saveConfig(config);
          console.log(`${cyan(S_BAR_START)}  ${green(S_CHECK)} ${t('CONFIG_SOURCES_RESET')}`);
          console.log(`${cyan(S_BAR_END)}\n`);
          return;
        }

        // Listar todas las rutas disponibles con estado, ordenar por cantidad de skills
        const available = (await listAvailableSources()).sort((a, b) => {
          // Primero las que tienen skills (desc), luego vacías, luego no encontradas
          if (a.exists !== b.exists) return a.exists ? -1 : 1;
          return b.skillCount - a.skillCount;
        });
        const config = getConfig();
        const currentSources = Array.isArray(config.sources) ? config.sources : [];

        // Preparar opciones para el selector: pre-seleccionar las ya configuradas
        const skillOptions = available.map(s => {
          let detail;
          if (!s.exists) detail = dim2(t('CONFIG_SOURCES_DETAIL_NOT_FOUND'));
          else if (s.skillCount === 0) detail = dim2(t('CONFIG_SOURCES_DETAIL_EMPTY'));
          else detail = green(t('CONFIG_SOURCES_DETAIL_SKILLS', { count: s.skillCount }));

          return {
            name: s.path,
            detail
          };
        });

        const { selected, cancelled } = await selectSkillsInteractive({
          skills: skillOptions,
          title: t('CONFIG_SOURCES_TITLE')
        });

        if (cancelled) {
          console.log(`${cyan(S_BAR_END)}  ${dim2(t('CANCELLED'))}\n`);
          return;
        }

        if (selected.length === 0 || selected.length === available.length) {
          // Si selecciona todas o ninguna, es equivalente a "todas" (reset)
          delete config.sources;
          saveConfig(config);
          console.log(`${cyan(S_BAR)}`);
          console.log(`${cyan(S_BAR_END)}  ${green(S_CHECK)} ${t('CONFIG_SOURCES_RESET')}\n`);
        } else {
          config.sources = selected;
          saveConfig(config);
          console.log(`${cyan(S_BAR)}`);
          console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${t('CONFIG_SOURCES_SAVED', { count: bold(selected.length) })}`);
          for (const src of selected) {
            console.log(`${cyan(S_BAR)}    ${dim2(S_POINTER)} ${text(src)}`);
          }
          console.log(`${cyan(S_BAR_END)}\n`);
        }
        return;
      }

      throw new Error(t('CONFIG_UNKNOWN_SUB', { sub: subcommand }));
    }

    case 'lang': {
      if (!maybeSkill || !['en', 'es'].includes(maybeSkill)) {
        throw new Error(t('LANG_INVALID', { lang: maybeSkill || '??' }));
      }
      const config = await getConfig();
      config.lang = maybeSkill;
      saveConfig(config);
      console.log(`${cyan(S_BAR_START)}  ${bold(t('LANG_SUCCESS', { lang: maybeSkill === 'es' ? 'Español' : 'English' }))}`);
      console.log(`${cyan(S_BAR_END)}\n`);
      return;
    }

    default:
      throw new Error(t('UNKNOWN_COMMAND', { cmd: command }));
  }
}

/**
 * Flujo interactivo para resolver duplicados.
 */
async function resolveDuplicatesFlow(duplicates) {
  const resolved = [];
  let remaining = [...duplicates];

  while (remaining.length > 0) {
    // 1. Mostrar lista de duplicados restantes para seleccionar
    const { selected: selectedNames, cancelled } = await selectSkillsInteractive({
      skills: remaining.map(d => {
        // Formatear las rutas de origen para que sean más legibles y menos redundantes
        const origins = d.matches.map(m => {
          const home = process.env.HOME || '';
          let rel = m.originPath.replace(home, '~');
          
          if (rel.startsWith('~/.')) {
            const parts = rel.split(path.sep === '\\' ? '\\' : '/');
            // Si es ~/.config, incluimos el siguiente nivel (ej: ~/.config/agents/)
            if (parts[1] === '.config' && parts.length > 2) {
              return `${parts[0]}${path.sep}${parts[1]}${path.sep}${parts[2]}${path.sep}`;
            }
            return `${parts[0]}${path.sep}${parts[1]}${path.sep}`;
          }
          
          return rel.length > 30 ? '...' + rel.slice(-27) : rel;
        });

        // Eliminar duplicados de nombres de origen si los hay (por si acaso)
        const uniqueOrigins = [...new Set(origins)];

        return {
          name: d.name,
          detail: uniqueOrigins.join(', ')
        };
      }),
      title: t('MIGRATE_DUPLICATES_TITLE', { count: remaining.length }),
      subtitle: t('MIGRATE_RESOLVE_SELECT')
    });

    if (cancelled || selectedNames.length === 0) break;

    // 2. Mostrar menú de acciones
    const action = await selectActionMenu();
    if (!action || action === 'ignore') {
      // Eliminar de la lista pero no migrar
      remaining = remaining.filter(d => !selectedNames.includes(d.name));
      continue;
    }

    // 3. Resolver según la acción
    for (const name of selectedNames) {
      const duplicateGroup = remaining.find(d => d.name === name);
      const winner = resolveWinner(duplicateGroup.matches, action);
      
      if (winner.fallbackUsed) {
        console.log(`${cyan(S_BAR)}  ${yellow(S_WARNING)} ${t('MIGRATE_FALLBACK_VER', { skill: bold(name) })}`);
      }
      
      resolved.push(winner.skill);
      console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${t('MIGRATE_RESOLVED', { skill: bold(name), strategy: t(`MIGRATE_ACTION_${action.toUpperCase()}`) })}`);
      
      // Quitar de la cola
      remaining = remaining.filter(d => d.name !== name);
    }
  }

  return resolved;
}

/**
 * Menú de un solo nivel para elegir la acción de resolución.
 */
async function selectActionMenu() {
  const actions = [
    { id: 'latest_ver', label: t('MIGRATE_ACTION_LATEST_VER') },
    { id: 'oldest_ver', label: t('MIGRATE_ACTION_OLDEST_VER') },
    { id: 'latest_fs', label: t('MIGRATE_ACTION_LATEST_FS') },
    { id: 'oldest_fs', label: t('MIGRATE_ACTION_OLDEST_FS') },
    { id: 'ignore', label: t('MIGRATE_ACTION_IGNORE') }
  ];

  // Reutilizamos la lógica de selección pero configurada para 1 solo item (o similar)
  // Como no queremos complicar el core, haremos un prompt simple o usaremos selectSkills de nuevo con limitación.
  // Por ahora usaremos selectSkillsFromList de core inyectando los labels.
  
  const { selected, cancelled } = await selectSkillsInteractive({
    skills: actions.map(a => a.label),
    title: t('MIGRATE_ACTION_MENU'),
    radio: true,
    clearOnExit: true
  });

  if (cancelled || selected.length === 0) return null;
  
  // Devolvemos el ID de la primera acción seleccionada (aunque el usuario solo debería elegir una según el i18n)
  return actions.find(a => a.label === selected[0]).id;
}

/**
 * Resuelve el ganador dentro de un grupo de matches.
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
      if (!matches.some(m => m.hasVersion || m.hasLock)) {
        fallbackUsed = true;
        sorted.sort((a, b) => compareTime(b, a)); // Fallback a fecha más reciente
      } else {
        sorted.sort((a, b) => {
          const vA = a.version || '0.0.0';
          const vB = b.version || '0.0.0';
          return compareVersion(vB, vA); // Descendente
        });
      }
      break;
    case 'oldest_ver':
      if (!matches.some(m => m.hasVersion || m.hasLock)) {
        fallbackUsed = true;
        sorted.sort((a, b) => compareTime(a, b)); // Fallback a fecha más vieja
      } else {
        sorted.sort((a, b) => {
          const vA = a.version || '0.0.0';
          const vB = b.version || '0.0.0';
          return compareVersion(vA, vB); // Ascendente
        });
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
