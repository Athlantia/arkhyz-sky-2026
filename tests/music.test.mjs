import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {ShufflePlaylist, SoundtrackPlayer} from '../src/audio-player.js';

const tracks = JSON.parse(fs.readFileSync(new URL('../src/data/soundtrack.json', import.meta.url)));
function rng(seed = 7) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; }; }
class FakeAudio extends EventTarget {
  constructor() { super(); this.currentTime = 0; this.duration = 264.879; this.paused = true; this.ended = false; this.sources = []; this.loads = 0; this.playCalls = 0; }
  set src(value) { this.source = value; this.sources.push(value); }
  get src() { return this.source; }
  removeAttribute(name) { if (name === 'src') this.source = undefined; }
  load() { this.loads++; this.currentTime = 0; this.ended = false; this.dispatchEvent(new Event('timeupdate')); }
  metadata() { this.dispatchEvent(new Event('loadedmetadata')); }
  play() { this.playCalls++; this.paused = false; return this.playPromise ?? Promise.resolve(); }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
  end() { this.ended = true; this.currentTime = this.duration; this.dispatchEvent(new Event('ended')); }
}
const setup = () => { const audio = new FakeAudio(); const player = new SoundtrackPlayer(audio, tracks, {random:rng()}); return {audio, player}; };

test('Apollo opens with Ascent, visits every track once per round and avoids adjacent repeats', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const queue = new ShufflePlaylist(tracks, rng(seed));
    assert.equal(queue.current.id, 'an-ending-ascent');
    let previous;
    for (let round = 0; round < 40; round++) {
      const seen = new Set();
      for (let i = 0; i < tracks.length; i++) {
        assert.notEqual(queue.current.id, previous);
        seen.add(queue.current.id);
        previous = queue.current.id;
        queue.advance();
      }
      assert.equal(seen.size, 8);
    }
  }
});

test('default silence makes no media requests; explicit play loads only Ascent', async () => {
  const {audio, player} = setup();
  assert.equal(player.enabled, false);
  assert.equal(audio.preload, 'none');
  assert.equal(audio.autoplay, false);
  assert.deepEqual(audio.sources, []);
  assert.equal(audio.loads, 0);
  await player.play();
  assert.deepEqual(audio.sources, [tracks[0].url]);
  assert.equal(player.status, 'playing');
});

test('off cancels buffering; re-enabling resumes the same track and position after metadata arrives', async () => {
  const {audio, player} = setup();
  await player.play(); audio.metadata();
  audio.currentTime = 92.4;
  player.pause();
  assert.equal(audio.src, undefined);
  assert.equal(audio.paused, true);
  assert.equal(player.position, 92.4);
  await player.play();
  assert.equal(player.position, 92.4, 'a reset timeupdate must not erase the resume position');
  audio.metadata();
  assert.equal(audio.currentTime, 92.4);
  assert.equal(player.track.id, 'an-ending-ascent');
});

test('a delayed play result cannot turn music back on after a quick off click', async () => {
  const {audio, player} = setup();
  let complete;
  audio.playPromise = new Promise(resolve => { complete = resolve; });
  const pending = player.play();
  player.pause();
  complete(); await pending;
  audio.dispatchEvent(new Event('playing'));
  assert.equal(player.enabled, false);
  assert.equal(player.status, 'off');
  assert.equal(audio.src, undefined);
  assert.equal(audio.paused, true);
});

test('natural completion advances to random tracks and repeats after the complete collection', async () => {
  const {audio, player} = setup();
  await player.play();
  const seen = new Set();
  for (let i = 0; i < tracks.length; i++) {
    seen.add(player.track.id);
    audio.metadata(); audio.end();
    await Promise.resolve();
  }
  assert.equal(seen.size, 8);
  assert.equal(audio.sources.length, 9);
  assert.equal(player.status, 'playing');
  assert.equal(player.position, 0);
});

test('play rejection and media failure stay silent and allow an explicit retry', async () => {
  const {audio, player} = setup();
  audio.playPromise = Promise.reject(Object.assign(new Error('Requires gesture'), {name:'NotAllowedError'}));
  await player.play();
  assert.equal(player.status, 'blocked');
  assert.equal(player.enabled, false);
  assert.equal(audio.src, undefined);
  audio.playPromise = undefined;
  await player.play();
  assert.equal(player.status, 'playing');
  audio.dispatchEvent(new Event('error'));
  assert.equal(player.status, 'error');
  assert.equal(player.enabled, false);
  assert.equal(audio.src, undefined);
});

test('all eight delivery copies are intact M4A files with streaming metadata before audio', () => {
  assert.equal(tracks.length, 8);
  assert.equal(new Set(tracks.map(t => t.id)).size, 8);
  let bytes = 0;
  for (const track of tracks) {
    const data = fs.readFileSync(new URL('../public/' + track.url, import.meta.url));
    assert.equal(data.length, track.bytes);
    assert.equal(createHash('sha256').update(data).digest('hex'), track.sha256);
    const boxes = [];
    for (let offset = 0; offset + 8 <= data.length;) {
      const size = data.readUInt32BE(offset);
      assert.ok(size >= 8 && offset + size <= data.length);
      boxes.push(data.toString('ascii', offset + 4, offset + 8));
      offset += size;
    }
    assert.equal(boxes[0], 'ftyp');
    assert.ok(boxes.indexOf('moov') > 0 && boxes.indexOf('moov') < boxes.indexOf('mdat'));
    assert.ok(track.seconds > 150 && track.seconds < 500);
    bytes += track.bytes;
  }
  assert.ok(bytes < 45_000_000);
});
