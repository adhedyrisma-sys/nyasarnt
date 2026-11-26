import { mascotImg } from './mascots.js';
import { icon, cctvPin, trainTopView, routePill } from './icons.js';
import { loadAreas, nearestArea, forecast, upcoming, rainNote, iconFor } from './weather.js';
import { prepare, busesNow, trainsNow, nextTrains, nextBuses, stopGroup, jakartaNow, fmtClock, dist } from './sim.js';

/* ============ ikon garis ============ */
const I = {
  home: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5H9v5.5H5.5A1.5 1.5 0 0 1 4 19z"/></svg>',
  route: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="6" cy="18" r="2.5" fill="currentColor"/><circle cx="18" cy="6" r="2.5" fill="currentColor"/><path d="M8.5 18H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="3" width="16" height="13" rx="3.5"/><rect x="7" y="6" width="10" height="5" rx="1.2" fill="#fff"/><path d="M10 16h4v5h-4z"/></svg>',
  cam: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2.5" y="6" width="13" height="12" rx="3"/><path d="M16.5 10.5 21.5 7.5v9l-5-3z"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="8" cy="12" r="1.5" fill="#fff"/><circle cx="12" cy="12" r="1.5" fill="#fff"/><circle cx="16" cy="12" r="1.5" fill="#fff"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  locate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>',
  bus: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm1 3v5h12V7z"/></svg>',
  train: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 3h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zm0 3v5h10V6z"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
};
document.querySelectorAll('.tabbar .ti').forEach((el) => {
  const k = { 'ti-home': 'home', 'ti-route': 'route', 'ti-stop': 'stop', 'ti-cam': 'cam', 'ti-more': 'more' }[el.classList[1]];
  el.outerHTML = I[k].replace('<svg', '<svg aria-hidden="true"');
});
document.getElementById('btnLocate').innerHTML = I.locate;

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const view = $('#view');
const KIND_LABEL = { brt: 'BRT', integrasi: 'Non-BRT', mikrotrans: 'Mikrotrans', transjabodetabek: 'Transjabodetabek', royaltrans: 'Royaltrans', rusun: 'Rusun', wisata: 'Wisata', lainnya: 'Lainnya' };
const FRIENDS = ['awan', 'bintang', 'batu', 'bulan', 'bunga'];
const friendFor = (s) => FRIENDS[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % FRIENDS.length];
const waitText = (s) => (s < 60 ? 'tiba' : `${Math.round(s / 60)} mnt`);

view.innerHTML = `<div class="loading">${mascotImg('awan', 110)}<b>Nyasarn't lagi siap-siap…</b><div class="bar"></div></div>`;

/* ============ state ============ */
const state = {
  tab: 'peta', layers: { bus: true, kereta: true, halte: true, cctv: true, teman: true },
  station: localStorage.getItem('nyasarnt.station') || 'Manggarai',
  routeKind: 'semua', routeQuery: '', selectedRoute: null, threeD: false, userLoc: null,
};
let BUS, TRAIN, CCTV, map;
let busFeats = [], trainFeats = [];

/* ============ peta ============ */
function initialView() {
  const m = location.hash.match(/@(-?[\d.]+),(-?[\d.]+),([\d.]+)/);
  return m ? { center: [+m[2], +m[1]], zoom: +m[3] } : { center: [106.8229, -6.2003], zoom: 11.3 };
}

// Peta butuh WebGL. Tanpa itu (atau bila peta gagal dimuat), tampilkan pesan yang jelas
// alih-alih "lagi siap-siap" selamanya.
function showFatal(title, detail) {
  view.innerHTML = `<div class="loading">${mascotImg('batu', 110, { look: [0, 0.4] })}<b>${title}</b>
    <p style="max-width:280px;margin:8px auto 14px;font-size:13px;color:var(--ink-3);line-height:1.5">${detail}</p>
    <button class="pill-btn dark" style="max-width:220px;margin:0 auto" onclick="location.reload()">Coba lagi</button></div>`;
}
const hasWebGL = (() => {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
})();
if (!hasWebGL) {
  showFatal('Peta tidak bisa ditampilkan', 'Browser ini tidak mendukung WebGL, yang dibutuhkan untuk menggambar peta. Coba buka Nyasarn\'t di Chrome, Safari, atau Firefox versi terbaru, atau nyalakan "akselerasi hardware" di pengaturan browser.');
  throw new Error('WebGL tidak tersedia');
}

map = new maplibregl.Map({
  container: 'map', style: 'https://tiles.openfreemap.org/styles/positron', ...initialView(),
  attributionControl: { compact: true, customAttribution: 'Nyasarn\'t · data TransJakarta GTFS, © OpenStreetMap' },
  maxPitch: 70,
});

window.addEventListener('hashchange', () => {
  const m = location.hash.match(/@(-?[\d.]+),(-?[\d.]+),([\d.]+)/);
  if (m) map.jumpTo({ center: [+m[2], +m[1]], zoom: +m[3] });
});

window.__nyasarnt = { get map() { return map; } }; // untuk pemeriksaan di konsol

map.on('moveend', () => {
  const c = map.getCenter();
  history.replaceState(null, '', `#@${c.lat.toFixed(5)},${c.lng.toFixed(5)},${map.getZoom().toFixed(1)}`);
});

function softenBasemap() {
  for (const l of map.getStyle().layers) {
    if (l.type === 'background') map.setPaintProperty(l.id, 'background-color', '#f3f6fc');
    if (/water/.test(l.id) && l.type === 'fill') map.setPaintProperty(l.id, 'fill-color', '#cfe2ff');
    if (/park|wood|grass/.test(l.id) && l.type === 'fill') map.setPaintProperty(l.id, 'fill-color', '#e2f3df');
  }
}

const loaded = new Promise((r) => (map.isStyleLoaded() ? r() : map.once('style.load', r)));
// Bila peta dasar tak kunjung termuat (koneksi putus/server peta bermasalah), beri tahu pengguna.
const loadTimer = setTimeout(() => {
  if (!BUS) showFatal('Peta belum berhasil dimuat', 'Sepertinya koneksi internet lambat atau server peta sedang sibuk. Cek koneksimu, lalu coba lagi.');
}, 25000);
const dataP = Promise.all(['bus', 'train', 'cctv'].map((n) => fetch(`data/${n}.json`).then((r) => r.json())));

Promise.all([loaded, dataP]).then(async ([, [bus, train, cctv]]) => {
  clearTimeout(loadTimer);
  BUS = bus; TRAIN = train; CCTV = cctv;
  applyCamFixes();
  prepare(BUS, TRAIN);
  softenBasemap();
  await addLayers();
  tick();
  setInterval(tick, 1000);
  initWeather();
  requestAnimationFrame(animate);
  render();
}).catch((e) => {
  clearTimeout(loadTimer);
  console.error(e);
  showFatal('Data Nyasarn\'t gagal dimuat', 'Cek koneksi internetmu, lalu coba lagi.');
});

