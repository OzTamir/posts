import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from './slug.ts';

test('lowercases and hyphenates', () => {
  assert.equal(slugify('Home Assistant'), 'home-assistant');
  assert.equal(slugify('3D Printing'), '3d-printing');
  assert.equal(slugify('COVID'), 'covid');
  assert.equal(slugify('harness engineering'), 'harness-engineering');
});

test('collapses runs and trims', () => {
  assert.equal(slugify('  a / b  '), 'a-b');
  assert.equal(slugify('already-clean'), 'already-clean');
});
