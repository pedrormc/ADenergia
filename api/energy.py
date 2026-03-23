"""
Vercel Serverless — Fetch energy data from APsystems API for a single system.
Called on-demand by the frontend when generating the economy PDF.

Usage:
  GET /api/energy?sid=E21E044135257041
  GET /api/energy?sid=E21E044135257041&from_date=2025-01-01&to_date=2025-12-31
"""

import hashlib
import hmac
import base64
import uuid
import time
import json
import os
from datetime import datetime, date
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

MONTH_NAMES = [
    "", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
]


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
# PERIOD HELPERS
# ==============================================================================


def determine_granularity(from_dt, to_dt):
    """Determina granularidade com base no range do periodo."""
    delta = (to_dt - from_dt).days
    if delta > 365:
        return "yearly"
    if delta > 60:
        return "monthly"
    return "daily"


def filter_yearly_to_period(yearly_kwh_list, start_year, from_dt, to_dt):
    """Filtra dados anuais ao periodo e estima proporcional se necessario."""
    delta_days = (to_dt - from_dt).days
    chart_data = []

    for i, kwh in enumerate(yearly_kwh_list):
        year = start_year + i
        if from_dt.year <= year <= to_dt.year:
            # Se o periodo cobre parte do ano, estima proporcional
            year_start = date(year, 1, 1)
            year_end = date(year, 12, 31)
            period_start = max(from_dt, year_start)
            period_end = min(to_dt, year_end)
            days_in_year = (year_end - year_start).days + 1
            days_in_period = (period_end - period_start).days + 1

            if delta_days <= 365 and days_in_period < days_in_year:
                # Periodo curto: estima proporcional
                estimated = kwh * (days_in_period / days_in_year)
                label = f"{MONTH_NAMES[period_start.month]}-{MONTH_NAMES[period_end.month]}/{str(year)[2:]}"
                chart_data.append({"label": label, "kwh": round(estimated, 2)})
            else:
                chart_data.append({"label": str(year), "kwh": kwh})

    return chart_data


def build_monthly_chart(sid, from_dt, to_dt):
    """Grafico por mes — busca monthly para cada ano no range."""
    chart_data = []
    for year in range(from_dt.year, to_dt.year + 1):
        try:
            resp = api_get(
                f"/installer/api/v2/systems/energy/{sid}"
                f"?energy_level=monthly&date={year}"
            )
            monthly_data = resp.get("data", [])
            monthly_kwh = [float(v) for v in monthly_data] if monthly_data else []

            for month_idx, kwh in enumerate(monthly_kwh):
                m = month_idx + 1
                dt = date(year, m, 1)
                # Filtra apenas meses dentro do periodo
                if dt < date(from_dt.year, from_dt.month, 1):
                    continue
                if dt > date(to_dt.year, to_dt.month, 1):
                    continue
                if kwh > 0:
                    label = f"{MONTH_NAMES[m]}/{str(year)[2:]}"
                    chart_data.append({"label": label, "kwh": kwh})
        except Exception:
            # Fallback: se monthly nao funciona, tenta yearly e distribui
            pass
    return chart_data


