const os = require('node:os');
const assert = require('node:assert');
const fs = require('node:fs');
const cluster = require('node:cluster');
const { isMainThread } = require('node:worker_threads');
const { spawnSync, spawn } = require('node:child_process');
const path = require('node:path');
const { inspect } = require('node:util');

const noop = ()=>{};
const isWindows = process.platform === 'win32';
const hasCrypto = Boolean(process.versions.openssl) && !process.env.NODE_SKIP_CRYPTO;
const isRiscv64 = process.arch === 'riscv64';
const isDebug = process.features.debug;
const isPi = (() => {
  try {
    // Normal Raspberry Pi detection is to find the `Raspberry Pi` string in
    // the contents of `/sys/firmware/devicetree/base/model` but that doesn't
    // work inside a container. Match the chipset model number instead.
    const cpuinfo = fs.readFileSync('/proc/cpuinfo', { encoding: 'utf8' });
    const ok = /^Hardware\s*:\s*(.*)$/im.exec(cpuinfo)?.[1] === 'BCM2835';
    /^/.test('');  // Clear RegExp.$_, some tests expect it to be empty.
    return ok;
  } catch {
    return false;
  }
})();
const isAIX = os.type() === 'AIX';
const isIBMi = os.type() === 'OS400';

// [assertSnapshot.spawnAndAssert]

function parseTestFlags(filename = process.argv[1]) {
  // The copyright notice is relatively big and the flags could come afterwards.
  const bytesToRead = 1500;
  const buffer = Buffer.allocUnsafe(bytesToRead);
  const fd = fs.openSync(filename, 'r');
  const bytesRead = fs.readSync(fd, buffer, 0, bytesToRead);
  fs.closeSync(fd);
  const source = buffer.toString('utf8', 0, bytesRead);

  const flagStart = source.search(/\/\/ Flags:\s+--/) + 10;

  if (flagStart === 9) {
    return [];
  }
  let flagEnd = source.indexOf('\n', flagStart);
  // Normalize different EOL.
  if (source[flagEnd - 1] === '\r') {
    flagEnd--;
  }
  return source
    .substring(flagStart, flagEnd)
    .split(/\s+/)
    .filter(Boolean);
}

if (process.argv.length === 2 &&
  isMainThread &&
  hasCrypto &&
  cluster.isPrimary &&
  fs.existsSync(process.argv[1])) {
  const flags = parseTestFlags();
  for (const flag of flags) {
    if (!process.execArgv.includes(flag) && (process.features.inspector || !flag.startsWith('--inspect'))) {
      const args = [...process.execArgv, ...process.argv.slice(1), ...flags];
      const options = { encoding: 'utf8', stdio: 'inherit' };
      const result = spawnSync(process.execPath, args, options);
      if (result.signal) {
        process.kill(0, result.signal);
      } else {
        process.exit(result.status);
      }
    }
  }
}

function mustNotCall(msg) {
  return function mustNotCall(...args) {
    const argsInfo = args.length > 0 ?
      `\ncalled with arguments: ${args.map((arg) => inspect(arg)).join(', ')}` : '';
    assert.fail(`${msg || 'function should not have been called'}` + argsInfo);
  };
}


function skip(msg) {
  printSkipMessage(msg);
  process.exit(0);
}

function printSkipMessage(msg) {
  console.log(`1..0 # Skipped: ${msg}`);
}

function expectRequiredModule(mod, expectation, checkESModule = true) {
  const clone = { ...mod };
  if (Object.hasOwn(mod, 'default') && checkESModule) {
    assert.strictEqual(mod.__esModule, true);
    delete clone.__esModule;
  }
  assert(isModuleNamespaceObject(mod));
  assert.deepStrictEqual(clone, { ...expectation });
}

