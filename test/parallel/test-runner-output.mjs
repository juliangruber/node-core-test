// !FAILURE
import * as common from '../common/index.mjs';
import * as fixtures from '../common/fixtures.mjs';
import * as snapshot from '../common/assertSnapshot.js';
import pkg from '#node:test';
const { describe, it } = pkg;
import { chdir, cwd } from 'node:process';
import { fileURLToPath } from 'node:url';

const skipForceColors =
  process.config.variables.icu_gyp_path !== 'tools/icu/icu-generic.gyp' ||
  process.config.variables.node_shared_openssl;

function replaceTestDuration(str) {
  return str
    .replaceAll(/duration_ms: [0-9.]+/g, 'duration_ms: *')
    .replaceAll(/duration_ms [0-9.]+/g, 'duration_ms *');
}

const root = fileURLToPath(new URL('../..', import.meta.url)).slice(0, -1);

const color = '(\\[\\d+m)';
const stackTraceBasePath = new RegExp(`${color}\\(${root.replaceAll(/[\\^$*+?.()|[\]{}]/g, '\\$&')}/?${color}(.*)${color}\\)`, 'g');

function replaceSpecDuration(str) {
  return str
    .replaceAll(/[0-9.]+ms/g, '*ms')
    .replaceAll(/duration_ms [0-9.]+/g, 'duration_ms *')
    .replace(stackTraceBasePath, '$3');
}

function removeWindowsPathEscaping(str) {
  return common.isWindows ? str.replaceAll(/\\\\/g, '\\') : str;
}

function replaceTestLocationLine(str) {
  return str.replaceAll(/(js:)(\d+)(:\d+)/g, '$1(LINE)$3');
}

const defaultTransform = snapshot.transform(
  snapshot.replaceWindowsLineEndings,
  snapshot.replaceStackTrace,
  removeWindowsPathEscaping,
  snapshot.replaceFullPaths,
  snapshot.replaceWindowsPaths,
  replaceTestDuration,
  replaceTestLocationLine,
);
const specTransform = snapshot.transform(
  replaceSpecDuration,
  snapshot.replaceWindowsLineEndings,
  snapshot.replaceStackTrace,
  snapshot.replaceWindowsPaths,
);

const tests = [
  { name: 'test-runner/output/abort.js', flags: ['--test-reporter=tap'] },
  {
    name: 'test-runner/output/abort-runs-after-hook.js',
    flags: ['--test-reporter=tap'],
  },
  { name: 'test-runner/output/abort_suite.js', flags: ['--test-reporter=tap'] },
  { name: 'test-runner/output/abort_hooks.js', flags: ['--test-reporter=tap'] },
  { name: 'test-runner/output/describe_it.js', flags: ['--test-reporter=tap'] },
  {
    name: 'test-runner/output/describe_nested.js',
    flags: ['--test-reporter=tap'],
  },
  { name: 'test-runner/output/eval_dot.js', transform: specTransform },
  { name: 'test-runner/output/eval_spec.js', transform: specTransform },
  { name: 'test-runner/output/eval_tap.js' },
  {
    name: 'test-runner/output/filtered-suite-delayed-build.js',
    flags: ['--test-reporter=tap'],
  },
  {
    name: 'test-runner/output/filtered-suite-order.mjs',
    flags: ['--test-reporter=tap'],
  },
  {
    name: 'test-runner/output/filtered-suite-throws.js',
    flags: ['--test-reporter=tap'],
  },
  { name: 'test-runner/output/hooks.js', flags: ['--test-reporter=tap'] },
  { name: 'test-runner/output/hooks_spec_reporter.js', transform: specTransform },
  { name: 'test-runner/output/skip-each-hooks.js', transform: specTransform },
  { name: 'test-runner/output/suite-skip-hooks.js', transform: specTransform },
  {
    name: 'test-runner/output/timeout_in_before_each_should_not_affect_further_tests.js',
    flags: ['--test-reporter=tap'],
  },
  {
    name: 'test-runner/output/hooks-with-no-global-test.js',
    flags: ['--test-reporter=tap'],
  },
  {
    name: 'test-runner/output/global-hooks-with-no-tests.js',
    flags: ['--test-reporter=tap'],
  },
  {
    name: 'test-runner/output/before-and-after-each-too-many-listeners.js',
    flags: ['--test-reporter=tap'],
  },
  {
    name: 'test-runner/output/before-and-after-each-with-timeout-too-many-listeners.js',
    flags: ['--test-reporter=tap'],
  },
  { name: 'test-runner/output/force_exit.js', transform: specTransform },
  {
    name: 'test-runner/output/global_after_should_fail_the_test.js',
    flags: ['--test-reporter=tap'],
  },
  {
    name: 'test-runner/output/no_refs.js',
    flags: ['--test-reporter=tap'],
  },
  {
    name: 'test-runner/output/no_tests.js',
    flags: ['--test-reporter=tap'],
  },
  { name: 'test-runner/output/only_tests.js', flags: ['--test-reporter=tap'] },
  { name: 'test-runner/output/dot_reporter.js', transform: specTransform },
  { name: 'test-runner/output/spec_reporter_successful.js', transform: specTransform },
  { name: 'test-runner/output/spec_reporter.js', transform: specTransform },
  { name: 'test-runner/output/spec_reporter_cli.js', transform: specTransform },
  { name: 'test-runner/output/output.js', flags: ['--test-reporter=tap'] },
  { name: 'test-runner/output/output_cli.js' },
  {
    name: 'test-runner/output/name_and_skip_patterns.js',
    flags: ['--test-reporter=tap'],
  },
  {
    name: 'test-runner/output/name_pattern.js',
    flags: ['--test-reporter=tap'],
  },
  {
    name: 'test-runner/output/name_pattern_with_only.js',
    flags: ['--test-reporter=tap'],
  },
  {
    name: 'test-runner/output/skip_pattern.js',
    flags: ['--test-reporter=tap'],
  },
  {
    name: 'test-runner/output/unfinished-suite-async-error.js',
    flags: ['--test-reporter=tap'],
  },
  {
    name: 'test-runner/output/unresolved_promise.js',
    flags: ['--test-reporter=tap'],
  },
  { name: 'test-runner/output/default_output.js', transform: specTransform, tty: true },
  {
    name: 'test-runner/output/non-tty-forced-color-output.js',
    transform: specTransform,
  },
  {
    name: 'test-runner/output/async-test-scheduling.mjs',
    flags: ['--test-reporter=tap'],
  },
  { name: 'test-runner/output/dot_output_custom_columns.js', transform: specTransform, tty: true },
  {
    name: 'test-runner/output/tap_escape.js',
    transform: snapshot.transform(
      snapshot.replaceWindowsLineEndings,
      replaceTestDuration,
    ),
    flags: ['--test-reporter=tap'],
  },
  {
    name: 'test-runner/output/test-runner-plan.js',
    flags: ['--test-reporter=tap'],
  },
  {
    name: 'test-runner/output/test-diagnostic-warning-without-test-only-flag.js',
    flags: ['--test', '--test-reporter=tap'],
  },
]
.filter(Boolean)
.map(({ flags, name, tty, transform }) => ({
  name,
  fn: common.mustCall(async () => {
    await snapshot.spawnAndAssert(fixtures.path(name), transform ?? defaultTransform, { tty, flags });
  }),
}));

if (cwd() !== root) {
  chdir(root);
}
describe('test runner output', { concurrency: true }, () => {
  for (const { name, fn } of tests) {
    it(name, fn);
  }
});
