# React Upgrade Advisor

An agent skill for upgrading React and preparing an application's source code using version-specific documentation and examples.

It guides the agent through version selection, source review, justified code adaptations, regression checks and rollback. An optional inspector distinguishes the React you declare, the version your dependencies resolve, and the renderer your framework serves.

## Install for Claude Code and Codex

Run this from the project you want to upgrade. It installs the skill for both agents:

```sh
npx skills add 0xfabrica/react-upgrade-advisor --skill react-upgrade-advisor --agent claude-code codex
```

For one agent, keep only `claude-code` or `codex` after `--agent`. Omit `--agent` to choose other supported agents interactively. The default installation is scoped to the project; add `--global` only if you want a personal installation across projects.

Then open your agent in that project and send the matching prompt:

**Claude Code**

```text
/react-upgrade-advisor Prepare this project for React 19.3. Check framework compatibility, use the version-specific documentation to adapt relevant code, and run the required checks. Explain which new APIs fit this project.
```

**Codex CLI / IDE**

```text
$react-upgrade-advisor Prepare this project for React 19.3. Check framework compatibility, use the version-specific documentation to adapt relevant code, and run the required checks. Explain which new APIs fit this project.
```

In an app interface, select the installed skill from its skill picker or mention it by name. If it is not discovered after installation, start a new agent session in the same project.

The package includes standard `SKILL.md` metadata for Claude Code and `agents/openai.yaml` with a display name and suggested prompt for Codex-compatible interfaces. The CLI creates the agent-specific installation paths; no manual permission changes, custom hooks or MCP server are required. The integration was verified with Skills CLI 1.5.26 for both agent targets, including the installed helper and reference files.

Sources: [Skills CLI options](https://github.com/vercel-labs/skills#install-a-skill), [Claude Code skills](https://code.claude.com/docs/en/skills), [OpenAI skill discovery and metadata](https://learn.chatgpt.com/docs/build-skills).

The skill follows the [Agent Skills format](https://agentskills.io/specification). You can also copy the complete `skills/react-upgrade-advisor` directory into your agent's supported skills location. Its directory page is on [skills.sh](https://skills.sh/0xfabrica/react-upgrade-advisor/react-upgrade-advisor).

The Skills CLI has its own Node requirement: version 1.5.26, used for installation verification, requires Node 22.20+. The offline inspector below supports Node 20+ independently.

## Ask your agent

> Assess whether our React upgrade is worth doing. Inspect the current stack and give me a recommendation without changing dependencies.

> Use react-upgrade-advisor to upgrade this app to the compatible stable React release. Preserve the current package manager and verify our main flows.

> Prepare this codebase for React 19.3 using its documentation. Identify the files that need changes, adapt useful patterns within scope, and explain which existing patterns should stay.

> Our editor broke after a React update. Compare the previous and current runtime and dependency graph, then isolate the regression.

## What makes it useful

- **Version-specific code guidance:** React 19.3 documentation, a file-level preparation workflow, and typed examples for browser-only content, ViewTransition and Fragment refs.
- **Framework-aware:** distinguishes Next App Router's bundled React from the application's installed version; checks hybrid App/Pages projects.
- **Consumer-aware:** catches React/DOM mismatches and inspects the `react-is` that Recharts actually resolves.
- **Workspace-aware:** identifies package-manager and lockfile signals, hoisted dependencies, pnpm package symlinks, PnP limitations and conflicts.
- **Scoped decisions:** separate maintenance upgrades from React Compiler, new animations, caching changes and redesigns.
- **Evidence before claims:** preserves existing work, compares the baseline, exercises product flows and distinguishes local checks from deployment verification.

The workflow covers React web apps, including Next.js, Vite and custom SSR. Library and Expo/React Native cases receive distinct guidance rather than a generic web upgrade command. The inspector is deliberately narrower than a package manager: it does not parse lockfile graphs, certify peer ranges, inspect every sibling app or prove browser behavior.

## Offline inspector

Requires Node 20+ and has no runtime dependencies:

```sh
node skills/react-upgrade-advisor/scripts/inspect-react.mjs /path/to/app --format markdown
node skills/react-upgrade-advisor/scripts/inspect-react.mjs /path/to/app --target 19.3.0 --format json
```

It reads metadata only. It does not execute the inspected project's scripts, import package entrypoints, install dependencies, use the network or write files. Exit 0 means inspection completed; it is not an upgrade approval. Reports stay on stdout and can contain private package names, so review them before sharing.

The instructions include a dated React 19.3 assessment and require fresh release research before choosing a version. The public skill is not pinned to upgrading every project to 19.3 forever.

## What the repository files are

| Path | Purpose |
| --- | --- |
| `skills/react-upgrade-advisor/SKILL.md` | Instructions the agent follows to upgrade and prepare the user's code. |
| `skills/react-upgrade-advisor/references/` | Version-specific documentation, code examples, compatibility, migration and verification guides. |
| `skills/react-upgrade-advisor/scripts/` | Optional offline metadata inspector; it does not upload the inspected project. |
| `tests/` | Synthetic projects created in temporary folders to test the inspector, plus packaging checks and evaluation scenarios. |
| `.github/workflows/` | CI that runs this repository's tests. |

The test projects contain invented manifests and package metadata, not source code or customer data from an application. The skill runs against the user's own project locally; using it does not publish that project to this repository. The installed skill folder includes its helper and references; repository tests and CI are development support files.

## Validate changes

```sh
node --test
```

Tests use disposable fixtures for package-manager conflicts, workspaces, symlinked dependencies, Next runtimes, Recharts peers, PnP, native projects, library peers and read-only behavior. They test the helper and packaging; they do not claim that an agent has successfully migrated every supported framework. [Behavioral scenarios](tests/scenarios.md) describe additional evaluations for future changes.

## Contribute

For a bug report, include the smallest sanitized manifest/peer layout that reproduces the result, the inspector finding and the expected behavior. Keep credentials, private paths and tenant data out of reports. Add a fixture for scanner changes; cite official documentation for changed migration guidance. This project has no affiliation with React, Vercel or any agent vendor.

MIT licensed. Copyright 2026 0xfabrica.
