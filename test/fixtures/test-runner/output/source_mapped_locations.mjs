// Flags: --enable-source-maps
import pkg from '#node:test';
const { test } = pkg;
import { strictEqual } from 'node:assert';
test('fails', () => {
    strictEqual(1, 2);
});
//# sourceMappingURL=source_mapped_locations.mjs.map
