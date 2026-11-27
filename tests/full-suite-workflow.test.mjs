import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const shardScript = new URL('../.github/scripts/run-test-shard.mjs', import.meta.url);
const evidenceScript = new URL('../.github/scripts/create-post-merge-evidence.mjs', import.meta.url);
const workflow = fs.readFileSync(new URL('../.github/workflows/full-suite.yml', import.meta.url), 'utf8');
const metadata = { KAFO_REPOSITORY: 'KAFOAI-COM/kafoai', KAFO_EVENT: 'push', KAFO_REF: 'refs/heads/main', KAFO_RUN_ID: '42', KAFO_RUN_ATTEMPT: '1', KAFO_SHA: 'abc123' };
const artifacts = 'test-timings-shard-1,test-timings-shard-2,test-timings-shard-3,test-timings-shard-4,post-merge-full-suite-evidence';
const run = (file, args, env = {}) => {
  const childEnv = { ...process.env, ...env };
  for (const [key, value] of Object.entries(env)) if (value === null) delete childEnv[key];
  return spawnSync(process.execPath, [file, ...args], { cwd: root, encoding: 'utf8', env: childEnv });
};

test('workflow contract is push-only, least privilege, and retains all evidence', () => {
  for (const phrase of ['name: Full Suite', 'branches: [main]', 'name: Pipeline smoke', 'name: Test shard ${{ matrix.shard }}/4', 'fail-fast: false', 'name: Post-merge full-suite evidence', 'if: always()', 'contents: read', 'test-timings-shard-${{ matrix.shard }}', 'post-merge-full-suite-evidence', 'ref: ${{ github.sha }}']) assert.ok(workflow.includes(phrase), `workflow is missing ${phrase}`);
  assert.doesNotMatch(workflow, /pull_request_target|permissions:\s*[\\s\\S]*write|secrets\./);
  const shardJob = workflow.slice(workflow.indexOf('  shard:'), workflow.indexOf('  evidence:'));
  assert.doesNotMatch(shardJob, /needs:\s*smoke/, 'shards must still run and write timings when smoke fails');
  assert.match(workflow, /name: Download timing artifacts\n\s+continue-on-error: true/, 'evidence generation must continue when timing downloads are absent after upstream failure');
});

test('each shard reaches its production case and writes timing evidence', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kafo-shards-'));
  for (let shard = 1; shard <= 4; shard++) {
    const result = run(shardScript.pathname, [String(shard), '--output-dir', dir], metadata);
    assert.equal(result.status, 0, result.stderr);
  }
  const records = fs.readdirSync(dir).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f))));
  assert.deepEqual(records.map((r) => r.shard).sort(), [1, 2, 3, 4]);
  assert.ok(records.every((r) => r.outcome === 'passed' && r.repository === metadata.KAFO_REPOSITORY));
});

test('invalid shard and missing metadata are rejected', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kafo-invalid-'));
  assert.notEqual(run(shardScript.pathname, ['5', '--output-dir', dir], metadata).status, 0);
  assert.notEqual(run(shardScript.pathname, ['1', '2', '--output-dir', dir], metadata).status, 0);
  assert.notEqual(run(shardScript.pathname, ['1', '--output-dir', dir], { KAFO_REPOSITORY: null, KAFO_EVENT: null, KAFO_REF: null, KAFO_RUN_ID: null, KAFO_RUN_ATTEMPT: null, KAFO_SHA: null, GITHUB_REPOSITORY: null, GITHUB_EVENT_NAME: null, GITHUB_REF: null, GITHUB_RUN_ID: null, GITHUB_RUN_ATTEMPT: null, GITHUB_SHA: null }).status, 0);
});

test('failed production case still writes failed timing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kafo-fail-'));
  const fixture = path.join(dir, 'failing-case-fixture.mjs');
  fs.writeFileSync(fixture, "import test from 'node:test';\ntest('README documents the repository and external publish contract', () => { throw new Error('forced failure'); });\n");
  const result = run(shardScript.pathname, ['1', '--output-dir', dir], { ...metadata, KAFO_TEST_FILE: fixture, NODE_TEST_CONTEXT: null });
  assert.notEqual(result.status, 0);
  const records = fs.readdirSync(dir).filter((f) => f.startsWith('timing-shard-')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f))));
  assert.equal(records.length, 1);
  assert.equal(records[0].outcome, 'failed');
});

