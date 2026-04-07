import { selectSkillsInteractive, listGlobalSkills, listProjectSkills, removeSkill } from '../core.js';
import { bold, dim2, text, cyan, red, green, yellow, S_CHECK, S_BAR, S_BAR_START, S_BAR_END, S_WARNING, S_POINTER } from '../styles.js';
import { t } from '../i18n.js';
import { hasFlag, getPositional } from '../args.js';
import { printLogo } from '../ui.js';

export async function run(args) {
  const isGlobal = hasFlag(args, '-g', '--global');
  const removeAll = hasFlag(args, '-a', '--all');
  const maybeSkill = getPositional(args, 1);

  let skillsToRemove = maybeSkill ? [maybeSkill] : null;

  if (removeAll) {
    printLogo();
    const skills = isGlobal ? await listGlobalSkills() : await listProjectSkills();

    if (!skills.length) {
      console.log(`${yellow(S_WARNING)} ${t('REMOVE_NO_SKILLS')}`);
      return;
    }

    const scope = isGlobal ? t('REMOVE_SCOPE_GLOBAL') : t('REMOVE_SCOPE_PROJECT');
    console.log(`${cyan(S_BAR_START)}  ${red(bold(t('REMOVE_ALL_CONFIRM_TITLE', { count: bold(skills.length), scope })))}`);
    skills.forEach((s) => console.log(`${cyan(S_BAR)}  ${dim2(S_POINTER)} ${text(s)}`));
    console.log(`${cyan(S_BAR)}`);

    const { selected: answer, cancelled } = await selectSkillsInteractive({
      skills: [t('REMOVE_ALL_NO'), t('REMOVE_ALL_YES')],
      title: t('REMOVE_ALL_CONFIRM_PROMPT'),
      radio: true,
      clearOnExit: true,
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
      clearOnExit: true,
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
}
