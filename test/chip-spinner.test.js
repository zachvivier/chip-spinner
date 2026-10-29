import test from 'node:test';
import assert from 'node:assert/strict';
import { CHIP_MODELS, shadeChip } from '../chip-spinner.js';

const litDots = shades => shades.filter((_, i) => i % 2 === 0 && shades[i] > 0).length;

test('dots that miss the model stay empty', () => {
  for (const chip of ['cpu', 'gpu']) {
    const { grid } = CHIP_MODELS[chip], shades = shadeChip(chip, 0);
    assert.equal(shades.length, grid * grid * 2);
    const center = (Math.floor(grid / 2) * grid + Math.floor(grid / 2)) * 2;
    assert.ok(shades[center] > 0.9, `${chip} center is covered`);
    assert.ok(shades[center + 1] > 0.1, `${chip} center is lit`);
    assert.equal(shades[0], 0, `${chip} corner is empty`);
    assert.ok(litDots(shades) < grid * grid, `${chip} leaves background dots empty`);
  }
});

test('chips are thin when edge-on', () => {
  for (const chip of ['cpu', 'gpu']) {
    for (const axis of ['right', 'left']) {
      assert.ok(litDots(shadeChip(chip, Math.PI / 2, 0, { axis })) < litDots(shadeChip(chip, 0, 0, { axis })) / 2, `${chip} ${axis}`);
    }
  }
});

test('the two axes roll in different directions', () => {
  const right = shadeChip('gpu', 0.8, 0, { axis: 'right' }), left = shadeChip('gpu', 0.8, 0, { axis: 'left' });
  assert.notDeepEqual([...right], [...left]);
});

test('shading stays within range at any angle', () => {
  for (const chip of ['cpu', 'gpu']) {
    for (let a = 0; a < 2 * Math.PI; a += 0.7) {
      for (const v of shadeChip(chip, a, a, { samples: 2 })) assert.ok(v >= 0 && v <= 1);
    }
  }
});
