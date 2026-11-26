// Mesin simulasi: menghitung posisi bus & kereta dari jadwal (bukan GPS).

const M_LAT = 110540, M_LON = 111320 * Math.cos((-6.2 * Math.PI) / 180);
const dist = (a, b) => Math.hypot((a[0] - b[0]) * M_LON, (a[1] - b[1]) * M_LAT);

function cumulative(coords) {
  const c = [0];
  for (let i = 1; i < coords.length; i++) c.push(c[i - 1] + dist(coords[i - 1], coords[i]));
  return c;
}

// titik + arah pada garis di jarak tertentu (meter)
function along(coords, cum, d) {
  if (d <= 0) return [coords[0], bearing(coords[0], coords[1] || coords[0])];
  const L = cum[cum.length - 1];
  if (d >= L) return [coords[coords.length - 1], bearing(coords[coords.length - 2] || coords[0], coords[coords.length - 1])];
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
  const seg = cum[hi] - cum[lo] || 1, f = (d - cum[lo]) / seg;
  const a = coords[lo], b = coords[hi];
  return [[a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], bearing(a, b)];
}

function bearing(a, b) {
  return (Math.atan2((b[0] - a[0]) * M_LON, (b[1] - a[1]) * M_LAT) * 180) / Math.PI;
}

// Waktu Jakarta: detik sejak tengah malam & hari (0 = Senin)
export function jakartaNow(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta', hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date).map((p) => [p.type, p.value]));
  const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(parts.weekday);
  const sec = (+parts.hour % 24) * 3600 + +parts.minute * 60 + +parts.second + (date.getMilliseconds() / 1000);
  return { sec, dow };
}

export function fmtClock(sec) {
  sec = ((Math.round(sec) % 86400) + 86400) % 86400;
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return `${String(h).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
}

export function prepare(bus, train) {
  bus.shapeCum = bus.shapes.map(cumulative);
  bus.routeById = Object.fromEntries(bus.routes.map((r) => [r.id, r]));
  for (const t of bus.trips) {
    t.duration = t.stops[t.stops.length - 1][1] || 60;
    t.stopDist = t.stops.map((s) => s[2]); // meter dari awal garis rute
    const r = bus.routeById[t.route];
    // headway khas (menit) untuk ditampilkan
    const hw = t.freq.filter((f) => f[2] < 86400).map((f) => f[2]);
    if (hw.length) r.headway = Math.min(r.headway || 1e9, Math.round(Math.min(...hw) / 60));
    (r.trips ||= []).push(t);
  }
  for (const l of train.lines) {
    l.cum = cumulative(l.coords);
    l.length = l.cum[l.cum.length - 1];
    if (HEADWAY[l.id]) [l.headwayPeak, l.headway] = HEADWAY[l.id];
    l.prof = { 1: buildProfile(l, 1), [-1]: buildProfile(l, -1) };
    l.duration = l.prof[1].total;
    const ph = (train.lines.indexOf(l) * 0.37) % 1; // tiap jalur beda fase
    l.deps = { 1: dayDepartures(l, ph), [-1]: dayDepartures(l, (ph + 0.5) % 1) };
  }
  // Varian satu rute yang berangkat dari halte & jam yang sama dibuat selang-seling,
  // supaya tidak berjalan bertumpuk sepanjang rute.
  const groups = new Map();
  for (const t of bus.trips) {
    const f = t.freq[0];
    const key = `${t.route}|${t.stops[0][0]}|${f[0]}|${f[2]}`;
    (groups.get(key) || groups.set(key, []).get(key)).push(t);
  }
  for (const g of groups.values()) {
    g.forEach((t, i) => { t.phase = g.length > 1 && t.freq[0][2] < 86400 ? Math.round((i / g.length) * t.freq[0][2]) : 0; });
  }
  train.lineById = Object.fromEntries(train.lines.map((l) => [l.id, l]));
}

// keberangkatan yang sedang berjalan pada saat `now` (detik)
function* departures(freq, duration, now, phase = 0) {
  for (const [s0, e, h] of freq) {
    const s = s0 + phase;
    for (const base of [0, -86400]) {
      const t = now - base; // dukung perjalanan lewat tengah malam
      const kMin = Math.max(0, Math.ceil((t - duration - s) / h));
      const kMax = Math.floor((Math.min(t, e - 1) - s) / h);
      for (let k = kMin; k <= kMax; k++) yield { dep: s + k * h + base, k };
    }
  }
}

function tripPosition(bus, t, offset) {
  const st = t.stops;
  let i = 0;
  while (i < st.length - 2 && st[i + 1][1] <= offset) i++;
  const a = st[i], b = st[i + 1];
  const span = b[1] - a[1] || 1;
  const f = Math.min(1, Math.max(0, (offset - a[1]) / span));
  const d = t.stopDist[i] + (t.stopDist[i + 1] - t.stopDist[i]) * f;
  const [p, brg] = along(bus.shapes[t.shape], bus.shapeCum[t.shape], d);
  return { p, brg, next: b[0] };
}

export function busesNow(bus, { sec, dow }, filter) {
  const feats = [];
  for (const t of bus.trips) {
    if (!t.days[dow] && !t.days[(dow + 6) % 7]) continue;
    if (filter && !filter(t)) continue;
    const r = bus.routeById[t.route];
    for (const { dep, k } of departures(t.freq, t.duration, sec, t.phase)) {
      if (!t.days[dep < 0 ? (dow + 6) % 7 : dow]) continue;
      const off = sec - dep;
      if (off < 0 || off > t.duration) continue;
      const { p, brg, next } = tripPosition(bus, t, off);
      feats.push({
        type: 'Feature', geometry: { type: 'Point', coordinates: p },
        properties: { id: `${t.id}#${k}`, route: r.id, short: r.short, color: r.color, text: r.text,
          kind: r.kind, head: t.head, brg, next: bus.stops[next].name },
      });
    }
  }
  return feats;
}

