import {
  addSkillsInteractive,
  addSkill,
  checkUpdates,
  getGlobalSkillsDir,
  getProjectSkillsDir,
  initProject,
  installFromManifest,
  installRemoteSkillRef,
  listGlobalSkills,
  listProjectSkills,
  migrateAgentsSkillsToSkillbase,
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
    ['remove', `<skill>`, t('DESC_REMOVE')],
    ['check', ``, t('DESC_CHECK')],
    ['update', `[skill]`, t('DESC_UPDATE')],
    ['migrate', ``, t('DESC_MIGRATE')],
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
    m: 'migrate'
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
      if (!maybeSkill) throw new Error(t('REMOVE_REQUIRED'));
      const isGlobal = hasFlag(args, '-g', '--global');
      await removeSkill(maybeSkill, { global: isGlobal });
      console.log(`${cyan(S_BAR_START)}  ${bold(t('INIT_RESUMEN'))}`);
      if (isGlobal) {
        console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${t('REMOVE_GLOBAL_SUCCESS', { skill: bold(maybeSkill) })}`);
      } else {
        console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${t('REMOVE_PROJECT_SUCCESS', { skill: bold(maybeSkill) })}`);
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
      const result = await migrateAgentsSkillsToSkillbase({
        force: hasFlag(args, '--force', '-f'),
        fromProject
      });
      console.log(`${cyan(S_BAR_START)}  ${bold(t('MIGRATE_TITLE'))}`);
      console.log(`${cyan(S_BAR)}  ${dim2(S_POINTER)} ${t('MIGRATE_SOURCE', { dir: dim2(`${result.sourceRoot}/skills`) })}`);
      console.log(`${cyan(S_BAR)}  ${dim2(S_POINTER)} ${t('MIGRATE_FOUND', { count: bold(result.totalFound) })}`);

      if (result.migrated.length) {
        console.log(`${cyan(S_BAR)}`);
        console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${t('MIGRATE_SUCCESS_LIST', { dir: dim2(getGlobalSkillsDir()) })}`);
        result.migrated.forEach((skill) => console.log(`${cyan(S_BAR)}    ${dim2('·')} ${text(skill)}`));
      }
      if (result.skipped.length) {
        console.log(`${cyan(S_BAR)}`);
        console.log(`${cyan(S_BAR)}  ${yellow(S_POINTER)} ${t('MIGRATE_SKIPPED_LIST')}`);
        result.skipped.forEach((skill) => console.log(`${cyan(S_BAR)}    ${dim2('·')} ${text(skill)}`));
      }

      if (result.migrated.length) {
        console.log(`${cyan(S_BAR)}`);
        console.log(`${cyan(S_BAR)}  ${bold(t('INIT_RESUMEN'))}`);
        console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${t('MIGRATE_RESUMEN_SUCCESS', { count: bold(result.migrated.length) })}`);
        console.log(`${cyan(S_BAR)}  ${dim2(S_POINTER)} ${t('MIGRATE_RESUMEN_DEST', { dir: bold(getGlobalSkillsDir()) })}`);
        console.log(`${cyan(S_BAR_END)}\n`);
      } else {
        console.log(`${cyan(S_BAR_END)}  ${dim2(t('MIGRATE_NONE'))}\n`);
      }
      return;
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