async function addLayers() {
  map.addImage('cctv', await cctvPin(88), { pixelRatio: 2 });
  await Promise.all(TRAIN.lines.map(async (l) => map.addImage(`train-${l.id}`, await trainTopView(l.color, 30), { pixelRatio: 2 })));
  // label pil per warna rute; melebar mengikuti panjang nama (mis. JAK.48A)
  await Promise.all([...new Set(BUS.routes.map((r) => r.color))].map(async (c) => map.addImage(`pill-${c}`, await routePill(c), {
    pixelRatio: 2, stretchX: [[22, 26]], stretchY: [[22, 26]], content: [14, 10, 34, 38],
  })));

  // garis rute bus: ambil bentuk terpanjang per rute
  const routeLines = BUS.routes.map((r) => {
    const t = (r.trips || []).reduce((a, b) => (!a || BUS.shapeCum[b.shape].at(-1) > BUS.shapeCum[a.shape].at(-1) ? b : a), null);
    return { type: 'Feature', properties: { id: r.id, color: r.color, kind: r.kind }, geometry: { type: 'LineString', coordinates: t ? BUS.shapes[t.shape] : [] } };
  });
  map.addSource('routes', { type: 'geojson', data: { type: 'FeatureCollection', features: routeLines } });
  map.addLayer({ id: 'routes', type: 'line', source: 'routes', layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': ['get', 'color'], 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1, 15, 3], 'line-opacity': ['case', ['==', ['get', 'kind'], 'brt'], 0.55, 0.18] } });
  map.addLayer({ id: 'route-hl-casing', type: 'line', source: 'routes', filter: ['==', 'id', ''], layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#fff', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 7, 15, 13] } });
  map.addLayer({ id: 'route-hl', type: 'line', source: 'routes', filter: ['==', 'id', ''], layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': ['get', 'color'], 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 4, 15, 8] } });

  // jalur kereta
  map.addSource('rails', { type: 'geojson', data: { type: 'FeatureCollection', features: TRAIN.lines.map((l) => ({ type: 'Feature', properties: { id: l.id, color: l.color }, geometry: { type: 'LineString', coordinates: l.coords } })) } });
  map.addLayer({ id: 'rails-casing', type: 'line', source: 'rails', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#fff', 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 3, 15, 9] } });
  map.addLayer({ id: 'rails', type: 'line', source: 'rails', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.5, 15, 5], 'line-dasharray': [3, 1.2] } });

  // halte
  map.addSource('stops', { type: 'geojson', data: { type: 'FeatureCollection', features: BUS.stops.map((s, i) => ({ type: 'Feature', id: i, properties: { i, name: s.name }, geometry: { type: 'Point', coordinates: [s.lon, s.lat] } })) } });
  map.addLayer({ id: 'stops', type: 'circle', source: 'stops', minzoom: 13.5,
    paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 13.5, 2.5, 17, 6], 'circle-color': '#fff', 'circle-stroke-color': '#8b93b8', 'circle-stroke-width': 1.5 } });
  map.addLayer({ id: 'stops-label', type: 'symbol', source: 'stops', minzoom: 15.5,
    layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-optional': true },
    paint: { 'text-color': '#5b6075', 'text-halo-color': '#fff', 'text-halo-width': 1.5 } });

  // stasiun
  map.addSource('stations', { type: 'geojson', data: { type: 'FeatureCollection', features: TRAIN.stations.map((s) => ({ type: 'Feature', properties: { name: s.name, lines: s.lines.join(',') }, geometry: { type: 'Point', coordinates: [s.lon, s.lat] } })) } });
  map.addLayer({ id: 'stations', type: 'circle', source: 'stations', minzoom: 10,
    paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 15, 7], 'circle-color': '#fff', 'circle-stroke-color': '#1f2233', 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 15, 3] } });
  map.addLayer({ id: 'stations-label', type: 'symbol', source: 'stations', minzoom: 12.5,
    layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-optional': true },
    paint: { 'text-color': '#1f2233', 'text-halo-color': '#fff', 'text-halo-width': 2 } });

  // bus & kereta bergerak
  map.addSource('buses', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'buses', type: 'circle', source: 'buses', maxzoom: 14.6,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, ['case', ['==', ['get', 'kind'], 'brt'], 2, 0.7], 12, ['case', ['==', ['get', 'kind'], 'brt'], 3.6, 1.6], 14, 6, 16, 10],
      'circle-opacity': ['interpolate', ['linear'], ['zoom'], 11, ['case', ['==', ['get', 'kind'], 'brt'], 1, 0.55], 13, 1],
      'circle-color': ['get', 'color'], 'circle-stroke-color': '#fff',
      'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 11, 0, 12, ['case', ['==', ['get', 'kind'], 'brt'], 1, 0], 14, 2],
    } });
  map.addLayer({ id: 'buses-label', type: 'symbol', source: 'buses', minzoom: 14.5,
    layout: {
      'icon-image': ['concat', 'pill-', ['get', 'color']], 'icon-text-fit': 'both', 'icon-text-fit-padding': [1, 3, 1, 3],
      'text-field': ['get', 'short'], 'text-font': ['Noto Sans Bold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 14.5, 10, 17, 13],
      'icon-allow-overlap': true, 'text-allow-overlap': true, 'icon-ignore-placement': true, 'text-ignore-placement': true,
      'symbol-sort-key': ['case', ['==', ['get', 'kind'], 'brt'], 1, 0],
    },
    paint: { 'text-color': ['get', 'text'] } });
  map.addSource('trains', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'trains', type: 'symbol', source: 'trains',
    layout: { 'icon-image': ['concat', 'train-', ['get', 'line']], 'icon-rotate': ['get', 'brg'], 'icon-rotation-alignment': 'map', 'icon-pitch-alignment': 'map',
      'icon-size': ['interpolate', ['linear'], ['zoom'], 9, 0.55, 12, 0.9, 15, 1.5, 17, 2.2], 'icon-allow-overlap': true, 'icon-ignore-placement': true } });

  // cctv
  // CCTV dikelompokkan saat peta jauh, supaya pin tidak menumpuk menutupi pusat kota
  map.addSource('cctv', { type: 'geojson', data: cctvGeo(), cluster: true, clusterRadius: 46, clusterMaxZoom: 15 });
  map.addLayer({ id: 'cctv-cluster', type: 'circle', source: 'cctv', minzoom: 10, filter: ['has', 'point_count'],
    paint: { 'circle-color': '#8f6bff', 'circle-radius': ['step', ['get', 'point_count'], 13, 5, 16, 12, 19],
      'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } });
  map.addLayer({ id: 'cctv-count', type: 'symbol', source: 'cctv', minzoom: 10, filter: ['has', 'point_count'],
    layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-allow-overlap': true },
    paint: { 'text-color': '#fff' } });
  map.addLayer({ id: 'cctv', type: 'symbol', source: 'cctv', minzoom: 10, filter: ['!', ['has', 'point_count']],
    layout: { 'icon-image': 'cctv', 'icon-size': ['interpolate', ['linear'], ['zoom'], 11, 0.6, 16, 1], 'icon-anchor': 'bottom', 'icon-allow-overlap': true } });

  // interaksi
  for (const id of ['buses', 'buses-label', 'trains', 'stops', 'stations', 'cctv', 'cctv-cluster', 'routes']) {
    map.on('mouseenter', id, () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', id, () => (map.getCanvas().style.cursor = ''));
  }
  map.on('click', (e) => {
    const order = ['cctv-cluster', 'cctv', 'trains', 'buses-label', 'buses', 'stations', 'stops'];
    const box = [[e.point.x - 6, e.point.y - 6], [e.point.x + 6, e.point.y + 6]];
    for (const id of order) {
      if (!map.getLayer(id) || map.getLayoutProperty(id, 'visibility') === 'none') continue;
      const f = map.queryRenderedFeatures(box, { layers: [id] })[0];
      if (!f) continue;
      const p = f.properties;
      if (id === 'cctv-cluster') {
        map.getSource('cctv').getClusterExpansionZoom(p.cluster_id).then((z) => map.easeTo({ center: f.geometry.coordinates, zoom: z + 0.3 }));
        return;
      }
      if (id === 'cctv') return openCam(CCTV.cameras[p.i]);
      if (id === 'trains') return showTrainCard(p);
      if (id === 'buses' || id === 'buses-label') return showBusCard(p);
      if (id === 'stations') return showStation(p.name);
      if (id === 'stops') return showStop(p.i);
    }
    hideCard();
  });

  addFriends();
  applyLayers();
}

/* ============ teman maskot di peta ============ */
const FRIEND_SPOTS = [
  { kind: 'awan', at: [106.8272, -6.1754], name: 'Awan di Monas', say: 'Halo! Aku Awan. Dari Monas, naik BRT koridor 1 ke Blok M atau Kota. Busnya datang tiap ~6 menit.' },
  { kind: 'bintang', at: [106.8017, -6.2186], name: 'Bintang di GBK', say: 'Mau nonton di GBK? Turun di halte Senayan Bank DKI atau stasiun MRT Istora Mandiri. Biar nggak nyasar!' },
  { kind: 'batu', at: [106.8133, -6.1352], name: 'Batu di Kota Tua', say: 'Aku Batu, penjaga Kota Tua. KRL Lin Bogor & Lin Tanjung Priok berhenti di Stasiun Jakarta Kota.' },
  { kind: 'bulan', at: [106.8457, -6.1229], name: 'Bulan di Ancol', say: 'Malam-malam ke Ancol? Koridor 5 dari Kampung Melayu sampai Ancol. Cek CCTV dulu, siapa tahu macet.' },
  { kind: 'bunga', at: [106.8203, -6.3122], name: 'Bunga di Ragunan', say: 'Aku Bunga dari Ragunan! Koridor 6 (Ragunan - Galunggung) datang tiap ~3 menit.' },
];
const friendMarkers = [];
function addFriends() {
  for (const f of FRIEND_SPOTS) {
    const el = document.createElement('div');
    el.className = 'friend-marker';
    el.innerHTML = mascotImg(f.kind, 64, { look: [0, 0.4] });
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      showCard(`<div class="card-head">${mascotImg(f.kind, 52)}<div><b>${esc(f.name)}</b><small>Teman jalan Nyasarn't</small></div></div><div class="bubble">${esc(f.say)}</div>`);
    });
    friendMarkers.push(new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(f.at).addTo(map));
  }
}

function applyLayers() {
  const vis = (on) => (on ? 'visible' : 'none');
  const L = state.layers;
  for (const id of ['buses', 'buses-label', 'routes']) map.setLayoutProperty(id, 'visibility', vis(L.bus));
  for (const id of ['trains', 'rails', 'rails-casing', 'stations', 'stations-label']) map.setLayoutProperty(id, 'visibility', vis(L.kereta));
  for (const id of ['stops', 'stops-label']) map.setLayoutProperty(id, 'visibility', vis(L.halte));
  for (const id of ['cctv', 'cctv-cluster', 'cctv-count']) map.setLayoutProperty(id, 'visibility', vis(L.cctv));
  friendMarkers.forEach((m) => (m.getElement().style.display = L.teman ? '' : 'none'));
}

/* ============ detak simulasi ============ */
// Gerak mulus: posisi dihitung ulang tiap frame (hanya yang terlihat di layar),
// makin dekat zoom makin sering supaya bus & kereta meluncur, bukan melompat.
let lastBus = 0, lastTrain = 0;
function animate(ts) {
  requestAnimationFrame(animate);
  if (document.hidden || !map.getSource('buses')) return;
  const z = map.getZoom();
  const now = jakartaNow();
  const busEvery = z >= 13 ? 33 : z >= 11.5 ? 120 : 500;
  if (ts - lastTrain >= 33) {
    lastTrain = ts;
    trainFeats = trainsNow(TRAIN, now);
    map.getSource('trains').setData({ type: 'FeatureCollection', features: trainFeats });
  }
  if (ts - lastBus >= busEvery) {
    lastBus = ts;
    busFeats = busesNow(BUS, now);
    let shown = busFeats;
    if (z >= 11.5) {
      const b = map.getBounds().toArray(), pad = 0.01;
      shown = busFeats.filter(({ geometry: { coordinates: [x, y] } }) => x > b[0][0] - pad && x < b[1][0] + pad && y > b[0][1] - pad && y < b[1][1] + pad);
    }
    map.getSource('buses').setData({ type: 'FeatureCollection', features: shown });
  }
}

function tick() {
  const now = jakartaNow();
  if (!busFeats.length) busFeats = busesNow(BUS, now);
  if (!trainFeats.length) trainFeats = trainsNow(TRAIN, now);
  $('#clock').innerHTML = `<span class="dot"></span>${fmtClock(now.sec)} WIB · ${busFeats.length.toLocaleString('id')} bus · ${trainFeats.length} kereta`;
  // perbarui angka yang tampil tanpa render ulang
  document.querySelectorAll('[data-live]').forEach((el) => {
    const k = el.dataset.live;
    if (k === 'bus') el.textContent = busFeats.length.toLocaleString('id');
    if (k === 'train') el.textContent = trainFeats.length;
    if (k === 'arrivals') el.innerHTML = arrivalsHTML();
  });
  if (cardRefresh) cardRefresh();
}

/* ============ panel ============ */
document.getElementById('tabbar').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (b) setTab(b.dataset.tab);
});
function setTab(tab) {
  state.tab = tab;
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  if (tab !== 'rute') highlightRoute(null);
  render();
  view.scrollTop = 0;
  if (window.matchMedia('(max-width: 760px)').matches && sheetSize() < 0.4) setSheet(0.62);
}

