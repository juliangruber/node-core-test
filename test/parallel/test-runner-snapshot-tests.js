// Flags: --expose-internals --experimental-test-snapshots
/* eslint-disable no-template-curly-in-string */
'use strict';
const common = require('../common');
const fixtures = require('../common/fixtures');
const tmpdir = require('../common/tmpdir');
const {
  snapshot,
  suite,
  test,
} = require('#node:test');
const {
  SnapshotManager,
  defaultResolveSnapshotPath,
  defaultSerializers,
} = require('#internal/test_runner/snapshot');
const fs = require('node:fs');

tmpdir.refresh();

suite('SnapshotManager', () => {
  test('uses default snapshot naming scheme', (t) => {
    const manager = new SnapshotManager(false);
    const file = manager.resolveSnapshotFile(__filename);
    t.assert.strictEqual(file.snapshotFile, `${__filename}.snapshot`);
  });

  test('generates snapshot IDs based on provided name', (t) => {
    const manager = new SnapshotManager(false);
    const file = manager.resolveSnapshotFile(__filename);

    t.assert.strictEqual(file.nextId('foo'), 'foo 1');
    t.assert.strictEqual(file.nextId('foo'), 'foo 2');
    t.assert.strictEqual(file.nextId('bar'), 'bar 1');
    t.assert.strictEqual(file.nextId('baz'), 'baz 1');
    t.assert.strictEqual(file.nextId('foo'), 'foo 3');
    t.assert.strictEqual(file.nextId('foo`'), 'foo` 1');
    t.assert.strictEqual(file.nextId('foo\\'), 'foo\\ 1');
    t.assert.strictEqual(file.nextId('foo`${x}`'), 'foo`${x}` 1');
  });

  test('throws if snapshot file does not have exports', (t) => {
    const fixture = fixtures.path(
      'test-runner', 'snapshots', 'malformed-exports.js'
    );
    const manager = new SnapshotManager(false);
    const file = manager.resolveSnapshotFile(fixture);

    t.assert.throws(() => {
      file.readFile();
    }, (err) => {
      t.assert.strictEqual(err.code, 'ERR_INVALID_STATE');
      t.assert.match(err.message, /Cannot read snapshot/);
      t.assert.strictEqual(err.filename, file.snapshotFile);
      t.assert.match(err.cause.message, /Malformed snapshot file/);
      return true;
    });
  });

  test('provides a tip if snapshot file does not exist', (t) => {
    const fixture = fixtures.path(
      'test-runner', 'snapshots', 'this-file-should-not-exist.js'
    );
    const manager = new SnapshotManager(false);
    const file = manager.resolveSnapshotFile(fixture);

    t.assert.throws(() => {
      file.readFile();
    }, /Missing snapshots can be generated by rerunning the command/);
  });

  test('throws if serialization cannot generate a string', (t) => {
    const manager = new SnapshotManager(false);
    const cause = new Error('boom');
    const input = {
      foo: 1,
      toString() {
        throw cause;
      },
    };

    t.assert.throws(() => {
      manager.serialize(input, [(value) => { return value; }]);
    }, (err) => {
      t.assert.strictEqual(err.code, 'ERR_INVALID_STATE');
      t.assert.match(err.message, /The provided serializers did not generate a string/);
      t.assert.strictEqual(err.input, input);
      t.assert.strictEqual(err.cause, cause);
      return true;
    });
  });

  test('serializes values using provided functions', (t) => {
    const manager = new SnapshotManager(false);
    const output = manager.serialize({ foo: 1 }, [
      (value) => { return JSON.stringify(value); },
      (value) => { return value + '424242'; },
    ]);

    t.assert.strictEqual(output, '\n{"foo":1}424242\n');
  });

  test('serialized values get cast to string', (t) => {
    const manager = new SnapshotManager(false);
    const output = manager.serialize(5, []);

    t.assert.strictEqual(output, '\n5\n');
  });

  test('serialized values get escaped', (t) => {
    const manager = new SnapshotManager(false);
    const output = manager.serialize('fo\\o`${x}`', []);

    t.assert.strictEqual(output, '\nfo\\\\o\\`\\${x}\\`\n');
  });

  test('reads individual snapshots from snapshot file', (t) => {
    const fixture = fixtures.path('test-runner', 'snapshots', 'simple.js');
    const manager = new SnapshotManager(false);
    const file = manager.resolveSnapshotFile(fixture);
    file.readFile();
    const snapshot = file.getSnapshot('foo 1');

    t.assert.strictEqual(snapshot, '\n{\n  "bar": 1,\n  "baz": 2\n}\n');
  });

  test('snapshot file is not read in update mode', (t) => {
    const fixture = fixtures.path('test-runner', 'snapshots', 'simple.js');
    const manager = new SnapshotManager(true);
    const file = manager.resolveSnapshotFile(fixture);
    file.readFile();

    t.assert.throws(() => {
      file.getSnapshot('foo 1');
    }, /Snapshot 'foo 1' not found/);
  });

  test('throws if requested snapshot does not exist in file', (t) => {
    const fixture = fixtures.path('test-runner', 'snapshots', 'simple.js');
    const manager = new SnapshotManager(false);
    const file = manager.resolveSnapshotFile(fixture);

    t.assert.throws(() => {
      file.getSnapshot('does not exist 1');
    }, (err) => {
      t.assert.strictEqual(err.code, 'ERR_INVALID_STATE');
      t.assert.match(err.message, /Snapshot 'does not exist 1' not found/);
      t.assert.strictEqual(err.snapshot, 'does not exist 1');
      t.assert.strictEqual(err.filename, file.snapshotFile);
      return true;
    });
  });

  test('snapshot IDs are escaped when stored', (t) => {
    const fixture = fixtures.path('test-runner', 'snapshots', 'simple.js');
    const manager = new SnapshotManager(false);
    const file = manager.resolveSnapshotFile(fixture);

    file.setSnapshot('foo`${x}` 1', 'test');
    t.assert.strictEqual(file.getSnapshot('foo\\`\\${x}\\` 1'), 'test');
  });

  test('throws if snapshot file cannot be resolved', (t) => {
    const manager = new SnapshotManager(false);
    const assertion = manager.createAssert();

    t.assert.throws(() => {
      Reflect.apply(assertion, { filePath: null }, ['foo']);
    }, (err) => {
      t.assert.strictEqual(err.code, 'ERR_INVALID_STATE');
      t.assert.match(err.message, /Invalid snapshot filename/);
      t.assert.strictEqual(err.filename, null);
      return true;
    });
  });

  test('writes the specified snapshot files', (t) => {
    const testFile1 = tmpdir.resolve('test1.js');
    const testFile2 = tmpdir.resolve('test2.js');
    const manager = new SnapshotManager(true);
    const file1 = manager.resolveSnapshotFile(testFile1);
    const file2 = manager.resolveSnapshotFile(testFile2);
    file1.setSnapshot('foo 1', 'foo 1 value');
    file2.setSnapshot('foo 2', 'foo 2 value');
    t.assert.strictEqual(fs.existsSync(file1.snapshotFile), false);
    t.assert.strictEqual(fs.existsSync(file2.snapshotFile), false);
    manager.writeSnapshotFiles();
    t.assert.strictEqual(fs.existsSync(file1.snapshotFile), true);
    t.assert.strictEqual(fs.existsSync(file2.snapshotFile), true);
  });

  test('creates snapshot directory if it does not exist', (t) => {
    const testFile = tmpdir.resolve('foo/bar/baz/test2.js');
    const manager = new SnapshotManager(true);
    const file = manager.resolveSnapshotFile(testFile);
    file.setSnapshot('foo 1', 'foo value');
    t.assert.strictEqual(fs.existsSync(file.snapshotFile), false);
    manager.writeSnapshotFiles();
    t.assert.strictEqual(fs.existsSync(file.snapshotFile), true);
  });

  test('does not write snapshot files in read mode', (t) => {
    const testFile = tmpdir.resolve('test3.js');
    const manager = new SnapshotManager(false);
    const file = manager.resolveSnapshotFile(testFile);
    file.setSnapshot('foo 1', 'foo value');
    t.assert.strictEqual(fs.existsSync(file.snapshotFile), false);
    manager.writeSnapshotFiles();
    t.assert.strictEqual(fs.existsSync(file.snapshotFile), false);
  });

  test('throws if snapshot files cannot be written', (t) => {
    const testFile = tmpdir.resolve('test4.js');
    const error = new Error('boom');
    const manager = new SnapshotManager(true);
    const file = manager.resolveSnapshotFile(testFile);
    file.snapshots['foo 1'] = { toString() { throw error; } };
    t.assert.strictEqual(fs.existsSync(file.snapshotFile), false);
    t.assert.throws(() => {
      manager.writeSnapshotFiles();
    }, (err) => {
      t.assert.strictEqual(err.code, 'ERR_INVALID_STATE');
      t.assert.match(err.message, /Cannot write snapshot file/);
      t.assert.strictEqual(err.filename, file.snapshotFile);
      t.assert.strictEqual(err.cause, error);
      return true;
    });

    t.assert.strictEqual(fs.existsSync(file.snapshotFile), false);
  });
});

