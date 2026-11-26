"""Satukan Lin Cikarang: relasi OSM 'C' dan 'C2' adalah lingkaran yang sama berlawanan arah.
Simpan hanya C (dijalankan dua arah oleh simulasi) dan lengkapi stasiun Pasar Senen.
Pakai: python3 scripts/fix_cikarang.py   (setelah build_train.py)"""
import json, math, os
P = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public/data/train.json")
d = json.load(open(P))
L = {l["id"]: l for l in d["lines"]}
if "C2" in L:
    C, C2 = L["C"], L["C2"]
    k = math.cos(math.radians(-6.2))
    dist = lambda a, b: math.hypot((a[0] - b[0]) * 111320 * k, (a[1] - b[1]) * 110540)
    cum = [0.0]
    for a, b in zip(C["coords"], C["coords"][1:]):
        cum.append(cum[-1] + dist(a, b))
    names = {s["name"] for s in C["stops"]}
    for s in C2["stops"]:
        if s["name"] in names:
            continue
        p = (s["lon"], s["lat"])
        # titik terdekat di lintasan kembali (paruh kedua lingkaran)
        half = len(C["coords"]) // 2
        i = min(range(half, len(C["coords"])), key=lambda j: dist(p, C["coords"][j]))
        C["stops"].append({**s, "at": round(cum[i])})
        print("tambah stasiun", s["name"], "di km", round(cum[i] / 1000, 1))
    C["stops"].sort(key=lambda s: s["at"])
    C["name"] = "Lin Cikarang (lingkar)"
    d["lines"] = [l for l in d["lines"] if l["id"] != "C2"]
    for st in d["stations"]:
        st["lines"] = [x for x in st["lines"] if x != "C2"] or ["C"]
json.dump(d, open(P, "w"), separators=(",", ":"), ensure_ascii=False)
print("jalur:", [l["id"] for l in d["lines"]])