test('valid timings produce evidence and invalid upstream fails with diagnostics', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kafo-evidence-'));
  for (let shard = 1; shard <= 4; shard++) assert.equal(run(shardScript.pathname, [String(shard), '--output-dir', dir], metadata).status, 0);
  const metaFile = path.join(dir, 'metadata.json');
  const upstreamFile = path.join(dir, 'upstream.json');
  fs.writeFileSync(metaFile, JSON.stringify({ repository: metadata.KAFO_REPOSITORY, event: metadata.KAFO_EVENT, ref: metadata.KAFO_REF, sha: metadata.KAFO_SHA, runId: metadata.KAFO_RUN_ID, runAttempt: metadata.KAFO_RUN_ATTEMPT, runUrl: 'https://github.com/KAFOAI-COM/kafoai/actions/runs/42' }));
  fs.writeFileSync(upstreamFile, JSON.stringify({ smoke: 'success', matrix: 'success' }));
  const output = path.join(dir, 'manifest.json');
  const good = run(evidenceScript.pathname, ['--timings-dir', dir, '--metadata', metaFile, '--upstream', upstreamFile, '--artifacts', artifacts, '--output', output]);
  assert.equal(good.status, 0, good.stderr);
  assert.equal(JSON.parse(fs.readFileSync(output)).valid, true);
  fs.writeFileSync(upstreamFile, JSON.stringify({ smoke: 'failure', matrix: 'success' }));
  const bad = run(evidenceScript.pathname, ['--timings-dir', dir, '--metadata', metaFile, '--upstream', upstreamFile, '--artifacts', artifacts, '--output', output]);
  assert.notEqual(bad.status, 0);
  assert.equal(JSON.parse(fs.readFileSync(output)).valid, false);
  fs.writeFileSync(upstreamFile, JSON.stringify({ smoke: 'success', matrix: 'success' }));
  const evidenceArgs = ['--timings-dir', dir, '--metadata', metaFile, '--upstream', upstreamFile, '--artifacts', artifacts, '--output', output];
  const missingArtifacts = run(evidenceScript.pathname, ['--timings-dir', dir, '--metadata', metaFile, '--upstream', upstreamFile, '--output', output]);
  assert.notEqual(missingArtifacts.status, 0);
  assert.equal(JSON.parse(fs.readFileSync(output)).valid, false);

  const timingFiles = fs.readdirSync(dir).filter((file) => file.startsWith('timing-shard-')).sort();
  const originals = timingFiles.map((file) => fs.readFileSync(path.join(dir, file), 'utf8'));
  const rejectMutation = (mutate) => {
    mutate();
    const result = run(evidenceScript.pathname, evidenceArgs);
    assert.notEqual(result.status, 0);
    assert.equal(JSON.parse(fs.readFileSync(output)).valid, false);
    timingFiles.forEach((file, index) => fs.writeFileSync(path.join(dir, file), originals[index]));
  };
  rejectMutation(() => fs.writeFileSync(path.join(dir, timingFiles[0]), 'null'));
  rejectMutation(() => {
    const duplicate = JSON.parse(originals[1]);
    duplicate.shard = 1;
    fs.writeFileSync(path.join(dir, timingFiles[1]), JSON.stringify(duplicate));
  });
  rejectMutation(() => {
    const mismatch = JSON.parse(originals[0]);
    mismatch.sha = 'other-sha';
    mismatch.runId = 'other-run';
    fs.writeFileSync(path.join(dir, timingFiles[0]), JSON.stringify(mismatch));
  });
  rejectMutation(() => {
    const inconsistentDuration = JSON.parse(originals[0]);
    inconsistentDuration.durationMs += 1;
    fs.writeFileSync(path.join(dir, timingFiles[0]), JSON.stringify(inconsistentDuration));
  });
  rejectMutation(() => {
    const failed = JSON.parse(originals[0]);
    failed.outcome = 'failed';
    failed.exitCode = 1;
    fs.writeFileSync(path.join(dir, timingFiles[0]), JSON.stringify(failed));
  });
  const validMeta = JSON.parse(fs.readFileSync(metaFile));
  fs.writeFileSync(metaFile, JSON.stringify({ ...validMeta, event: 'workflow_dispatch', ref: 'refs/heads/feature' }));
  assert.notEqual(run(evidenceScript.pathname, evidenceArgs).status, 0);
  fs.writeFileSync(metaFile, JSON.stringify(validMeta));
  fs.unlinkSync(path.join(dir, timingFiles[0]));
  assert.notEqual(run(evidenceScript.pathname, evidenceArgs).status, 0);
});
