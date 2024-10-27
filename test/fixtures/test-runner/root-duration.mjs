import pkg from '#node:test';
const { test, after } = pkg;

after(() => {});

test('a test with some delay', (t, done) => {
  setTimeout(done, 50);
});
