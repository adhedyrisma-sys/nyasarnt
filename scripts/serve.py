"""Server lokal untuk mencoba Nyasarn't, tanpa cache (selalu file terbaru).
Pakai: python3 scripts/serve.py [port]"""
import http.server, os, sys
os.chdir(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public"))
class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()
port = int(sys.argv[1]) if len(sys.argv) > 1 else 5180
http.server.ThreadingHTTPServer(("", port), NoCache).serve_forever()
