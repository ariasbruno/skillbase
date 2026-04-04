/**
 * skillbase - Sistema de Estilos ANSI
 * Proporciona funciones para colorear texto y símbolos comunes sin dependencias externas.
 */

const ESC = '\x1b[';
const RESET = `${ESC}0m`;

const createStyle = (start) => (msg) => `${ESC}${start}m${msg}${RESET}`;

export const bold = createStyle('1');
export const dim = createStyle('2');
export const italic = createStyle('3');
export const underline = createStyle('4');

export const black = createStyle('30');
export const red = createStyle('31');
export const green = createStyle('32');
export const yellow = createStyle('33');
export const blue = createStyle('34');
export const magenta = createStyle('35');
export const cyan = createStyle('36');
export const white = createStyle('37');

// 256-color grays (estilo Vercel)
export const dim2 = (msg) => `\x1b[38;5;102m${msg}${RESET}`;
export const text = (msg) => `\x1b[38;5;145m${msg}${RESET}`;
export const grayAccent = (msg) => `\x1b[38;5;240m${msg}${RESET}`;
export const grayLogo = (msg, index = 0) => {
  const grays = ['250', '248', '245', '243', '240', '238'];
  const color = grays[Math.min(index, grays.length - 1)];
  return `\x1b[38;5;${color}m${msg}${RESET}`;
};

// Control de Terminal
export const H_HIDE_CURSOR = '\x1b[?25l';
export const H_SHOW_CURSOR = '\x1b[?25h';
export const H_CLEAR_DOWN = '\x1b[J';
export const H_MOVE_UP = (n) => (n > 0 ? `\x1b[${n}A` : '');
export const H_MOVE_TO_COL = (n) => `\x1b[${n}G`;

// Símbolos comunes
export const S_DIAMOND = '◆';
export const S_BULLET = '◆';
export const S_POINTER = '❯';
export const S_STEP = '◇';
export const S_CHECK = '✔';
export const S_SQUARE = '◻';
export const S_SQUARE_FILL = '◼';
export const S_CROSS = '✖';
export const S_INFO = 'ℹ';
export const S_WARNING = '⚠';
export const S_ARROW_UP = '▲';
export const S_ARROW_DOWN = '▼';

// Estructura Clack
export const S_BAR = '│';
export const S_BAR_START = '┌';
export const S_BAR_END = '└';
