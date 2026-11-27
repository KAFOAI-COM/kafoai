#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const total = 4;
const cases = [
  'README documents the repository and external publish contract',
  'ignore rules exclude local clutter without hiding committed content',
  'LICENSE states proprietary ownership and restricted use',
  'generated boundaries and hosting configuration remain reachable',
];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const env = process.env;
const value = (name, fallbackName) => env[name] || (fallbackName && env[fallbackName]);
const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output-dir');
const outputDir = outputIndex >= 0 ? args[outputIndex + 1] : (env.KAFO_TIMING_DIR || env.TIMING_OUTPUT_DIR);
const positional = args.filter((arg, index) => outputIndex < 0 || (index !== outputIndex && index !== outputIndex + 1));
const shard = positional.length === 1 && /^\d+$/.test(positional[0]) ? Number(positional[0]) : Number.NaN;
if (!Number.isInteger(shard) || shard < 1 || shard > total || !outputDir || (outputIndex >= 0 && outputIndex !== 1)) {
  console.error('Usage: run-test-shard.mjs <1-4> --output-dir <directory>; required GitHub metadata must be set');
  process.exit(2);
}
const metadata = {
  repository: value('KAFO_REPOSITORY', 'GITHUB_REPOSITORY'),
  event: value('KAFO_EVENT', 'GITHUB_EVENT_NAME'),
  ref: value('KAFO_REF', 'GITHUB_REF'),
  runId: value('KAFO_RUN_ID', 'GITHUB_RUN_ID'),
  runAttempt: value('KAFO_RUN_ATTEMPT', 'GITHUB_RUN_ATTEMPT'),
  sha: value('KAFO_SHA', 'GITHUB_SHA'),
};
const missing = Object.entries(metadata).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.error(`Missing metadata: ${missing.join(', ')}`); process.exit(2); }
if (path.resolve(outputDir) === root) {
  console.error('Timing output directory must not be inside the repository'); process.exit(2);
}
fs.mkdirSync(outputDir, { recursive: true });
const testName = cases[shard - 1];
const testFile = env.KAFO_TEST_FILE || 'tests/repository-hygiene.test.mjs';
const command = ['node', '--test', testFile, '--test-name-pattern', `^${testName}$`];
const started = new Date();
const result = spawnSync(command[0], command.slice(1), { cwd: root, stdio: 'inherit', env });
const ended = new Date();
const record = {
  schemaVersion: 1, shard, total, test: testName, command: command.join(' '),
  startedAt: started.toISOString(), endedAt: ended.toISOString(),
  durationMs: Math.max(0, ended - started), exitCode: result.status ?? 1,
  outcome: result.status === 0 ? 'passed' : 'failed', ...metadata,
};
const filename = `timing-shard-${shard}-${process.pid}-${Date.now()}.json`;
fs.writeFileSync(path.join(outputDir, filename), `${JSON.stringify(record, null, 2)}\n`, { flag: 'wx' });
process.exit(record.exitCode);