function render() {
  if (!BUS) return;
  const fn = { peta: renderHome, rute: renderRoutes, halte: renderStops, cctv: renderCams, lainnya: renderMore }[state.tab];
  view.innerHTML = fn();
  view.classList.remove('enter');
  void view.offsetWidth; // mulai ulang animasi masuk
  view.classList.add('enter');
  bind();
}

function header() {
  return `<div class="top">
    <div class="brand"><div class="brand-logo">${mascotImg('bintang', 40, { shadow: false, look: [0, 0.2] })}</div>
      <h1>Nyasarn't</h1><span class="badge">Simulasi</span></div>
    <button class="icon-btn" data-act="focus-search" title="Cari" aria-label="Cari">${I.search}</button>
    <button class="icon-btn" data-tab-go="lainnya" title="Tentang" aria-label="Tentang Nyasarn't">${I.info}</button>
  </div>
  <div class="tagline">Biar nggak nyasar di Jakarta.</div>`;
}

function searchBox(ph = 'Cari halte, stasiun, rute, atau CCTV', value = '') {
  return `<div class="search">${I.search}<input id="q" type="search" placeholder="${ph}" value="${esc(value)}" autocomplete="off"><div class="results" id="results"></div></div>`;
}
// pesan "tidak ketemu" (disembunyikan sampai dibutuhkan)
function notFound(id, text) {
  return `<div class="empty" id="${id}" hidden>${mascotImg('batu', 70, { look: [0, 0.3] })}${esc(text)}</div>`;
}
function filterRoutes(q) {
  let shown = 0;
  view.querySelectorAll('.rgroup').forEach((g) => {
    let n = 0;
    g.querySelectorAll('.row').forEach((r) => { const ok = !q || r.textContent.toLowerCase().includes(q); r.style.display = ok ? '' : 'none'; n += ok; });
    g.style.display = n ? '' : 'none';
    shown += n;
  });
  const e = $('#route-empty'); if (e) e.hidden = shown > 0;
}

