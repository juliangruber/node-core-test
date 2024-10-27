'use strict';

let dot;
let junit;
let spec;
let tap;
let lcov;

Object.defineProperties(module.exports, {
  dot: {
    configurable: true,
    enumerable: true,
    get() {
      return dot ??= require('#internal/test_runner/reporter/dot');
    },
  },
  junit: {
    configurable: true,
    enumerable: true,
    get() {
      return junit ??= require('#internal/test_runner/reporter/junit');
    },
  },
  spec: {
    configurable: true,
    enumerable: true,
    value: function (...args) {
      spec ??= require('#internal/test_runner/reporter/spec');
      return new spec(...args);
    },
  },
  tap: {
    configurable: true,
    enumerable: true,
    get() {
      return tap ??= require('#internal/test_runner/reporter/tap');
    },
  },
  lcov: {
    configurable: true,
    enumerable: true,
    value: function (...args) {
      lcov ??= require('#internal/test_runner/reporter/lcov');
      return new lcov(...args);
    },
  },
});
