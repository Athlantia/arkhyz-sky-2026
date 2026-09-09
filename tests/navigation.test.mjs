import test from 'node:test';
import assert from 'node:assert/strict';
import {blocksSkyArrows, keyboardPan, edgePan, PanMotion} from '../src/sky-navigation.js';

test('canvas focus and ordinary buttons allow sky arrows; editors retain their keys', () => {
  for (const tagName of ['CANVAS', 'BODY', 'BUTTON', 'A', 'NAV']) assert.equal(blocksSkyArrows({tagName}), false);
  for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT', 'OPTION']) assert.equal(blocksSkyArrows({tagName}), true);
  assert.equal(blocksSkyArrows({tagName: 'DIV', isContentEditable: true}), true);
  assert.equal(blocksSkyArrows({tagName: 'DIV', closest: () => ({role: 'slider'})}), true);
});

test('edge speed increases gently toward all four edges and stays capped at corners', () => {
  const width = 1200, height = 900;
  assert.deepEqual(edgePan({x: 600, y: 450}, width, height), {x: 0, y: 0});
  let last = 0;
  for (let distance = 96; distance >= 0; distance--) {
    const v = edgePan({x: width - distance, y: 450}, width, height);
    assert(v.x >= last && v.x <= 1);
    assert(v.x - last < 0.021);
    last = v.x;
  }
  assert.equal(edgePan({x: width - 48, y: 450}, width, height).x, 0.25);
  assert.equal(edgePan({x: 0, y: 450}, width, height).x, -1);
  assert.equal(edgePan({x: 600, y: 0}, width, height).y, 1);
  assert.equal(edgePan({x: 600, y: height}, width, height).y, -1);
  for (const point of [{x: 0, y: 0}, {x: width, y: height}]) {
    const v = edgePan(point, width, height);
    assert(Math.hypot(v.x, v.y) <= 1 + 1e-12);
  }
  for (const point of [null, {x: -1, y: 40}, {x: 50, y: height + 1}]) assert.deepEqual(edgePan(point, width, height), {x: 0, y: 0});
});

test('keyboard directions cancel or combine without a diagonal speed boost', () => {
  assert.deepEqual(keyboardPan(new Set(['ArrowLeft', 'ArrowRight'])), {x: 0, y: 0});
  assert.deepEqual(keyboardPan(new Set(['ArrowUp', 'ArrowDown'])), {x: 0, y: 0});
  const diagonal = keyboardPan(new Set(['ArrowRight', 'ArrowUp']));
  assert(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-12);
});

test('eased camera motion has the same distance at 30, 60 and 144 Hz, with slower atlas motion', () => {
  const travel = (hz, zoom, keys) => {
    const motion = new PanMotion(), camera = {az: 0, alt: 22, zoom};
    for (let frame = 0; frame < hz * 2; frame++) motion.step(camera, 1 / hz, keys, {x: 1200, y: 450}, 1200, 900);
    return camera.az;
  };
  for (const keys of [new Set(), new Set(['ArrowRight'])]) {
    const distance = travel(60, 1, keys);
    assert(Math.abs(distance - travel(30, 1, keys)) < 1e-9);
    assert(Math.abs(distance - travel(144, 1, keys)) < 1e-9);
    assert(Math.abs(distance / 4 - travel(60, 4, keys)) < 1e-9);
    assert(distance < 2 * (keys.size ? 28 : 12));
  }
});

test('edge motion stops in the center, resets on interruption, and yields to keyboard input', () => {
  const motion = new PanMotion(), camera = {az: 45, alt: 22, zoom: 1}, none = new Set();
  for (let i = 0; i < 60; i++) motion.step(camera, 1 / 60, none, {x: 1200, y: 450}, 1200, 900);
  const stop = {...camera};
  assert.equal(motion.step(camera, 1 / 60, none, {x: 600, y: 450}, 1200, 900), false);
  assert.deepEqual(camera, stop);
  motion.reset();
  motion.step(camera, 1 / 60, new Set(['ArrowLeft']), {x: 1200, y: 450}, 1200, 900);
  assert(camera.az < stop.az, 'Keyboard direction overrides the opposite edge');
  assert(camera.az > stop.az - 0.1, 'A new movement eases in');
  const released = {...camera};
  motion.step(camera, 1 / 60, none, null, 1200, 900);
  assert.deepEqual(camera, released);
});

test('camera wraps through 360 degrees, respects elevation limits and caps a stalled frame', () => {
  const motion = new PanMotion(), camera = {az: 359.9, alt: 89.49, zoom: 1};
  const keys = new Set(['ArrowRight', 'ArrowUp']);
  motion.step(camera, 10, keys, null, 1200, 900);
  assert(camera.az >= 0 && camera.az < 2.8);
  assert.equal(camera.alt, 89.5);
  camera.alt = -24.99;
  motion.reset();
  motion.step(camera, 0.1, new Set(['ArrowDown']), null, 1200, 900);
  assert.equal(camera.alt, -25);
});
