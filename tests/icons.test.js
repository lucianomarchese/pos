import test from 'node:test';
import assert from 'node:assert/strict';
import { ICONS, PRODUCT_ICONS, icon } from '../src/icons.js';
import { createSeed } from '../src/data.js';

test('every seeded product icon exists in the set', () => {
  for (const preset of ['lounge', 'retail']) {
    for (const product of createSeed(preset).products) assert.ok(ICONS[product.icon], `${preset}:${product.id} → ${product.icon}`);
  }
  assert.ok(PRODUCT_ICONS.every((name) => ICONS[name]));
});

test('unknown icons fall back to spark and labels are escaped', () => {
  assert.equal(icon('no-existe'), icon('spark'));
  assert.equal(icon(undefined), icon('spark'));
  const labelled = icon('chai', { label: '<b>"Chai"</b>' });
  assert.match(labelled, /^<svg [^>]*role="img"><title>&lt;b&gt;&quot;Chai&quot;&lt;\/b&gt;<\/title>/);
  assert.doesNotMatch(labelled, /<b>/);
  assert.match(labelled, /<\/svg>$/);
});
