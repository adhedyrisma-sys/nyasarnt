"""Kumpulkan titik prakiraan cuaca BMKG (satu kelurahan wakil per kecamatan di DKI Jakarta).
Pakai: python3 scripts/build_weather_areas.py   (menghasilkan public/data/weather-areas.json)
"""
import json, time, subprocess, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
areas = []
for kota in ["31.71", "31.72", "31.73", "31.74", "31.75", "31.01"]:
    for kec in range(1, 11):
        code = f"{kota}.{kec:02d}.1001"
        url = f"https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={code}"
        try:
            raw = subprocess.run(["curl", "-sS", "-m", "20", "-A", "transit-map-dev/0.1", url],
                                 capture_output=True, check=True).stdout
            d = json.loads(raw)
            lok = d["data"][0]["lokasi"]
            areas.append({"adm4": code, "kecamatan": lok["kecamatan"], "kota": lok["kotkab"],
                          "lat": round(lok["lat"], 5), "lon": round(lok["lon"], 5)})
            print("ok ", code, lok["kecamatan"])
        except Exception as e:
            print("-- ", code, type(e).__name__)
        time.sleep(1.1)  # sopan: < 60 permintaan per menit
json.dump({"source": "BMKG (api.bmkg.go.id)", "areas": areas},
          open(os.path.join(ROOT, "public/data/weather-areas.json"), "w"), ensure_ascii=False, indent=0)
print(len(areas), "kecamatan")
