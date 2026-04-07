import { t } from './i18n.js';
import { printHelp, printCommandList } from './ui.js';
import { hasFlag } from './args.js';

import * as lsCmd      from './commands/ls.js';
import * as initCmd    from './commands/init.js';
import * as addCmd     from './commands/add.js';
import * as installCmd from './commands/install.js';
import * as removeCmd  from './commands/remove.js';
import * as checkCmd   from './commands/check.js';
import * as updateCmd  from './commands/update.js';
import * as migrateCmd from './commands/migrate.js';
import * as configCmd  from './commands/config.js';
import * as langCmd    from './commands/lang.js';

const COMMANDS = {
  ls:      lsCmd,
  init:    initCmd,
  add:     addCmd,
  install: installCmd,
  remove:  removeCmd,
  check:   checkCmd,
  update:  updateCmd,
  migrate: migrateCmd,
  config:  configCmd,
  lang:    langCmd,
};

const ALIASES = {
  h:   '-h',
  l:   'ls',
  a:   'add',
  i:   'install',
  rm:  'remove',
  c:   'check',
  up:  'update',
  m:   'migrate',
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

  const cmd = COMMANDS[command];
  if (!cmd) {
    throw new Error(t('UNKNOWN_COMMAND', { cmd: command }));
  }

  await cmd.run(args);
}