def build_daily_chart(sid, from_dt, to_dt):
    """Grafico por dia — busca daily para cada mes no range."""
    chart_data = []
    current = date(from_dt.year, from_dt.month, 1)
    end = date(to_dt.year, to_dt.month, 1)

    while current <= end:
        try:
            date_param = f"{current.year}-{current.month:02d}"
            resp = api_get(
                f"/installer/api/v2/systems/energy/{sid}"
                f"?energy_level=daily&date={date_param}"
            )
            daily_data = resp.get("data", [])
            daily_kwh = [float(v) for v in daily_data] if daily_data else []

            for day_idx, kwh in enumerate(daily_kwh):
                d = day_idx + 1
                try:
                    dt = date(current.year, current.month, d)
                except ValueError:
                    break
                if dt < from_dt or dt > to_dt:
                    continue
                if kwh > 0:
                    label = f"{d:02d}/{current.month:02d}"
                    chart_data.append({"label": label, "kwh": kwh})
        except Exception:
            pass

        # Proximo mes
        if current.month == 12:
            current = date(current.year + 1, 1, 1)
        else:
            current = date(current.year, current.month + 1, 1)

    return chart_data


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

        # Params opcionais de periodo
        from_date_str = params.get("from_date", [None])[0]
        to_date_str = params.get("to_date", [None])[0]

        try:
            # 1. System details (for create_date, capacity)
            details = api_get(f"/installer/api/v2/systems/details/{sid}")
            system_data = details.get("data", {})
            create_date = system_data.get("create_date", "")
            capacity = system_data.get("capacity", "0")

            # 2. Energy summary (today, month, year, lifetime in kWh)
            summary = api_get(f"/installer/api/v2/systems/summary/{sid}")
            summary_data = summary.get("data", {})

            cliente = SYSTEM_CLIENTS.get(sid, "Cliente")

            lifetime_kwh = float(summary_data.get("lifetime", "0"))
            year_kwh = float(summary_data.get("year", "0"))
            month_kwh = float(summary_data.get("month", "0"))
            today_kwh = float(summary_data.get("today", "0"))

            # 3. Yearly energy breakdown (sempre retorna para compatibilidade)
            yearly = api_get(
                f"/installer/api/v2/systems/energy/{sid}?energy_level=yearly"
            )
            yearly_data = yearly.get("data", [])
            yearly_kwh_list = [float(v) for v in yearly_data] if yearly_data else []

            start_year = int(create_date.split("-")[0]) if create_date else 2025
            if create_date:
                yearly_labeled = {
                    str(start_year + i): kwh
                    for i, kwh in enumerate(yearly_kwh_list)
                }
            else:
                yearly_labeled = {}

            # 4. Determinar periodo e granularidade do grafico
            today = date.today()
            if from_date_str and to_date_str:
                from_dt = datetime.strptime(from_date_str, "%Y-%m-%d").date()
                to_dt = datetime.strptime(to_date_str, "%Y-%m-%d").date()
            elif from_date_str:
                from_dt = datetime.strptime(from_date_str, "%Y-%m-%d").date()
                to_dt = today
            else:
                # Sem periodo: usa desde create_date ate hoje
                from_dt = (
                    datetime.strptime(create_date, "%Y-%m-%d").date()
                    if create_date else today
                )
                to_dt = today

            granularity = determine_granularity(from_dt, to_dt)

            # 5. Buscar chart_data — cascata: daily → monthly → yearly
            chart_data = []

            if granularity == "daily":
                chart_data = build_daily_chart(sid, from_dt, to_dt)
                if not chart_data:
                    chart_data = build_monthly_chart(sid, from_dt, to_dt)
                    if chart_data:
                        granularity = "monthly"

            if granularity == "monthly" and not chart_data:
                chart_data = build_monthly_chart(sid, from_dt, to_dt)

            # Fallback final: yearly filtrado e proporcional ao periodo
            if not chart_data:
                granularity = "yearly"
                chart_data = filter_yearly_to_period(
                    yearly_kwh_list, start_year, from_dt, to_dt
                )

            # Economia total do periodo
            period_kwh = sum(item["kwh"] for item in chart_data)
            period_economy = round(period_kwh * TARIFA_KWH, 2)

            # Calcular meses no periodo para media mensal
            months_in_period = max(
                1,
                (to_dt.year - from_dt.year) * 12
                + (to_dt.month - from_dt.month)
                + 1,
            )
            avg_monthly_economy = round(period_economy / months_in_period, 2)

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
                "period": {
                    "from": from_dt.isoformat(),
                    "to": to_dt.isoformat(),
                    "granularity": granularity,
                    "economy_total": period_economy,
                    "energy_total_kwh": round(period_kwh, 2),
                    "avg_monthly_economy": avg_monthly_economy,
                    "months_in_period": months_in_period,
                    "chart_data": chart_data,
                },
            })

        except Exception as exc:
            print(f"[energy] erro ao processar sid={sid}: {exc}")
            self._respond(500, {"error": "Erro ao consultar dados do sistema."})

    def _respond(self, status_code, body):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())
