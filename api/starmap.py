from http.server import BaseHTTPRequestHandler
import json
import subprocess
import traceback
import os
from os.path import join, dirname, abspath

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body_bytes = self.rfile.read(content_length)
        data = json.loads(body_bytes.decode("utf-8"))

        lat = data.get("latitude")
        lng = data.get("longitude")
        date = data.get("date")
        time = data.get("time")
        utc_offset = data.get("utcOffset", 1)
        constellation = data.get("constellation", True)

        if lat is None or lng is None or not date or not time:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": False,
                "error": "Missing latitude/longitude/date/time"
            }).encode("utf-8"))
            return

        # project root en starmap repo
        root = dirname(dirname(abspath(__file__)))
        starmap_dir = join(root, "external", "starmap")
        script_path = join(starmap_dir, "starmap.py")
        output_path = join(starmap_dir, "starmap.svg")

        coord = f"{lat},{lng}"
        utc = f"+{utc_offset}" if utc_offset >= 0 else str(utc_offset)

        try:
            result = subprocess.run(
                [
                    "python3",
                    script_path,
                    "-coord", coord,
                    "-time", time,
                    "-date", date,
                    "-utc", utc,
                    "-constellation", str(constellation),
                ],
                cwd=starmap_dir,
                check=False,           # geen exception, we checken zelf
                capture_output=True,
                text=True,
            )

            if result.returncode != 0:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": False,
                    "error": "starmap.py failed",
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "code": result.returncode,
                }).encode("utf-8"))
                return

            with open(output_path, "r", encoding="utf-8") as f:
                svg = f.read()

            self.send_response(200)
            self.send_header("Content-Type", "image/svg+xml")
            self.end_headers()
            self.wfile.write(svg.encode("utf-8"))
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": False,
                "error": str(e),
                "trace": traceback.format_exc(),
            }).encode("utf-8"))