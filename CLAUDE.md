# Nyasarn't

## Testing
- Jalankan: `npm test` (penguji bawaan Node, `tests/*.test.js`). Panduan lengkap di [TESTING.md](TESTING.md).
- Setiap fungsi baru di `public/js/sim.js` atau `public/js/weather.js` diberi tes; bug yang diperbaiki diberi tes regresi (`*.regression-N.test.js`). Tes kedua cabang: jalur sukses dan jalur gagal.
- Tampilan peta dicek di peramban yang punya WebGL. Peramban headless gstack tidak punya WebGL.
