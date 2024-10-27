const {
    codes: { ERR_INVALID_ARG_VALUE, ERR_UNSUPPORTED_FEATURE }
} = require('#internal/errors')

const notParsedAsOptions = [];
const parsedAsOptions = [];

function getDefaultValue(type, def) {
    if (def !== undefined) return def;
    const defaults = {
        'array': [],
        'boolean': false,
    };
    return defaults[type] ?? undefined;
}

function parseOptions(options, map) {
    const parsedOptions = Object.fromEntries(
        Object.entries(map).map(([key, { type, default: def }]) => [
            key, getDefaultValue(type, def)
        ])
    );

    
    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        let [key, value] = option.split('=');
        

        // Skip if the key is not in the map or if it is disallowed
        if (!(key in map)) {
            if (
                !key.startsWith('-') &&
                (i > process.execArgv.length)
            ) notParsedAsOptions.push(key);
            continue;
        };

        if (map[key].disallowed) {
            throw new ERR_UNSUPPORTED_FEATURE(key);
        };

        const { type, valueMustConnect = true } = map[key];

        if (!value && !valueMustConnect) {
            value = options[++i];
            if (value.startsWith('-')) {
                throw new ERR_INVALID_ARG_VALUE(key, undefined, 'requires a value');
            }
        }
        parsedAsOptions.push(option);
        switch (type) {
            case 'array':
                parsedOptions[key] = [...(parsedOptions[key] || []), value];
                break;
            case 'boolean':
                parsedOptions[key] = true; // Set boolean to true
                break;
            case 'number':
                const numValue = parseFloat(value);
                if (isNaN(numValue)) {
                    throw new Error(`Invalid value for number: ${value}`);
                }
                parsedOptions[key] = numValue;
                break;
            case 'string':
                parsedOptions[key] = value; // Set the string value
                break;
            default:
                throw new Error(`Unknown type: ${type}`);
        }
    }

    return parsedOptions;
}

const options = parseOptions([
    ...process.execArgv,
    ...process.argv.slice(1),
], {
    '--import': { type: 'array', valueMustConnect: false },
    '--experimental-test-snapshots': { type: 'boolean' },
    '--experimental-strip-types': { type: 'boolean', disallowed: true },
    '--test': { type: 'boolean' },
    '--experimental-test-coverage': { type: 'boolean' },
    '--test-force-exit': { type: 'boolean' },
    '--enable-source-maps': { type: 'boolean' },
    '--test-update-snapshots': { type: 'boolean' },
    '--watch': { type: 'boolean', disallowed: true },
    '--test-only': { type: 'boolean' },
    '--test-reporter-destination': { type: 'array', valueMustConnect: false },
    '--test-reporter': { type: 'array', valueMustConnect: false },
    '--experimental-test-isolation': { type: 'string' },
    '--test-timeout': { type: 'number' },
    '--test-concurrency': { type: 'number' },
    '--test-shard': { type: 'string' },
    '--test-name-pattern': { type: 'array' },
    '--test-skip-pattern': { type: 'array' },
    '--test-coverage-exclude': { type: 'array' },
    '--test-coverage-include': { type: 'array' },
    '--test-coverage-branches': { type: 'number' },
    '--test-coverage-lines': { type: 'number' },
    '--test-coverage-functions': { type: 'number' },
    '--experimental-test-module-mocks': { type: 'boolean' },
});

module.exports = {
    getOptionValue(option) {
        return options[option];
    },
    // Useful for determining file arguments
    notParsedAsOptions,
    parsedAsOptions
};