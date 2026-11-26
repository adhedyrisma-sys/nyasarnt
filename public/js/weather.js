// Prakiraan cuaca BMKG (api.bmkg.go.id), per kecamatan terdekat.
// Data BMKG diperbarui berkala dan di-cache 1 jam oleh server; kita simpan 30 menit.

const API = 'https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=';
const cache = new Map();
let AREAS = [];

export async function loadAreas() {
  AREAS = (await fetch('data/weather-areas.json').then((r) => r.json())).areas;
  return AREAS;
}

export function nearestArea([lon, lat]) {
  let best = null, bd = Infinity;
  for (const a of AREAS) {
    const d = (a.lat - lat) ** 2 + ((a.lon - lon) * 0.994) ** 2;
    if (d < bd) { bd = d; best = a; }
  }
  return best;
}

// kode cuaca BMKG -> ikon clay kita
export function iconFor(code) {
  if (code === 0) return 'cerah';
  if (code === 1 || code === 2) return 'cerah_berawan';
  if (code === 3 || code === 4) return 'berawan';
  if ([5, 10, 45].includes(code)) return 'kabut';
  if (code === 95 || code === 97) return 'petir';
  if (code >= 60 && code < 95) return 'hujan';
  return 'berawan';
}
export const isRain = (code) => code >= 60;

// Simpan prakiraan terakhir di perangkat: muat ulang halaman tak perlu meminta ulang ke BMKG,
// dan bila BMKG sedang menolak/putus, data terakhir tetap bisa ditampilkan (ditandai "stale").
const STORE = (adm4) => `nyasarnt.wx.${adm4}`;
const FRESH_MS = 30 * 60 * 1000;
const KEEP_MS = 12 * 60 * 60 * 1000;

function saved(area) {
  try {
    const x = JSON.parse(localStorage.getItem(STORE(area.adm4)) || 'null');
    if (!x) return null;
    x.data.slots.forEach((s) => (s.time = new Date(s.time)));
    return x;
  } catch { return null; }
}

export async function forecast(area) {
  const hit = cache.get(area.adm4);
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.data;
  const keep = saved(area);
  if (keep && Date.now() - keep.at < FRESH_MS) { cache.set(area.adm4, keep); return keep.data; }
  try {
    const json = await fetch(API + area.adm4).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
    const slots = json.data[0].cuaca.flat().map((c) => ({
      time: new Date(c.utc_datetime.replace(' ', 'T') + 'Z'),
      local: c.local_datetime.slice(11, 16).replace(':', '.'),
      day: c.local_datetime.slice(0, 10),
      t: c.t, hu: c.hu, ws: c.ws, rain: c.tp, code: c.weather, desc: c.weather_desc,
    })).sort((a, b) => a.time - b.time);
    const data = { area, slots, analysis: json.data[0].cuaca[0]?.[0]?.analysis_date };
    const entry = { at: Date.now(), data };
    cache.set(area.adm4, entry);
    try { localStorage.setItem(STORE(area.adm4), JSON.stringify(entry)); } catch { /* penyimpanan penuh/dimatikan */ }
    return data;
  } catch (err) {
    if (keep && Date.now() - keep.at < KEEP_MS) return { ...keep.data, stale: true, savedAt: keep.at };
    throw err;
  }
}

// slot yang sedang berlaku + beberapa slot berikutnya
export function upcoming(data, n = 8, now = new Date()) {
  const i = Math.max(0, data.slots.findIndex((s) => s.time > now) - 1);
  return data.slots.slice(i, i + n);
}

// kalimat singkat soal hujan dalam ~12 jam ke depan
export function rainNote(data, now = new Date()) {
  const next = upcoming(data, 5, now);
  const r = next.find((s) => isRain(s.code));
  if (!r) return { rain: false, text: 'Tidak ada hujan dalam 12 jam ke depan.' };
  if (r === next[0]) return { rain: true, text: `Sedang ${r.desc.toLowerCase()}. Bawa payung ya!` };
  return { rain: true, text: `${r.desc} diperkirakan sekitar pukul ${r.local}. Siapkan payung.` };
}