function expectsError(validator, exact) {
  return mustCall((...args) => {
    if (args.length !== 1) {
      // Do not use `assert.strictEqual()` to prevent `inspect` from
      // always being called.
      assert.fail(`Expected one argument, got ${inspect(args)}`);
    }
    const error = args.pop();
    assert.throws(() => { throw error; }, validator);
    return true;
  }, exact);
}

function platformTimeout(ms) {
  const multipliers = typeof ms === 'bigint' ?
    { two: 2n, four: 4n, seven: 7n } : { two: 2, four: 4, seven: 7 };

  if (isDebug)
    ms = multipliers.two * ms;

  if (isAIX || isIBMi)
    return multipliers.two * ms; // Default localhost speed is slower on AIX

  if (isPi)
    return multipliers.two * ms;  // Raspberry Pi devices

  if (isRiscv64) {
    return multipliers.four * ms;
  }

  return ms;
}

function spawnPromisified(...args) {
  let stderr = '';
  let stdout = '';

  const child = spawn(...args);
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (data) => { stderr += data; });
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (data) => { stdout += data; });

  return new Promise((resolve, reject) => {
    child.on('close', (code, signal) => {
      resolve({
        code,
        signal,
        stderr,
        stdout,
      });
    });
    child.on('error', (code, signal) => {
      reject({
        code,
        signal,
        stderr,
        stdout,
      });
    });
  });
}

function skipIfInspectorDisabled() {
  if (!process.features.inspector) {
    skip('V8 inspector is disabled');
  }
}

const mustCallChecks = [];

function runCallChecks(exitCode) {
  if (exitCode !== 0) return;

  const failed = mustCallChecks.filter(function(context) {
    if ('minimum' in context) {
      context.messageSegment = `at least ${context.minimum}`;
      return context.actual < context.minimum;
    }
    context.messageSegment = `exactly ${context.exact}`;
    return context.actual !== context.exact;
  });

  failed.forEach(function(context) {
    console.log('Mismatched %s function calls. Expected %s, actual %d.',
                context.name,
                context.messageSegment,
                context.actual);
    console.log(context.stack.split('\n').slice(2).join('\n'));
  });

  if (failed.length) process.exit(1);
}

function _mustCallInner(fn, criteria = 1, field) {
  if (process._exiting)
    throw new Error('Cannot use common.mustCall*() in process exit handler');
  if (typeof fn === 'number') {
    criteria = fn;
    fn = noop;
  } else if (fn === undefined) {
    fn = noop;
  }

  if (typeof criteria !== 'number')
    throw new TypeError(`Invalid ${field} value: ${criteria}`);

  const context = {
    [field]: criteria,
    actual: 0,
    stack: inspect(new Error()),
    name: fn.name || '<anonymous>',
  };

  // Add the exit listener only once to avoid listener leak warnings
  if (mustCallChecks.length === 0) process.on('exit', runCallChecks);

  mustCallChecks.push(context);

  const _return = function() { // eslint-disable-line func-style
    context.actual++;
    return fn.apply(this, arguments);
  };
  // Function instances have own properties that may be relevant.
  // Let's replicate those properties to the returned function.
  // Refs: https://tc39.es/ecma262/#sec-function-instances
  Object.defineProperties(_return, {
    name: {
      value: fn.name,
      writable: false,
      enumerable: false,
      configurable: true,
    },
    length: {
      value: fn.length,
      writable: false,
      enumerable: false,
      configurable: true,
    },
  });
  return _return;
}

function mustCall(fn, exact) {
  return _mustCallInner(fn, exact, 'exact');
}

module.exports = {
  spawnPromisified,
  skipIfInspectorDisabled,
  platformTimeout,
  expectRequiredModule,
  expectsError,
  printSkipMessage,
  skip,
  allowGlobals: () => { },
  mustNotCall,
  mustCall,
  parseTestFlags,
  testRunnerPath: path.resolve(__dirname, '..', '..', 'lib', 'cli.js'),
  isMainThread,
  isWindows,
  isAIX,
  isIBMi,
  hasCrypto,
}