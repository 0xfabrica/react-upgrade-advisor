import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inspectProject, markdown } from '../skills/react-upgrade-advisor/scripts/inspect-react.mjs';

const cli = fileURLToPath(new URL('../skills/react-upgrade-advisor/scripts/inspect-react.mjs', import.meta.url));
function fixture(t, manifest = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'react-upgrade-fixture-'));
  fs.mkdirSync(path.join(root, '.git'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  json(root, 'package.json', manifest);
  return root;
}
function json(root, relative, value) { write(root, relative, JSON.stringify(value)); }
function write(root, relative, value) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}
function pkg(root, name, version, extra = {}) { json(root, `node_modules/${name}/package.json`, { name, version, ...extra }); }
const codes = (report) => report.findings.map((f) => f.code);

test('standalone Vite inventory preserves npm and installed versions', (t) => {
  const root = fixture(t, { packageManager: 'npm@11.0.0', dependencies: { react: '^19.2.0', 'react-dom': '^19.2.0' }, devDependencies: { vite: '^7.0.0' } });
  write(root, 'package-lock.json', '{}'); pkg(root, 'react', '19.2.8'); pkg(root, 'react-dom', '19.2.8');
  const result = inspectProject(root, '19.3.0');
  assert.equal(result.packageManager.selected, 'npm'); assert.equal(result.framework.vite, true);
  assert.equal(result.packages.find((p) => p.name === 'react').installed, '19.2.8');
  assert.equal(result.findings.length, 0);
});
test('App Router distinguishes bundled revision from declared stable React', (t) => {
  const root = fixture(t, { dependencies: { react: '19.3.0', next: '16.3.5' } });
  pkg(root, 'react', '19.3.0'); pkg(root, 'next', '16.3.5');
  fs.mkdirSync(path.join(root, 'src/app'), { recursive: true });
  write(root, 'node_modules/next/dist/compiled/react/cjs/react.development.js', 'exports.version = "19.3.0-canary-example-20260731";');
  const result = inspectProject(root);
  assert.equal(result.bundled.react, '19.3.0-canary-example-20260731');
  assert.ok(codes(result).includes('NEXT_APP_BUNDLED_REACT'));
});
test('Pages Router does not receive an App Router finding', (t) => {
  const root = fixture(t, { dependencies: { next: '16.3.5' } }); fs.mkdirSync(path.join(root, 'pages'));
  assert.ok(!codes(inspectProject(root)).includes('NEXT_APP_BUNDLED_REACT'));
});
test('unknown bundled revision is reported, never fabricated', (t) => {
  const root = fixture(t, { dependencies: { next: '16.3.5' } }); fs.mkdirSync(path.join(root, 'app'));
  assert.ok(codes(inspectProject(root)).includes('BUNDLED_REACT_UNKNOWN'));
});
test('nested pnpm workspace discovers owning root and hoisted installation', (t) => {
  const root = fixture(t, { packageManager: 'pnpm@11.1.3' });
  write(root, 'pnpm-workspace.yaml', 'packages:\n  - apps/*\n'); write(root, 'pnpm-lock.yaml', 'lockfileVersion: 9');
  json(root, 'apps/web/package.json', { dependencies: { react: '19.3.0' } }); pkg(root, 'react', '19.3.0');
  const result = inspectProject(path.join(root, 'apps/web'));
  assert.equal(result.workspace.detected, true); assert.equal(result.workspace.selectedIsRoot, false);
  assert.equal(result.packageManager.selected, 'pnpm'); assert.equal(result.packageManager.lockfiles[0].file, '../../pnpm-lock.yaml');
  assert.equal(result.packages[0].installed, '19.3.0');
});
test('package-manager conflict blocks blindly choosing a lockfile', (t) => {
  const root = fixture(t, { packageManager: 'pnpm@11.1.3' }); write(root, 'package-lock.json', '{}');
  assert.ok(codes(inspectProject(root)).includes('PACKAGE_MANAGER_CONFLICT'));
});
test('Yarn PnP remains explicitly unresolved without executing hooks', (t) => {
  const root = fixture(t, { packageManager: 'yarn@4.9.0', dependencies: { react: '^19.3.0' } });
  write(root, '.pnp.cjs', 'throw new Error("must not run");'); write(root, 'yarn.lock', '');
  const result = inspectProject(root);
  assert.ok(codes(result).includes('YARN_PNP')); assert.equal(result.packages[0].installed, null);
});
test('Bun lockb is recognized without parsing binary data', (t) => {
  const root = fixture(t); write(root, 'bun.lockb', Buffer.from([0, 1, 2]));
  assert.equal(inspectProject(root).packageManager.selected, 'bun');
});
test('React DOM mismatch and exact manifest drift remain separate', (t) => {
  const root = fixture(t, { dependencies: { react: '19.3.0', 'react-dom': '19.3.0' } });
  pkg(root, 'react', '19.2.8'); pkg(root, 'react-dom', '19.3.0');
  const found = codes(inspectProject(root));
  assert.ok(found.includes('MANIFEST_INSTALL_DRIFT')); assert.ok(found.includes('REACT_DOM_VERSION_MISMATCH'));
});
test('Recharts checks its own peer, allowing unrelated react-is copies', (t) => {
  const root = fixture(t, { dependencies: { react: '19.3.0', recharts: '3.10.1' } });
  pkg(root, 'react', '19.3.0'); pkg(root, 'react-is', '16.13.1');
  pkg(root, 'recharts', '3.10.1', { peerDependencies: { react: '^19.0.0', 'react-is': '^16.8.0 || ^19.0.0' } });
  assert.ok(codes(inspectProject(root)).includes('RECHARTS_REACT_IS_MISMATCH'));
  pkg(path.join(root, 'node_modules/recharts'), 'react-is', '19.3.0');
  assert.ok(!codes(inspectProject(root)).includes('RECHARTS_REACT_IS_MISMATCH'));
});
test('pnpm symlink consumer resolution follows real package location', (t) => {
  const root = fixture(t, { dependencies: { react: '19.3.0', recharts: '3.10.1' } });
  pkg(root, 'react', '19.3.0');
  const virtual = path.join(root, 'node_modules/.pnpm/recharts-fixture');
  pkg(virtual, 'recharts', '3.10.1', { peerDependencies: { react: '^19', 'react-is': '^19' } });
  pkg(virtual, 'react', '19.3.0'); pkg(virtual, 'react-is', '19.3.0');
  fs.symlinkSync(path.join(virtual, 'node_modules/recharts'), path.join(root, 'node_modules/recharts'), 'junction');
  assert.equal(inspectProject(root).consumers[0].resolved['react-is'], '19.3.0');
});
test('native projects route to their framework instead of arbitrary React latest', (t) => {
  const root = fixture(t, { dependencies: { expo: '^54.0.0', react: '19.1.0' } });
  assert.ok(codes(inspectProject(root, '19.3.0')).includes('NATIVE_FRAMEWORK_OWNS_REACT'));
});
test('a hoisted native or Next framework does not reclassify a sibling Vite app', (t) => {
  const root = fixture(t, { workspaces: ['apps/*'] });
  pkg(root, 'expo', '54.0.0'); pkg(root, 'next', '16.3.5');
  json(root, 'apps/web/package.json', { dependencies: { react: '19.3.0' }, devDependencies: { vite: '7.0.0' } });
  const result = inspectProject(path.join(root, 'apps/web'));
  assert.equal(result.framework.native, false); assert.equal(result.framework.next, false);
});
test('library peer declarations do not become runtime dependencies', (t) => {
  const root = fixture(t, { peerDependencies: { react: '^18 || ^19' } });
  const result = inspectProject(root); assert.equal(result.framework.library, true);
  assert.ok(codes(result).includes('REACT_LIBRARY'));
});
test('older target and major migration have different findings', (t) => {
  const root = fixture(t); pkg(root, 'react', '19.3.1');
  assert.ok(codes(inspectProject(root, '19.3.0')).includes('TARGET_IS_OLDER'));
  pkg(root, 'react', '18.2.0');
  assert.ok(codes(inspectProject(root, '19.3.0')).includes('REACT_19_MAJOR_MIGRATION'));
});
test('project scripts and package entrypoints never execute', (t) => {
  const root = fixture(t, { dependencies: { react: '19.3.0' }, scripts: { postinstall: 'DO_NOT_PRINT_OR_RUN_THIS' } });
  pkg(root, 'react', '19.3.0', { main: 'index.js', exports: './index.js' });
  const marker = path.join(root, 'executed');
  write(root, 'node_modules/react/index.js', `require('fs').writeFileSync(${JSON.stringify(marker)}, 'bad'); throw Error('bad');`);
  const result = inspectProject(root); assert.ok(!existsFile(marker));
  assert.ok(!JSON.stringify(result).includes('DO_NOT_PRINT_OR_RUN_THIS'));
});
const existsFile = (file) => fs.existsSync(file);
test('specs containing credentials or private paths are redacted', (t) => {
  const root = fixture(t, { dependencies: { react: 'git+https://secret-token@example.invalid/private.git' } });
  const text = JSON.stringify(inspectProject(root)); assert.ok(!text.includes('secret-token')); assert.ok(!text.includes('private.git'));
});
test('malformed nearest dependency does not resolve to a different hoisted copy', (t) => {
  const root = fixture(t); pkg(root, 'react', '19.3.0'); json(root, 'apps/web/package.json', { dependencies: { react: '19.3.0' } });
  write(root, 'apps/web/node_modules/react/package.json', '{bad');
  assert.equal(inspectProject(path.join(root, 'apps/web')).packages[0].installed, null);
});
test('unknown peer ranges are preserved as evidence, not claimed compatible', (t) => {
  const root = fixture(t, { dependencies: { example: '1.0.0' } });
  pkg(root, 'example', '1.0.0', { peerDependencies: { react: '>=18 <20 || ^20.0.0-rc.1' } });
  assert.equal(inspectProject(root, '19.3.0').consumers[0].peers.react, '>=18 <20 || ^20.0.0-rc.1');
});
test('inspection makes no file changes', (t) => {
  const root = fixture(t, { dependencies: { react: '19.3.0' } }); pkg(root, 'react', '19.3.0');
  const before = fs.readFileSync(path.join(root, 'package.json'));
  const entries = fs.readdirSync(root, { recursive: true }); inspectProject(root);
  assert.deepEqual(fs.readFileSync(path.join(root, 'package.json')), before);
  assert.deepEqual(fs.readdirSync(root, { recursive: true }), entries);
});
test('CLI handles invalid arguments, missing project, JSON and markdown', (t) => {
  const root = fixture(t);
  for (const args of [['--wat'], ['--target'], ['--target', 'latest'], ['--format', 'html'], [root, root]]) {
    assert.equal(spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' }).status, 1);
  }
  assert.equal(spawnSync(process.execPath, [cli, path.join(root, 'absent')]).status, 1);
  const result = spawnSync(process.execPath, [cli, root], { encoding: 'utf8' }); assert.equal(result.status, 0); JSON.parse(result.stdout);
  assert.match(markdown(inspectProject(root)), /not a runtime/);
  assert.equal(spawnSync(process.execPath, [cli, root, '--format', 'markdown']).status, 0);
});
test('CLI works through a symlink, as installed agent skills often do', (t) => {
  const root = fixture(t);
  const link = path.join(root, 'inspect.mjs'); fs.symlinkSync(cli, link);
  const result = spawnSync(process.execPath, [link, root], { encoding: 'utf8' });
  assert.equal(result.status, 0); assert.equal(JSON.parse(result.stdout).schemaVersion, 1);
});
test('the module can be imported from stdin without treating it as a CLI run', () => {
  const url = new URL('../skills/react-upgrade-advisor/scripts/inspect-react.mjs', import.meta.url).href;
  const result = spawnSync(process.execPath, ['--input-type=module', '-'], {
    input: `import { inspectProject } from ${JSON.stringify(url)}; console.log(typeof inspectProject);`, encoding: 'utf8',
  });
  assert.equal(result.status, 0); assert.equal(result.stdout.trim(), 'function');
});
