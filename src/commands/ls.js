import { listGlobalSkills, listProjectSkills, getGlobalSkillsDir, getProjectSkillsDir } from '../core.js';
import { bold, dim2, text, cyan, green, yellow, S_CHECK, S_BAR, S_BAR_START, S_BAR_END, S_WARNING } from '../styles.js';
import { t } from '../i18n.js';
import { hasFlag } from '../args.js';

export async function run(args) {
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
}
