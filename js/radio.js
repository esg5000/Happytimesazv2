/**
 * HappyTimesAZ – GTA Radio Mini Player
 * Persistent across all pages via localStorage.
 */

(function() {
  'use strict';

  const LS_STATION  = 'ht_radio_station';
  const LS_PLAYING  = 'ht_radio_playing';
  const LS_VOLUME   = 'ht_radio_volume';
  const LS_MINI     = 'ht_radio_mini';

  // Fallback stations if Sanity returns nothing
  const FALLBACK_STATIONS = [
    { title: 'GTA Radio – Desert Vibes', streamUrl: '', genre: 'Desert Rock' },
    { title: 'Chill AZ', streamUrl: '', genre: 'Chill' },
    { title: 'The Vibe 480', streamUrl: '', genre: 'Hip-Hop / R&B' },
    { title: 'Sunset FM', streamUrl: '', genre: 'Electronic' }
  ];

  let stations    = [];
  let currentIdx  = 0;
  let audio       = null;
  let isPlaying   = false;
  let volume      = 0.7;
  let isMini      = false;
  let uiReady     = false;

  // ─── Init ─────────────────────────────────────────────────────────────────

  async function init() {
    loadState();
    buildUI();

    // Load stations from Sanity
    try {
      const remote = await window.getRadioStations();
      if (remote && remote.length > 0) {
        stations = remote;
      } else {
        stations = FALLBACK_STATIONS;
      }
    } catch (e) {
      stations = FALLBACK_STATIONS;
    }

    // Clamp index
    if (currentIdx >= stations.length) currentIdx = 0;

    renderStations();
    updateDisplay();

    if (audio) {
      audio.volume = volume;
    }
  }

  function loadState() {
    currentIdx = parseInt(localStorage.getItem(LS_STATION) || '0', 10) || 0;
    isPlaying  = false; // don't auto-play on page load (browser restrictions)
    volume     = parseFloat(localStorage.getItem(LS_VOLUME) || '0.7');
    isMini     = localStorage.getItem(LS_MINI) === 'true';
  }

  function saveState() {
    localStorage.setItem(LS_STATION, currentIdx);
    localStorage.setItem(LS_PLAYING, isPlaying);
    localStorage.setItem(LS_VOLUME, volume);
    localStorage.setItem(LS_MINI, isMini);
  }

  // ─── Audio ────────────────────────────────────────────────────────────────

  function getAudio() {
    if (!audio) {
      audio = new Audio();
      audio.volume = volume;
      audio.addEventListener('error', onAudioError);
      audio.addEventListener('waiting', () => setLoadingState(true));
      audio.addEventListener('playing', () => setLoadingState(false));
      audio.addEventListener('canplay', () => setLoadingState(false));
    }
    return audio;
  }

  function play() {
    const station = stations[currentIdx];
    if (!station || !station.streamUrl) {
      showNoStream();
      return;
    }
    const a = getAudio();
    if (a.src !== station.streamUrl) {
      a.src = station.streamUrl;
    }
    const promise = a.play();
    if (promise !== undefined) {
      promise.then(() => {
        isPlaying = true;
        updatePlayButton();
        saveState();
      }).catch(err => {
        console.warn('[Radio] play error:', err.message);
        isPlaying = false;
        updatePlayButton();
      });
    }
  }

  function pause() {
    if (audio) audio.pause();
    isPlaying = false;
    updatePlayButton();
    saveState();
  }

  function togglePlay() {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }

  function switchStation(idx) {
    currentIdx = idx;
    const wasPlaying = isPlaying;
    if (audio) {
      audio.pause();
      audio.src = '';
      isPlaying = false;
    }
    renderStations();
    updateDisplay();
    saveState();
    if (wasPlaying) play();
  }

  function onAudioError(e) {
    console.warn('[Radio] audio error');
    isPlaying = false;
    updatePlayButton();
    setLoadingState(false);
  }

  function showNoStream() {
    const label = document.getElementById('radio-station-name');
    if (label) {
      const orig = label.textContent;
      label.textContent = 'No stream configured';
      setTimeout(() => { label.textContent = orig; }, 2000);
    }
  }

  // ─── UI Builder ───────────────────────────────────────────────────────────

  function buildUI() {
    const existing = document.getElementById('radio-player');
    if (existing) { uiReady = true; return; }

    const player = document.createElement('div');
    player.id = 'radio-player';
    player.className = isMini ? 'radio-player radio-mini' : 'radio-player';
    player.innerHTML = `
      <div class="radio-inner">
        <button class="radio-toggle-btn" id="radio-toggle" aria-label="Toggle radio player" title="GTA Radio">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
        </button>

        <div class="radio-cover" id="radio-cover">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        </div>

        <div class="radio-info">
          <div class="radio-label">GTA RADIO</div>
          <div class="radio-station-name" id="radio-station-name">Loading…</div>
          <div class="radio-genre" id="radio-genre"></div>
        </div>

        <div class="radio-controls">
          <div class="radio-loading" id="radio-loading" style="display:none">
            <span class="radio-spinner"></span>
          </div>
          <button class="radio-play-btn" id="radio-play" aria-label="Play/Pause">
            <svg class="icon-play" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>
            <svg class="icon-pause" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="display:none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          </button>

          <div class="radio-volume-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            <input type="range" class="radio-volume" id="radio-volume" min="0" max="1" step="0.05" value="${volume}">
          </div>

          <div class="radio-station-picker" id="radio-station-picker">
            <button class="radio-pick-btn" id="radio-pick-toggle" aria-label="Change station" title="Switch station">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
            <div class="radio-station-list" id="radio-station-list" style="display:none"></div>
          </div>
        </div>

        <button class="radio-close-btn" id="radio-minimize" aria-label="Minimize player" title="Minimize">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
        </button>
      </div>
    `;

    document.body.appendChild(player);

    // Bind events
    document.getElementById('radio-play').addEventListener('click', togglePlay);
    document.getElementById('radio-toggle').addEventListener('click', toggleMini);
    document.getElementById('radio-minimize').addEventListener('click', toggleMini);
    document.getElementById('radio-pick-toggle').addEventListener('click', toggleStationList);
    document.getElementById('radio-volume').addEventListener('input', onVolumeChange);

    // Close station list on outside click
    document.addEventListener('click', (e) => {
      const picker = document.getElementById('radio-station-picker');
      if (picker && !picker.contains(e.target)) {
        const list = document.getElementById('radio-station-list');
        if (list) list.style.display = 'none';
      }
    });

    uiReady = true;
  }

  function renderStations() {
    const list = document.getElementById('radio-station-list');
    if (!list) return;
    list.innerHTML = stations.map((s, i) => `
      <button class="radio-station-item ${i === currentIdx ? 'active' : ''}" data-idx="${i}">
        <span class="station-item-name">${escHtml(s.title)}</span>
        ${s.genre ? `<span class="station-item-genre">${escHtml(s.genre)}</span>` : ''}
      </button>
    `).join('');
    list.querySelectorAll('.radio-station-item').forEach(btn => {
      btn.addEventListener('click', () => {
        switchStation(parseInt(btn.dataset.idx, 10));
        list.style.display = 'none';
      });
    });
  }

  function updateDisplay() {
    const station = stations[currentIdx];
    if (!station) return;
    const nameEl  = document.getElementById('radio-station-name');
    const genreEl = document.getElementById('radio-genre');
    const coverEl = document.getElementById('radio-cover');
    if (nameEl)  nameEl.textContent  = station.title || 'Unknown Station';
    if (genreEl) genreEl.textContent = station.genre || '';
    if (coverEl && station.coverImage) {
      const url = window.sanityImage(station.coverImage, 56, 56, 'crop');
      if (url) {
        coverEl.innerHTML = `<img src="${url}" alt="${escHtml(station.title)}" loading="lazy">`;
      }
    }
  }

  function updatePlayButton() {
    const play  = document.querySelector('#radio-play .icon-play');
    const pause = document.querySelector('#radio-play .icon-pause');
    const btn   = document.getElementById('radio-play');
    if (!play || !pause) return;
    if (isPlaying) {
      play.style.display  = 'none';
      pause.style.display = '';
      btn.classList.add('playing');
    } else {
      play.style.display  = '';
      pause.style.display = 'none';
      btn.classList.remove('playing');
    }
  }

  function setLoadingState(loading) {
    const spinner = document.getElementById('radio-loading');
    const btn     = document.getElementById('radio-play');
    if (spinner) spinner.style.display = loading ? 'flex' : 'none';
    if (btn)     btn.style.display     = loading ? 'none' : 'flex';
  }

  function toggleMini() {
    const player = document.getElementById('radio-player');
    if (!player) return;
    isMini = !isMini;
    player.classList.toggle('radio-mini', isMini);
    saveState();
  }

  function toggleStationList() {
    const list = document.getElementById('radio-station-list');
    if (!list) return;
    list.style.display = list.style.display === 'none' ? 'block' : 'none';
  }

  function onVolumeChange(e) {
    volume = parseFloat(e.target.value);
    if (audio) audio.volume = volume;
    saveState();
  }

  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
