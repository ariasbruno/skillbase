import { addSkillsInteractive, addSkill } from '../core.js';
import { bold, dim2, cyan, green, S_CHECK, S_BAR, S_BAR_START, S_BAR_END } from '../styles.js';
import { t } from '../i18n.js';
import { hasFlag, getPositional } from '../args.js';
import { printLogo } from '../ui.js';

export async function run(args) {
  const maybeSkill = getPositional(args, 1);

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
}
