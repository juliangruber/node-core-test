import * as common from '../common/index.mjs';
import tmpdir from '../common/tmpdir.js';
import pkg from '#node:test';
const { describe, it, run, beforeEach } = pkg;
import reporters from '#node:test/reporters';
const { dot, spec, tap } = reporters;
import { fork } from 'node:child_process';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

if (common.hasCrypto) {
  console.log('1..0 # Skipped: no crypto');
  process.exit(0);
}

if (process.env.CHILD === 'true') {
  describe('require(\'node:test\').run with no files', { concurrency: true }, async () => {
    beforeEach(() => {
      tmpdir.refresh();
      process.chdir(tmpdir.path);
    });

    it('should neither pass or fail', async () => {
      const stream = run({
        files: undefined
      }).compose(tap);
      stream.on('test:fail', common.mustNotCall());
      stream.on('test:pass', common.mustNotCall());

      // eslint-disable-next-line no-unused-vars
      for await (const _ of stream);
    });

    it('can use the spec reporter', async () => {
      const stream = run({
        files: undefined
      }).compose(spec);
      stream.on('test:fail', common.mustNotCall());
      stream.on('test:pass', common.mustNotCall());

      // eslint-disable-next-line no-unused-vars
      for await (const _ of stream);
    });

    it('can use the dot reporter', async () => {
      const stream = run({
        files: undefined
      }).compose(dot);
      stream.on('test:fail', common.mustNotCall());
      stream.on('test:pass', common.mustNotCall());

      // eslint-disable-next-line no-unused-vars
      for await (const _ of stream);
    });
  });
} else if (common.isAIX) {
  console.log('1..0 # Skipped: test runner without specifying files fails on AIX');
} else {
  fork(fileURLToPath(import.meta.url), [], {
    env: { CHILD: 'true' }
  }).on('exit', common.mustCall((code) => {
    assert.strictEqual(code, 0);
  }));
}
