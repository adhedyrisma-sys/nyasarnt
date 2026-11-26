// Tes logika simulasi Nyasarn't. Jalankan: npm test  (atau: node --test tests/*.test.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { prepare, busesNow, trainsNow, nextTrains } from '../public/js/sim.js';

const load = (n) => JSON.parse(fs.readFileSync(new URL(`../public/data/${n}.json`, import.meta.url)));
const bus = load('bus');
const train = load('train');
prepare(bus, train);

const key = (f) => f.geometry.coordinates.map((v) => v.toFixed(4)).join();

test('tidak ada potongan rute bus di atas 60 km/jam (bus tidak "melesat")', () => {
  for (const t of bus.trips) {
    for (let i = 0; i < t.stops.length - 1; i++) {
      const dt = t.stops[i + 1][1] - t.stops[i][1];
      if (dt <= 0) continue;
      const kmh = ((t.stopDist[i + 1] - t.stopDist[i]) / dt) * 3.6;
      assert.ok(kmh <= 60.5, `${t.id} potongan ${i}: ${kmh.toFixed(0)} km/jam`);
    }
  }
});

test('tidak ada perjalanan bus yang diam lebih dari 20% waktunya', () => {
  for (const t of bus.trips) {
    let still = 0;
    for (let i = 0; i < t.stops.length - 1; i++) {
      const dt = t.stops[i + 1][1] - t.stops[i][1];
      if (dt > 0 && t.stopDist[i + 1] - t.stopDist[i] < 10) still += dt;
    }
    assert.ok(still <= t.duration * 0.2, `${t.id} diam ${Math.round(still / 60)} dari ${Math.round(t.duration / 60)} menit`);
  }
});

test('kereta berhenti di stasiun dan waktu tempuh masuk akal', () => {
  const f = trainsNow(train, { sec: 7 * 3600 });
  assert.ok(f.length > 50, `kereta jalan pukul 07.00: ${f.length}`);
  assert.ok(f.some((x) => x.properties.at), 'ada kereta yang sedang berhenti di stasiun');
  const minutes = (id) => train.lineById[id].prof[1].total / 60;
  assert.ok(minutes('B') > 80 && minutes('B') < 115, `Jakarta Kota-Bogor ${minutes('B')} menit`);
  assert.ok(minutes('M') > 20 && minutes('M') < 35, `MRT ${minutes('M')} menit`);
});

test('kereta searah tidak bertumpuk di titik yang sama', () => {
  let piles = 0, samples = 0;
  for (let sec = 5.5 * 3600; sec < 23 * 3600; sec += 97) {
    samples++;
    const seen = new Map();
    // kunci = posisi + jalur + arah (kereta berlawanan arah di stasiun yang sama itu wajar: beda peron)
    for (const f of trainsNow(train, { sec })) {
      const k = `${key(f)}|${f.properties.id.split('@')[0]}`;
      seen.set(k, (seen.get(k) || 0) + 1);
    }
    piles += [...seen.values()].filter((n) => n >= 2).length;
  }
  assert.ok(piles / samples < 0.05, `${piles} tumpukan dalam ${samples} sampel waktu`);
});

test('bus tidak berjalan bertumpuk (varian rute selang-seling)', () => {
  const f = busesNow(bus, { sec: 8 * 3600 + 137, dow: 2 });
  const seen = new Map();
  for (const x of f) seen.set(key(x), (seen.get(key(x)) || 0) + 1);
  const piles = [...seen.values()].filter((n) => n >= 3).length;
  assert.ok(piles <= 25, `${piles} tumpukan berisi 3+ bus`);
});

test('kereta berikutnya terurut dan belum lewat', () => {
  const sec = 8 * 3600;
  const list = nextTrains(train, 'Manggarai', { sec }, 5);
  assert.equal(list.length, 5);
  for (let i = 1; i < list.length; i++) assert.ok(list[i].at >= list[i - 1].at, 'urut waktu');
  assert.ok(list.every((x) => x.at >= sec - 20), 'tidak ada kereta yang sudah lewat');
});