/* ---------- kereta: berhenti di tiap stasiun, akselerasi & pengereman ---------- */
// kecepatan puncak (m/s), percepatan (m/s²), lama berhenti (detik)
const MODE = {
  KRL: { vmax: 55 / 3.6, acc: 0.5, dwell: 60 },
  MRT: { vmax: 60 / 3.6, acc: 0.8, dwell: 40 },
  LRT: { vmax: 50 / 3.6, acc: 0.7, dwell: 40 },
};
// stasiun transit besar: berhenti lebih lama
const BIG = /Manggarai|Tanah Abang|Jatinegara|Duri|Jakarta Kota|Sudirman|Bekasi|Depok|Bogor|Dukuh Atas|Bundaran HI|Lebak Bulus|Rangkasbitung|Tangerang/;
// selang (menit): [jam sibuk, biasa]; jam sibuk 06–09 & 16–19
const HEADWAY = { B: [6, 10], C: [12, 20], R: [12, 20], T: [12, 20], TP: [30, 30], M: [5, 10], S: [10, 10], CB: [8, 15], BK: [8, 15] };

// waktu & jarak tempuh satu potongan dengan profil trapesium (gas - jalan - rem)
function runTime(d, v, a) {
  return d >= (v * v) / a ? d / v + v / a : 2 * Math.sqrt(d / a);
}
function runDist(d, v, a, t) {
  const T = runTime(d, v, a);
  if (d >= (v * v) / a) {
    const ta = v / a;
    if (t < ta) return 0.5 * a * t * t;
    if (t < T - ta) return 0.5 * a * ta * ta + v * (t - ta);
    const r = T - t;
    return d - 0.5 * a * r * r;
  }
  const h = T / 2;
  return t < h ? 0.5 * a * t * t : d - 0.5 * a * (T - t) * (T - t);
}

function buildProfile(l, dir) {
  const m = MODE[l.mode] || MODE.KRL;
  const stops = (dir === 1 ? l.stops : [...l.stops].reverse()).map((s) => ({
    name: s.name, d: dir === 1 ? s.at : l.length - s.at, pt: [s.lon, s.lat],
  }));
  const seq = [];
  let t = 0;
  stops.forEach((s, i) => {
    const dwell = i === 0 || i === stops.length - 1 ? 0 : BIG.test(s.name) ? m.dwell * 2 : m.dwell;
    seq.push({ ...s, arr: t, dep: t + dwell });
    t += dwell;
    if (i < stops.length - 1) t += runTime(Math.max(1, stops[i + 1].d - s.d), m.vmax, m.acc);
  });
  // jalur lingkar (awal = akhir, mis. Lin Cikarang): tujuan berganti di titik balik terjauh
  const loop = stops[0].name === stops[stops.length - 1].name;
  let turn = stops.length - 1;
  if (loop) {
    const kb = stops.findIndex((s) => /Kampung Bandan/.test(s.name));
    turn = kb > 0 ? kb : stops.reduce((bi, s, i) => (dist(s.pt, stops[0].pt) > dist(stops[bi].pt, stops[0].pt) ? i : bi), 0);
  }
  const via = stops.slice(0, turn).some((s) => /Manggarai/.test(s.name)) ? 'Manggarai' : 'Pasar Senen';
  const destAt = (i) => (loop && i < turn ? `${stops[turn].name} via ${via}` : stops[stops.length - 1].name);
  return { seq, total: t, m, dest: destAt(0), destAt };
}

