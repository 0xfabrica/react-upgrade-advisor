import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const skill = path.join(root, 'skills/react-upgrade-advisor');
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
test('the installable folder has valid discovery fields and its own license', () => {
  const content = fs.readFileSync(path.join(skill, 'SKILL.md'), 'utf8');
  const header = content.match(/^---\n([\s\S]+?)\n---\n/); assert.ok(header);
  const name = header[1].match(/^name: (.+)$/m)?.[1];
  const description = header[1].match(/^description: (.+)$/m)?.[1];
  assert.equal(name, path.basename(skill)); assert.ok(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name));
  assert.ok(name.length <= 64 && description.length > 0 && description.length <= 1024);
  assert.equal(fs.readFileSync(path.join(skill, 'LICENSE'), 'utf8'), fs.readFileSync(path.join(root, 'LICENSE'), 'utf8'));
});
test('skill references survive installation without the repository README or tests', () => {
  for (const file of files(skill).filter((file) => file.endsWith('.md'))) {
    const content = fs.readFileSync(file, 'utf8');
    for (const [, href] of content.matchAll(/\]\(([^)]+)\)/g)) {
      if (/^https?:|^#/.test(href)) continue;
      const target = path.resolve(path.dirname(file), href.split('#')[0]);
      assert.ok(target.startsWith(skill + path.sep), `${file}: link escapes installable skill`);
      assert.ok(fs.statSync(target).isFile(), `${file}: missing ${href}`);
    }
  }
});
test('public bundle contains no machine-specific paths or tenant identifiers', () => {
  const forbidden = [new RegExp('/Users/' + '[^/]+/'), new RegExp('C:\\\\Users\\\\'), /localhost:3000/, /[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/i];
  for (const file of files(skill)) {
    const content = fs.readFileSync(file, 'utf8');
    for (const pattern of forbidden) assert.ok(!pattern.test(content), `${file}: private material`);
    assert.ok(!content.startsWith('\uFEFF')); assert.ok(!content.includes('\r'));
  }
});
