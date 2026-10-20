const tracks = window.bandContent ? Object.fromEntries(window.bandContent.music.map(item => [item.id, item.videoId])) : { negativo: 'WRcxE6M-ETE', recomecar: 'A1Lon87KK-c', 'in-loop': 'bsZ7K7QEsMM' };

let player, activeButton, pendingTrack, apiRequested = false;
let playbackGeneration = 0;
let flightTimer = null;
let flightProgress = 0;
let flightStarted = false;
const status = document.getElementById('playback-status');
const indicator = document.getElementById('flight-indicator');
function setPlaying(value) {
  if (flightTimer !== null) clearInterval(flightTimer);
  flightTimer = null;
  indicator.dataset.playing = String(value);
  indicator.setAttribute('aria-label', value ? 'Rádio tocando' : 'Rádio pausado');
  if (value) {
    flightStarted = true;
    updateFlight();
    flightTimer = setInterval(updateFlight, 250);
  }
}
function flightHeight(progress) {
  const points = [[0, .42], [.07, .23], [.24, .86], [.34, .72], [.49, .72], [.53, .80], [.67, .18], [.80, .66], [.89, .18], [1, .70]];
  const index = points.findIndex(point => point[0] >= progress);
  if (index <= 0) return points[0][1];
  if (points[index][0] === progress) return points[index][1];
  const [left, right] = [points[index - 1], points[index]];
  const t = (progress - left[0]) / (right[0] - left[0]);
  const smooth = t * t * (3 - 2 * t);
  return left[1] + (right[1] - left[1]) * smooth;
}
function positionFlight(progress) {
  flightProgress = Math.max(0, Math.min(1, progress));
  const toolbar = document.querySelector('.toolbar');
  const logo = document.querySelector('.small-brand');
  if (!toolbar || !logo) return;
  const bar = toolbar.getBoundingClientRect();
  const brand = logo.getBoundingClientRect();
  const parked = Math.min(brand.right - bar.left + 12, bar.width - indicator.offsetWidth - 12);
  const start = bar.width <= 700 ? 8 : parked;
  const end = Math.max(start, bar.width - indicator.offsetWidth - 12);
  const x = flightStarted ? start + (end - start) * flightProgress : parked;
  indicator.style.setProperty('--flight-x', `${x}px`);
  const routeHeight = bar.width <= 700 ? .60 + .34 * Math.sin(Math.PI * flightProgress) - .27 * flightProgress : flightHeight(flightProgress);
  let centerY = flightStarted ? bar.height * routeHeight : brand.top - bar.top + brand.height / 2;
  if (flightStarted) {
    // Leave room for the whole aircraft before it reaches a label or icon.
    document.querySelectorAll('.toolbar nav button,.header-socials a').forEach(item => {
      const rect = item.getBoundingClientRect();
      const left = rect.left - bar.left;
      const right = rect.right - bar.left;
      if (x + indicator.offsetWidth + 32 > left && x - 32 < right) {
        centerY = Math.max(centerY, rect.bottom - bar.top + indicator.offsetHeight / 2 + 8);
      }
    });
  }
  indicator.style.setProperty('--flight-y', `${Math.max(0, centerY - indicator.offsetHeight / 2)}px`);
}
function updateFlight() {
  if (!player?.getDuration || !player?.getCurrentTime) return;
  const duration = player.getDuration();
  const current = player.getCurrentTime();
  if (Number.isFinite(duration) && duration > 0 && Number.isFinite(current)) positionFlight(current / duration);
}
window.addEventListener('resize', () => positionFlight(flightProgress));
positionFlight(0);
function openPanel(id) {
  document.querySelectorAll('dialog[open]').forEach(panel => panel.close());
  if (['musicas', 'contatos', 'shows'].includes(id)) document.getElementById(id === 'musicas' ? 'sons' : id === 'shows' ? 'agenda' : 'fale-com-a-banda').scrollIntoView({behavior:'smooth'});
  else document.getElementById(id)?.showModal();
}
document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openPanel(b.dataset.open)));
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(panel => panel.addEventListener('click', e => {
  const r = panel.getBoundingClientRect();
  if (e.target === panel && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) panel.close();
}));
function chooseTrack(id) {
  if (!tracks[id]) return;
  if (location.protocol === 'file:') { status.textContent = 'Abra pelo arquivo Abrir site.cmd para ouvir aqui. O YouTube exige uma origem HTTP.'; return; }
  pendingTrack = id;
  if (!window.YT?.Player) {
    status.textContent = 'Carregando player…';
    if (!apiRequested) {
      apiRequested = true;
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = () => { apiRequested = false; status.textContent = 'Player indisponível. Use o link YouTube da música.'; };
      document.head.append(script);
    }
    return;
  }
  setPlaying(false);
  flightStarted = false;
  positionFlight(0);
  const generation = ++playbackGeneration;
  if (player) player.destroy();
  document.querySelectorAll('.track-player').forEach(element => element.remove());
  if (activeButton) activeButton.hidden = false;
  activeButton = document.querySelector('[data-video="' + id + '"]');
  activeButton.hidden = true;
  const mount = document.createElement('div');
  mount.id = 'inline-player';
  const slot = document.createElement('div');
  slot.className = 'track-player';
  slot.append(mount);
  activeButton.before(slot);
  status.textContent = '';
  player = new window.YT.Player(mount, {
    host: 'https://www.youtube-nocookie.com', videoId: tracks[id],
    playerVars: {origin:location.origin, autoplay:1, playsinline:1, rel:0},
    events: {
      onReady: e => { if (generation === playbackGeneration) e.target.playVideo(); },
      onStateChange: e => {
        if (generation !== playbackGeneration) return;
        setPlaying(e.data === 1);
        if (e.data === 1) status.textContent = '';
        if (e.data === 0) {
          positionFlight(1);
          indicator.animate?.([{ transform: 'translateX(0)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(0)' }], { duration: 400 });
          const ids = Object.keys(tracks);
          chooseTrack(ids[(ids.indexOf(id)+1)%ids.length]);
        }
      },
      onAutoplayBlocked: () => { if (generation !== playbackGeneration) return; setPlaying(false); status.textContent = 'Toque no play da música para começar.'; },
      onError: e => { if (generation !== playbackGeneration) return; setPlaying(false); status.textContent = e.data === 153 ? 'O YouTube não recebeu a identificação do site. Use o link da música.' : 'Esta música não pôde ser reproduzida aqui. Use o link YouTube.'; }
    }
  });
}
window.onYouTubeIframeAPIReady = () => { if (pendingTrack) chooseTrack(pendingTrack); };
document.querySelectorAll('[data-video]').forEach(b => b.addEventListener('click', () => chooseTrack(b.dataset.video)));
document.querySelectorAll('[data-track]').forEach(b => b.addEventListener('click', () => {openPanel('musicas'); chooseTrack(b.dataset.track);}));
if (window.lucide) window.lucide.createIcons();
const cockpit = document.getElementById('cabine');
if (cockpit && typeof ResizeObserver !== 'undefined') new ResizeObserver(() => {
  const w = cockpit.clientWidth, h = cockpit.clientHeight, iw = Math.max(w,h*1.5);
  cockpit.style.setProperty('--scene-width', iw+'px');
  cockpit.style.setProperty('--scene-height', iw/1.5+'px');
  cockpit.style.setProperty('--scene-offset-x', (w-iw)/2+'px');
  cockpit.style.setProperty('--scene-offset-y', (h-iw/1.5)+'px');
}).observe(cockpit);
