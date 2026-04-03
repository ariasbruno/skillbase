import {
  addSkillsInteractive,
  addSkill,
  checkUpdates,
  getGlobalSkillsDir,
  getProjectSkillsDir,
  initProject,
  installFromManifest,
  installRemoteSkillRef,
  listGlobalSkills,
  listProjectSkills,
  migrateAgentsSkillsToSkillbase,
  readManifest,
  removeSkill,
  updateSkills
} from './core.js';

function printHelp() {
  console.log(`skillbase - Gestor de skills locales/remotas

Uso:
  skillbase -h
  skillbase h
  skillbase ls [--project]
  skillbase l [-p]
  skillbase init [--hard]
  skillbase add <skill> [--sym]
  skillbase add
  skillbase a <skill> [-s]
  skillbase install
  skillbase i
  skillbase install <skill|repo-url> --remote [--skill <name>] [--force]
  skillbase remove <skill> [--g]
  skillbase rm <skill> [--g]
  skillbase check [--remote]
  skillbase c [-r]
  skillbase update [<skill>] [--remote] [--force]
  skillbase up [<skill>] [-r] [-f]
  skillbase migrate [--project] [--force]
  skillbase m [--project] [-f]

Descripción breve de comandos:
  ls        Lista skills instaladas globalmente (~/.skillbase/skills) o del proyecto con --project.
  init      Sugiere skills globales según tecnologías del proyecto.
  add       Instala una skill global (o abre selector interactivo sin argumentos).
  install   Instala desde skillbase.json o una skill remota con --remote.
  remove    Elimina una skill del proyecto o global con --g.
  check     Revisa si hay versiones más nuevas disponibles.
  update    Actualiza skills del manifiesto (todas o una puntual).
  migrate   Migra skills desde .agents hacia ~/skillbase/skills.

Aliases:
  l=ls, h=-h, a=add, i=install, rm=remove, c=check, up=update, m=migrate

Short flags:
  -s=--sym, -r=--remote, -f=--force, -k=--skill, -p=--project

Notas:
  - Carpeta global por defecto: ~/.skillbase/skills
  - Puedes cambiarla con SKILLBASE_HOME
  - Las skills de proyecto viven en .agents/skills
  - El manifiesto del proyecto es skillbase.json
`);
}

function printCommandList() {
  console.log(`Comandos disponibles:
- skillbase ls [--project]
- skillbase l [-p]
- skillbase init [--hard]
- skillbase add
- skillbase add <skill> [--sym]
- skillbase a <skill> [-s]
- skillbase install | skillbase i
- skillbase install <skill|repo-url> --remote [--skill <name>] [--force]
- skillbase remove <skill> [--g]
- skillbase rm <skill> [--g]
- skillbase check [--remote]
- skillbase c [-r]
- skillbase update [<skill>] [--remote] [--force]
- skillbase up [<skill>] [-r] [-f]
- skillbase migrate [--project] [--force]
- skillbase m [--project] [-f]

Usa "skillbase -h" para ver detalles.`);
}

function hasFlag(args, ...flags) {
  return args.some((arg) => flags.includes(arg));
}

function getFlagValue(args, ...flags) {
  for (let i = 0; i < args.length; i += 1) {
    if (flags.includes(args[i])) return args[i + 1] ?? null;
  }
  return null;
}

