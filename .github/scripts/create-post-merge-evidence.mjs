#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const timingDir = arg('--timings-dir', process.env.KAFO_TIMING_DIR);
const output = arg('--output', process.env.KAFO_EVIDENCE_OUTPUT || path.join(timingDir || '.', 'post-merge-full-suite-evidence.json'));
const metadataPath = arg('--metadata', process.env.KAFO_METADATA_FILE);
const upstreamPath = arg('--upstream', process.env.KAFO_UPSTREAM_FILE);
const artifactNames = (arg('--artifacts', process.env.KAFO_ARTIFACTS || 'test-timings-shard-1,test-timings-shard-2,test-timings-shard-3,test-timings-shard-4,post-merge-full-suite-evidence')).split(',').filter(Boolean);
const metadata = metadataPath ? JSON.parse(fs.readFileSync(metadataPath, 'utf8')) : {
  repository: process.env.GITHUB_REPOSITORY, event: process.env.GITHUB_EVENT_NAME,
  ref: process.env.GITHUB_REF, sha: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT, runUrl: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : undefined,
};
const upstream = upstreamPath ? JSON.parse(fs.readFileSync(upstreamPath, 'utf8')) : {
  smoke: process.env.KAFO_SMOKE_RESULT || 'success', matrix: process.env.KAFO_MATRIX_RESULT || 'success',
};
const errors = [];
const requiredMeta = ['repository', 'event', 'ref', 'sha', 'runId', 'runAttempt'];
for (const key of requiredMeta) if (!metadata[key]) errors.push(`missing metadata: ${key}`);
if (metadata.event !== 'push') errors.push('event must be push');
if (metadata.ref !== 'refs/heads/main') errors.push('ref must be refs/heads/main');
if (!timingDir) errors.push('missing timings directory');
let files = [];
if (timingDir && fs.existsSync(timingDir)) files = fs.readdirSync(timingDir).filter((f) => f.startsWith('timing-shard-') && f.endsWith('.json'));
if (files.length !== 4) errors.push(`expected exactly four timing records, found ${files.length}`);
const records = [];
for (const file of files) {
  try { records.push(JSON.parse(fs.readFileSync(path.join(timingDir, file), 'utf8'))); } catch { errors.push(`malformed timing record: ${file}`); }
}
const shards = new Set();
for (const record of records) {
  if (!Number.isInteger(record.shard) || record.shard < 1 || record.shard > 4 || shards.has(record.shard)) errors.push('shards 1-4 must occur exactly once');
  shards.add(record.shard);
  if (record.total !== 4 || record.outcome !== 'passed' || record.exitCode !== 0) errors.push(`shard ${record.shard} did not succeed`);
  for (const key of ['repository', 'event', 'ref', 'runId', 'runAttempt', 'sha']) if (record[key] !== metadata[key]) errors.push(`timing ${record.shard} mismatches ${key}`);
  if (!record.startedAt || !record.endedAt || !Number.isFinite(record.durationMs) || record.durationMs < 0) errors.push(`invalid timing for shard ${record.shard}`);
}
if (upstream.smoke !== 'success' || upstream.matrix !== 'success') errors.push('upstream smoke and matrix jobs must succeed');
const expected = ['test-timings-shard-1', 'test-timings-shard-2', 'test-timings-shard-3', 'test-timings-shard-4', 'post-merge-full-suite-evidence'];
for (const name of expected) if (!artifactNames.includes(name)) errors.push(`missing artifact representation: ${name}`);
const manifest = { schemaVersion: 1, generatedAt: new Date().toISOString(), metadata, upstream, artifacts: artifactNames, timings: records, valid: errors.length === 0, errors };
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
if (errors.length) { console.error(`Evidence validation failed:\n${errors.map((e) => `- ${e}`).join('\n')}`); process.exit(1); }
console.log(`Evidence written: ${output}`);