function renderHome() {
  const brt = BUS.routes.filter((r) => r.kind === 'brt' && /^\d+$/.test(r.short)).sort((a, b) => a.short - b.short);
  const corridors = brt.map((r, i) => `
    <button class="cor" data-route="${esc(r.id)}">
      <div class="art" style="background:linear-gradient(160deg, ${r.color}22, ${r.color}55)">
        <span class="route-badge" style="background:${r.color};color:${r.text}">${esc(r.short)}</span>
        ${mascotImg(FRIENDS[i % 5], 96, { look: [i % 2 ? -0.3 : 0.3, 0.1] })}
      </div>
      <div class="meta"><small>Koridor ${esc(r.short)} · tiap ~${r.headway || '?'} mnt</small><b>${esc(r.long)}</b></div>
    </button>`).join('');
  return `${header()}${searchBox()}
    <div class="stats">
      <div class="stat"><div class="stat-label"><i>${I.bus}</i>Bus jalan</div>
        <div class="stat-row"><div class="stat-val"><span data-live="bus">${busFeats.length.toLocaleString('id')}</span><small>unit</small></div></div></div>
      <div class="stat"><div class="stat-label"><i>${I.train}</i>Kereta jalan</div>
        <div class="stat-row"><div class="stat-val"><span data-live="train">${trainFeats.length}</span><small>rangkaian</small></div></div></div>
    </div>
    <div data-live-weather>${weatherCardHTML()}</div>
    <div class="hero">
      <div class="gang">${mascotImg('batu', 70, { look: [0.5, 0] })}${mascotImg('awan', 128, { look: [0, 0.35] })}${mascotImg('bunga', 76, { look: [-0.5, 0] })}</div>
      <h2>Mau ke mana hari ini? <br>Kami temani, biar nggak nyasar.</h2>
      <button class="pill-btn" data-act="nearby">Cari halte terdekat</button>
    </div>
    <div class="sec-title"><h3>Mau naik apa?</h3></div>
    <div class="tiles">
      <button class="tile awan" data-act="focus-bus">${icon('bus', 68)}<b>Bus</b><span><span data-live="bus">${busFeats.length.toLocaleString('id')}</span> · simulasi</span></button>
      <button class="tile bintang" data-act="focus-train">${icon('train', 68)}<b>Kereta</b><span>KRL, MRT, LRT</span></button>
      <button class="tile bulan" data-tab-go="cctv">${icon('cctv', 68)}<b>CCTV</b><span><span class="dot"></span>${CCTV.cameras.length} kamera</span></button>
    </div>
    <div class="minis">
      <button class="mini" data-act="nearby"><span class="ic">${icon('halte', 52)}</span>Halte dekat</button>
      <button class="mini" data-tab-go="rute"><span class="ic">${icon('route', 52)}</span>Semua rute</button>
      <a class="mini" href="https://pantaubanjir.jakarta.go.id/" target="_blank" rel="noopener"><span class="ic">${icon('banjir', 52)}</span>Banjir</a>
      <button class="mini" data-tab-go="lainnya"><span class="ic">${icon('more', 52)}</span>Lainnya</button>
    </div>
    <div class="sec-title"><h3>Untukmu</h3></div>
    <div class="foryou">
      <div class="foryou-head">${icon('train', 50)}<div><b>Kereta berikutnya</b> <span class="badge new">Baru</span>
        <p>dari <select class="station" id="station">${TRAIN.stations.map((s) => s.name).sort().map((n) => `<option ${n === state.station ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></p></div></div>
      <div class="arrivals" data-live="arrivals">${arrivalsHTML()}</div>
      <div class="foot-note"><span>Menurut perkiraan jadwal</span><button data-act="show-station" style="color:var(--accent-ink);font-weight:600">Lihat di peta</button></div>
    </div>
    <div class="sec-title"><h3>Koridor BRT</h3><button data-tab-go="rute">Semua</button></div>
    <div class="hscroll">${corridors}</div>
    <div class="about">Posisi bus &amp; kereta di Nyasarn't adalah <b>simulasi dari jadwal resmi</b>, bukan GPS asli, jadi bisa meleset. Tidak berafiliasi dengan TransJakarta, KAI, MRT, atau LRT.</div>`;
}

function arrivalsHTML() {
  const list = nextTrains(TRAIN, state.station, jakartaNow(), 4);
  if (!list.length) return `<div class="empty">Belum ada kereta lewat lagi. Layanan mulai 05.00.</div>`;
  return list.map((a) => `<div class="arr"><span class="line-badge" style="border-color:${a.color};color:${a.color}">${esc(a.line)}</span>
    <span class="dest">${esc(a.dest)}<small>${a.mode}</small></span><span class="time">${fmtClock(a.at)}</span>
    <span class="wait ${a.wait < 300 ? 'soon' : ''}">${waitText(a.wait)}</span></div>`).join('');
}

/* ---------- Rute ---------- */
function renderRoutes() {
  if (state.selectedRoute) return renderRouteDetail(state.selectedRoute);
  const kinds = ['semua', 'brt', 'integrasi', 'mikrotrans', 'transjabodetabek', 'royaltrans', 'rusun', 'wisata', 'kereta'];
  const chip = (k) => `<button class="chip ${state.routeKind === k ? 'on' : ''}" data-kind="${k}">${k === 'semua' ? 'Semua' : k === 'kereta' ? 'Kereta' : KIND_LABEL[k]}</button>`;
  let rows = '';
  if (state.routeKind === 'semua' || state.routeKind === 'kereta') {
    rows += `<div class="rgroup"><div class="group-title">Kereta · ${TRAIN.lines.length} jalur</div>` + TRAIN.lines.map((l) => `
      <button class="row" data-line="${l.id}"><span class="line-badge" style="border-color:${l.color};color:${l.color}">${l.id}</span>
      <span class="txt"><b>${esc(l.name)}</b><small>${l.mode} · ${l.stops.length} stasiun · ${(l.length / 1000).toFixed(0)} km</small></span><span class="side">tiap ~${l.headwayPeak && l.headwayPeak !== l.headway ? `${l.headwayPeak}–${l.headway}` : l.headway} mnt</span></button>`).join('') + '</div>';
  }
  if (state.routeKind !== 'kereta') {
    const groups = {};
    for (const r of BUS.routes) if (state.routeKind === 'semua' || r.kind === state.routeKind) (groups[r.kind] ||= []).push(r);
    for (const k of Object.keys(KIND_LABEL)) {
      const list = groups[k];
      if (!list) continue;
      list.sort((a, b) => a.short.localeCompare(b.short, 'id', { numeric: true }));
      rows += `<div class="rgroup"><div class="group-title">${KIND_LABEL[k]} · ${list.length} rute</div>` + list.map((r) => `
        <button class="row" data-route="${esc(r.id)}"><span class="route-badge" style="background:${r.color};color:${r.text}">${esc(r.short)}</span>
        <span class="txt"><b>${esc(r.long)}</b><small>${KIND_LABEL[r.kind]}${r.headway ? ` · tiap ~${r.headway} mnt` : ''}</small></span></button>`).join('') + '</div>';
    }
  }
  return `<h2 class="page-title">Rute</h2>${searchBox('Cari nomor atau nama rute', state.routeQuery)}<div class="chips">${kinds.map(chip).join('')}</div>
    <div class="list">${rows}</div>${notFound('route-empty', 'Rute itu belum ketemu. Coba nomor lain, misalnya 1, 9D, atau JAK.48A.')}`;
}

function renderRouteDetail(id) {
  const r = BUS.routeById[id];
  const t = r.trips.reduce((a, b) => (b.stops.length > a.stops.length ? b : a));
  const active = busFeats.filter((f) => f.properties.route === id).length;
  const stops = t.stops.map(([si, off]) => `<button class="row" data-stop="${si}"><span class="txt"><b>${esc(BUS.stops[si].name)}</b><small>+${Math.round(off / 60)} mnt dari awal</small></span></button>`).join('');
  return `<button class="back" data-act="back-routes">${I.back} Semua rute</button>
    <div class="route-head" style="background:linear-gradient(140deg, ${r.color}, ${r.color}cc);color:${r.text}">
      <span class="route-badge" style="background:#fff;color:${r.color}">${esc(r.short)}</span>
      <h2>${esc(r.long)}</h2><p>${KIND_LABEL[r.kind]} · ${r.headway ? `tiap ~${r.headway} mnt · ` : ''}<span data-live-route>${active}</span> bus jalan</p>
      ${mascotImg(friendFor(r.id), 104, { look: [-0.4, 0.1] })}
    </div>
    <div class="group-title">${esc(t.head || 'Halte')} · ${t.stops.length} halte</div>
    <div class="list timeline" style="--c:${r.color}">${stops}</div>`;
}

/* ---------- Halte ---------- */
function stopList(filterText) {
  const q = (filterText || '').toLowerCase();
  const seen = new Set();
  let base = BUS.stops.map((s, i) => ({ s, i }));
  if (state.userLoc) base.forEach((x) => (x.d = dist(state.userLoc, [x.s.lon, x.s.lat])));
  if (q) base = base.filter((x) => x.s.name.toLowerCase().includes(q));
  if (state.userLoc) base.sort((a, b) => a.d - b.d);
  else base.sort((a, b) => b.s.routes.length - a.s.routes.length);
  return base.filter((x) => (seen.has(x.s.name) ? false : seen.add(x.s.name))).slice(0, 60);
}
function stopRow({ s, i, d }) {
  const routes = stopGroup(BUS, i).routes;
  return `<button class="row" data-stop="${i}">${icon('halte', 40)}
    <span class="txt"><b>${esc(s.name)}</b><small>${routes.slice(0, 8).map(esc).join(' · ')}${routes.length > 8 ? ' …' : ''}</small></span>
    <span class="side">${d != null ? (d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(1)} km`) : `${routes.length} rute`}</span></button>`;
}
function renderStops() {
  return `<h2 class="page-title">Halte</h2>${searchBox('Cari nama halte')}
    <button class="pill-btn dark" data-act="nearby" style="margin-bottom:14px">${state.userLoc ? 'Perbarui lokasiku' : 'Tampilkan halte terdekat'}</button>
    <div class="group-title">${state.userLoc ? 'Terdekat darimu' : 'Halte tersibuk'}</div>
    <div class="list" id="stopList">${stopList().map(stopRow).join('')}</div>`;
}

/* ---------- CCTV ---------- */
function renderCams() {
  const groups = {};
  CCTV.cameras.forEach((c, i) => (groups[c.name] ||= []).push(i));
  const rows = Object.entries(groups).map(([name, ids]) => `
    <button class="row" data-cam="${ids[0]}">${icon('cctv', 40)}
      <span class="txt"><b>${esc(name)}</b><small>${ids.length} kamera · CCTV Publik Pemprov DKI</small></span><span class="side"><span class="dot"></span>live</span></button>`).join('');
  return `<h2 class="page-title">CCTV Live</h2>
    <div class="hero" style="padding-top:14px">${mascotImg('bulan', 110, { look: [0.4, 0.2] })}
      <h2 style="font-size:19px;margin-top:6px">${CCTV.cameras.length} kamera lalu lintas,<br>tonton langsung tanpa pindah halaman</h2></div>
    <div class="list">${rows}</div>
    <p class="about" style="margin-top:12px">Video langsung dari server <a href="https://jakcctv.jakarta.go.id/publik" target="_blank" rel="noopener">CCTV Publik Pemprov DKI Jakarta</a>; Nyasarn't tidak menyimpan rekaman. Lokasi di peta adalah perkiraan dari nama kamera.</p>`;
}

