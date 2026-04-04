import { getConfig } from './config.js';
import { en } from './locales/en.js';
import { es } from './locales/es.js';

const locales = { en, es };

let currentLang = getConfig().lang || 'en';

/**
 * Cambia el idioma actual en memoria
 * @param {string} lang 'en' | 'es'
 */
export function setLanguage(lang) {
  if (locales[lang]) {
    currentLang = lang;
  }
}

/**
 * Traduce una clave al idioma actual
 * @param {string} key Clave del diccionario
 * @param {Object} params Parámetros para reemplazar en la cadena ({key: value})
 * @returns {string} Texto traducido
 */
export function t(key, params = {}) {
  const dict = locales[currentLang] || locales.en;
  let textStr = dict[key] || locales.en[key] || key;

  for (const [k, v] of Object.entries(params)) {
    textStr = textStr.replace(new RegExp(`{${k}}`, 'g'), v);
  }

  return textStr;
}