export async function runCLI(argv) {
  const args = argv.slice(2);
  const [rawCommand, maybeSkill] = args;
  const commandAliases = {
    h: '-h',
    l: 'ls',
    a: 'add',
    i: 'install',
    rm: 'remove',
    c: 'check',
    up: 'update',
    m: 'migrate'
  };
  const command = commandAliases[rawCommand] ?? rawCommand;

  if (!command) {
    printCommandList();
    return;
  }

  if (command === '-h' || command === '--help') {
    printHelp();
    return;
  }

  switch (command) {
    case 'ls': {
      const showProject = hasFlag(args, '--project', '-p');
      if (showProject) {
        const skills = await listProjectSkills();
        if (!skills.length) {
          console.log(`No hay skills instaladas localmente en ${getProjectSkillsDir()}`);
        } else {
          console.log(`Skills del proyecto (${getProjectSkillsDir()}):`);
          skills.forEach((skill) => console.log(`- ${skill}`));
        }
      } else {
        const skills = await listGlobalSkills();
        if (!skills.length) {
          console.log(`No hay skills globales instaladas en ${getGlobalSkillsDir()}`);
        } else {
          console.log(`Skills globales (${getGlobalSkillsDir()}):`);
          skills.forEach((skill) => console.log(`- ${skill}`));
        }
      }
      return;
    }

    case 'init': {
      const result = await initProject({ hard: hasFlag(args, '--hard') });
      if (!result.technologies.length) {
        console.log('No se detectaron tecnologías en el proyecto.');
        return;
      }
      console.log(`Tecnologías detectadas: ${result.technologies.join(', ')}`);
      if (!result.suggested.length) {
        console.log('No se encontraron skills compatibles en ~/.skillbase/skills.');
        return;
      }
      if (result.cancelled) {
        console.log('Selección cancelada.');
        return;
      }
      if (result.installed.length) {
        console.log(`Skills instaladas: ${result.installed.join(', ')}`);
      } else {
        console.log('No se seleccionaron skills para instalar.');
      }
      return;
    }

    case 'add': {
      if (!maybeSkill) {
        const result = await addSkillsInteractive({ sym: hasFlag(args, '--sym', '-s') });
        if (result.cancelled) {
          console.log('Selección cancelada.');
          return;
        }
        if (!result.selected.length) {
          console.log('No se seleccionaron skills para instalar.');
          return;
        }
        console.log(`Skills instaladas: ${result.selected.join(', ')}`);
        return;
      }
      await addSkill(maybeSkill, { sym: hasFlag(args, '--sym', '-s') });
      console.log(`Skill "${maybeSkill}" instalada en el proyecto.`);
      return;
    }

    case 'install': {
      if (maybeSkill && hasFlag(args, '--remote', '-r')) {
        await installRemoteSkillRef(maybeSkill, {
          force: hasFlag(args, '--force', '-f'),
          skill: getFlagValue(args, '--skill', '-k')
        });
        console.log(`Skill remota "${maybeSkill}" instalada.`);
        return;
      }
      if (maybeSkill && !hasFlag(args, '--remote', '-r')) {
        throw new Error('Para instalar una skill puntual usa "skillbase add <skill>" (global) o "skillbase install <skill|repo-url> --remote".');
      }
      await installFromManifest({ remote: hasFlag(args, '--remote', '-r'), force: hasFlag(args, '--force', '-f') });
      const manifest = await readManifest();
      console.log(`Instaladas ${manifest.skills.length} skills desde skillbase.json.`);
      return;
    }

    case 'remove': {
      if (!maybeSkill) throw new Error('Debes indicar una skill: skillbase remove <skill>');
      await removeSkill(maybeSkill, { global: hasFlag(args, '--g') });
      if (hasFlag(args, '--g')) {
        console.log(`Skill global "${maybeSkill}" eliminada.`);
      } else {
        console.log(`Skill "${maybeSkill}" eliminada del proyecto.`);
      }
      return;
    }

    case 'check': {
      const updates = await checkUpdates({ remoteOnly: hasFlag(args, '--remote', '-r') });
      if (!updates.length) {
        console.log('No hay actualizaciones disponibles.');
        return;
      }
      console.log('Actualizaciones disponibles:');
      updates.forEach((item) => {
        console.log(`- ${item.name}: ${item.current ?? 'desconocida'} -> ${item.latest} (${item.source})`);
      });
      return;
    }

    case 'update': {
      const skill = maybeSkill && !maybeSkill.startsWith('-') ? maybeSkill : null;
      await updateSkills({
        skillName: skill,
        remoteOnly: hasFlag(args, '--remote', '-remote', '-r'),
        force: hasFlag(args, '--force', '-f')
      });
      if (skill) {
        console.log(`Skill "${skill}" actualizada.`);
      } else {
        console.log('Skills actualizadas.');
      }
      return;
    }

    case 'migrate': {
      const fromProject = hasFlag(args, '--project', '-p');
      const result = await migrateAgentsSkillsToSkillbase({
        force: hasFlag(args, '--force', '-f'),
        fromProject
      });
      console.log(`Origen de migración: ${result.sourceRoot}/skills`);
      console.log(`Skills encontradas: ${result.totalFound}`);
      if (result.migrated.length) {
        console.log(`Migradas a ${getGlobalSkillsDir()}:`);
        result.migrated.forEach((skill) => console.log(`- ${skill}`));
      }
      if (result.skipped.length) {
        console.log('Omitidas (ya existen globalmente, usa --force para sobrescribir):');
        result.skipped.forEach((skill) => console.log(`- ${skill}`));
      }
      return;
    }

    default:
      throw new Error(`Comando desconocido: ${command}. Usa skillbase -h`);
  }
}
