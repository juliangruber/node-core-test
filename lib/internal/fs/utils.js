const { Dirent } = require('node:fs');

const kStats = Symbol('stats');

class DirentFromStats extends Dirent {
  constructor(name, stats, path) {
    super(name, null, path);
    this[kStats] = stats;
  }
}

for (const name of Reflect.ownKeys(Dirent.prototype)) {
  if (name === 'constructor') {
    continue;
  }
  DirentFromStats.prototype[name] = function () {
    return this[kStats][name]();
  };
}

module.exports = { DirentFromStats }