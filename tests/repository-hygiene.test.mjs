import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');

test('README documents the repository and external publish contract', () => {
  const readme = read('README.md');
  const required = [
    'Kafo AI Mockups.dc.html',
    'deploy/index.html',
    'support.js',
    'dc-runtime/src/*.ts',
    'deploy/vercel.json',
    'uploads/',
    'Do not hand-edit',
    'cd dc-runtime && bun run build',
    'no bundler',
    'no local command',
    'external bundler/source owner',
    'Vercel serves the `deploy/` directory',
    'noindex, nofollow',
    'does not prove the Vercel account linkage',
    'node --test tests/repository-hygiene.test.mjs',
    'node --check support.js',
    `node -e "JSON.parse(require('node:fs').readFileSync('deploy/vercel.json', 'utf8'))"`,
    'git diff --check',
    'python3 -m http.server 8000 --directory deploy',
    'git diff --exit-code -- deploy/index.html support.js',
    '[`LICENSE`](LICENSE)',
  ];
  for (const phrase of required) {
    assert.ok(readme.includes(phrase), `README is missing: ${phrase}`);
  }
});

test('ignore rules exclude local clutter without hiding committed content', () => {
  const ignored = [
    ['.DS_Store', 'macOS metadata'],
    ['Thumbs.db', 'Windows metadata'],
    ['.vscode/settings.json', 'editor state'],
    ['scratch.swp', 'editor swap'],
    ['debug.log', 'logs'],
    ['.cache/tool-state', 'cache directory'],
    ['node_modules/example/index.js', 'local dependencies'],
    ['.vercel/project.json', 'local Vercel metadata'],
    ['.env', 'local environment'],
  ];
  for (const [path, label] of ignored) {
    assert.doesNotThrow(() => execFileSync('git', ['check-ignore', '--no-index', '--quiet', '--', path]), `${label} should be ignored: ${path}`);
  }
  assert.throws(() => execFileSync('git', ['check-ignore', '--no-index', '--', '.env.example']), 'safe example environment file should not be ignored');

  const protectedPaths = ['deploy/', 'deploy/index.html', 'support.js', 'Kafo AI Mockups.dc.html', 'uploads/reference.pdf'];
  for (const path of protectedPaths) {
    assert.throws(() => execFileSync('git', ['check-ignore', '--no-index', '--quiet', '--', path]), `committed path must remain visible: ${path}`);
  }
});

test('LICENSE states proprietary ownership and restricted use', () => {
  const license = read('LICENSE');
  for (const phrase of ['Raya Software Limited', 'proprietary', 'confidential', 'all rights reserved', 'No permission', 'copy', 'modify', 'distribute', 'sublicense', 'derivative', 'prior written authorization', 'not an open-source license']) {
    assert.ok(license.toLowerCase().includes(phrase.toLowerCase()), `LICENSE is missing: ${phrase}`);
  }
});

test('generated boundaries and hosting configuration remain reachable', () => {
  const runtime = read('support.js');
  assert.ok(runtime.startsWith('// GENERATED from dc-runtime/src/*.ts — do not edit. Rebuild with `cd dc-runtime && bun run build`.'), 'support.js generated warning changed; update README and external rebuild boundary together');

  const bundle = read('deploy/index.html');
  for (const marker of ['__bundler/manifest', '__bundler/template', '__bundler/page_order']) {
    assert.ok(bundle.includes(`script type="${marker}"`), `deploy/index.html is missing bundler marker ${marker}; README contract may be stale`);
  }

  const vercel = JSON.parse(read('deploy/vercel.json'));
  assert.equal(vercel.cleanUrls, true, 'deploy/vercel.json must retain cleanUrls: true');
  const globalRule = vercel.headers?.find((rule) => rule.source === '/(.*)');
  const robots = globalRule?.headers?.find((header) => header.key === 'X-Robots-Tag');
  assert.equal(robots?.value, 'noindex, nofollow', 'deploy/vercel.json must retain the global pre-launch noindex, nofollow rule');
});
