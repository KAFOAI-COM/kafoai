#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const timingDir = arg('--timings-dir', process.env.KAFO_TIMING_DIR);
const output = arg('--output', process.env.KAFO_EVIDENCE_OUTPUT || path.join(timingDir || '.', 'post-merge-full-suite-evidence.json'));
const metadataPath = arg('--metadata', process.env.KAFO_METADATA_FILE);
const upstreamPath = arg('--upstream', process.env.KAFO_UPSTREAM_FILE);
const errors = [];
const readJson = (file, label, fallback) => {
  if (!file) return fallback;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new TypeError();
    return parsed;
  } catch { errors.push(`malformed ${label}`); return {}; }
};
const metadata = readJson(metadataPath, 'metadata', {
  repository: process.env.GITHUB_REPOSITORY, event: process.env.GITHUB_EVENT_NAME,
  ref: process.env.GITHUB_REF, sha: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT, runUrl: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : undefined,
});
const upstream = readJson(upstreamPath, 'upstream metadata', {
  smoke: process.env.KAFO_SMOKE_RESULT, matrix: process.env.KAFO_MATRIX_RESULT,
});
const artifactInput = arg('--artifacts', process.env.KAFO_ARTIFACTS);
const artifactNames = artifactInput ? artifactInput.split(',').filter(Boolean) : [];
const requiredMeta = ['repository', 'event', 'ref', 'sha', 'runId', 'runAttempt', 'runUrl'];
for (const key of requiredMeta) if (!metadata[key]) errors.push(`missing metadata: ${key}`);
if (metadata.event !== 'push') errors.push('event must be push');
if (metadata.ref !== 'refs/heads/main') errors.push('ref must be refs/heads/main');
if (!timingDir) errors.push('missing timings directory');
let files = [];
if (timingDir && fs.existsSync(timingDir)) files = fs.readdirSync(timingDir).filter((f) => f.startsWith('timing-shard-') && f.endsWith('.json'));
if (files.length !== 4) errors.push(`expected exactly four timing records, found ${files.length}`);
const records = [];
for (const file of files) {
  try {
    const record = JSON.parse(fs.readFileSync(path.join(timingDir, file), 'utf8'));
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new TypeError();
    records.push(record);
  } catch { errors.push(`malformed timing record: ${file}`); }
}
const cases = [
  'README documents the repository and external publish contract',
  'ignore rules exclude local clutter without hiding committed content',
  'LICENSE states proprietary ownership and restricted use',
  'generated boundaries and hosting configuration remain reachable',
];
const shards = new Set();
for (const record of records) {
  if (!Number.isInteger(record.shard) || record.shard < 1 || record.shard > 4 || shards.has(record.shard)) errors.push('shards 1-4 must occur exactly once');
  shards.add(record.shard);
  if (record.schemaVersion !== 1 || record.total !== 4 || record.outcome !== 'passed' || record.exitCode !== 0) errors.push(`shard ${record.shard} did not succeed`);
  for (const key of ['repository', 'event', 'ref', 'runId', 'runAttempt', 'sha']) if (record[key] !== metadata[key]) errors.push(`timing ${record.shard} mismatches ${key}`);
  const expectedTest = cases[record.shard - 1];
  const expectedCommand = expectedTest && `node --test tests/repository-hygiene.test.mjs --test-name-pattern ^${expectedTest}$`;
  if (record.test !== expectedTest || record.command !== expectedCommand) errors.push(`timing ${record.shard} does not identify its production case`);
  const started = Date.parse(record.startedAt);
  const ended = Date.parse(record.endedAt);
  if (!Number.isFinite(started) || !Number.isFinite(ended) || ended < started || !Number.isFinite(record.durationMs) || record.durationMs < 0) errors.push(`invalid timing for shard ${record.shard}`);
}
if (upstream.smoke !== 'success' || upstream.matrix !== 'success') errors.push('upstream smoke and matrix jobs must succeed');
const expected = ['test-timings-shard-1', 'test-timings-shard-2', 'test-timings-shard-3', 'test-timings-shard-4', 'post-merge-full-suite-evidence'];
if (artifactNames.length !== expected.length || expected.some((name) => artifactNames.filter((candidate) => candidate === name).length !== 1)) errors.push('artifacts must represent each required artifact exactly once');
const manifest = { schemaVersion: 1, generatedAt: new Date().toISOString(), metadata, upstream, artifacts: artifactNames, timings: records, valid: errors.length === 0, errors };
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
if (errors.length) { console.error(`Evidence validation failed:\n${errors.map((e) => `- ${e}`).join('\n')}`); process.exit(1); }
console.log(`Evidence written: ${output}`);
