#!/usr/bin/env node

const { argv } = require('#internal/options')

argv['test-only'] = true

require('./node-core-test.js')
