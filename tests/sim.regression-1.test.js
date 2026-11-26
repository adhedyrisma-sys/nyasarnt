// Regression: ISSUE-006 — kartu halte hanya menampilkan rute dari satu peron
// Found by /qa on 2026-11-26
// Report: .gstack/qa-reports/qa-report-localhost-2026-11-26.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { prepare, stopGroup, nextBuses } from '../public/js/sim.js';

const load = (n) => JSON.parse(fs.readFileSync(new URL(`../public/data/${n}.json`, import.meta.url)));
const bus = load('bus');
prepare(bus, load('train'));

test('halte dengan beberapa peron menggabungkan semua rutenya (Bundaran HI: Koridor 1 dan 6A)', () => {
  const i = bus.stops.findIndex((s) => s.name === 'Bundaran HI Astra' && s.routes.includes('6A'));
  const g = stopGroup(bus, i);
  assert.ok(g.routes.includes('1'), `rute grup: ${g.routes.join(',')}`);
  assert.ok(g.routes.includes('6A'));
  assert.ok(g.idx.length >= 2, 'lebih dari satu peron');
});

test('bus berikutnya di halte menyertakan rute dari peron lain', () => {
  const i = bus.stops.findIndex((s) => s.name === 'Bundaran HI Astra' && s.routes.includes('6A'));
  const list = nextBuses(bus, stopGroup(bus, i).idx, { sec: 8 * 3600, dow: 2 }, 10);
  assert.ok(list.some((x) => x.short === '1'), `rute muncul: ${[...new Set(list.map((x) => x.short))].join(',')}`);
});
