# Tes Nyasarn't

- **Alat:** penguji bawaan Node.js (`node:test`, Node 22). Tidak perlu install paket.
- **Jalankan:** `npm test` (sama dengan `node --test tests/*.test.js`)
- **Lokasi:** `tests/*.test.js`

## Yang dites
- `tests/sim.test.js`: logika simulasi di `public/js/sim.js` memakai data asli di `public/data/`
  (kecepatan bus wajar, bus tidak diam lama, kereta berhenti di stasiun, tidak ada tumpukan, urutan kereta berikutnya).

## Kebiasaan
- Nama tes dalam bahasa Indonesia, menjelaskan perilaku yang dijaga.
- Pakai `assert/strict` dengan pesan yang menyebut angka nyata (mis. "75 km/jam").
- Bug yang diperbaiki mendapat tes regresi baru: `{nama}.regression-N.test.js`.
- Tampilan (peta, panel) dicek lewat peramban dengan `/qa`, bukan tes unit.
