# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] — 2026-04-07

### Added
- Lightweight zero-dependency background update notifier for the CLI, with opt-out via `skillbase config autoupdate off`
- `skillbase config lang <en|es>` for direct CLI language configuration
- Added extensive cross-agent directory support for discovering and migrating skills (covering +30 AI assistants like Cursor, Windsurf, Copilot, Gemini, Roo, Claude, etc.)
- `skillbase config sources` — interactive command to select which directories are scanned during migration, reducing noise from unused editor paths
- `skillbase migrate` — migrate skills from `~/.agents/skills` to the new global store at `~/.skillbase/skills`; supports `--promote` to push project skills to the global registry and `--force` to allow overwrites
- Interactive multi-selection flow for `skillbase remove` when no skill is specified
- `--all` / `-a` flag for `skillbase remove` with safety confirmation prompt

### Changed
- Standardized UI controls globally with context-aware action labels
- Refactored CLI architecture: commands extracted to `src/commands/` for modularity
- Implemented Lazy-Loading for commands via dynamic imports, cutting startup time effectively
- Integrated `esbuild` to generate a minified, production-ready bundle in `dist/`
- Parallelized I/O-intensive core operations (`initProject`, `checkUpdates`, `scanMigrationSources`, `updateSkills`) safely with `Promise.all`
- Introduced an in-memory cache for `readManifest` to eliminate redundant disk reads across commands

---

## [1.1.0] — 2026-04-04

Major release with full UI overhaul, bilingual support, and architectural cleanup.

### Added
- Bilingual support (ES/EN) via `src/i18n.js` and locale files `src/locales/en.js` / `src/locales/es.js`; language is auto-detected from the environment
- `skillbase ls` — list skills installed in the current project (`.agents/skills`)
- `skillbase ls -g` / `--global` — list skills in the global registry (`~/.skillbase/skills`)
- `src/styles.js` — centralised terminal styling tokens (colours, icons, box-drawing chars)
- `src/config.js` — user configuration management module
- Spanish README (`README_es.md`)
- Demo GIF in `artifacts/skillbase-demo.gif`

### Changed
- Global store moved from `~/.agents` to `~/.skillbase/skills` for standard CLI compliance
- All business logic consolidated in `src/core.js`; `src/cli.js` now only parses and coordinates commands
- Rewrote `src/cli.js` for consistent output, scroll-aware navigation, and richer interactive prompts
- Updated `src/recommendations.js` to use internal stack detection (no external dependencies)
- Improved `skillbase init`: now correctly reads and processes `package.json` dependencies

### Fixed
- `skillbase init` was not detecting project dependencies from `package.json`
- Terminal scrolled uncontrollably on long skill lists when using arrow-key navigation

---

## [1.0.0] — 2026-04-03

Initial public release under the scoped package name `@ariasbruno/skillbase`.

### Added
- `bin/skillbase.js` CLI entry point
- `src/cli.js` — command parsing and coordination
- `src/core.js` — core install / remove / search logic
- `src/manifest.js` — reads and writes `skillbase.json` project manifest
- `src/recommendations.js` — stack detection and skill recommendations for `skillbase init`
- `skillbase init` — scaffold `skillbase.json` and recommend relevant skills based on detected stack
- `skillbase install <skill>` — install a skill from the global registry into the project
- `skillbase remove <skill>` — remove a skill from the project
- Global skill store at `~/.agents/skills`
- Project-level skill store at `.agents/skills`
- `skillbase.json` project manifest
- GitHub Action for automated NPM publishing on release

### Changed
- Package renamed from `skillbase` → `@ariasbruno/skillbase`

---

[Unreleased]: https://github.com/ariasbruno/skillbase/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/ariasbruno/skillbase/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/ariasbruno/skillbase/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/ariasbruno/skillbase/releases/tag/v1.0.0
