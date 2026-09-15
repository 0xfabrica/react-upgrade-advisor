# React Upgrade Advisor

An agent skill for deciding whether to upgrade React and carrying out the migration with evidence from the actual application.

It checks the distinction between the React you declare, the version your dependencies resolve, and the renderer your framework serves. It then guides the agent through version selection, focused changes, regression checks and rollback.

## Install

Install with the Skills CLI:

```sh
npx skills add 0xfabrica/react-upgrade-advisor --skill react-upgrade-advisor
```

The skill uses the [Agent Skills format](https://agentskills.io/specification). Install it for Claude Code, Codex, Cursor or another supported agent with the Skills CLI. You can also copy the complete `skills/react-upgrade-advisor` directory into your agent's supported skills location.

The Skills CLI has its own Node requirement: version 1.5.26, used for installation verification, requires Node 22.20+. The offline inspector below supports Node 20+ independently.

## Ask your agent

> Assess whether our React upgrade is worth doing. Inspect the current stack and give me a recommendation without changing dependencies.

> Use react-upgrade-advisor to upgrade this app to the compatible stable React release. Preserve the current package manager and verify our main flows.

> Our editor broke after a React update. Compare the previous and current runtime and dependency graph, then isolate the regression.

## What makes it useful

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

## Validate changes

```sh
node --test
```

Tests use disposable fixtures for package-manager conflicts, workspaces, symlinked dependencies, Next runtimes, Recharts peers, PnP, native projects, library peers and read-only behavior. They test the helper and packaging; they do not claim that an agent has successfully migrated every supported framework. [Behavioral scenarios](tests/scenarios.md) describe additional evaluations for future changes.

## Contribute

For a bug report, include the smallest sanitized manifest/peer layout that reproduces the result, the inspector finding and the expected behavior. Keep credentials, private paths and tenant data out of reports. Add a fixture for scanner changes; cite official documentation for changed migration guidance. This project has no affiliation with React, Vercel or any agent vendor.

MIT licensed. Copyright 2026 0xfabrica.
