/**
 * Componentes de UI compartidos de la CLI (logo, ayuda, lista de comandos).
 */
import { createRequire } from 'node:module';
import {
  bold,
  dim2,
  text,
  grayLogo,
  cyan,
  yellow,
  green,
  S_BAR,
  S_BAR_START,
  S_BAR_END,
} from './styles.js';
import { t } from './i18n.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

export function printLogo() {
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

export function printHelp() {
  printLogo();
  console.log(`${cyan(S_BAR_START)}  ${bold(t('USAGE'))}`);
  console.log(`${cyan(S_BAR)}  ${green('skillbase')} ${text('<command> [args] [options]')}`);
  console.log(`${cyan(S_BAR)}`);

  console.log(`${cyan(S_BAR)}  ${bold(t('COMMANDS'))}`);
  const commands = [
    ['ls',      '[args]',   t('DESC_LS')],
    ['init',    '',         t('DESC_INIT')],
    ['add',     '<skill>',  t('DESC_ADD')],
    ['install', '[url]',    t('DESC_INSTALL')],
    ['remove',  '[skill]',  t('DESC_REMOVE')],
    ['check',   '',         t('DESC_CHECK')],
    ['update',  '[skill]',  t('DESC_UPDATE')],
    ['migrate', '',         t('DESC_MIGRATE')],
    ['config',  '[sub]',    t('DESC_CONFIG')],
    ['lang',    '<lang>',   t('DESC_LANG')],
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

export function printCommandList() {
  printLogo();
  console.log(`${cyan(S_BAR_START)}  ${bold(t('COMMANDS_AVAILABLE'))}`);

  const quickList = [
    ['ls',      t('DESC_LS_SHORT')],
    ['init',    t('DESC_INIT_SHORT')],
    ['add',     t('DESC_ADD_SHORT')],
    ['install', t('DESC_INSTALL_SHORT')],
    ['migrate', t('DESC_MIGRATE_SHORT')],
    ['config',  t('DESC_CONFIG_SHORT')],
    ['lang',    t('DESC_LANG_SHORT')],
  ];

  quickList.forEach(([cmd, desc]) => {
    console.log(`${cyan(S_BAR)}  ${bold(cmd.padEnd(12))} ${dim2(desc)}`);
  });

  console.log(`${cyan(S_BAR)}`);
  console.log(`${cyan(S_BAR_END)}  ${dim2(t('USE_HELP', { cmd: yellow('skillbase --help') }))}\n`);
}