suite('t.assert.snapshot() validation', () => {
  test('options must be an object', (t) => {
    t.assert.throws(() => {
      t.assert.snapshot('', null);
    }, /The "options" argument must be of type object/);
  });

  test('options.serializers must be an array if present', (t) => {
    t.assert.throws(() => {
      t.assert.snapshot('', { serializers: 5 });
    }, /The "options\.serializers" property must be an instance of Array/);
  });

  test('options.serializers must only contain functions', (t) => {
    t.assert.throws(() => {
      t.assert.snapshot('', { serializers: [() => {}, ''] });
    }, /The "options\.serializers\[1\]" property must be of type function/);
  });
});

suite('setResolveSnapshotPath()', () => {
  test('throws if input is not a function', (t) => {
    t.assert.throws(() => {
      snapshot.setResolveSnapshotPath('');
    }, { code: 'ERR_INVALID_ARG_TYPE' });
  });

  test('changes default snapshot output path', (t) => {
    t.after(() => {
      snapshot.setResolveSnapshotPath(defaultResolveSnapshotPath);
    });

    snapshot.setResolveSnapshotPath(() => { return 'foobarbaz'; });
    const manager = new SnapshotManager(false);
    const file = manager.resolveSnapshotFile(__filename);
    t.assert.strictEqual(file.snapshotFile, 'foobarbaz');
  });
});

