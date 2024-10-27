#!/usr/bin/env node

'use strict';

const { isUsingInspector } = require('#internal/util/inspector');
const { run } = require('#internal/test_runner/runner');
const { parseCommandLine } = require('#internal/test_runner/utils');
const { notParsedAsOptions } = require('#internal/options')

const options = parseCommandLine();

if (isUsingInspector() && options.isolation === 'process') {
  process.emitWarning('Using the inspector with --test forces running at a concurrency of 1. ' +
  'Use the inspectPort option to run with concurrency');
  options.concurrency = 1;
  options.inspectPort = process.debugPort;
}

options.globPatterns = notParsedAsOptions;

run(options).on('test:summary', (data) => {
  if (!data.success) {
    process.exitCode = 1;
  }
});