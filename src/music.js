import './music.css';
import tracks from './data/soundtrack.json';
import {SoundtrackPlayer} from './audio-player.js';

export const SOUNDTRACK_URL = 'https://www.brian-eno.net/';
const COPY = {
  music: ['Музыка', 'Music'],
  start: ['Включить музыку', 'Turn music on'],
  stop: ['Выключить музыку', 'Turn music off'],
  details: ['Управление музыкой', 'Music controls'],
  collapse: ['Свернуть плеер', 'Collapse player'],
  next: ['Следующая композиция', 'Next track'],
  volume: ['Громкость музыки', 'Music volume'],
  deviceVolume: ['Громкость — кнопками устройства', 'Use your device to adjust the volume'],
  seek: ['Позиция в композиции', 'Track position'],
  off: ['Музыка выключена', 'Music is off'],
  loading: ['Загружаем композицию…', 'Loading the track…'],
  playing: ['Случайный порядок · повтор', 'Shuffle · repeat'],
  blocked: ['Нажмите кнопку музыки ещё раз', 'Press the music button again'],
  error: ['Не удалось загрузить трек. Нажмите музыку, чтобы повторить.', 'Could not load this track. Press music to retry.'],
  collection: ['8 композиций · Apollo', '8 tracks · Apollo']
};
const note = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="17" cy="16" rx="3" ry="2.5"/></svg>';
const time = seconds => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.floor(Math.max(0, seconds) % 60)).padStart(2, '0')}`;

export function createSoundtrack(root, getLanguage) {
  root.innerHTML = `
    <div class="music-buttons"><button class="music-toggle" id="music-toggle" aria-pressed="false">${note}<span class="music-label"></span><span class="music-light" aria-hidden="true"></span></button><button class="music-details-toggle icon-btn" aria-controls="music-panel" aria-expanded="false" hidden><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></div>
    <section class="music-panel" id="music-panel" aria-labelledby="music-title" hidden>
      <div class="music-heading"><div><span class="music-collection"></span><h2 id="music-title">An Ending (Ascent)</h2></div><button class="icon-btn music-close"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button></div>
      <p class="music-artist">Brian Eno · Daniel Lanois · Roger Eno</p>
      <div class="music-progress"><input id="music-seek" type="range" min="0" max="1" step="0.1" value="0"><span><time id="music-elapsed">0:00</time><time id="music-duration">4:24</time></span></div>
      <div class="music-settings"><label class="music-volume"><span></span><input id="music-volume" type="range" min="0" max="100" step="1" value="35"></label><span class="music-device-volume" hidden></span><button class="music-next icon-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 5 10 7-10 7Zm14 0v14"/></svg></button></div>
      <p class="music-status" role="status" aria-live="polite"></p>
    </section><audio id="soundtrack-audio" preload="none"></audio>`;
  const $ = selector => root.querySelector(selector);
  const button = $('#music-toggle'), details = $('.music-details-toggle'), panel = $('#music-panel');
  const seek = $('#music-seek'), volume = $('#music-volume');
  let expanded = false, started = false;
  const text = key => COPY[key][getLanguage() === 'en' ? 1 : 0];
  const player = new SoundtrackPlayer($('#soundtrack-audio'), tracks, {
    resolveUrl: path => new URL(path, document.baseURI).href,
    onChange: () => render()
  });
  function render() {
    root.dataset.state = player.status;
    root.classList.toggle('is-enabled', player.enabled);
    button.setAttribute('aria-pressed', String(player.enabled));
    button.setAttribute('aria-label', text(player.enabled ? 'stop' : 'start'));
    button.title = text(player.enabled ? 'stop' : 'start');
    $('.music-label').textContent = text('music');
    details.hidden = !started;
    details.setAttribute('aria-label', text('details'));
    details.title = text('details');
    details.setAttribute('aria-expanded', String(expanded));
    panel.hidden = !expanded;
    $('.music-close').setAttribute('aria-label', text('collapse'));
    $('.music-collection').textContent = text('collection');
    $('#music-title').textContent = player.track.title;
    const status = text(player.status);
    if ($('.music-status').textContent !== status) $('.music-status').textContent = status;
    $('.music-next').setAttribute('aria-label', text('next'));
    $('.music-next').title = text('next');
    seek.setAttribute('aria-label', text('seek'));
    seek.max = player.duration;
    seek.value = player.position;
    seek.disabled = !player.loadedId;
    seek.setAttribute('aria-valuetext', `${time(player.position)} / ${time(player.duration)}`);
    seek.style.setProperty('--pct', `${player.duration ? player.position / player.duration * 100 : 0}%`);
    $('#music-elapsed').textContent = time(player.position);
    $('#music-duration').textContent = time(player.duration);
    $('.music-volume').hidden = !player.volumeSupported;
    $('.music-volume>span').textContent = text('volume');
    $('.music-device-volume').hidden = player.volumeSupported;
    $('.music-device-volume').textContent = text('deviceVolume');
    volume.setAttribute('aria-label', text('volume'));
    volume.value = Math.round(player.audio.volume * 100);
    volume.style.setProperty('--pct', `${volume.value}%`);
    volume.setAttribute('aria-valuetext', `${volume.value}%`);
  }
  button.addEventListener('click', () => {
    if (player.enabled) { expanded = false; player.pause(); }
    else { if (!started) expanded = true; started = true; player.play(); }
  });
  details.addEventListener('click', () => { expanded = !expanded; render(); });
  $('.music-close').addEventListener('click', () => { expanded = false; render(); details.focus({preventScroll:true}); });
  $('.music-next').addEventListener('click', () => player.next());
  seek.addEventListener('input', () => player.seek(Number(seek.value)));
  volume.addEventListener('input', () => player.setVolume(Number(volume.value) / 100));
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') { expanded = false; render(); button.focus({preventScroll:true}); }
  });
  window.addEventListener('pagehide', () => { expanded = false; player.pause(); });
  render();
  return {localize: render};
}
