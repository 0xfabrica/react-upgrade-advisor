#!/usr/bin/env node
// Read metadata, never execute the inspected project's code or package manager.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CORE = ['react', 'react-dom', 'react-is', '@types/react', '@types/react-dom', 'next', 'react-native', 'expo'];
const LOCKS = { 'pnpm-lock.yaml': 'pnpm', 'package-lock.json': 'npm', 'npm-shrinkwrap.json': 'npm', 'yarn.lock': 'yarn', 'bun.lock': 'bun', 'bun.lockb': 'bun' };
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const exists = (file) => fs.existsSync(file);

function readJson(file) {
  if (fs.statSync(file).size > 1_048_576) throw new Error('Metadata exceeds 1 MiB');
  const value = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  if (!object(value)) throw new Error('Expected an object');
  return value;
}

function parents(start) {
  const result = [];
  for (let current = start; ; current = path.dirname(current)) {
    result.push(current);
    if (path.dirname(current) === current) return result;
  }
}

function safeSpec(value) {
  // Do not emit file paths, Git URLs, registry credentials, or arbitrary strings.
  return typeof value === 'string' && value.length < 160 && /[\dxX*]/.test(value) && /^[\da-zA-Z\s.*^~<>=|+-]+$/.test(value)
    ? value : '<non-semver spec; inspect locally>';
}

function validName(name) {
  return /^(?:@[a-zA-Z0-9._-]+\/)?[a-zA-Z0-9._-]+$/.test(name)
    && !name.split('/').some((part) => part === '.' || part === '..');
}

function installed(name, start) {
  if (!validName(name)) return { error: 'Invalid package name' };
  for (const dir of parents(start)) {
    const file = path.join(dir, 'node_modules', name, 'package.json');
    if (!exists(file)) continue;
    try {
      return { metadata: readJson(file), directory: fs.realpathSync(path.dirname(file)) };
    } catch {
      // Do not silently fall back to a hoisted copy when the nearest one is broken.
      return { error: 'Nearest installed metadata is unreadable or invalid' };
    }
  }
  return { error: 'Not resolved through node_modules' };
}

function bundledVersion(nextDirectory, packageName) {
  if (!nextDirectory) return null;
  const file = path.join(nextDirectory, 'dist', 'compiled', packageName, 'cjs', `${packageName}.development.js`);
  try {
    if (fs.statSync(file).size > 5_242_880) return null;
    const text = fs.readFileSync(file, 'utf8');
    return text.match(/(?:exports\.)?version\s*=\s*["']([^"']+)["']/)?.[1] ?? null;
  } catch { return null; }
}

