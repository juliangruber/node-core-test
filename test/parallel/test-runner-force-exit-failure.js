'use strict';
const common = require('../common');
const { match, doesNotMatch, strictEqual } = require('node:assert');
const { spawnSync } = require('node:child_process');
const fixtures = require('../common/fixtures');
const fixture = fixtures.path('test-runner/throws_sync_and_async.js');

for (const isolation of ['none', 'process']) {
  const args = [
    fixture,
    '--test',
    '--test-reporter=spec',
    '--test-force-exit',
    `--experimental-test-isolation=${isolation}`,
  ];
  const r = spawnSync(process.execPath, args);

  strictEqual(r.status, 1);
  strictEqual(r.signal, null);
  strictEqual(r.stderr.toString(), '');

  const stdout = r.stdout.toString();
  match(stdout, /Error: fails/);
  doesNotMatch(stdout, /this should not have a chance to be thrown/);
}
