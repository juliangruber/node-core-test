const assert = require('node:assert');

function innerOk(_caller, _length, ...args) {
    return assert.ok(...args);
}

module.exports = {
    innerOk
}
