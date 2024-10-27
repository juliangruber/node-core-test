import * as common from '../../../common/index.mjs';
import pkg from '#node:test';
const { describe, test } = pkg;
import { setTimeout } from 'node:timers/promises';

test('test', common.mustCall());
describe('suite', common.mustCall(async () => {
  test('test', common.mustCall());
  await setTimeout(10);
  test('scheduled async', common.mustCall());
}));

await setTimeout(10);
test('scheduled async', common.mustCall());
