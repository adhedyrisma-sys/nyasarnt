"""Tempatkan CCTV Publik Pemprov DKI (jakcctv.jakarta.go.id/publik) di peta.

Koordinat tiang kamera tidak diterbitkan, jadi tiap kamera ditempelkan ke
geometri OpenStreetMap sesuai namanya:
  road    -> titik terdekat di jalan yang namanya disebut
  simpang -> lampu lalu lintas terdekat di jalan itu (persimpangan)
  jpo     -> jembatan penyeberangan terdekat yang melintasi jalan itu
  poi     -> titik tempat yang disebut (mis. UOB Plaza, Taman Literasi)
Koreksi manual bisa ditulis di scripts/cctv_overrides.json: {"nomor stream": [lat, lon]}
(bisa diekspor dari aplikasi: Lainnya > Ekspor koreksi lokasi CCTV).

Pakai: python3 scripts/build_cctv.py
"""
import json, math, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = lambda *p: os.path.join(ROOT, *p)

M_LAT, M_LON = 110540, 111320 * math.cos(math.radians(-6.2))
def d(a, b): return math.hypot((a[0] - b[0]) * M_LAT, (a[1] - b[1]) * M_LON)

def nearest_on_seg(p, a, b):
    ax, ay, bx, by = a[1] * M_LON, a[0] * M_LAT, b[1] * M_LON, b[0] * M_LAT
    px, py = p[1] * M_LON, p[0] * M_LAT
    vx, vy = bx - ax, by - ay
    t = 0 if vx == vy == 0 else max(0, min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)))
    return ((ay + t * vy) / M_LAT, (ax + t * vx) / M_LON)

elements = []
for f in ("raw/osm_cctv.json", "raw/osm_cctv2.json", "raw/osm_cctv3.json"):
    if os.path.exists(R(f)):
        try: elements += json.load(open(R(f)))["elements"]
        except ValueError: pass

roads = [e for e in elements if e["type"] == "way" and "highway" in e["tags"] and e["tags"].get("highway") not in ("footway", "path", "steps")]
jpos = [e for e in elements if e["type"] == "way" and e["tags"].get("highway") == "footway" and e["tags"].get("bridge") == "yes"]
signals = [(e["lat"], e["lon"]) for e in elements if e["type"] == "node" and e["tags"].get("highway") == "traffic_signals"]
named = {e["tags"].get("name"): (e["lat"], e["lon"]) for e in elements if e["type"] == "node" and "name" in e["tags"]}

def geom(w): return [(p["lat"], p["lon"]) for p in w["geometry"]]

def snap_road(pattern, hint):
    best, bp = 1e18, None
    for w in roads:
        if not re.search(pattern, w["tags"].get("name", "")): continue
        g = geom(w)
        for a, b in zip(g, g[1:]):
            q = nearest_on_seg(hint, a, b)
            if d(q, hint) < best: best, bp = d(q, hint), q
    return bp, best

