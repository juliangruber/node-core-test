const util = require('node:util');
const vm = require('node:vm');

const getStructuredStack = vm.runInNewContext(`(function() {
    try { Error.stackTraceLimit = Infinity; } catch {}
    return function structuredStack() {
    Error.prepareStackTrace = (_, stack) => stack;
    const e = new Error();
      return e.stack;
    };
  })()`, { overrideStackTrace: new WeakMap() }, { filename: 'structured-stack' });

const experimentalWarnings = new Set();

function once(callback, { preserveReturnValue = false } = {}) {
  let called = false;
  let returnValue;
  return function (...args) {
    if (called) return returnValue;
    called = true;
    const result = Reflect.apply(callback, this, args);
    returnValue = preserveReturnValue ? result : undefined;
    return result;
  };
}

module.exports = {
  ...util,

  kEmptyObject: Object.freeze({}),
  isWindows: process.platform === 'win32',
  isMacOS: process.platform === 'darwin',
  getStructuredStack,
  once,

  emitExperimentalWarning(feature, prefix = '') {
    if (experimentalWarnings.has(feature)) return;
    experimentalWarnings.add(feature);
    process.emitWarning(
      `${prefix}${feature} is an experimental feature and might change at any time`,
      'ExperimentalWarning'
    );
  },

  setupCoverageHooks() {
    // TODO
    return '';
  }
}
