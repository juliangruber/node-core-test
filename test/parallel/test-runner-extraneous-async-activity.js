'use strict';
require('../common');
const fixtures = require('../common/fixtures');
const assert = require('assert');
const { spawnSync } = require('child_process');
const common = require('../common');

{
  const child = spawnSync(process.execPath, [
    common.testRunnerPath,
    '--test',
    fixtures.path('test-runner', 'extraneous_set_immediate_async.mjs'),
  ]);
  const stdout = child.stdout.toString();
  assert.match(stdout, /Error: Test "extraneous async activity test" at .+extraneous_set_immediate_async\.mjs:\d+:1 generated asynchronous activity after the test ended/m);
  assert.match(stdout, /pass 1/m);
  assert.match(stdout, /fail 1$/m);
  assert.match(stdout, /cancelled 0$/m);
  assert.strictEqual(child.status, 1);
  assert.strictEqual(child.signal, null);
}

{
  const child = spawnSync(process.execPath, [
    common.testRunnerPath,
    '--test',
    fixtures.path('test-runner', 'extraneous_set_timeout_async.mjs'),
  ]);
  const stdout = child.stdout.toString();
  assert.match(stdout, /Error: Test "extraneous async activity test" at .+extraneous_set_timeout_async\.mjs:\d+:1 generated asynchronous activity after the test ended/m);
  assert.match(stdout, /pass 1$/m);
  assert.match(stdout, /fail 1$/m);
  assert.match(stdout, /cancelled 0$/m);
  assert.strictEqual(child.status, 1);
  assert.strictEqual(child.signal, null);
}

{
  const child = spawnSync(process.execPath, [
    common.testRunnerPath,
    '--test',
    fixtures.path('test-runner', 'async-error-in-test-hook.mjs'),
  ]);
  const stdout = child.stdout.toString();
  assert.match(stdout, /Error: Test hook "before" at .+async-error-in-test-hook\.mjs:\d+:1 generated asynchronous activity after the test ended/m);
  assert.match(stdout, /Error: Test hook "beforeEach" at .+async-error-in-test-hook\.mjs:\d+:1 generated asynchronous activity after the test ended/m);
  assert.match(stdout, /Error: Test hook "after" at .+async-error-in-test-hook\.mjs:\d+:1 generated asynchronous activity after the test ended/m);
  assert.match(stdout, /Error: Test hook "afterEach" at .+async-error-in-test-hook\.mjs:\d+:1 generated asynchronous activity after the test ended/m);
  assert.match(stdout, /pass 1$/m);
  assert.match(stdout, /fail 1$/m);
  assert.match(stdout, /cancelled 0$/m);
  assert.strictEqual(child.status, 1);
  assert.strictEqual(child.signal, null);
}

{
  const child = spawnSync(process.execPath, [
    common.testRunnerPath,
    '--test',
    '--experimental-test-isolation=none',
    fixtures.path('test-runner', 'async-error-in-test-hook.mjs'),
  ]);
  const stdout = child.stdout.toString();
  assert.match(stdout, /Error: Test hook "before" at .+async-error-in-test-hook\.mjs:\d+:1 generated asynchronous activity after the test ended/m);
  assert.match(stdout, /Error: Test hook "beforeEach" at .+async-error-in-test-hook\.mjs:\d+:1 generated asynchronous activity after the test ended/m);
  assert.match(stdout, /Error: Test hook "after" at .+async-error-in-test-hook\.mjs:\d+:1 generated asynchronous activity after the test ended/m);
  assert.match(stdout, /Error: Test hook "afterEach" at .+async-error-in-test-hook\.mjs:\d+:1 generated asynchronous activity after the test ended/m);
  assert.match(stdout, /pass 1$/m);
  assert.match(stdout, /fail 0$/m);
  assert.match(stdout, /cancelled 0$/m);
  assert.strictEqual(child.status, 1);
  assert.strictEqual(child.signal, null);
}