/* ---------- Lainnya ---------- */
function renderMore() {
  const t = (key, kind, label, sub) => `<div class="toggle-row">${kind === 'teman' ? mascotImg('bunga', 40, { shadow: false }) : icon(kind, 40)}<span class="txt"><b style="display:block;font-size:15px">${label}</b><small style="color:var(--ink-3)">${sub}</small></span><button class="switch ${state.layers[key] ? 'on' : ''}" data-layer="${key}" role="switch" aria-checked="${!!state.layers[key]}" aria-label="Tampilkan ${label} di peta"></button></div>`;
  return `<h2 class="page-title">Lainnya</h2>
    <div class="group-title">Tampilkan di peta</div>
    ${t('bus', 'bus', 'Bus', `${BUS.routes.length} rute TransJakarta`)}
    ${t('kereta', 'train', 'Kereta', 'KRL, MRT, LRT')}
    ${t('halte', 'halte', 'Halte', `${BUS.stops.length.toLocaleString('id')} titik halte`)}
    ${t('cctv', 'cctv', 'CCTV', `${CCTV.cameras.length} kamera`)}
    ${t('teman', 'teman', 'Teman maskot', 'Awan, Bintang, Batu, Bulan, Bunga')}
    ${Object.keys(camFixes()).length ? `<div class="group-title">Koreksi lokasi CCTV</div>
      <div class="about">Kamu sudah membetulkan ${Object.keys(camFixes()).length} lokasi kamera. Kirim hasilnya supaya dipasang untuk semua pengguna.
      <button class="pill-btn" style="margin-top:10px" data-act="export-fixes">Unduh koreksi (cctv_overrides.json)</button></div>` : ''}
    <div class="group-title">Tentang Nyasarn't</div>
    <div class="about"><b>Nyasarn't</b> berasal dari "tidak nyasar". Peta ini membantu kamu melihat bus, kereta, dan kondisi jalan di Jakarta.<br><br>
      <b>Sumber data</b><br>
      · Rute, halte &amp; jadwal bus: <a href="https://gtfs.transjakarta.co.id/" target="_blank" rel="noopener">GTFS resmi TransJakarta</a><br>
      · Jalur &amp; stasiun kereta: © kontributor OpenStreetMap (ODbL)<br>
      · Peta dasar: OpenFreeMap, © OpenStreetMap<br>
      · CCTV: CCTV Publik Pemprov DKI Jakarta<br><br>
      Posisi kendaraan adalah <b>simulasi</b> dari jadwal dan selang waktu, bukan posisi asli. Tidak berafiliasi dengan TransJakarta, KAI Commuter, MRT Jakarta, LRT Jakarta, maupun LRT Jabodebek.</div>`;
}

