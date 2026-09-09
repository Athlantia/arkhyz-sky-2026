import {clamp, wrap} from './astro.js';

const ARROWS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
export const DESKTOP_HOVER_QUERY = '(min-width: 701px) and (hover: hover) and (pointer: fine)';
const normalize = (x, y) => {
  const length = Math.max(1, Math.hypot(x, y));
  return {x: x / length, y: y / length};
};

export function blocksSkyArrows(element) {
  return Boolean(element && (
    element.isContentEditable || /^(INPUT|TEXTAREA|SELECT|OPTION)$/.test(element.tagName) ||
    element.closest?.('[role="slider"], [role="spinbutton"], [role="combobox"], [role="listbox"], [role="menu"], [role="tree"], [role="tablist"]')
  ));
}

export function keyboardPan(keys) {
  return normalize(Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft')),
    Number(keys.has('ArrowUp')) - Number(keys.has('ArrowDown')));
}

export function edgePan(point, width, height) {
  if (!point || width <= 0 || height <= 0 || !Number.isFinite(point.x) || !Number.isFinite(point.y) ||
      point.x < 0 || point.y < 0 || point.x > width || point.y > height) return {x: 0, y: 0};
  const band = Math.min(96, width * 0.1, height * 0.14);
  const strength = distance => Math.max(0, 1 - distance / band) ** 2;
  return normalize(strength(width - point.x) - strength(point.x),
    strength(point.y) - strength(height - point.y));
}

export class PanMotion {
  constructor() { this.reset(); }
  reset() { this.velocity = {x: 0, y: 0}; this.mode = null; }
  step(camera, seconds, keys, point, width, height) {
    const mode = keys.size ? 'keyboard' : 'edge';
    const vector = mode === 'keyboard' ? keyboardPan(keys) : edgePan(point, width, height);
    if (!vector.x && !vector.y) { this.reset(); return false; }
    if (this.mode !== mode) this.reset();
    this.mode = mode;
    const dt = clamp(seconds, 0, 0.1), response = 0.16;
    const speed = (mode === 'keyboard' ? 28 : 12) / clamp(camera.zoom, 1, 4);
    const decay = Math.exp(-dt / response), delta = {};
    // Integrate the eased velocity exactly so frame rate does not change the feel.
    for (const axis of ['x', 'y']) {
      const target = vector[axis] * speed, previous = this.velocity[axis];
      delta[axis] = target * dt + (previous - target) * response * (1 - decay);
      this.velocity[axis] = target + (previous - target) * decay;
    }
    const az = wrap(camera.az + delta.x), alt = clamp(camera.alt + delta.y, -25, 89.5);
    if (alt !== camera.alt + delta.y) this.velocity.y = 0;
    const moved = Math.abs(delta.x) > 1e-9 || Math.abs(alt - camera.alt) > 1e-9;
    camera.az = az;
    camera.alt = alt;
    return moved;
  }
}

export function installSkyNavigation(canvas, {getCamera, blocked, onMove}) {
  const motion = new PanMotion(), keys = new Set();
  const desktopHover = matchMedia(DESKTOP_HOVER_QUERY);
  let pointer = null;
  const clearPointer = () => { pointer = null; if (!keys.size) motion.reset(); };
  const reset = () => { keys.clear(); pointer = null; motion.reset(); };
  window.addEventListener('keydown', event => {
    if (!ARROWS.has(event.key)) return;
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || blocked() || blocksSkyArrows(document.activeElement)) {
      reset();
      return;
    }
    event.preventDefault();
    pointer = null;
    keys.add(event.key);
  });
  window.addEventListener('keyup', event => {
    keys.delete(event.key);
    if (!keys.size) motion.reset();
  });
  document.addEventListener('pointermove', event => {
    if (desktopHover.matches && event.pointerType === 'mouse' && event.buttons === 0 &&
        event.target === canvas && !keys.size && !blocked()) {
      pointer = {x: event.clientX, y: event.clientY};
    } else clearPointer();
  }, {passive: true});
  document.addEventListener('pointerdown', reset, {passive: true});
  document.addEventListener('pointerout', event => { if (!event.relatedTarget) clearPointer(); }, {passive: true});
  canvas.addEventListener('pointerleave', clearPointer, {passive: true});
  canvas.addEventListener('pointercancel', reset, {passive: true});
  document.addEventListener('focusin', () => { if (blocksSkyArrows(document.activeElement)) reset(); });
  document.addEventListener('visibilitychange', reset);
  window.addEventListener('blur', reset);
  window.addEventListener('pagehide', reset);
  window.addEventListener('resize', reset);
  desktopHover.addEventListener('change', reset);
  return {
    reset,
    update(seconds) {
      if (blocked() || document.hidden || !document.hasFocus()) { reset(); return; }
      if (keys.size && blocksSkyArrows(document.activeElement)) reset();
      if (pointer && (!desktopHover.matches || document.elementFromPoint(pointer.x, pointer.y) !== canvas)) clearPointer();
      if (motion.step(getCamera(), seconds, keys, pointer, innerWidth, innerHeight)) onMove();
    }
  };
}
