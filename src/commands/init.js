import { initProject } from '../core.js';
import { bold, dim2, text, cyan, green, yellow, S_CHECK, S_BAR, S_BAR_START, S_BAR_END, S_WARNING } from '../styles.js';
import { t } from '../i18n.js';
import { hasFlag } from '../args.js';
import { printLogo } from '../ui.js';

export async function run(args) {
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
}