/* ============ event panel ============ */
function bind() {
  view.querySelectorAll('[data-tab-go]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tabGo)));
  view.querySelectorAll('[data-route]').forEach((b) => b.addEventListener('click', () => openRoute(b.dataset.route)));
  view.querySelectorAll('[data-line]').forEach((b) => b.addEventListener('click', () => openLine(b.dataset.line)));
  view.querySelectorAll('[data-stop]').forEach((b) => b.addEventListener('click', () => showStop(+b.dataset.stop, true)));
  view.querySelectorAll('[data-cam]').forEach((b) => b.addEventListener('click', () => openCam(CCTV.cameras[+b.dataset.cam], true)));
  view.querySelectorAll('[data-kind]').forEach((b) => b.addEventListener('click', () => { state.routeKind = b.dataset.kind; render(); }));
  if (state.tab === 'rute' && !state.selectedRoute && state.routeQuery) filterRoutes(state.routeQuery.trim().toLowerCase());
  view.querySelectorAll('[data-layer]').forEach((b) => b.addEventListener('click', () => {
    state.layers[b.dataset.layer] = !state.layers[b.dataset.layer]; b.classList.toggle('on'); b.setAttribute('aria-checked', state.layers[b.dataset.layer]); applyLayers();
  }));
  view.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => act(b.dataset.act)));
  const st = $('#station', view);
  if (st) st.addEventListener('change', () => { state.station = st.value; localStorage.setItem('nyasarnt.station', st.value); $('[data-live="arrivals"]').innerHTML = arrivalsHTML(); });
  const q = $('#q', view);
  if (q) q.addEventListener('input', () => onSearch(q.value));
}

function act(a) {
  if (a === 'focus-search') $('#q')?.focus();
  if (a === 'nearby') locate(true);
  if (a === 'focus-bus') { state.layers.bus = true; applyLayers(); map.flyTo({ center: [106.8229, -6.2003], zoom: 12.5 }); }
  if (a === 'focus-train') { state.layers.kereta = true; applyLayers(); state.routeKind = 'kereta'; setTab('rute'); map.flyTo({ center: [106.83, -6.25], zoom: 10.6 }); }
  if (a === 'show-station') showStation(state.station);
  if (a === 'export-fixes') exportCamFixes();
  if (a === 'back-routes') { state.selectedRoute = null; highlightRoute(null); render(); }
}

function onSearch(text) {
  const q = text.trim().toLowerCase();
  if (state.tab === 'halte') {
    const list = stopList(q);
    $('#stopList').innerHTML = list.length ? list.map(stopRow).join('')
      : `<div class="empty">${mascotImg('batu', 70, { look: [0, 0.3] })}Halte "${esc(text.trim())}" belum ketemu. Coba nama lain, misalnya "Senayan" atau "Blok M".</div>`;
    bind(); return;
  }
  const box = $('#results');
  if (state.tab === 'rute') { state.routeQuery = text; filterRoutes(q); return; }
  if (q.length < 2) { box.innerHTML = ''; return; }
  const out = [];
  for (const r of BUS.routes) if (r.short.toLowerCase() === q || r.long.toLowerCase().includes(q)) out.push(`<button class="row" data-route="${esc(r.id)}"><span class="route-badge" style="background:${r.color};color:${r.text}">${esc(r.short)}</span><span class="txt"><b>${esc(r.long)}</b><small>Rute ${KIND_LABEL[r.kind]}</small></span></button>`);
  for (const s of TRAIN.stations) if (s.name.toLowerCase().includes(q)) out.push(`<button class="row" data-station="${esc(s.name)}">${icon('train', 36)}<span class="txt"><b>${esc(s.name)}</b><small>Stasiun · ${s.lines.join(', ')}</small></span></button>`);
  stopList(q).slice(0, 8).forEach((x) => out.push(stopRow(x)));
  CCTV.cameras.forEach((c, i) => { if (c.name.toLowerCase().includes(q) && !out.some((o) => o.includes(`>${esc(c.name)}<`))) out.push(`<button class="row" data-cam="${i}">${icon('cctv', 36)}<span class="txt"><b>${esc(c.name)}</b><small>CCTV</small></span></button>`); });
  box.innerHTML = out.slice(0, 24).join('') || `<div class="empty">${mascotImg('batu', 70)}Hmm, belum ketemu. Coba kata lain.</div>`;
  bind();
  box.querySelectorAll('[data-station]').forEach((b) => b.addEventListener('click', () => showStation(b.dataset.station)));
}

/* ============ aksi peta ============ */
function fitCoords(coords, pad = 60) {
  const b = coords.reduce((bb, c) => bb.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
  const mobile = window.matchMedia('(max-width: 760px)').matches;
  map.fitBounds(b, { padding: mobile ? { top: 70, left: 30, right: 30, bottom: window.innerHeight * sheetSize() + 30 } : pad, maxZoom: 15 });
}

function highlightRoute(id) {
  if (!map.getLayer('route-hl')) return;
  map.setFilter('route-hl', ['==', 'id', id || '']);
  map.setFilter('route-hl-casing', ['==', 'id', id || '']);
  map.setFilter('buses', id ? ['==', ['get', 'route'], id] : null);
  map.setFilter('buses-label', id ? ['==', ['get', 'route'], id] : null);
}

function openRoute(id) {
  state.selectedRoute = id;
  if (state.tab !== 'rute') { state.tab = 'rute'; document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.tab === 'rute')); }
  render(); view.scrollTop = 0;
  highlightRoute(id);
  const r = BUS.routeById[id];
  const t = r.trips.reduce((a, b) => (b.stops.length > a.stops.length ? b : a));
  fitCoords(BUS.shapes[t.shape]);
  hideCard();
}

function openLine(id) {
  const l = TRAIN.lineById[id];
  fitCoords(l.coords);
  showCard(`<div class="card-head">${icon('train', 48)}<div><b>${esc(l.name)}</b><small>${l.mode} · tiap ~${l.headwayPeak && l.headwayPeak !== l.headway ? `${l.headwayPeak}–${l.headway}` : l.headway} mnt · ${l.stops.length} stasiun</small></div></div>
    <div class="list" style="max-height:220px;overflow:auto">${l.stops.map((s) => `<button class="row" data-st="${esc(s.name)}"><span class="line-badge" style="border-color:${l.color};color:${l.color}">${l.id}</span><span class="txt"><b>${esc(s.name)}</b></span></button>`).join('')}</div>`);
  $('#card').querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => showStation(b.dataset.st.split(' (')[0])));
}

function showStop(i, fly) {
  const s = BUS.stops[i];
  if (fly) map.flyTo({ center: [s.lon, s.lat], zoom: Math.max(map.getZoom(), 16) });
  const group = stopGroup(BUS, i);
  const draw = () => {
    const list = nextBuses(BUS, group.idx, jakartaNow(), 6);
    return list.length ? list.map((a) => `<div class="arr"><span class="route-badge" style="background:${a.color};color:${a.text}">${esc(a.short)}</span><span class="dest">${esc(a.head)}</span><span class="wait ${a.wait < 300 ? 'soon' : ''}">${waitText(a.wait)}</span></div>`).join('') : '<div class="empty">Belum ada bus terjadwal sebentar lagi.</div>';
  };
  showCard(`<div class="card-head">${icon('halte', 48)}<div><b>${esc(s.name)}</b><small>Halte · ${group.routes.length} rute${group.idx.length > 1 ? ` · ${group.idx.length} peron` : ''}</small></div></div>
    <div class="arrivals" id="stopArr">${draw()}</div><div class="foot-note"><span>Perkiraan dari jadwal</span></div>`,
  () => { const el = $('#stopArr'); if (el) el.innerHTML = draw(); });
}