export function inspectProject(directory, target = null) {
  if (target !== null && !VERSION.test(target)) throw new Error('--target must be an exact version such as 19.3.0');
  const root = fs.realpathSync(path.resolve(directory));
  let manifest;
  try { manifest = readJson(path.join(root, 'package.json')); }
  catch { throw new Error('Selected directory must contain a readable package.json object'); }
  const findings = [];
  const add = (code, severity, message) => findings.push({ code, severity, message });
  const ancestry = [];
  for (const dir of parents(root)) {
    ancestry.push(dir);
    if (exists(path.join(dir, '.git'))) break;
  }
  const manifests = new Map([[root, manifest]]);
  for (const dir of ancestry.slice(1)) {
    try { manifests.set(dir, readJson(path.join(dir, 'package.json'))); } catch { /* no ancestor metadata */ }
  }
  const workspace = ancestry.find((dir) => exists(path.join(dir, 'pnpm-workspace.yaml')) || manifests.get(dir)?.workspaces) ?? null;
  const boundary = workspace ?? root;
  const relevantDirs = ancestry.slice(0, ancestry.indexOf(boundary) + 1);
  const lockfiles = relevantDirs.flatMap((dir) => Object.entries(LOCKS)
    .filter(([file]) => exists(path.join(dir, file)))
    .map(([file, manager]) => ({ file: path.relative(root, path.join(dir, file)).split(path.sep).join('/'), manager })));
  const managerDeclaration = relevantDirs.map((dir) => manifests.get(dir)?.packageManager).find((v) => typeof v === 'string') ?? null;
  const declaredManager = managerDeclaration?.match(/^(npm|pnpm|yarn|bun)@/)?.[1] ?? null;
  const lockManagers = [...new Set(lockfiles.map((lock) => lock.manager))];
  const manager = declaredManager ?? (lockManagers.length === 1 ? lockManagers[0] : null);
  if (lockManagers.length > 1 || (declaredManager && lockManagers.some((pm) => pm !== declaredManager))) {
    add('PACKAGE_MANAGER_CONFLICT', 'blocker', 'Multiple package-manager signals conflict. Inspect CI and workspace ownership before installing.');
  }
  if (!manager) add('PACKAGE_MANAGER_UNKNOWN', 'review', 'Package manager is unknown. Inspect project instructions and CI.');
  if (!lockfiles.length) add('LOCKFILE_NOT_FOUND', 'review', 'No lockfile was found for the selected package/workspace. Reproducibility is unverified.');
  if (relevantDirs.some((dir) => exists(path.join(dir, '.pnp.cjs')) || exists(path.join(dir, '.pnp.js')))) {
    add('YARN_PNP', 'review', 'Plug\u2019n\u2019Play detected. This helper does not load PnP hooks; use the project\u2019s Yarn diagnostics for actual resolution.');
  }
  const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
  const declared = {};
  for (const section of sections) {
    for (const [name, spec] of Object.entries(object(manifest[section]) ? manifest[section] : {})) {
      if (!validName(name)) continue;
      (declared[name] ??= []).push({ section, spec: safeSpec(spec) });
    }
  }
  const packages = CORE.map((name) => {
    const pkg = installed(name, root);
    return {
      name, declared: declared[name] ?? [],
      installed: VERSION.test(pkg.metadata?.version ?? '') ? pkg.metadata.version : null,
      resolution: pkg.error ?? 'node_modules metadata',
    };
  });
  const get = (name) => packages.find((pkg) => pkg.name === name)?.installed ?? null;
  if (!declared.react && !get('react')) add('REACT_NOT_FOUND', 'review', 'No React declaration or installation found. Select the application package inside the workspace.');
  for (const pkg of packages.filter((pkg) => pkg.declared.length)) {
    if (!pkg.installed) add('PACKAGE_UNRESOLVED', 'review', `${pkg.name}: installed version is unknown. Do not infer it from a declared range.`);
    for (const { spec } of pkg.declared) {
      if (VERSION.test(spec) && pkg.installed && spec !== pkg.installed) {
        add('MANIFEST_INSTALL_DRIFT', 'review', `${pkg.name}: declared ${spec}, installed ${pkg.installed}. Establish the intended baseline.`);
      }
      if (spec.startsWith('<non-semver')) add('NON_REGISTRY_SPEC', 'review', `${pkg.name}: alias, workspace, file or other non-semver spec needs manual inspection.`);
    }
  }
  if (get('react') && get('react-dom') && get('react') !== get('react-dom')) {
    add('REACT_DOM_VERSION_MISMATCH', 'blocker', `React ${get('react')} and React DOM ${get('react-dom')} differ. Align the renderer pair.`);
  }
  if (get('react') && get('@types/react') && get('react').split('.')[0] !== get('@types/react').split('.')[0]) {
    add('REACT_TYPES_MAJOR_MISMATCH', 'review', 'React runtime and installed React types have different major versions.');
  }
  const dependencyNames = Object.keys(declared).sort();
  if (dependencyNames.length > 500) add('CONSUMER_LIMIT', 'review', 'Consumer inspection is limited to the first 500 direct dependencies.');
  const consumers = [];
  for (const name of dependencyNames.slice(0, 500)) {
    const pkg = installed(name, root);
    const peers = pkg.metadata?.peerDependencies;
    if (!object(peers) || !['react', 'react-dom', 'react-is'].some((key) => key in peers)) continue;
    const relevant = Object.fromEntries(Object.entries(peers)
      .filter(([key]) => ['react', 'react-dom', 'react-is', '@types/react', '@types/react-dom'].includes(key))
      .map(([key, spec]) => [key, safeSpec(spec)]));
    const resolved = Object.fromEntries(['react', 'react-dom', 'react-is'].filter((key) => key in peers)
      .map((key) => {
        const version = installed(key, pkg.directory).metadata?.version;
        return [key, VERSION.test(version ?? '') ? version : null];
      }));
    consumers.push({ name, version: VERSION.test(pkg.metadata.version ?? '') ? pkg.metadata.version : null, peers: relevant, resolved });
    if (name === 'recharts' && resolved['react-is'] && resolved.react && resolved['react-is'] !== resolved.react) {
      add('RECHARTS_REACT_IS_MISMATCH', 'review', `Recharts resolves React ${resolved.react} and react-is ${resolved['react-is']}. Check the maintainer\u2019s version-alignment guidance; do not force every react-is consumer globally.`);
    }
    if (resolved.react && get('react') && resolved.react !== get('react')) {
      add('CONSUMER_REACT_VERSION_DIFFERS', 'review', `${name} resolves a different React version. Verify peer layout and possible duplicate runtimes.`);
    }
  }
  const next = installed('next', root);
  // A hoisted framework may belong to a sibling app, not this selected package.
  const hasNext = Boolean(declared.next);
  const native = Boolean(declared.expo || declared['react-native']);
  const library = Boolean(manifest.peerDependencies?.react && !manifest.dependencies?.react && !hasNext && !native);
  const routers = hasNext ? ['app', 'src/app', 'pages', 'src/pages'].filter((dir) => exists(path.join(root, dir))) : [];
  if (native) add('NATIVE_FRAMEWORK_OWNS_REACT', 'blocker', 'Expo/React Native detected. Choose the framework-supported React version; this web workflow must not independently upgrade its React runtime.');
  if (library) add('REACT_LIBRARY', 'review', 'This looks like a React library. Preserve React as a peer; validate supported consumers before changing its range.');
  const bundled = hasNext ? { react: bundledVersion(next.directory, 'react'), reactDom: bundledVersion(next.directory, 'react-dom') } : null;
  if (routers.some((dir) => dir.endsWith('app'))) {
    add('NEXT_APP_BUNDLED_REACT', 'review', 'App Router uses React bundled by Next. A manifest upgrade alone does not prove a runtime or feature upgrade.');
    if (!bundled?.react) add('BUNDLED_REACT_UNKNOWN', 'review', 'Could not read the bundled React revision. Inspect the installed Next documentation and effective route runtime.');
  }
  if (target && get('react')) {
    const current = get('react').split(/[.+-]/).slice(0, 3).map(Number);
    const requested = target.split(/[.+-]/).slice(0, 3).map(Number);
    const firstDifference = current.findIndex((part, i) => part !== requested[i]);
    if (firstDifference >= 0 && current[firstDifference] > requested[firstDifference]) {
      add('TARGET_IS_OLDER', 'blocker', `Target ${target} is older than installed React ${get('react')}. Do not downgrade under an upgrade request.`);
    }
    if (current[0] < 19 && requested[0] >= 19) add('REACT_19_MAJOR_MIGRATION', 'review', 'Read the React 19 upgrade guide, assess the React 18.3 warning step, JSX transform, removed APIs, types and error reporting.');
  }
  if (target?.includes('-')) add('PRERELEASE_TARGET', 'review', 'The requested version is a prerelease. Confirm this was intentional and supported by the framework.');
  return {
    schemaVersion: 1, target,
    packageManager: { selected: manager, declared: managerDeclaration?.match(/^(?:npm|pnpm|yarn|bun)@[\d.]+/)?.[0] ?? null, lockfiles },
    workspace: { detected: Boolean(workspace), selectedIsRoot: workspace === root },
    framework: { next: hasNext, routers, native, library, vite: Boolean(declared.vite), reactRouter: Boolean(declared['react-router'] || declared['@remix-run/react']) },
    packages, bundled, consumers, scripts: Object.keys(object(manifest.scripts) ? manifest.scripts : {}).sort(),
    findings,
    limits: [
      'Offline metadata inspection only; no network, installation, project code execution or file writes.',
      'Lockfiles are located, not parsed. Confirm locked versions and full peer satisfaction with the owning package manager.',
      'Only direct consumers and node_modules resolution are inspected; PnP, aliases, bundler overrides and full duplicate trees require follow-up.',
      'A finding-free report is not a runtime, security, build, browser or upgrade approval.',
    ],
  };
}

