import { getConfig, saveConfig } from '../config.js';
import { bold, dim2, cyan, green, text, S_CHECK, S_BAR, S_BAR_START, S_BAR_END, S_POINTER } from '../styles.js';
import { t } from '../i18n.js';
import { hasFlag, getPositional } from '../args.js';

export async function run(args) {
  const subcommand = getPositional(args, 1);
  const resetFlag = hasFlag(args, '--reset');

  if (!subcommand || subcommand === 'show') {
    const config = getConfig();
    console.log(`${cyan(S_BAR_START)}  ${bold(t('CONFIG_CURRENT_TITLE'))}`);
    console.log(`${cyan(S_BAR)}  ${t('CONFIG_CURRENT_LANG', { lang: bold(config.lang || 'en') })}`);

    if (Array.isArray(config.sources) && config.sources.length > 0) {
      console.log(`${cyan(S_BAR)}  ${t('CONFIG_CURRENT_SOURCES', { list: '' })}`);
      for (const src of config.sources) {
        console.log(`${cyan(S_BAR)}    ${dim2(S_POINTER)} ${text(src)}`);
      }
    } else {
      console.log(`${cyan(S_BAR)}  ${t('CONFIG_CURRENT_SOURCES_ALL')}`);
    }
    console.log(`${cyan(S_BAR_END)}\n`);
    return;
  }

  if (subcommand === 'sources') {
    // Importación dinámica para evitar dependencias circulares con core
    const { listAvailableSources, selectSkillsInteractive } = await import('../core.js');

    if (resetFlag) {
      const config = getConfig();
      delete config.sources;
      saveConfig(config);
      console.log(`${cyan(S_BAR_START)}  ${green(S_CHECK)} ${t('CONFIG_SOURCES_RESET')}`);
      console.log(`${cyan(S_BAR_END)}\n`);
      return;
    }

    const available = (await listAvailableSources()).sort((a, b) => {
      if (a.exists !== b.exists) return a.exists ? -1 : 1;
      return b.skillCount - a.skillCount;
    });
    const config = getConfig();

    const skillOptions = available.map((s) => {
      let detail;
      if (!s.exists) detail = dim2(t('CONFIG_SOURCES_DETAIL_NOT_FOUND'));
      else if (s.skillCount === 0) detail = dim2(t('CONFIG_SOURCES_DETAIL_EMPTY'));
      else detail = green(t('CONFIG_SOURCES_DETAIL_SKILLS', { count: s.skillCount }));

      return { name: s.path, detail };
    });

    const { selected, cancelled } = await selectSkillsInteractive({
      skills: skillOptions,
      title: t('CONFIG_SOURCES_TITLE'),
    });

    if (cancelled) {
      console.log(`${cyan(S_BAR_END)}  ${dim2(t('CANCELLED'))}\n`);
      return;
    }

    if (selected.length === 0 || selected.length === available.length) {
      delete config.sources;
      saveConfig(config);
      console.log(`${cyan(S_BAR)}`);
      console.log(`${cyan(S_BAR_END)}  ${green(S_CHECK)} ${t('CONFIG_SOURCES_RESET')}\n`);
    } else {
      config.sources = selected;
      saveConfig(config);
      console.log(`${cyan(S_BAR)}`);
      console.log(`${cyan(S_BAR)}  ${green(S_CHECK)} ${t('CONFIG_SOURCES_SAVED', { count: bold(selected.length) })}`);
      for (const src of selected) {
        console.log(`${cyan(S_BAR)}    ${dim2(S_POINTER)} ${text(src)}`);
      }
      console.log(`${cyan(S_BAR_END)}\n`);
    }
    return;
  }

  throw new Error(t('CONFIG_UNKNOWN_SUB', { sub: subcommand }));
}