function showStation(name) {
  const st = TRAIN.stations.find((s) => s.name === name);
  if (!st) return;
  state.station = name;
  map.flyTo({ center: [st.lon, st.lat], zoom: Math.max(map.getZoom(), 14) });
  const draw = () => nextTrains(TRAIN, name, jakartaNow(), 5).map((a) => `<div class="arr"><span class="line-badge" style="border-color:${a.color};color:${a.color}">${esc(a.line)}</span><span class="dest">${esc(a.dest)}</span><span class="time">${fmtClock(a.at)}</span><span class="wait ${a.wait < 300 ? 'soon' : ''}">${waitText(a.wait)}</span></div>`).join('') || '<div class="empty">Layanan mulai 05.00.</div>';
  showCard(`<div class="card-head">${icon('train', 48)}<div><b>Stasiun ${esc(name)}</b><small>${st.lines.map((l) => TRAIN.lineById[l]?.mode + ' ' + l).join(' · ')}</small></div></div>
    <div class="arrivals" id="stArr">${draw()}</div><div class="foot-note"><span>Perkiraan dari selang jadwal</span></div>`,
  () => { const el = $('#stArr'); if (el) el.innerHTML = draw(); });
}

function showBusCard(p) {
  const r = BUS.routeById[p.route];
  showCard(`<div class="card-head">${icon('bus', 48)}<div><b><span class="route-badge" style="background:${p.color};color:${p.text};margin-right:6px">${esc(p.short)}</span>${esc(r.long)}</b><small>Menuju ${esc(p.head)}</small></div></div>
    <div class="bubble">Halte berikutnya: <b>${esc(p.next)}</b></div>
    <button class="pill-btn" style="margin-top:10px" data-open-route="${esc(p.route)}">Lihat rute ${esc(p.short)}</button>`);
  $('#card [data-open-route]').addEventListener('click', () => openRoute(p.route));
}

function trainStatus(p) {
  return p.at ? `🚉 Sedang berhenti di <b>Stasiun ${esc(p.at)}</b>` : `➡️ Menuju <b>Stasiun ${esc(p.next)}</b>`;
}
function showTrainCard(p) {
  showCard(`<div class="card-head">${icon('train', 48)}<div><b><span class="line-badge" style="border-color:${p.color};color:${p.color};margin-right:6px">${esc(p.line)}</span>${esc(p.name)}</b><small>${esc(p.mode)} · menuju ${esc(p.dest)}</small></div></div>
    <div class="bubble" id="trainStatus">${trainStatus(p)}</div>
    <div class="foot-note"><span>Simulasi dari perkiraan jadwal, bukan GPS. Cek papan info di stasiun ya!</span></div>`,
  () => { const f = trainFeats.find((x) => x.properties.id === p.id); const el = $('#trainStatus'); if (f && el) el.innerHTML = trainStatus(f.properties); });
}

let cardRefresh = null;
function showCard(html, refresh) {
  const card = $('#card');
  card.innerHTML = `<button class="icon-btn x" title="Tutup" aria-label="Tutup kartu">✕</button>${html}`;
  card.hidden = false;
  // di HP: turunkan panel bawah supaya kartu muat di layar
  if (window.matchMedia('(max-width: 760px)').matches && sheetSize() > 0.5) setSheet(0.46);
  card.querySelector('.x').addEventListener('click', hideCard);
  cardRefresh = refresh || null;
}
function hideCard() { $('#card').hidden = true; cardRefresh = null; }

function openCam(c, fly) {
  if (fly) map.flyTo({ center: [c.lon, c.lat], zoom: Math.max(map.getZoom(), 15) });
  $('#modalTitle').innerHTML = `<b>${esc(c.name)}</b><small>${esc(c.detail)}</small>`;
  $('#modalBody').innerHTML = `<iframe src="${esc(c.embed)}" allow="autoplay; fullscreen" allowfullscreen referrerpolicy="no-referrer"></iframe>`;
  const box = $('#modal .modal-box');
  box.querySelector('.modal-foot')?.remove();
  const conf = CONF_LABEL[c.confidence] || CONF_LABEL.perkiraan;
  box.insertAdjacentHTML('beforeend', `<div class="modal-foot">
    <div class="cam-loc"><span class="conf ${conf.cls}">${conf.text}</span><button class="fix-btn" data-fix>Lokasi kurang pas? Geser pin</button></div>
    Langsung dari CCTV Publik Pemprov DKI Jakarta. Kalau gelap, kameranya mungkin sedang offline.</div>`);
  box.querySelector('[data-fix]').addEventListener('click', () => fixCam(c));
  $('#modal').hidden = false;
}
function closeCam() { $('#modal').hidden = true; $('#modalBody').innerHTML = ''; }
$('#modalClose').addEventListener('click', closeCam);
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeCam(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeCam(); hideCard(); } });

/* ============ lokasi ============ */
let meMarker;
function locate(showList) {
  if (!navigator.geolocation) return alert('Browser ini tidak bisa membaca lokasi.');
  navigator.geolocation.getCurrentPosition((pos) => {
    state.userLoc = [pos.coords.longitude, pos.coords.latitude];
    const el = document.createElement('div');
    el.className = 'me-dot';
    meMarker?.remove();
    meMarker = new maplibregl.Marker({ element: el }).setLngLat(state.userLoc).addTo(map);
    map.flyTo({ center: state.userLoc, zoom: 16 });
    if (showList) setTab('halte');
  }, () => alert('Lokasi tidak diizinkan. Kamu tetap bisa cari halte lewat kolom pencarian.'), { enableHighAccuracy: true, timeout: 10000 });
}

/* ============ tombol peta ============ */
$('#btnZoomIn').addEventListener('click', () => map.zoomIn());
$('#btnZoomOut').addEventListener('click', () => map.zoomOut());
$('#btnLocate').addEventListener('click', () => locate(false));
$('#btn3d').addEventListener('click', (e) => {
  state.threeD = !state.threeD;
  e.currentTarget.classList.toggle('on', state.threeD);
  e.currentTarget.setAttribute('aria-pressed', state.threeD);
  map.easeTo({ pitch: state.threeD ? 55 : 0, bearing: state.threeD ? -15 : 0, duration: 800 });
});

/* ============ bottom sheet (HP) ============ */
const panel = $('#panel');
function sheetSize() { return parseFloat(getComputedStyle(panel).height) / window.innerHeight; }
function setSheet(f) { document.documentElement.style.setProperty('--sheet-h', `${Math.round(f * 100)}vh`); }
(() => {
  const g = $('#grabber');
  let y0, h0;
  g.addEventListener('pointerdown', (e) => { y0 = e.clientY; h0 = sheetSize(); panel.classList.add('dragging'); g.setPointerCapture(e.pointerId); });
  g.addEventListener('pointermove', (e) => { if (y0 == null) return; setSheet(Math.min(0.92, Math.max(0.14, h0 + (y0 - e.clientY) / window.innerHeight))); });
  g.addEventListener('pointerup', (e) => {
    panel.classList.remove('dragging');
    if (y0 == null) return;
    const moved = Math.abs(e.clientY - y0) > 5;
    const f = sheetSize();
    const snaps = [0.16, 0.46, 0.9];
    setSheet(moved ? snaps.reduce((a, b) => (Math.abs(b - f) < Math.abs(a - f) ? b : a)) : f < 0.5 ? 0.9 : 0.16);
    y0 = null;
  });
})();


/* ============ cuaca (BMKG) ============ */
const WX = { data: null, area: null, error: false };

