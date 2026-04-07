import { checkUpdates } from '../core.js';
import { bold, dim2, cyan, green, yellow, S_CHECK, S_BAR, S_BAR_START, S_BAR_END, S_POINTER, S_STEP } from '../styles.js';
import { t } from '../i18n.js';
import { hasFlag } from '../args.js';

export async function run(args) {
  console.log(`${cyan(S_BAR_START)}  ${dim2(t('CHECK_SEARCHING'))}`);
  const updates = await checkUpdates({ remoteOnly: hasFlag(args, '--remote', '-r') });

  if (!updates.length) {
    console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${t('CHECK_UP_TO_DATE')}`);
    console.log(`${cyan(S_BAR_END)}\n`);
    return;
  }

  console.log(`${cyan(S_BAR)}  ${bold(t('CHECK_UPDATES_FOUND'))}`);
  updates.forEach((item) => {
    console.log(
      `${cyan(S_BAR)}  ${yellow(S_POINTER)} ${item.name}: ${dim2(item.current ?? '?')} ${dim2(S_STEP)} ${green(item.latest)} ${dim2(`(${item.source})`)}`
    );
  });
  console.log(`${cyan(S_BAR)}`);
  console.log(`${cyan(S_BAR_END)}  ${dim2(t('CHECK_UPDATE_HINT', { cmd: yellow('skillbase update') }))}\n`);
}