def place(rule):
    kind, pattern, hint = rule[0], rule[1], rule[2]
    if kind == "poi":
        return named.get(pattern, hint), "poi"
    p, off = snap_road(pattern, hint)
    if p is None:
        return hint, "perkiraan"
    if kind == "simpang" and signals:
        s = min(signals, key=lambda x: d(x, p))
        if d(s, p) < 350:
            p2, _ = snap_road(pattern, s)
            return p2 or s, "persimpangan"
    if kind == "jpo" and jpos:
        best, bp = 1e18, None
        for w in jpos:
            g = geom(w)
            mid = g[len(g) // 2]
            q, _ = snap_road(pattern, mid)
            if q and d(q, mid) < 40 and d(q, p) < best: best, bp = d(q, p), q
        if bp and best < 600:
            return bp, "jpo"
    return p, "jalan"

GATSU, THAMRIN, GP = r"Gatot Subroto", r"Husni Thamrin|M\.?H\.? Thamrin", r"Gerbang Pemuda"
SPARMAN = r"Siswondo Parman"
# Kunci = nomor stream (tercetak di video). Judul di situs sumber kadang tertukar,
# jadi nama lokasi diambil dari nama stream, bukan dari judul.
# ketepatan: "tepat" = titik bernama (persimpangan/JPO/tempat), "ruas" = jalannya benar
# tapi letak di sepanjang jalan diperkirakan, "perkiraan" = hanya area.
RULES = {
    # Gatot Subroto kode JKP = ruas Jakarta Pusat (Semanggi - Slipi)
    "502045": ("jpo", GATSU, (-6.2150, 106.8075), "JPO Jl. Gatot Subroto 7", "ruas"),
    "502507": ("road", GATSU, (-6.2120, 106.8045), "Jl. Gatot Subroto (C11)", "ruas"),
    "503300": ("road", GATSU, (-6.2085, 106.8018), "Jl. Gatot Subroto (C13)", "ruas"),
    "503303": ("road", GATSU, (-6.2183, 106.8112), "Jl. Gatot Subroto dekat Semanggi (C14)", "ruas"),
    "502155": ("road", GP, (-6.2125, 106.8045), "Jl. Gerbang Pemuda (C02)", "ruas"),
    "502160": ("road", GP, (-6.2150, 106.8030), "Jl. Gerbang Pemuda (C03)", "ruas"),
    "502506": ("road", GP, (-6.2105, 106.8055), "Jl. Gerbang Pemuda (C04)", "ruas"),
    "503536": ("road", GP, (-6.21232, 106.80700), "Flyover dekat RSGM Ladokgi", "perkiraan"),
    "503301": ("road", r"Tentara Pelajar", (-6.2050, 106.7995), "Jl. Tentara Pelajar", "ruas"),
    # S. Parman kode JKB = ruas Jakarta Barat (Slipi - Grogol)
    "502535": ("simpang", SPARMAN, (-6.1915, 106.7975), "Simpang Slipi, Jl. S. Parman (C07)", "ruas"),
    "502645": ("simpang", SPARMAN, (-6.1670, 106.7905), "Simpang Jl. S. Parman (C08)", "ruas"),
    "502540": ("simpang", SPARMAN, (-6.1780, 106.7935), "Simpang Jl. S. Parman (C02)", "ruas"),
    "501862": ("road", SPARMAN, (-6.1960, 106.7975), "Jl. S. Parman (C01)", "ruas"),
    # Thamrin
    "501844": ("road", THAMRIN, (-6.1835, 106.8237), "Jl. MH Thamrin (C01)", "ruas"),
    "501941": ("road", THAMRIN, (-6.1910, 106.8228), "Jl. MH Thamrin (C02)", "ruas"),
    "502491": ("simpang", THAMRIN, (-6.1950, 106.8231), "Simpang Thamrin (C07)", "ruas"),
    "502492": ("simpang", THAMRIN, (-6.1877, 106.8236), "Simpang Thamrin - Sarinah (C08)", "ruas"),
    "502493": ("simpang", THAMRIN, (-6.1828, 106.8238), "Simpang Thamrin - Kebon Sirih (C09)", "ruas"),
    "504866": ("poi", "Pintu masuk UOB Plaza", (-6.19898, 106.82283), "UOB Plaza, Thamrin", "tepat"),
    # lain-lain
    "501478": ("poi", "Taman Literasi Martha Tiahahu", (-6.2435, 106.7989), "Taman Literasi Blok M", "tepat"),
    "501493": ("road", r"Fachrudin|Jatibaru Raya", (-6.1880, 106.8125), "Pasar Tanah Abang (C02)", "ruas"),
    "501594": ("road", r"Manggarai Utara II$", (-6.2090, 106.8480), "Jl. Manggarai Utara 2", "ruas"),
    "502041": ("road", r"Mas Mansyur", (-6.2010, 106.8155), "Jl. KH Mas Mansyur (C02)", "ruas"),
    "503343": ("jpo", r"Cideng Timur", (-6.1760, 106.8150), "JPO Jl. Cideng Timur", "ruas"),
    "503675": ("road", r"Jatibaru Raya", (-6.1850, 106.8130), "Jl. Jatibaru Raya", "ruas"),
    "501968": ("simpang", r"Nurdin Raya", (-6.1730, 106.7900), "Simpang Jl. Dr. Nurdin Raya", "ruas"),
    "705979": ("road", r"Asia Afrika", (-6.2240, 106.8000), "Senayan (018)", "perkiraan"),
    "705084": ("road", r"Asia Afrika", (-6.2215, 106.8020), "Senayan (001)", "perkiraan"),
    "700014": ("road", r"Sudirman$", (-6.2150, 106.8180), "Bendungan Hilir (003)", "perkiraan"),
    "700332": ("road", r"Mas Mansyur", (-6.1975, 106.8160), "Kebon Melati (010)", "perkiraan"),
}

def stream_id(embed):
    m = re.search(r"/(\d{6})[_-]|-(\d{6})_\d+/", embed)
    return m.group(1) or m.group(2)

def stream_label(embed):
    name = embed.split("/")[3]
    name = re.sub(r"^\d{6}[_-]", "", name)
    return re.sub(r"[_-]+", " ", name).replace("CCTV ", "· CCTV ").strip()

overrides = {}
if os.path.exists(R("scripts/cctv_overrides.json")):
    overrides = json.load(open(R("scripts/cctv_overrides.json")))

cams = json.load(open(R("raw/cctv/cams.json")))
out, cache, count = [], {}, {}
for c in cams:
    sid = stream_id(c["embed"])
    rule = RULES[sid]
    if sid not in cache:
        cache[sid] = (tuple(overrides[sid]), "manual") if sid in overrides else place(rule)
    (lat, lon), how = cache[sid]
    n = count[sid] = count.get(sid, -1) + 1
    conf = "tepat" if how == "manual" else rule[4]
    out.append({"id": re.sub(r"[^A-Za-z0-9]+", "-", c["embed"].split("/")[3]), "sid": sid, "name": rule[3],
                "detail": stream_label(c["embed"]), "lat": round(lat + n * 0.00005, 6), "lon": round(lon + n * 0.00005, 6),
                "placed": how, "confidence": conf, "embed": c["embed"]})

json.dump({"source": "CCTV Publik Pemprov DKI Jakarta · jakcctv.jakarta.go.id/publik",
           "note": "Lokasi ditempel ke jalan/persimpangan/JPO OpenStreetMap sesuai nama kamera", "cameras": out},
          open(R("public/data/cctv.json"), "w"), ensure_ascii=False, indent=0)
from collections import Counter
print(len(out), "kamera", Counter(v[1] for v in cache.values()))
for sid, ((lat, lon), how) in cache.items():
    print(f"  {how:12} {lat:.5f},{lon:.5f}  {sid} {RULES[sid][3]}")
