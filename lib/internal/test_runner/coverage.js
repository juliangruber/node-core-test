const {
  codes: { ERR_UNSUPPORTED_FEATURE }
} = require('#internal/errors');

module.exports = {
  setupCoverage() {
    throw new ERR_UNSUPPORTED_FEATURE('Code coverage');
  },
  TestCoverage: class {}
};
