"""Bangun data jalur kereta (KRL, MRT, LRT) dari OpenStreetMap.

Pakai:  python3 scripts/build_train.py raw/lines.json raw/nodes.json public/data/train.json
Jadwal tidak tersedia terbuka, jadi tiap jalur diberi selang (headway) dan
kecepatan rata-rata; aplikasi menyimulasikan posisi kereta dari situ.
"""
import json, math, sys

lines_f, nodes_f, out = sys.argv[1:4]

# id relasi OSM -> info tampilan
LINES = {
    16877210: dict(id="B", name="Lin Bogor", mode="KRL", color="#E30A16", headway=6, speed=40),
    15094545: dict(id="C", name="Lin Cikarang (via Manggarai)", mode="KRL", color="#0084D8", headway=15, speed=40),
    2922163: dict(id="C2", name="Lin Cikarang (via Pasar Senen)", mode="KRL", color="#0084D8", headway=20, speed=40),
    15094546: dict(id="R", name="Lin Rangkasbitung", mode="KRL", color="#16812B", headway=15, speed=45),
    17193463: dict(id="T", name="Lin Tangerang", mode="KRL", color="#623814", headway=15, speed=38),
    17193008: dict(id="TP", name="Lin Tanjung Priok", mode="KRL", color="#DD0067", headway=30, speed=35),
    17675695: dict(id="A", name="KA Bandara Soekarno-Hatta", mode="KRL", color="#2E2F70", headway=30, speed=55),
    9677670: dict(id="M", name="MRT Lebak Bulus - Bundaran HI", mode="MRT", color="#CE0037", headway=5, speed=38),
    10693119: dict(id="S", name="LRT Jakarta Velodrome - Kelapa Gading", mode="LRT", color="#F16227", headway=10, speed=30),
    16036440: dict(id="CB", name="LRT Jabodebek Cibubur", mode="LRT", color="#20409A", headway=10, speed=45),
    16079479: dict(id="BK", name="LRT Jabodebek Bekasi", mode="LRT", color="#0E6938", headway=10, speed=45),
}


def d(a, b):
    dx = (a[0] - b[0]) * 111320 * math.cos(math.radians(-6.2))
    dy = (a[1] - b[1]) * 110540
    return math.hypot(dx, dy)


def chain(ways):
    """Sambungkan potongan rel menjadi satu garis, membalik arah bila perlu."""
    line = []
    for w in ways:
        if not line:
            line = list(w)
            continue
        end = line[-1]
        opts = [(d(end, w[0]), w), (d(end, w[-1]), w[::-1])]
        if len(line) and len(ways) > 1 and line is not None and len(line) == len(ways[0]):
            # potongan pertama mungkin terbalik
            opts += [(d(line[0], w[0]), None), (d(line[0], w[-1]), None)]
        gap, seg = min(opts, key=lambda x: x[0])
        if seg is None:
            line = line[::-1]
            end = line[-1]
            seg = w if d(end, w[0]) < d(end, w[-1]) else w[::-1]
        line += seg[1:] if d(line[-1], seg[0]) < 1 else seg
    return line


def thin(pts, step=25):
    outp, acc = [pts[0]], 0
    for a, b in zip(pts, pts[1:]):
        acc += d(a, b)
        if acc >= step:
            outp.append(b)
            acc = 0
    if outp[-1] != pts[-1]:
        outp.append(pts[-1])
    return outp


rels = {e["id"]: e for e in json.load(open(lines_f))["elements"]}
nodes = {e["id"]: e for e in json.load(open(nodes_f))["elements"]}

result = []
stations = {}
for rid, info in LINES.items():
    rel = rels[rid]
    ways = [[(round(p["lon"], 5), round(p["lat"], 5)) for p in m["geometry"]]
            for m in rel["members"] if m["type"] == "way" and m.get("role", "") in ("", "route", "forward", "backward")
            and m.get("geometry")]
    line = thin(chain(ways))
    cum = [0.0]
    for a, b in zip(line, line[1:]):
        cum.append(cum[-1] + d(a, b))
    stops = []
    for m in rel["members"]:
        if m["type"] != "node" or not m["role"].startswith("stop"):
            continue
        n = nodes.get(m["ref"])
        if not n:
            continue
        p = (n["lon"], n["lat"])
        k = min(range(len(line)), key=lambda i: d(p, line[i]))
        name = n["tags"].get("name", "?")
        if stops and stops[-1]["name"] == name:
            continue
        stops.append({"name": name, "at": round(cum[k]), "lon": round(p[0], 5), "lat": round(p[1], 5)})
        key = name.split(" (")[0]
        st = stations.setdefault(key, {"name": key, "lon": round(p[0], 5), "lat": round(p[1], 5), "lines": []})
        if info["id"] not in st["lines"]:
            st["lines"].append(info["id"])
    stops.sort(key=lambda s: s["at"])
    result.append({**info, "length": round(cum[-1]), "coords": [list(p) for p in line], "stops": stops,
                   "service": [5 * 3600, 24 * 3600]})
    print(info["id"], f"{cum[-1]/1000:.1f} km", len(stops), "stasiun", stops[0]["name"], "->", stops[-1]["name"])

json.dump({"source": "OpenStreetMap contributors (ODbL)", "lines": result,
           "stations": list(stations.values())},
          open(out, "w"), separators=(",", ":"), ensure_ascii=False)
