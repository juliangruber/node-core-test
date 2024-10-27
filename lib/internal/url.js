const url = require('node:url');

url.URL.parse = (a, b) => {
    console.log(a, b);
    return new URL(a, b);
}

module.exports = {
    ...url,
    URLParse: url.parse,
    toPathIfFileURL: (self) => {
        if (!module.exports.isURL(self)) return self;
        return url.fileURLToPath(self);
    },
    isURL: (self) => Boolean(self?.href && self.protocol && self.auth === undefined && self.path === undefined)
}
