'use strict';

const tty = require('node:tty');

const colorCodes = {
    blue: '\u001b[34m',
    green: '\u001b[32m',
    white: '\u001b[39m',
    yellow: '\u001b[33m',
    red: '\u001b[31m',
    gray: '\u001b[90m',
    clear: '\u001bc',
    reset: '\u001b[0m',
};

module.exports = {
  shouldColorize(stream) {
    // FORCE_COLOR env variable forces color depth check
    if (process.env.FORCE_COLOR !== undefined) {
      return tty.WriteStream.prototype.getColorDepth() > 2;
    }
    // Check if the stream is a TTY and supports color depth
    return stream?.isTTY && (stream.getColorDepth?.() > 2 || true);
  },

  refresh() {
    const hasColors = this.shouldColorize(process.stderr);

    // Assign color escape codes or empty strings based on color support
    for (const [key, code] of Object.entries(colorCodes)) {
      this[key] = hasColors ? code : '';
    }

    this.hasColors = hasColors;
  },
};

module.exports.refresh();
