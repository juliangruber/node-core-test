import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const common = require('./index.js');

const {
  allowGlobals,
  expectsError,
  isAIX,
  isIBMi,
  isWindows,
  mustCall,
  mustNotCall,
  platformTimeout,
  printSkipMessage,
  skip,
  skipIfInspectorDisabled,
  spawnPromisified,
  testRunnerPath
} = common;

export {
    allowGlobals,
    expectsError,
    isAIX,
    isIBMi,
    isWindows,
    mustCall,
    mustNotCall,
    platformTimeout,
    printSkipMessage,
    skip,
    skipIfInspectorDisabled,
    spawnPromisified,
    testRunnerPath,
};
