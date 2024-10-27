const { codes: { ERR_UNSUPPORTED_FEATURE } } = require('#internal/errors');
throw new ERR_UNSUPPORTED_FEATURE('Sourcemap caching')