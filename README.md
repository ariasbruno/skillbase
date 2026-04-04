# 🧠 skillbase

**Local skill manager for AI-assisted development environments.**

`skillbase` is a Node.js CLI that empowers you to manage skills for your AI agents using symbolic links (symlinks) or local installations per workspace, preventing context saturation.

---

### 🌐 Language / Idioma

- [🇪🇸 **Ver documentación en Español**](README_es.md)

---

![demo](artifacts/skillbase-demo.gif)

## 🤔 The Problem: Context Bloat

When developing with AI assistance (using tools like Cursor, Copilot, or custom agents), having a global directory with hundreds of skills in `.agents/skills/` destroys model precision:

*   **Hallucinations:** The LLM gets confused by having too many irrelevant tools at its disposal.
*   **Token Consumption:** Sending the manifest of hundreds of skills in every prompt is slow and expensive.
*   **Lack of Focus:** One project doesn't need the same skills as another.

## 💡 The Solution

`skillbase` maintains a **single global registry** on your machine (`~/.skillbase/skills`) and allows you to install **only what you need** in your current project.

Imagine you're working on the frontend of an e-commerce site. No need for the AI to see DevOps or Backend tools; you only need your React skills and maybe some SEO skills. With `skillbase`, you give your agent exactly that context.

---

## 🚀 Installation

Install the package globally:

```bash
npm install -g @ariasbruno/skillbase
# Or clone and link locally:
# npm link
```

## 💻 Quickstart

**1. Initialize your project**
Detect technologies and suggest compatible skills:
```bash
skillbase init
```

**2. Add necessary skills**
```bash
skillbase add seo-analyzer
# Or open the interactive selector:
skillbase add
```

**3. Install from manifest**
If you already have a `skillbase.json`, recreate the environment:
```bash
skillbase install
```

---

## 🛠️ Command Reference

| Command | Alias | Description |
| :--- | :--- | :--- |
| `skillbase ls [-g]` | `l [-g]` | List skills in local project. Use `-g` for global registry. |
| `skillbase init [--hard]` | | Detect technologies and suggests skills (use `--hard` for deep analysis). |
| `skillbase add [<skill>] [-s]` | `a` | Install global skill. Without name, opens **interactive selector**. `-s` for symlinks. |
| `skillbase install` | `i` | Install from `skillbase.json`. Supports `-r` (remote) and `-f` (force). |
| `skillbase install <ref> -r` | `i -r` | Install remote skill (URL or GitHub). Requires `-k <name>` if it's a Git repo. |
| `skillbase remove <skill> [-g]` | `rm` | Remove skill from project. Use `-g` to remove from global registry instead. |
| `skillbase check [-r]` | `c` | Check for updates. With `-r`, searches only in remote sources. |
| `skillbase update [<skill>] [-r] [-f]` | `up` | Update one or all skills. `-r` for remote, `-f` to force. |
| `skillbase migrate [-p] [-f]` | `m` | Migrate (~/.agents) or **promote** local skills to global registry with `-p`. |
| `skillbase lang <en|es>` | | Change CLI language. |

### 🚩 Detailed Flags
- `-h`, `--help`: Show detailed help.
- `-s`, `--sym`: Create a symbolic link instead of copying files (useful for development).
- `-r`, `--remote`: Indicates that the operation should consult external sources (GitHub or skills.sh API).
- `-f`, `--force`: Ignore "already exists" errors and overwrite files/configurations.
- `-k`, `--skill`: Name of the specific skill to extract when installing from a GitHub repository.
- `-g`, `--global`: Operate on the global registry (for `ls` and `remove`).

### ⌨️ Command Aliases
For speed, you can use initials:
`l` (ls), `a` (add), `i` (install), `rm` (remove), `c` (check), `up` (update), `m` (migrate).

---

## 📂 How does it work under the hood?

`skillbase` organizes your tools efficiently:

```text
Your Computer
├── ~/.skillbase/skills/           <-- (Your physical global registry)
│   ├── seo-analyzer/              <-- (Real source code)
│   └── react-helper/
│
└── /Projects/my-great-app/        <-- (Your current workspace)
    ├── skillbase.json             <-- (Project manifest)
    └── .agents/skills/            <-- (Clean context for the AI)
        └── seo-analyzer/          <-- (Link or local copy)
```

You can change the global registry location by setting the `SKILLBASE_HOME` environment variable.

---

## 🌐 Remote Sources

Install skills directly from GitHub repositories:
```bash
skillbase install <repo-url> --remote
# Example:
skillbase install https://github.com/user/my-skills --remote --skill analyzer
```

---

## 🤝 Contributions

Contributions are welcome! If you have ideas to improve context management, open an Issue or a Pull Request.

## 📄 License

MIT