async function initWeather() {
  try { await loadAreas(); } catch { return; }
  let timer;
  const update = async () => {
    const area = nearestArea(state.userLoc || map.getCenter().toArray());
    if (!area || (WX.area && WX.area.adm4 === area.adm4 && WX.data)) return;
    WX.area = area;
    await fetchWeather(area);
  };
  // coba ulang bertahap bila BMKG gagal (15 dtk, 1 mnt, 3 mnt)
  let retry = null;
  const fetchWeather = async (area, attempt = 0) => {
    clearTimeout(retry);
    try { WX.data = await forecast(area); WX.error = false; } catch { WX.error = true; }
    paintWeather();
    if ((WX.error || WX.data?.stale) && attempt < 3 && WX.area === area) {
      retry = setTimeout(() => fetchWeather(area, attempt + 1), [15, 60, 180][attempt] * 1000);
    }
  };
  map.on('moveend', () => { clearTimeout(timer); timer = setTimeout(update, 700); });
  update();
  setInterval(() => { if (WX.area) forecast(WX.area).then((d) => { WX.data = d; paintWeather(); }).catch(() => {}); }, 30 * 60 * 1000);
}

function paintWeather() {
  const chip = $('#wx');
  if (WX.data) {
    const now = upcoming(WX.data, 1)[0];
    chip.innerHTML = `${icon(iconFor(now.code), 26)}<b>${now.t}°</b><span>${esc(now.desc)} · ${esc(WX.area.kecamatan)}</span>`;
    chip.hidden = false;
  } else chip.hidden = true;
  document.querySelectorAll('[data-live-weather]').forEach((el) => (el.innerHTML = weatherCardHTML()));
  const open = $('#card [data-wx-card]');
  if (open) open.outerHTML = weatherDetailHTML();
}

function hourlyHTML(slots) {
  return `<div class="wx-hours">${slots.map((s, i) => `<div class="wx-h ${i === 0 ? 'now' : ''}">
    <small>${i === 0 ? 'Kini' : s.local}</small>${icon(iconFor(s.code), 34)}<b>${s.t}°</b></div>`).join('')}</div>`;
}

function weatherCardHTML() {
  if (!WX.data) {
    return WX.error ? '' : `<div class="wx-card wx-loading">${icon('berawan', 44)}<span>Memuat prakiraan cuaca BMKG…</span></div>`;
  }
  const slots = upcoming(WX.data, 8);
  const now = slots[0];
  const note = rainNote(WX.data);
  return `<button class="wx-card ${note.rain ? 'rainy' : ''}" data-wx-open>
    <div class="wx-top">${icon(iconFor(now.code), 64)}
      <div class="wx-now"><b>${now.t}°</b><span>${esc(now.desc)}</span><small>${esc(WX.area.kecamatan)} · lembap ${now.hu}%</small></div></div>
    <div class="wx-note">${esc(note.text)}</div>
    ${hourlyHTML(slots.slice(0, 6))}
    <div class="foot-note"><span>Prakiraan BMKG${WX.data.stale ? ` · data ${Math.max(1, Math.round((Date.now() - WX.data.savedAt) / 60000))} mnt lalu` : ''}</span><span>tiap 3 jam</span></div>
  </button>`;
}

function weatherDetailHTML() {
  if (!WX.data) return '<div data-wx-card></div>';
  const days = {};
  for (const s of upcoming(WX.data, 24)) (days[s.day] ||= []).push(s);
  const label = (d, i) => (i === 0 ? 'Hari ini' : i === 1 ? 'Besok' : new Date(d).toLocaleDateString('id', { weekday: 'long' }));
  return `<div data-wx-card>
    <div class="card-head">${icon(iconFor(upcoming(WX.data, 1)[0].code), 52)}<div><b>Cuaca ${esc(WX.area.kecamatan)}</b><small>${esc(WX.area.kota)} · sumber BMKG</small></div></div>
    <div class="bubble">${esc(rainNote(WX.data).text)}</div>
    ${Object.entries(days).map(([d, sl], i) => `<div class="group-title" style="margin:12px 4px 6px">${label(d, i)}</div>${hourlyHTML(sl)}`).join('')}
  </div>`;
}

function openWeather() { if (WX.data) showCard(weatherDetailHTML()); }
document.getElementById('wx').addEventListener('click', openWeather);
view.addEventListener('click', (e) => { if (e.target.closest('[data-wx-open]')) openWeather(); });


/* ============ koreksi lokasi CCTV (geser pin) ============ */
const CONF_LABEL = {
  tepat: { cls: 'ok', text: '📍 Lokasi tepat' },
  ruas: { cls: 'mid', text: '📍 Jalannya benar, titik di sepanjang jalan diperkirakan' },
  perkiraan: { cls: 'low', text: '📍 Lokasi perkiraan area' },
};
const FIX_KEY = 'nyasarnt.cctvfix';
const camFixes = () => JSON.parse(localStorage.getItem(FIX_KEY) || '{}');

function applyCamFixes() {
  const fx = camFixes(), seen = {};
  for (const c of CCTV.cameras) {
    if (!fx[c.sid]) continue;
    const n = (seen[c.sid] = (seen[c.sid] ?? -1) + 1);
    c.lat = fx[c.sid][0] + n * 0.00005; c.lon = fx[c.sid][1] + n * 0.00005; c.confidence = 'tepat';
  }
}
function cctvGeo() {
  return { type: 'FeatureCollection', features: CCTV.cameras.map((c, i) => ({ type: 'Feature', properties: { i }, geometry: { type: 'Point', coordinates: [c.lon, c.lat] } })) };
}

let fixMarker = null;
function fixCam(c) {
  closeCam();
  fixMarker?.remove();
  map.flyTo({ center: [c.lon, c.lat], zoom: Math.max(map.getZoom(), 17.5) });
  const el = document.createElement('div');
  el.className = 'fix-pin';
  el.innerHTML = `${icon('cctv', 54)}<span>Geser aku</span>`;
  fixMarker = new maplibregl.Marker({ element: el, draggable: true, anchor: 'bottom' }).setLngLat([c.lon, c.lat]).addTo(map);
  showCard(`<div class="card-head">${icon('cctv', 48)}<div><b>Betulkan lokasi: ${esc(c.name)}</b><small>${esc(c.detail)}</small></div></div>
    <div class="bubble">Geser pin kamera ke posisi tiang CCTV yang sebenarnya (lihat videonya sebagai patokan), lalu ketuk <b>Simpan</b>.</div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="pill-btn" data-fix-cancel>Batal</button><button class="pill-btn dark" data-fix-save>Simpan</button></div>`);
  const card = $('#card');
  card.querySelector('[data-fix-cancel]').addEventListener('click', () => { fixMarker.remove(); fixMarker = null; hideCard(); });
  card.querySelector('[data-fix-save]').addEventListener('click', () => {
    const { lng, lat } = fixMarker.getLngLat();
    const fx = camFixes();
    fx[c.sid] = [+lat.toFixed(6), +lng.toFixed(6)];
    localStorage.setItem(FIX_KEY, JSON.stringify(fx));
    applyCamFixes();
    map.getSource('cctv').setData(cctvGeo());
    fixMarker.remove(); fixMarker = null;
    showCard(`<div class="card-head">${icon('cctv', 48)}<div><b>Tersimpan, makasih!</b><small>${esc(c.name)}</small></div></div>
      <div class="bubble">Lokasi kamera ini sudah dibetulkan di perangkatmu. Kirim semua koreksi lewat menu <b>Lainnya → Unduh koreksi</b>.</div>`);
    if (state.tab === 'lainnya') render();
  });
}

function exportCamFixes() {
  const blob = new Blob([JSON.stringify(camFixes(), null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'cctv_overrides.json';
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