export function markdown(report) {
  const cell = (value) => String(value ?? 'unknown').replace(/[\r\n|<>`]/g, ' ');
  return [
    '# React upgrade inventory', '',
    `Package manager: ${cell(report.packageManager.selected)}. Target: ${cell(report.target ?? 'not selected')}.`, '',
    '| Package | Installed | Declared |', '| --- | --- | --- |',
    ...report.packages.filter((pkg) => pkg.installed || pkg.declared.length)
      .map((pkg) => `| ${cell(pkg.name)} | ${cell(pkg.installed)} | ${cell(pkg.declared.map((d) => `${d.section}: ${d.spec}`).join('; '))} |`), '',
    ...(report.bundled ? [`Next bundled React: ${cell(report.bundled.react)}. React DOM: ${cell(report.bundled.reactDom)}.`, ''] : []),
    '## Findings', '',
    ...(report.findings.length ? report.findings.map((f) => `- ${cell(f.severity)} / ${cell(f.code)}: ${cell(f.message)}`) : ['No metadata findings. Runtime validation is still required.']), '',
    '## Limits', '', ...report.limits.map((limit) => `- ${limit}`), '',
  ].join('\n');
}

function main(args) {
  let project = null, target = null, format = 'json';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') {
      process.stdout.write('Usage: node inspect-react.mjs [project-directory] [--target 19.3.0] [--format json|markdown]\nRead-only, offline metadata inventory. Exit 0 means inspection ran, not upgrade approval.\n');
      return;
    }
    if (args[i] === '--target' || args[i] === '--format') {
      const option = args[i], value = args[++i];
      if (!value || value.startsWith('--')) throw new Error(`${option} needs a value`);
      if (option === '--target') target = value; else format = value;
    } else if (args[i].startsWith('-')) throw new Error(`Unknown option: ${args[i]}`);
    else if (project !== null) throw new Error('Select one project directory per invocation');
    else project = args[i];
  }
  if (!['json', 'markdown'].includes(format)) throw new Error('--format must be json or markdown');
  const report = inspectProject(project ?? '.', target);
  process.stdout.write(format === 'json' ? `${JSON.stringify(report, null, 2)}\n` : markdown(report));
}

function isMain() {
  try { return Boolean(process.argv[1]) && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
}

if (isMain()) {
  try { main(process.argv.slice(2)); }
  catch (error) { process.stderr.write(`Inspection failed: ${error.message}\n`); process.exitCode = 1; }
}
