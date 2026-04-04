export const en = {
  // General
  USAGE: 'Usage:',
  COMMANDS: 'Commands:',
  OPTIONS: 'Common Options:',
  SHORTCUTS: 'Shortcuts: l=ls, h=-h, a=add, i=install, rm=remove, c=check, up=update, m=migrate',
  HELP_FOOTER: 'Use {cmd} to see all options and commands.',
  USE_HELP: 'Use {cmd} to see all options and commands.',
  CANCELLED: 'Operation cancelled.',
  COMMANDS_AVAILABLE: 'Available commands:',
  SELECTION_CANCELLED: 'Selection cancelled.',
  UNKNOWN_COMMAND: 'Unknown command: {cmd}. Use skillbase -h',

  // Commands info
  DESC_INIT: 'Initialize project and detect stack [--hard]',
  DESC_INIT_SHORT: 'Configure project and detect stack',
  DESC_ADD: 'Add one or more skills to the project',
  DESC_ADD_SHORT: 'Add new skill (global/project)',
  DESC_LS: 'List installed skills (local or global with -g)',
  DESC_LS_SHORT: 'List installed skills',
  DESC_INSTALL: 'Install from manifest or remote [-r] [-k <name>]',
  DESC_INSTALL_SHORT: 'Install dependencies from manifest',
  DESC_REMOVE: 'Remove a skill from project or global [-g]',
  DESC_CHECK: 'Check for updates for installed skills',
  DESC_UPDATE: 'Update one or all skills',
  DESC_MIGRATE: 'Migrate (~/.agents) or promote (-p) local skills to global',
  DESC_MIGRATE_SHORT: 'Migrate or promote local skills',
  DESC_LANG: 'Change tool language (en|es)',
  DESC_LANG_SHORT: 'Change CLI language',

  // Options info
  OPT_REMOTE: 'Operate with remote repositories (GitHub/GitLab)',
  OPT_FORCE: 'Force operation (overwrite files)',
  OPT_SYM: 'Create symbolic links instead of copying (add only)',
  OPT_GLOBAL: 'Operate globally (for ls and remove)',
  OPT_HELP: 'Show this help',

  // Command-specific messages
  LS_GLOBAL_EMPTY: 'No global skills installed in {dir}',
  LS_GLOBAL_TITLE: 'Global skills ({dir}):',
  LS_PROJECT_EMPTY: 'No local skills installed in {dir}',
  LS_PROJECT_TITLE: 'Project skills ({dir}):',

  INIT_NO_STACK: 'No stack detected in the project.',
  INIT_ANALYSIS: 'Stack analysis:',
  INIT_RESUMEN: 'Summary:',
  INIT_INSTALLED: 'Installed: {list}',
  INIT_NONE: 'No skills were installed.',

  ADD_NO_SELECTED: 'No skills selected to install.',
  ADD_RESUMEN: 'Summary:',
  ADD_SUCCESS: 'Skill "{skill}" installed.',
  ADD_REMOTE_SUCCESS: 'Remote skill "{skill}" installed.',

  REMOVE_GLOBAL_SUCCESS: 'Global skill "{skill}" removed.',
  REMOVE_PROJECT_SUCCESS: 'Project skill "{skill}" removed.',
  REMOVE_NOT_FOUND: 'Skill "{skill}" is not installed.',

  CHECK_SEARCHING: 'Checking for updates...',
  CHECK_UP_TO_DATE: 'All skills are up to date.',
  CHECK_UPDATES_FOUND: 'Updates available:',
  CHECK_UPDATE_HINT: 'Use {cmd} to update.',

  UPDATE_START: 'Updating skills...',
  UPDATE_SUCCESS: 'All skills updated.',
  UPDATE_SINGLE_SUCCESS: 'Skill "{skill}" updated.',

  MIGRATE_TITLE: 'Skills Migration',
  MIGRATE_SOURCE: 'Source: {dir}',
  MIGRATE_FOUND: 'Skills found: {count}',
  MIGRATE_SUCCESS_LIST: 'Skills migrated to {dir}:',
  MIGRATE_SKIPPED_LIST: 'Skipped (already exist):',
  MIGRATE_RESUMEN_TITLE: 'Summary:',
  MIGRATE_RESUMEN_SUCCESS: '{count} skills migrated successfully.',
  MIGRATE_RESUMEN_DEST: 'Destination: {dir}',
  MIGRATE_NONE: 'No new skills were migrated.',

  LANG_SUCCESS: 'Language changed to {lang} successfully.',
  LANG_INVALID: 'Unsupported language: {lang}. Use "en" or "es".',

  // Interactive UI
  UI_SELECT_ONE: 'Select a skill',
  UI_SELECT_MULTIPLE: 'Select skills',
  UI_CONTROLS: '↑↓ navigate • [space] sel. {status} • [a] all • [enter] install • [esc] exit',
  UI_SELECTED: 'selected',
  UI_PAGE: 'page {current}/{total}',
  UI_AVAILABLE: '{count} skills available',
  UI_REQUIRED_TTY: 'Interactive selection requires a TTY terminal. Use: skillbase add <skill>.',

  // Core / Errors
  ERR_GLOBAL_NOT_FOUND: 'Global skill "{name}" does not exist in {dir}',
  ERR_REMOTE_INVALID: 'You must specify a valid remote skill.',
  ERR_REMOTE_METADATA: 'Could not fetch remote metadata for "{ref}". Use slug like "owner/skill" or skills.sh URL.',
  ERR_REMOTE_NO_URL: 'Remote metadata for "{ref}" does not contain downloadUrl/sourceUrl/repo/url',
  ERR_REMOTE_DOWNLOAD: 'Could not download archiveUrl ({status})',
  ERR_GITHUB_USAGE: 'To install from GitHub use: skillbase install <repo-url> --remote --skill <skill-name>.',
  ERR_SKILL_EXISTS: 'Skill "{name}" already exists in the project. Use --force to reinstall.',
  ERR_SKILL_REQUIRED: 'Missing --skill <name>. Example: skillbase install <repo-url> --remote --skill find-skills',
  ERR_SKILL_NOT_FOUND_REMOTE: 'Skill "{name}" not found in remote repo.',
  ERR_MANIFEST_EMPTY: 'No skills in skillbase.json. Use "skillbase add <skill>" or "skillbase install <skill> --remote".',
  
  INIT_HARD_TITLE: 'Init --hard: select skills recommended by name and tags',
  INIT_TITLE: 'Init: select skills recommended by name',
};