// posisi (jarak sepanjang garis arah tsb.) dan status pada detik ke-e sejak berangkat
function profileAt(p, e) {
  const q = p.seq;
  let lo = 0, hi = q.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (q[mid].arr <= e) lo = mid; else hi = mid; }
  const a = q[lo];
  if (e <= a.dep || lo === q.length - 1) return { d: a.d, at: a.name, i: lo };
  const b = q[lo + 1];
  return { d: a.d + runDist(Math.max(1, b.d - a.d), p.m.vmax, p.m.acc, e - a.dep), next: b.name, i: lo };
}

function dayDepartures(l, phase) {
  const [hp, ho] = HEADWAY[l.id] || [l.headway, l.headway];
  const [s, e] = l.service;
  const peak = (t) => (t >= 6 * 3600 && t < 9 * 3600) || (t >= 16 * 3600 && t < 19 * 3600);
  const out = [];
  for (let t = s + phase * ho * 60; t <= e; t += (peak(t) ? hp : ho) * 60) out.push(t);
  return out;
}

export function trainsNow(train, { sec }) {
  const feats = [];
  for (const l of train.lines) {
    for (const dir of [1, -1]) {
      const p = l.prof[dir];
      for (const dep of l.deps[dir]) {
        const e = sec - dep;
        if (e < 0) break;
        if (e > p.total) continue;
        const st = profileAt(p, e);
        const d = dir === 1 ? st.d : l.length - st.d;
        const [pt0, brg0] = along(l.coords, l.cum, d);
        const pt = pt0; // tepat di geometri rel (tanpa geseran)
        feats.push({
          type: 'Feature', geometry: { type: 'Point', coordinates: pt },
          properties: { id: `${l.id}${dir}@${dep}`, line: l.id, mode: l.mode, color: l.color, name: l.name,
            dest: p.destAt(st.i), brg: dir === 1 ? brg0 : brg0 + 180, at: st.at || '', next: st.next || '' },
        });
      }
    }
  }
  return feats;
}

// Kereta berikutnya yang tiba di sebuah stasiun
export function nextTrains(train, stationName, { sec }, count = 4) {
  const out = [];
  for (const l of train.lines) {
    for (const dir of [1, -1]) {
      const p = l.prof[dir];
      p.seq.forEach((s, i) => {
        if (s.name.split(' (')[0] !== stationName || i === p.seq.length - 1) return;
        let n = 0;
        for (const dep of l.deps[dir]) {
          const at = dep + s.arr;
          if (at < sec - 20) continue;
          out.push({ line: l.id, color: l.color, mode: l.mode, dest: p.destAt(i), at, wait: at - sec });
          if (++n >= count) break;
        }
      });
    }
  }
  return out.sort((a, b) => a.at - b.at).slice(0, count);
}

// Satu halte bisa punya beberapa titik/peron dengan nama sama (mis. Bundaran HI:
// peron Koridor 1 dan peron 6A/6B). Gabungkan peron bernama sama dalam radius 400 m.
export function stopGroup(bus, i) {
  const s0 = bus.stops[i];
  bus._groups ||= new Map();
  const key = `${s0.name}|${i}`;
  if (bus._groups.has(key)) return bus._groups.get(key);
  const idx = [];
  bus.stops.forEach((s, j) => { if (s.name === s0.name && dist([s.lon, s.lat], [s0.lon, s0.lat]) < 400) idx.push(j); });
  const g = { idx, routes: [...new Set(idx.flatMap((j) => bus.stops[j].routes))].sort((a, b) => a.localeCompare(b, 'id', { numeric: true })) };
  bus._groups.set(key, g);
  return g;
}

// Bus berikutnya di halte (satu indeks halte atau daftar indeks peron)
export function nextBuses(bus, stopIdx, { sec, dow }, count = 5) {
  const want = new Set([].concat(stopIdx));
  const out = [];
  for (const t of bus.trips) {
    if (!t.days[dow]) continue;
    const j = t.stops.findIndex((s) => want.has(s[0]));
    if (j < 0 || j === t.stops.length - 1) continue;
    const off = t.stops[j][1];
    const r = bus.routeById[t.route];
    for (const [s0, e, h] of t.freq) {
      const s = s0 + (t.phase || 0);
      const k0 = Math.max(0, Math.ceil((sec - off - s) / h));
      const dep = s + k0 * h;
      if (dep >= e) continue;
      out.push({ route: r.id, short: r.short, color: r.color, text: r.text, head: t.head, at: dep + off, wait: dep + off - sec });
    }
  }
  out.sort((a, b) => a.at - b.at);
  const seen = new Set();
  return out.filter((x) => { const key = x.route + x.head; if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, count);
}

export { dist };
