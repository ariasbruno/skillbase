/**
 * Utilidades de parseo de argumentos CLI.
 * Compartidas por todos los módulos de comando.
 */

/** Verifica si alguno de los flags está presente en los args. */
export function hasFlag(args, ...flags) {
  return args.some((arg) => flags.includes(arg));
}

/** Obtiene el valor que sigue a un flag (--flag value). */
export function getFlagValue(args, ...flags) {
  for (let i = 0; i < args.length; i += 1) {
    if (flags.includes(args[i])) return args[i + 1] ?? null;
  }
  return null;
}

/**
 * Obtiene un argumento posicional (no-flag) en el índice dado.
 * Por convención: args[0] = comando, args[1] = primer posicional.
 */
export function getPositional(args, index = 1) {
  const val = args[index];
  return val && !val.startsWith('-') ? val : null;
}
