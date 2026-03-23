"""
Vercel Serverless — Fetch energy data from APsystems API for a single system.
Called on-demand by the frontend when generating the economy PDF.

Usage: GET /api/energy?sid=E21E044135257041
"""

import hashlib
import hmac
import base64
import uuid
import time
import json
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

import requests

# ==============================================================================
# CONFIG
# ==============================================================================

APP_ID = os.environ.get("APSYSTEMS_APP_ID", "")
APP_SECRET = os.environ.get("APSYSTEMS_APP_SECRET", "")
BASE_URL = "https://api.apsystemsema.com:9282"

SYSTEM_CLIENTS = {
    "E21E044135257041": "Clei Barros",
    "E21E044135349333": "Guilherme_umpierre",
    "E21E044161431312": "Daniele",
    "E21E044168495545": "Carlos.ribeiro",
    "E22E277103425504": "Marcio C",
    "E22E277105806328": "fgcarvalho",
    "E22E277106899477": "EsioB",
    "E22E277111284159": "AIDAB",
    "E22E277116332427": "serafim amaral",
    "E22E277117450701": "ricardo_coelho",
}

TARIFA_KWH = 0.90  # R$/kWh — Neoenergia Brasilia DF (faixa 201-300 kWh)


# ==============================================================================
# APSYSTEMS AUTH
# ==============================================================================


def build_signature(http_method, request_path):
    timestamp = str(int(time.time() * 1000))
    nonce = uuid.uuid4().hex
    signature_method = "HmacSHA256"

    string_to_sign = "/".join([
        timestamp, nonce, APP_ID, request_path,
        http_method.upper(), signature_method,
    ])

    raw_signature = hmac.new(
        APP_SECRET.encode("utf-8"),
        string_to_sign.encode("utf-8"),
        hashlib.sha256,
    ).digest()

    signature = base64.b64encode(raw_signature).decode("utf-8")

    return {
        "X-CA-AppId": APP_ID,
        "X-CA-Timestamp": timestamp,
        "X-CA-Nonce": nonce,
        "X-CA-Signature-Method": signature_method,
        "X-CA-Signature": signature,
        "Content-Type": "application/json",
    }


def api_get(path):
    last_segment = path.rstrip("/").split("/")[-1]
    # For paths with query params, strip them from the segment
    if "?" in last_segment:
        last_segment = last_segment.split("?")[0]
    headers = build_signature("GET", last_segment)
    url = BASE_URL + path
    resp = requests.get(url, headers=headers, timeout=6)
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != 0:
        raise Exception(f"API code={data.get('code')} for {path}")
    return data


# ==============================================================================
# HANDLER
# ==============================================================================


class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        sid = params.get("sid", [None])[0]

        if not sid:
            self._respond(400, {"error": "Missing 'sid' parameter"})
            return

        if not APP_ID or not APP_SECRET:
            self._respond(500, {"error": "APsystems credentials not configured"})
            return

        try:
            # 1. System details (for create_date, capacity)
            details = api_get(f"/installer/api/v2/systems/details/{sid}")
            system_data = details.get("data", {})
            create_date = system_data.get("create_date", "")
            capacity = system_data.get("capacity", "0")

            # 2. Energy summary (today, month, year, lifetime in kWh)
            summary = api_get(f"/installer/api/v2/systems/summary/{sid}")
            summary_data = summary.get("data", {})

            # 3. Yearly energy breakdown
            yearly = api_get(f"/installer/api/v2/systems/energy/{sid}?energy_level=yearly")
            yearly_data = yearly.get("data", [])

            # Build response
            cliente = SYSTEM_CLIENTS.get(sid, "Cliente")

            lifetime_kwh = float(summary_data.get("lifetime", "0"))
            year_kwh = float(summary_data.get("year", "0"))
            month_kwh = float(summary_data.get("month", "0"))
            today_kwh = float(summary_data.get("today", "0"))

            # Yearly breakdown: list of kWh strings, one per year since installation
            yearly_kwh = [float(v) for v in yearly_data] if yearly_data else []

            # Determine year labels from create_date
            if create_date:
                start_year = int(create_date.split("-")[0])
                yearly_labeled = {
                    str(start_year + i): kwh
                    for i, kwh in enumerate(yearly_kwh)
                }
            else:
                yearly_labeled = {}

            self._respond(200, {
                "sid": sid,
                "cliente": cliente,
                "create_date": create_date,
                "capacity_kw": capacity,
                "tarifa_kwh": TARIFA_KWH,
                "energy": {
                    "today_kwh": today_kwh,
                    "month_kwh": month_kwh,
                    "year_kwh": year_kwh,
                    "lifetime_kwh": lifetime_kwh,
                },
                "economy": {
                    "today": round(today_kwh * TARIFA_KWH, 2),
                    "month": round(month_kwh * TARIFA_KWH, 2),
                    "year": round(year_kwh * TARIFA_KWH, 2),
                    "lifetime": round(lifetime_kwh * TARIFA_KWH, 2),
                },
                "yearly_breakdown": yearly_labeled,
            })

        except Exception as exc:
            self._respond(500, {"error": str(exc)})

    def _respond(self, status_code, body):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())
