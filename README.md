# The `test` npm Package

[![CI](https://github.com/nodejs/node-core-test/actions/workflows/ci.yml/badge.svg)](https://github.com/nodejs/node-core-test/actions/workflows/ci.yml)

This package is a user-land implementation of [`node:test`](https://nodejs.org/api/test.html), the experimental test runner introduced in Node.js 23. It provides compatibility for Node.js 18. *(This package does not support newer versions. Instead, use the `node:test` module.)*

### Key Features:
- Minimal dependencies.
- Complete test suite.

### Differences from Core Implementation:
- Exposes its own stack frames.
- Lacks source map caching.
- Does not support module mocking.
- No inherent file watching capabilities.
- No built-in coverage support.
- Cannot import external scripts into `run()`-called test files.