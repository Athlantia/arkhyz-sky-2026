function shuffled(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Only the opening track of a new page session is fixed.
export class ShufflePlaylist {
  constructor(tracks, random = Math.random) {
    if (!tracks.length) throw new Error('A soundtrack needs at least one track');
    this.tracks = tracks;
    this.random = random;
    this.index = 0;
    this.remaining = shuffled(tracks.map((_, i) => i).slice(1), random);
  }
  get current() { return this.tracks[this.index]; }
  advance() {
    if (!this.remaining.length) {
      this.remaining = shuffled(this.tracks.map((_, i) => i), this.random);
      if (this.remaining.length > 1 && this.remaining[0] === this.index) {
        const j = 1 + Math.floor(this.random() * (this.remaining.length - 1));
        [this.remaining[0], this.remaining[j]] = [this.remaining[j], this.remaining[0]];
      }
    }
    this.index = this.remaining.shift();
    return this.current;
  }
}

export class SoundtrackPlayer {
  constructor(audio, tracks, {random = Math.random, onChange = () => {}, resolveUrl = url => url} = {}) {
    this.audio = audio;
    this.playlist = new ShufflePlaylist(tracks, random);
    this.onChange = onChange;
    this.resolveUrl = resolveUrl;
    this.enabled = false;
    this.status = 'off';
    this.position = 0;
    this.request = 0;
    this.loadedId = null;
    this.awaitingMetadata = false;
    audio.autoplay = false;
    audio.preload = 'none';
    audio.volume = 0.35;
    this.volumeSupported = Math.abs(audio.volume - 0.35) < 0.01;
    audio.addEventListener('loadedmetadata', () => {
      if (!this.loadedId) return;
      if (this.position > 0) audio.currentTime = Math.min(this.position, Math.max(0, audio.duration - 0.05));
      this.awaitingMetadata = false;
      this.position = audio.currentTime;
      this.notify();
    });
    audio.addEventListener('timeupdate', () => {
      if (this.loadedId && !this.awaitingMetadata) this.position = audio.currentTime;
      this.notify();
    });
    audio.addEventListener('playing', () => {
      if (!this.enabled) { audio.pause(); return; }
      this.status = 'playing';
      this.notify();
    });
    audio.addEventListener('waiting', () => {
      if (this.enabled) { this.status = 'loading'; this.notify(); }
    });
    audio.addEventListener('pause', () => {
      if (this.enabled && audio.paused && !audio.ended && this.status !== 'loading') this.pause();
    });
    audio.addEventListener('ended', () => { if (this.enabled) this.next(); });
    audio.addEventListener('error', () => {
      if (!this.enabled || !this.loadedId) return;
      this.fail('error');
    });
  }
  get track() { return this.playlist.current; }
  get duration() { return this.loadedId && Number.isFinite(this.audio.duration) ? this.audio.duration : this.track.seconds; }
  notify() { this.onChange(this); }
  release() {
    this.loadedId = null;
    this.awaitingMetadata = false;
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
  }
  async play() {
    const request = ++this.request;
    this.enabled = true;
    this.status = 'loading';
    if (this.loadedId !== this.track.id) {
      this.loadedId = this.track.id;
      this.awaitingMetadata = true;
      this.audio.src = this.resolveUrl(this.track.url);
      this.audio.load();
    }
    this.notify();
    try {
      // Called directly in the click handler, before any network awaits.
      await this.audio.play();
      if (request !== this.request || !this.enabled) return;
      this.status = 'playing';
      this.notify();
    } catch (error) {
      if (request !== this.request || !this.enabled) return;
      this.fail(error.name === 'NotAllowedError' ? 'blocked' : 'error');
    }
  }
  pause() {
    this.enabled = false;
    this.request++;
    if (this.loadedId && !this.awaitingMetadata) this.position = this.audio.currentTime;
    this.status = 'off';
    // Cancel buffering too. Cached ranges can be reused when resuming.
    this.release();
    this.notify();
  }
  fail(status) {
    this.enabled = false;
    this.request++;
    if (this.loadedId && !this.awaitingMetadata) this.position = this.audio.currentTime;
    this.status = status;
    this.release();
    this.notify();
  }
  next() {
    const resume = this.enabled;
    this.enabled = false;
    this.request++;
    this.release();
    this.position = 0;
    this.playlist.advance();
    this.status = 'off';
    if (resume) return this.play();
    this.notify();
  }
  seek(seconds) {
    if (!this.loadedId || !Number.isFinite(seconds)) return;
    this.audio.currentTime = Math.max(0, Math.min(this.duration, seconds));
    this.position = this.audio.currentTime;
    this.notify();
  }
  setVolume(volume) {
    if (!Number.isFinite(volume)) return;
    this.audio.volume = Math.max(0, Math.min(1, volume));
    this.notify();
  }
}
