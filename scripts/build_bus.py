"""Ubah GTFS TransJakarta menjadi satu file JSON ringkas untuk aplikasi.

Pakai:  python3 scripts/build_bus.py raw/gtfs public/data/bus.json
"""
import csv, json, math, sys
from collections import defaultdict

src, out = sys.argv[1], sys.argv[2]


def rows(name):
    with open(f"{src}/{name}", newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def hms(s):
    h, m, sec = (int(x) for x in s.split(":"))
    return h * 3600 + m * 60 + sec


def dist(a, b):
    # meter kira-kira (cukup untuk Jakarta)
    dx = (a[0] - b[0]) * 111320 * math.cos(math.radians(-6.2))
    dy = (a[1] - b[1]) * 110540
    return math.hypot(dx, dy)


def simplify(pts, tol=6.0):
    """Douglas-Peucker sederhana (toleransi dalam meter)."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        a, b = pts[i], pts[j]
        best, idx = 0, -1
        for k in range(i + 1, j):
            p = pts[k]
            # jarak titik ke garis a-b
            ab = dist(a, b)
            if ab == 0:
                d = dist(a, p)
            else:
                ax, ay = 0, 0
                bx = (b[0] - a[0]) * 111320 * math.cos(math.radians(-6.2)); by = (b[1] - a[1]) * 110540
                px = (p[0] - a[0]) * 111320 * math.cos(math.radians(-6.2)); py = (p[1] - a[1]) * 110540
                t = max(0, min(1, (px * bx + py * by) / (ab * ab)))
                d = math.hypot(px - t * bx, py - t * by)
            if d > best:
                best, idx = d, k
        if best > tol:
            keep[idx] = True
            stack += [(i, idx), (idx, j)]
    return [p for p, k in zip(pts, keep) if k]


MAX_MPS = 60 / 3.6   # batas atas kecepatan bus (60 km/jam)
TYP_MPS = 18 / 3.6   # kecepatan khas bila halte tak bisa ditempel


def shape_cum(pts):
    c = [0.0]
    for a, b in zip(pts, pts[1:]):
        c.append(c[-1] + dist(a, b))
    return c


def project(p, a, b):
    k = math.cos(math.radians(-6.2))
    ax, ay, bx, by, px, py = a[0] * k, a[1], b[0] * k, b[1], p[0] * k, p[1]
    vx, vy = bx - ax, by - ay
    vv = vx * vx + vy * vy
    f = 0 if vv == 0 else max(0.0, min(1.0, ((px - ax) * vx + (py - ay) * vy) / vv))
    return (a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1])), f


KIND = {
    "BRT": "brt", "Angkutan Umum Integrasi": "integrasi", "Mikrotrans": "mikrotrans",
    "Royaltrans": "royaltrans", "Rusun": "rusun", "Transjabodetabek": "transjabodetabek",
    "Bus Wisata": "wisata",
}

routes = []
for r in rows("routes.txt"):
    routes.append({
        "id": r["route_id"], "short": r["route_short_name"], "long": r["route_long_name"],
        "kind": KIND.get(r["route_desc"], "lainnya"),
        "color": "#" + (r["route_color"] or "3B82F6"), "text": "#" + (r["route_text_color"] or "FFFFFF"),
    })
route_ids = {r["id"] for r in routes}

calendar = {c["service_id"]: [int(c[d]) for d in
            ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")]
            for c in rows("calendar.txt")}

# shapes
shape_pts = defaultdict(list)
for s in rows("shapes.txt"):
    shape_pts[s["shape_id"]].append((int(s["shape_pt_sequence"]), float(s["shape_pt_lon"]), float(s["shape_pt_lat"])))

freqs = defaultdict(list)
for f in rows("frequencies.txt"):
    freqs[f["trip_id"]].append([hms(f["start_time"]), hms(f["end_time"]), int(f["headway_secs"])])

stop_times = defaultdict(list)
for st in rows("stop_times.txt"):
    stop_times[st["trip_id"]].append(st)

stops_raw = {s["stop_id"]: s for s in rows("stops.txt")}
stop_index, stops_out = {}, []
stop_routes = defaultdict(set)


def stop_idx(sid):
    if sid not in stop_index:
        s = stops_raw[sid]
        stop_index[sid] = len(stops_out)
        stops_out.append({"id": sid, "name": s["stop_name"],
                          "lon": round(float(s["stop_lon"]), 5), "lat": round(float(s["stop_lat"]), 5)})
    return stop_index[sid]


shape_index, shapes_out = {}, []
trips_out = []
for t in rows("trips.txt"):
    tid, rid = t["trip_id"], t["route_id"]
    if rid not in route_ids or t["service_id"] not in calendar or tid not in stop_times:
        continue
    sts = sorted(stop_times[tid], key=lambda x: int(x["stop_sequence"]))
    if len(sts) < 2 or t["shape_id"] not in shape_pts:
        continue
    raw = [(lon, lat) for _, lon, lat in sorted(shape_pts[t["shape_id"]])]
    if t["shape_id"] not in shape_index:
        shape_index[t["shape_id"]] = len(shapes_out)
        shapes_out.append([[round(x, 5), round(y, 5)] for x, y in simplify(raw)])
    shp = shapes_out[shape_index[t["shape_id"]]]
    # Tempelkan tiap halte ke garis rute (jarak dalam meter dari awal garis).
    # Halte hanya boleh maju sejauh yang masuk akal untuk waktu tempuhnya,
    # supaya rute memutar/bolak-balik tidak membuat bus "melompat" puluhan km.
    cum = shape_cum(shp)
    L = cum[-1]
    t0 = hms(sts[0]["arrival_time"])
    cur, prev_t = 0.0, 0
    seq = []
    for st in sts:
        s = stops_raw.get(st["stop_id"])
        if not s:
            continue
        p = (float(s["stop_lon"]), float(s["stop_lat"]))
        t_rel = hms(st["arrival_time"]) - t0
        reach = max(2500.0, (t_rel - prev_t) * MAX_MPS * 1.5)
        first, best = None, None
        for k in range(len(shp) - 1):
            if cum[k + 1] < cur - 30 or cum[k] > cur + reach:
                continue
            q, f = project(p, shp[k], shp[k + 1])
            along = cum[k] + f * (cum[k + 1] - cum[k])
            if along < cur - 30 or along > cur + reach:
                continue
            dq = dist(p, q)
            # lintasan PERTAMA yang lewat dekat halte (penting untuk rute melingkar)
            if dq < 120 and (first is None or along < first[1] - 1):
                first = (dq, along)
            if best is None or dq < best[0] - 1:
                best = (dq, along)
        pick = first or (best if best and best[0] < 400 else None)
        along = pick[1] if pick else min(L, cur + (t_rel - prev_t) * TYP_MPS)
        cur, prev_t = max(cur, along), t_rel
        si = stop_idx(st["stop_id"])
        stop_routes[si].add(rid)
        seq.append([si, t_rel, round(cur)])
    if L - seq[-1][2] < 600:
        seq[-1][2] = round(L)
    # pengaman 1: potongan yang masih terlalu cepat dibatasi
    for i in range(1, len(seq)):
        dt = max(1, seq[i][1] - seq[i - 1][1])
        if (seq[i][2] - seq[i - 1][2]) / dt > MAX_MPS:
            seq[i][2] = round(seq[i - 1][2] + dt * MAX_MPS)
    # pengaman 2: halte yang "tidak maju" (bus akan diam) diratakan menurut waktu
    # di antara dua halte jangkar yang jaraknya benar-benar bertambah
    anchors = [0] + [i for i in range(1, len(seq)) if seq[i][2] > seq[i - 1][2] + 5]
    if anchors[-1] != len(seq) - 1:
        anchors.append(len(seq) - 1)
        seq[-1][2] = round(max(seq[-1][2], L if L - seq[-1][2] < 600 else seq[-1][2]))
    for a, b in zip(anchors, anchors[1:]):
        if b - a < 2:
            continue
        ta, tb, da, db = seq[a][1], seq[b][1], seq[a][2], seq[b][2]
        for i in range(a + 1, b):
            f = (seq[i][1] - ta) / max(1, tb - ta)
            seq[i][2] = round(da + (db - da) * f)
    windows = freqs.get(tid) or [[t0, t0 + 1, 10 ** 9]]
    trips_out.append({"id": tid, "route": rid, "days": calendar[t["service_id"]],
                      "head": t["trip_headsign"], "shape": shape_index[t["shape_id"]],
                      "stops": seq, "freq": windows})

for i, s in enumerate(stops_out):
    s["routes"] = sorted(stop_routes[i])

used = {t["route"] for t in trips_out}
routes = [r for r in routes if r["id"] in used]

data = {"source": "https://gtfs.transjakarta.co.id/files/file_gtfs.zip",
        "routes": routes, "stops": stops_out, "shapes": shapes_out, "trips": trips_out}
with open(out, "w") as f:
    json.dump(data, f, separators=(",", ":"), ensure_ascii=False)
print(f"routes={len(routes)} stops={len(stops_out)} shapes={len(shapes_out)} trips={len(trips_out)}")
