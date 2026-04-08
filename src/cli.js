import { t } from './i18n.js';
import { printHelp, printCommandList } from './ui.js';
import { hasFlag } from './args.js';

const COMMAND_LOADERS = {
  ls: () => import('./commands/ls.js'),
  init: () => import('./commands/init.js'),
  add: () => import('./commands/add.js'),
  install: () => import('./commands/install.js'),
  remove: () => import('./commands/remove.js'),
  check: () => import('./commands/check.js'),
  update: () => import('./commands/update.js'),
  migrate: () => import('./commands/migrate.js'),
  config: () => import('./commands/config.js'),
  lang: () => import('./commands/lang.js'),
};

const ALIASES = {
  h: '-h',
  l: 'ls',
  a: 'add',
  i: 'install',
  rm: 'remove',
  c: 'check',
  up: 'update',
  m: 'migrate',
  cfg: 'config',
};

/**
 * Punto de entrada principal de la CLI.
 */
export async function runCLI(argv) {
  const args = argv.slice(2);
  const [rawCommand] = args;
  const command = ALIASES[rawCommand] ?? rawCommand;

  if (!command) {
    printCommandList();
    return;
  }

  if (command === '-h' || command === '--help' || hasFlag(args, '-h', '--help')) {
    printHelp();
    return;
  }

  const commandLoader = COMMAND_LOADERS[command];
  if (!commandLoader) {
    throw new Error(t('UNKNOWN_COMMAND', { cmd: command }));
  }

  const cmd = await commandLoader();
  await cmd.run(args);
}
