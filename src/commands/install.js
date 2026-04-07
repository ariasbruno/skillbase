import { installRemoteSkillRef, installFromManifest, readManifest } from '../core.js';
import { bold, cyan, green, S_CHECK, S_BAR, S_BAR_START, S_BAR_END } from '../styles.js';
import { t } from '../i18n.js';
import { hasFlag, getFlagValue, getPositional } from '../args.js';

export async function run(args) {
  const maybeSkill = getPositional(args, 1);

  if (maybeSkill && hasFlag(args, '--remote', '-r')) {
    await installRemoteSkillRef(maybeSkill, {
      force: hasFlag(args, '--force', '-f'),
      skill: getFlagValue(args, '--skill', '-k'),
    });
    console.log(`${cyan(S_BAR_START)}  ${bold(t('INIT_RESUMEN'))}`);
    console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${t('ADD_REMOTE_SUCCESS', { skill: bold(maybeSkill) })}`);
    console.log(`${cyan(S_BAR_END)}\n`);
    return;
  }

  if (maybeSkill && !hasFlag(args, '--remote', '-r')) {
    throw new Error(t('INSTALL_ERROR_SINGLE'));
  }

  await installFromManifest({
    remote: hasFlag(args, '--remote', '-r'),
    force: hasFlag(args, '--force', '-f'),
  });
  const manifest = await readManifest();
  console.log(`${cyan(S_BAR_START)}  ${bold(t('INIT_RESUMEN'))}`);
  console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${t('INSTALL_MANIFEST_SUCCESS', { count: bold(manifest.skills.length) })}`);
  console.log(`${cyan(S_BAR_END)}\n`);
}
