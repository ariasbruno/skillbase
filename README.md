# 🧠 skillbase

**Gestor de skills locales para entornos de desarrollo con IA.**

`skillbase` es un CLI de Node.js que te permite administrar las skills de tus agentes de Inteligencia Artificial utilizando enlaces simbólicos (symlinks) o instalaciones locales por cada workspace, evitando la saturación del contexto.

![demo](artifacts/skillbase-demo.gif)

---

## 🤔 El Problema: Saturación de Contexto (Context Bloat)

Cuando desarrollas asistido por IA (usando herramientas como Cursor, Copilot o agentes personalizados), tener un directorio global con cientos de skills `.agents/skills/` destruye la precisión del modelo:

*   **Alucinaciones:** El LLM se confunde al tener demasiadas herramientas irrelevantes a su disposición.
*   **Consumo de Tokens:** Enviar el manifiesto de cientos de skills en cada prompt es lento y costoso.
*   **Falta de foco:** Un proyecto no necesita las mismas skills que otro.

## 💡 La Solución

`skillbase` mantiene un **único registro global** en tu máquina (`~/.skillbase/skills`) y permite hacer una instalación en tu proyecto actual de **solo lo que necesitas**.

Imagínate que estás trabajando en el frontend de un e-commerce. No necesitas que la IA vea herramientas de DevOps o Backend; solo necesitas tus skills de React y quizás algunas de SEO. Con `skillbase`, le das a tu agente exactamente ese contexto.

---

## 🚀 Instalación

Instala el paquete globalmente:

```bash
npm install -g @ariasbruno/skillbase
# O clona y linkea localmente:
# npm link
```

## 💻 Uso Rápido (Quickstart)

**1. Inicializa tu proyecto**
Detecta tecnologías y sugiere skills compatibles:
```bash
skillbase init
```

**2. Añade las skills necesarias**
```bash
skillbase add seo-analyzer
# O abre el selector interactivo:
skillbase add
```

**3. Instala desde el manifiesto**
Si ya tienes un `skillbase.json`, recrea el entorno:
```bash
skillbase install
```

---

## 🛠️ Referencia de Comandos

| Comando | Alias | Descripción |
| :--- | :--- | :--- |
| `skillbase ls [--project]` | `l [-p]` | Lista skills globales o del proyecto con `-p`. |
| `skillbase init [--hard]` | | Detecta tecnologías y sugiere skills (usa `--hard` para analizar `tags` en `skill.json`). |
| `skillbase add [<skill>] [-s]` | `a` | Instalar skill global. Sin nombre, abre el **selector interactivo**. `-s` crea symlink. |
| `skillbase install` | `i` | Instala desde el manifiesto `skillbase.json`. Soporta `-r` (remotas) y `-f` (forzar). |
| `skillbase install <ref> -r` | `i -r` | Instala skill remota (URL o GitHub). Requiere `-k <name>` si es un repo Git. |
| `skillbase remove <skill> [--g]` | `rm` | Elimina skill del proyecto. Con `--g` la elimina del registro global. |
| `skillbase check [-r]` | `c` | Busca actualizaciones. Con `-r` busca solo en fuentes remotas. |
| `skillbase update [<skill>] [-r] [-f]` | `up` | Actualiza una o todas las skills. `-r` para remotas, `-f` para forzar. |
| `skillbase migrate [-p] [-f]` | `m` | Migra desde el antiguo `.agents`. `-p` usa el dir del proyecto, `-f` sobrescribe. |

### 🚩 Flags Detalladas
- `-h`, `--help`: Muestra la ayuda detallada.
- `-s`, `--sym`: Crea un enlace simbólico en lugar de copiar los archivos (útil para desarrollo).
- `-r`, `--remote`: Indica que la operación debe consultar fuentes externas (GitHub o API de skills.sh).
- `-f`, `--force`: Ignora errores de "ya existe" y sobrescribe archivos/configuraciones.
- `-k`, `--skill`: Nombre de la skill específica a extraer cuando se instala desde un repositorio GitHub.
- `-p`, `--project`: En `ls`, lista skills locales. En `migrate`, indica que el origen es `.agents/skills`.
- `--g`: Flag específica de `remove` para borrar una skill del registro global.

### ⌨️ Aliases de comandos
Para mayor velocidad, puedes usar las iniciales:
`l` (ls), `a` (add), `i` (install), `rm` (remove), `c` (check), `up` (update), `m` (migrate).

---

## 📂 ¿Cómo funciona bajo el capó?

`skillbase` organiza tus herramientas de forma eficiente:

```text
Tu Computadora
├── ~/.skillbase/skills/           <-- (Tu registro global físico)
│   ├── seo-analyzer/              <-- (Código fuente real)
│   └── react-helper/
│
└── /Proyectos/mi-gran-app/        <-- (Tu workspace actual)
    ├── skillbase.json             <-- (El manifiesto del proyecto)
    └── .agents/skills/            <-- (Contexto limpio para la IA)
        └── seo-analyzer/          <-- (Enlace o copia local)
```

Puedes cambiar la ubicación del registro global configurando la variable de entorno `SKILLBASE_HOME`.

---

## 🌐 Fuentes Remotas

Instala skills directamente desde repositorios de GitHub:
```bash
skillbase install <repo-url> --remote
# Ejemplo:
skillbase install https://github.com/usuario/my-skills --remote --skill analyzer
```

---

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Si tienes ideas para mejorar la gestión del contexto, abre un Issue o un Pull Request.

## 📄 Licencia

MIT
