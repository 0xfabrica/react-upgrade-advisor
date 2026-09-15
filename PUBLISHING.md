# Publishing this skill

The release candidate is a standalone repository containing only the public skill, tests, documentation and license. The intended GitHub source is `0xfabrica/react-upgrade-advisor`; publishing it does not require exposing the application repository from which the original workflow was developed.

## Before the first public push

Run `node --test`, inspect the exact files and history to be published, and review the license. Check that examples/reports contain no personal paths, internal domains, credentials, customer identifiers or copied private application code. The scanner's live reports are local QA artifacts and should not be added to this repository.

After the owner authorizes the public repository, create it and push this standalone history. The commands below are the release steps, not a claim that publication has happened:

```sh
gh repo create 0xfabrica/react-upgrade-advisor --public --source . --remote origin --push
```

If the repository already exists, inspect its visibility, remote and current branch before updating it instead of creating another one. Replace the conditional installation wording in README once the public source and installation are verified.

## Discovery and installation

List the skill without installing it:

```sh
npx skills add 0xfabrica/react-upgrade-advisor --list
```

Then do one genuine installation for the intended agent, using the command in README. Read the CLI's available options for the installed version; do not overwrite existing agent skills during a smoke test. Use a disposable test directory for local installation validation.

The [skills.sh FAQ](https://www.skills.sh/docs/faq) says skills are hosted in GitHub and enter the leaderboard through installation telemetry from the Skills CLI. There is no separate ZIP-upload submission step. The [CLI documentation](https://www.skills.sh/docs/cli) documents telemetry and opt-out controls. A successful GitHub push is not proof that indexing has completed; verify the source page and report pending indexing honestly. Do not repeat artificial installs to influence rankings.

## Updates

Review release sources when new React/framework versions arrive. Keep the general decision workflow independent of dated release notes. Update the skill's metadata version, run the tests, inspect the diff and publish a focused commit. Users can use the Skills CLI's update workflow. Avoid a fixed recurring “update to latest” instruction that can silently move people onto incompatible releases.
