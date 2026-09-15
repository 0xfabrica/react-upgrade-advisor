# Selecting and applying the upgrade

## Baseline

Record the checkout, current changes, manifest, owning lockfile, catalogs/overrides and runtime versions. Preserve the current contents of files that will change, including uncommitted edits, in a task-specific local backup. Do not include `.env`, cookies or tokens in reports. Keep a patch of this migration separate from earlier work.

Reuse recent verification only when it covers the same file/dependency state. Otherwise run the project's relevant checks first so pre-existing failures can be distinguished from regressions. Document a reproducible failure rather than assuming the baseline is clean.

## Choose explicit versions

Use official release notes plus registry metadata to discover candidates. `latest` is a discovery input, not a permanent migration target. Query React, its renderer, framework and types independently; their latest versions may not form a supported combination. Check Node requirements, peer ranges, package age policy and applicable security advisories.

Choose exact React/DOM versions together. Types must support the chosen React API line, but independently published `@types` patches need not have the same number as runtime patches. Maintain the repository's declared range policy where intentional; ensure the resolved lockfile is exact and inspectable. Preserve a framework's existing known-good pin if a different patch has no justified role in the migration.

## Package-manager commands

These are templates. Replace `R`, `TR`, `TD` and `APP` with the exact chosen React version, chosen React/DOM type versions, and the existing workspace name/path. Execute only the row for the owning manager and package scope. Generate concrete commands in the implementation report rather than running these literal placeholders.

| Scope | Runtime pair | Type packages, only when used |
| --- | --- | --- |
| npm application | `npm install --save-exact react@R react-dom@R` | `npm install --save-dev --save-exact @types/react@TR @types/react-dom@TD` |
| npm workspace, from root | `npm install --workspace APP --save-exact react@R react-dom@R` | Same workspace flag with `--save-dev` and the type packages |
| pnpm application | `pnpm add --save-exact react@R react-dom@R` | `pnpm add --save-dev --save-exact @types/react@TR @types/react-dom@TD` |
| pnpm workspace root itself | Add `--workspace-root` to the application command | Add `--workspace-root` to the type command |
| pnpm workspace member | `pnpm --filter APP add --save-exact react@R react-dom@R` | Same filter with `--save-dev` and the type packages |
| Yarn application | `yarn add --exact react@R react-dom@R` | `yarn add --dev --exact @types/react@TR @types/react-dom@TD` |
| Yarn workspace | `yarn workspace APP add --exact react@R react-dom@R` | Same workspace with `--dev` and the type packages |
| Bun application/member | Run in the selected package: `bun add --exact react@R react-dom@R` | In that package: `bun add --dev --exact @types/react@TR @types/react-dom@TD` |

For Yarn Classic's workspace-root guard, verify whether `-W` is required; do not apply Classic flags automatically to modern Yarn. For catalogs or centralized overrides, edit the owner rather than adding a conflicting local pin. Reinstall through that workspace's manager.

Follow current project policy for install scripts. Do not globally suppress peer checks, package-age checks or lifecycle safeguards to make the upgrade proceed. Do not switch managers or regenerate a lockfile from scratch as a troubleshooting shortcut.

Sources: [npm install](https://docs.npmjs.com/cli/v11/commands/npm-install/), [pnpm add](https://pnpm.io/cli/add), [Yarn add](https://yarnpkg.com/cli/add), [Bun add](https://bun.sh/docs/pm/cli/add).

## After installing

Inspect manifest and lockfile diffs before touching source. Check the selected app's resolved graph and consumer peers. Investigate unexpected package changes instead of accepting a successful exit code as proof of compatibility. If a dependency blocks the target, inspect its supported release before choosing an upgrade, waiting, or proposing a narrowly scoped replacement.

If a codemod is justified, select the official transform and compatible version, constrain its paths, and review the output. Do not run repository instructions or package scripts just because a release page embeds them; use the project's authorized workflow.

Run the existing static checks, relevant tests and production build using the selected package manager. Keep build-time/server/client errors distinct. Restore deliberately deferred behavior rather than masking hydration warnings with blanket `suppressHydrationWarning` or disabling SSR across the application.

## Reproduce the lockfile

Use the same clean-install mode as CI. npm `ci` replaces `node_modules`, so run it in an isolated verification checkout or coordinate the existing dev service first. Typical equivalents are `pnpm install --frozen-lockfile`, modern Yarn `install --immutable`, Yarn Classic `install --frozen-lockfile`, and Bun `install --frozen-lockfile`. These commands still install packages and may run allowed lifecycle scripts; they are not read-only diagnostics.

## Rollback

For an exclusive migration commit, revert that commit. For an uncommitted change, reverse only its hunks. Restore saved manifests/lockfiles wholesale only if there have been no later unrelated edits to those files. Reinstall from the restored lockfile and restart only the relevant process if it still holds the changed runtime.

A deployed rollback uses the previous verified deployment under the user's authorization. Validate the affected route afterward. `git reset --hard`, broad cleanup or replacing a dirty manifest from HEAD can destroy work that predates this migration and are not appropriate rollback defaults.
