import { getConfig, saveConfig } from '../config.js';
import { bold, dim2, cyan, S_BAR_START, S_BAR_END } from '../styles.js';
import { t, setLanguage } from '../i18n.js';
import { getPositional } from '../args.js';

export async function run(args) {
  const maybeSkill = getPositional(args, 1);

  if (!maybeSkill || !['en', 'es'].includes(maybeSkill)) {
    throw new Error(t('LANG_INVALID', { lang: maybeSkill || '??' }));
  }

  const config = getConfig();
  config.lang = maybeSkill;
  saveConfig(config);
  setLanguage(maybeSkill);

  const langLabel = maybeSkill === 'es' ? 'Español' : 'English';
  console.log(`${cyan(S_BAR_START)}  ${bold(t('LANG_SUCCESS', { lang: langLabel }))}`);
  console.log(`${cyan(S_BAR_END)}\n`);
}
