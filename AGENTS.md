# AGENTS.md

Guía operativa para agentes que trabajen en este repositorio.

## Alcance
Estas instrucciones aplican a todo el árbol del proyecto (`skillbase`).

## Objetivo del proyecto
`skillbase` es una CLI para gestionar skills locales/remotas:
- store global por defecto: `~/.skillbase/skills`
- skills en proyecto: `.agents/skills`
- manifiesto del proyecto: `skillbase.json`

## Reglas de implementación
1. Mantener el código en JavaScript ESM (`"type": "module"`).
2. Evitar dependencias externas salvo necesidad clara.
3. Toda lógica de negocio va en `src/core.js`; el parseo de comandos está modularizado en `src/commands/` y coordinado por `src/cli.js`.
4. Toda visualización de estado de manera TTY se apoya en `src/ui.js` y dentro de cada comando.
5. Mantener soporte bilingüe (ES/EN) mediante `src/i18n.js` y sus locales.
6. Si agregas o cambias comandos, actualiza:
   - los "loaders" dinámicos en `src/cli.js`
   - diccionarios en `src/locales/`
   - secciones de comandos en `README.md` y `README_es.md`

## Flujo de recomendaciones (init)
- Usar integración propia (sin dependencias externas) para detectar stack.
- Basarse en señales del proyecto (`package.json`, `requirements.txt`, etc).
- Si cambias este comportamiento, documenta el motivo en README.

## Listado
- `skillbase ls` lista las skills instaladas en el proyecto actual (`.agents/skills`).
- `skillbase ls -g` (o `--global`) lista las skills en el registro global (`~/.skillbase/skills`).

## Migración y Promoción
- `skillbase migrate` migra desde `~/.agents/skills` a `~/.skillbase/skills`.
- `skillbase migrate --promote` (o `-p`) promueve skills del proyecto actual al registro global.
- Mantener `--force` para sobrescritura explícita.

## Calidad mínima
Antes de cerrar cambios ejecutar:
```bash
npm run lint
npm run test
npm run build
node bin/skillbase.js -h
```

## Publicación
Si cambias comportamiento visible, actualiza README con ejemplos.