suite('setDefaultSnapshotSerializers()', () => {
  test('throws if input is not a function array', (t) => {
    t.assert.throws(() => {
      snapshot.setDefaultSnapshotSerializers('');
    }, { code: 'ERR_INVALID_ARG_TYPE' });
    t.assert.throws(() => {
      snapshot.setDefaultSnapshotSerializers([5]);
    }, { code: 'ERR_INVALID_ARG_TYPE' });
  });

  test('changes default serializers', (t) => {
    t.after(() => {
      snapshot.setDefaultSnapshotSerializers(defaultSerializers);
    });

    snapshot.setDefaultSnapshotSerializers([() => { return 'foobarbaz'; }]);
    const manager = new SnapshotManager(false);
    const output = manager.serialize({ foo: 1 });
    t.assert.strictEqual(output, '\nfoobarbaz\n');
  });
});

test('t.assert.snapshot()', async (t) => {
  const fixture = fixtures.path(
    'test-runner', 'snapshots', 'unit.js'
  );

  await t.test('fails prior to snapshot generation', async (t) => {
    const child = await common.spawnPromisified(
      process.execPath,
      [common.testRunnerPath, '--experimental-test-snapshots', fixture],
      { cwd: tmpdir.path },
    );

    t.assert.strictEqual(child.code, 1);
    t.assert.strictEqual(child.signal, null);
    t.assert.match(child.stdout, /tests 5/);
    t.assert.match(child.stdout, /pass 0/);
    t.assert.match(child.stdout, /fail 5/);
    t.assert.match(child.stdout, /Missing snapshots/);
  });

  await t.test('passes when regenerating snapshots', async (t) => {
    const child = await common.spawnPromisified(
      process.execPath,
      [common.testRunnerPath, '--test-update-snapshots', '--experimental-test-snapshots', fixture],
      { cwd: tmpdir.path },
    );

    t.assert.strictEqual(child.code, 0);
    t.assert.strictEqual(child.signal, null);
    t.assert.match(child.stdout, /tests 5/);
    t.assert.match(child.stdout, /pass 5/);
    t.assert.match(child.stdout, /fail 0/);
  });

  await t.test('passes when snapshots exist', async (t) => {
    const child = await common.spawnPromisified(
      process.execPath,
      [common.testRunnerPath, '--experimental-test-snapshots', fixture],
      { cwd: tmpdir.path },
    );

    t.assert.strictEqual(child.code, 0);
    t.assert.strictEqual(child.signal, null);
    t.assert.match(child.stdout, /tests 5/);
    t.assert.match(child.stdout, /pass 5/);
    t.assert.match(child.stdout, /fail 0/);
  });
});

