// Regression: ISSUE-002 — cuaca hilang saat server BMKG menolak permintaan (tanpa cadangan)
// Found by /qa on 2026-11-26
// Report: .gstack/qa-reports/qa-report-localhost-2026-11-26.md
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// localStorage tiruan (aplikasi berjalan di browser; di Node kita sediakan versi sederhana)
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const area = { adm4: '31.74.02.1001', kecamatan: 'Setiabudi', kota: 'Jakarta Selatan', lat: -6.2, lon: 106.8 };
const bmkgBody = (t) => ({
  data: [{ cuaca: [[{ utc_datetime: '2026-11-26 00:00:00', local_datetime: '2026-11-26 07:00:00', t, hu: 90, ws: 3, tp: 0, weather: 3, weather_desc: 'Berawan', analysis_date: 'x' }]] }],
});

beforeEach(() => store.clear());

test('saat BMKG gagal, prakiraan terakhir yang tersimpan tetap ditampilkan', async () => {
  const w = await import(`../public/js/weather.js?ok=${Date.now()}`);
  globalThis.fetch = async () => ({ ok: true, json: async () => bmkgBody(27) });
  const first = await w.forecast(area);
  assert.equal(first.slots[0].t, 27);

  // satu jam kemudian (data tersimpan sudah tidak segar, aplikasi akan meminta ulang ke BMKG)
  const k = `nyasarnt.wx.${area.adm4}`;
  const saved = JSON.parse(localStorage.getItem(k));
  saved.at -= 60 * 60 * 1000;
  localStorage.setItem(k, JSON.stringify(saved));

  // modul baru = halaman dimuat ulang (cache di memori hilang); BMKG sekarang menolak
  const w2 = await import(`../public/js/weather.js?fail=${Date.now()}`);
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  const again = await w2.forecast(area);
  assert.equal(again.slots[0].t, 27, 'memakai data tersimpan');
  assert.ok(again.stale, 'ditandai sebagai data lama');
});

test('tanpa data tersimpan, kegagalan BMKG tetap dilaporkan sebagai error', async () => {
  const w = await import(`../public/js/weather.js?empty=${Date.now()}`);
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(() => w.forecast(area));
});
