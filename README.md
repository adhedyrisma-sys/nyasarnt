# Nyasarn't

Biar nggak nyasar di Jakarta. Peta bus TransJakarta, KRL, MRT, LRT, dan CCTV, ditemani lima maskot: Awan, Bintang, Batu, Bulan, dan Bunga.

**Buka:** https://adhedyrisma-sys.github.io/nyasarnt/

## Menjalankan di komputer

```bash
python3 scripts/serve.py
```

Lalu buka http://localhost:5180

## Isi folder

- `public/`: semua isi situs (siap diunggah ke hosting statis mana saja)
  - `js/mascots.js`: maskot boneka kain (SVG)
  - `js/sim.js`: simulasi posisi bus dan kereta dari jadwal
  - `js/main.js`: peta, panel, pencarian, kartu info
  - `data/`: data hasil olahan
- `scripts/`: pengolah data
- `raw/`: data mentah yang diunduh

## Memperbarui data

```bash
curl -L -o raw/gtfs.zip https://gtfs.transjakarta.co.id/files/file_gtfs.zip && unzip -o raw/gtfs.zip -d raw/gtfs
python3 scripts/build_bus.py raw/gtfs public/data/bus.json
python3 scripts/build_train.py raw/lines.json raw/nodes.json public/data/train.json
python3 scripts/fix_cikarang.py
python3 scripts/build_cctv.py
python3 scripts/build_weather_areas.py   # titik prakiraan BMKG per kecamatan
```

## Sumber data

- Bus: GTFS resmi TransJakarta
- Kereta: © kontributor OpenStreetMap (ODbL). Selang waktu dan kecepatan diperkirakan
- Peta dasar: OpenFreeMap
- CCTV: CCTV Publik Pemprov DKI Jakarta (jakcctv.jakarta.go.id/publik). Lokasi ditempel ke jalan/persimpangan/JPO OpenStreetMap sesuai nama kamera; koreksi manual di `scripts/cctv_overrides.json`
- Cuaca: prakiraan BMKG (api.bmkg.go.id), diambil langsung oleh browser per kecamatan terdekat

Posisi kendaraan adalah simulasi, bukan GPS asli.