test('snapshots from multiple files (isolation=none)', async (t) => {
  tmpdir.refresh();

  const fixture = fixtures.path('test-runner', 'snapshots', 'unit.js');
  const fixture2 = fixtures.path('test-runner', 'snapshots', 'unit-2.js');

  await t.test('fails prior to snapshot generation', async (t) => {
    const args = [
      common.testRunnerPath,
      '--test',
      '--experimental-test-isolation=none',
      '--experimental-test-snapshots',
      fixture,
      fixture2,
    ];
    const child = await common.spawnPromisified(
      process.execPath,
      args,
      { cwd: tmpdir.path },
    );

    t.assert.strictEqual(child.code, 1);
    t.assert.strictEqual(child.signal, null);
    t.assert.match(child.stdout, /tests 6/);
    t.assert.match(child.stdout, /pass 0/);
    t.assert.match(child.stdout, /fail 6/);
    t.assert.match(child.stdout, /Missing snapshots/);
  });

  await t.test('passes when regenerating snapshots', async (t) => {
    const args = [
      common.testRunnerPath,
      '--test',
      '--experimental-test-isolation=none',
      '--experimental-test-snapshots',
      '--test-update-snapshots',
      fixture,
      fixture2,
    ];
    const child = await common.spawnPromisified(
      process.execPath,
      args,
      { cwd: tmpdir.path },
    );

    t.assert.strictEqual(child.code, 0);
    t.assert.strictEqual(child.signal, null);
    t.assert.match(child.stdout, /tests 6/);
    t.assert.match(child.stdout, /pass 6/);
    t.assert.match(child.stdout, /fail 0/);
  });

  await t.test('passes when snapshots exist', async (t) => {
    const args = [
      common.testRunnerPath,
      '--test',
      '--experimental-test-isolation=none',
      '--experimental-test-snapshots',
      fixture,
      fixture2,
    ];
    const child = await common.spawnPromisified(
      process.execPath,
      args,
      { cwd: tmpdir.path },
    );

    t.assert.strictEqual(child.code, 0);
    t.assert.strictEqual(child.signal, null);
    t.assert.match(child.stdout, /tests 6/);
    t.assert.match(child.stdout, /pass 6/);
    t.assert.match(child.stdout, /fail 0/);
  });
});
