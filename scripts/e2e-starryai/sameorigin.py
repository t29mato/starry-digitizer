"""Same origin as starryai's nginx, for the browser check (scripts/e2e-starryai).

Serves the starryai build at /sd/ and passes /wpd-auto/api/ to a
local wpd-auto backend (like nginx's proxy_pass). Binds 127.0.0.1 only.
Standard library only.

Usage: python3 -I sameorigin.py <www dir> <backend origin> <port>
  e.g. python3 -I sameorigin.py /tmp/x/www http://127.0.0.1:24866 24960
"""
import sys
import urllib.error
import urllib.request
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

WWW, BACKEND, PORT = sys.argv[1], sys.argv[2].rstrip("/"), int(sys.argv[3])
# the request headers the page sends to the backend (nginx passes them all)
PASS = ("content-type", "x-wpd-app", "x-wpd-client-id", "x-wpd-session-id",
        "x-wpd-request-id", "x-wpd-user", "x-wpd-token", "authorization")
API = "/wpd-auto/api/"
APP = "/sd"


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):  # the path only (no query, no headers)
        sys.stderr.write("%s %s\n" % (self.command, self.path.split("?")[0]))

    def proxy(self, method):
        n = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(n) if n else None
        url = BACKEND + "/api/" + self.path[len(API):]
        headers = {k: v for k, v in self.headers.items() if k.lower() in PASS}
        req = urllib.request.Request(url, data=body, method=method, headers=headers)
        try:
            r = urllib.request.urlopen(req, timeout=180)
            status, rheaders, data = r.status, r.headers, r.read()
        except urllib.error.HTTPError as e:
            status, rheaders, data = e.code, e.headers, e.read()
        except OSError:
            status, rheaders, data = 502, {}, b""
        self.send_response(status)
        for k in ("Content-Type", "Retry-After", "WWW-Authenticate"):
            if rheaders.get(k):
                self.send_header(k, rheaders[k])
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path.startswith(API):
            return self.proxy("GET")
        if self.path.startswith(APP + "/"):
            self.path = self.path[len(APP):]
            return super().do_GET()
        self.send_response(302)
        self.send_header("Location", APP + "/")
        self.end_headers()

    def do_POST(self):
        if self.path.startswith(API):
            return self.proxy("POST")
        self.send_error(404)

    def do_PUT(self):
        if self.path.startswith(API):
            return self.proxy("PUT")
        self.send_error(404)


ThreadingHTTPServer(("127.0.0.1", PORT), partial(Handler, directory=WWW)).serve_forever()
