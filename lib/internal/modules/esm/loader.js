const {
    codes: { UNSUPPORTED_FEATURE }
} = require('#internal/errors');

const cascadedLoader = {
    import(a, _, b) {
        return import(a, b);
    },

    register() {
        throw new UNSUPPORTED_FEATURE('Module mocking');
    },
}

module.exports = {
    getOrInitializeCascadedLoader() {
        return cascadedLoader
    }
}