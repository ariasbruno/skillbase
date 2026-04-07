import { updateSkills } from '../core.js';
import { bold, dim2, cyan, green, S_CHECK, S_BAR, S_BAR_START, S_BAR_END } from '../styles.js';
import { t } from '../i18n.js';
import { hasFlag, getPositional } from '../args.js';

export async function run(args) {
  const skill = getPositional(args, 1);

  console.log(`${cyan(S_BAR_START)}  ${dim2(t('UPDATE_START'))}`);
  await updateSkills({
    skillName: skill,
    remoteOnly: hasFlag(args, '--remote', '-remote', '-r'),
    force: hasFlag(args, '--force', '-f'),
  });

  console.log(`${cyan(S_BAR)}  ${bold(t('INIT_RESUMEN'))}`);
  if (skill) {
    console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${t('UPDATE_SINGLE_SUCCESS', { skill: bold(skill) })}`);
  } else {
    console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${t('UPDATE_SUCCESS')}`);
  }
  console.log(`${cyan(S_BAR_END)}\n`);
}
