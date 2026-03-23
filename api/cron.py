"""
Vercel Serverless Cron — Solar Health Check
Triggered daily via vercel.json cron schedule.
"""

import hashlib
import hmac
import base64
import uuid
import time
import datetime
import json
import os

import requests

# ==============================================================================
# CONFIGURACAO (env vars configuradas no painel do Vercel)
# ==============================================================================

APP_ID = os.environ.get("APSYSTEMS_APP_ID", "")
APP_SECRET = os.environ.get("APSYSTEMS_APP_SECRET", "")
BASE_URL = "https://api.apsystemsema.com:9282"

WHATSAPP_API_URL = os.environ.get("WHATSAPP_API_URL", "")
WHATSAPP_API_KEY = os.environ.get("WHATSAPP_API_KEY", "")
WHATSAPP_DEST_NUMBER = os.environ.get("WHATSAPP_DEST_NUMBER", "")

GOOGLE_SCRIPT_URL = os.environ.get("GOOGLE_SCRIPT_URL", "")
GOOGLE_SCRIPT_API_KEY = os.environ.get("GOOGLE_SCRIPT_API_KEY", "")

PAGE_SIZE = 50

LIGHT_STATUS = {
    1: ("ok", "Funcionando normalmente"),
    2: ("warning", "Alarmes em micro-inversores"),
    3: ("error", "Problema de conexao ECU"),
    4: ("inactive", "ECU sem dados"),
}

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

# ==============================================================================
# AUTENTICACAO APSYSTEMS
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


# ==============================================================================
# API CALLS
# ==============================================================================


def api_request(method, path, body=None):
    last_segment = path.rstrip("/").split("/")[-1]
    headers = build_signature(method, last_segment)
    url = BASE_URL + path

    if method.upper() == "POST":
        resp = requests.post(url, headers=headers, json=body, timeout=8)
    else:
        resp = requests.get(url, headers=headers, timeout=8)

    resp.raise_for_status()
    data = resp.json()

    if data.get("code") != 0:
        raise Exception(f"API code={data.get('code')} for {path}")

    return data


def get_all_systems():
    all_systems = []
    page = 1

    while True:
        result = api_request("POST", "/installer/api/v2/systems", {"page": page, "size": PAGE_SIZE})
        data = result.get("data", {})
        systems = data.get("systems", [])
        total = data.get("total", 0)

        all_systems.extend(systems)

        if len(all_systems) >= total or len(systems) == 0:
            break
        page += 1

    return all_systems


def send_whatsapp(message):
    if not WHATSAPP_API_URL:
        return
    requests.post(
        WHATSAPP_API_URL,
        headers={"apikey": WHATSAPP_API_KEY, "Content-Type": "application/json"},
        json={"number": WHATSAPP_DEST_NUMBER, "text": message},
        timeout=8,
    )


def send_to_sheets(systems):
    if not GOOGLE_SCRIPT_URL:
        return

    timestamp = datetime.datetime.now().isoformat()
    data = []
    for s in systems:
        sid = s.get("sid", "")
        light = s.get("light", 0)
        _, desc = LIGHT_STATUS.get(light, ("", "Status desconhecido"))
        data.append({
            "timestamp": timestamp,
            "sid": sid,
            "cliente": SYSTEM_CLIENTS.get(sid, "Desconhecido"),
            "capacidade_kw": s.get("capacity", 0),
            "status": light,
            "status_descricao": desc,
        })

    requests.post(
        GOOGLE_SCRIPT_URL,
        json={"api_key": GOOGLE_SCRIPT_API_KEY, "data": data},
        timeout=8,
    )


# ==============================================================================
# VERCEL SERVERLESS HANDLER
# ==============================================================================


def handler(request):
    """Vercel serverless function entry point."""
    # Vercel cron sends GET requests — verify with CRON_SECRET if set
    cron_secret = os.environ.get("CRON_SECRET", "")
    if cron_secret:
        auth_header = request.headers.get("Authorization", "")
        if auth_header != f"Bearer {cron_secret}":
            return {
                "statusCode": 401,
                "body": json.dumps({"error": "Unauthorized"}),
            }

    try:
        systems = get_all_systems()

        if not systems:
            send_whatsapp(
                "⚠️ *ALERTA - Monitoramento Solar AD Energia*\n\n"
                "Nao foi possivel obter dados dos sistemas. "
                "Verificar conexao com a API APsystems."
            )
            return {
                "statusCode": 200,
                "body": json.dumps({"status": "warning", "message": "No systems returned"}),
            }

        send_to_sheets(systems)

        problems = [s for s in systems if s.get("light") != 1]

        if problems:
            now = datetime.datetime.now().strftime("%d/%m/%Y as %H:%M")
            lines = [
                "⚠️ *ALERTA - Monitoramento Solar AD Energia*",
                "",
                f"Problemas detectados em {now}:",
                "",
            ]
            for s in problems:
                sid = s.get("sid", "???")
                cap = s.get("capacity", "?")
                light = s.get("light", 0)
                icon_map = {1: "🟢", 2: "🟡", 3: "🔴", 4: "⚪"}
                icon = icon_map.get(light, "❓")
                _, desc = LIGHT_STATUS.get(light, ("", "Status desconhecido"))
                lines.append(f"{icon} *{sid}* ({cap}kW) - {desc}")

            lines.append("")
            lines.append(f"{len(problems)} com problema / {len(systems)} monitorados")
            send_whatsapp("\n".join(lines))

        return {
            "statusCode": 200,
            "body": json.dumps({
                "status": "ok",
                "total": len(systems),
                "problems": len(problems),
                "timestamp": datetime.datetime.now().isoformat(),
            }),
        }

    except Exception as exc:
        try:
            send_whatsapp(
                f"🚨 *ERRO - Monitoramento Solar AD Energia*\n\n"
                f"Erro no cron serverless: {exc}\n"
                "Verificar logs no Vercel."
            )
        except Exception:
            pass

        return {
            "statusCode": 500,
            "body": json.dumps({"status": "error", "message": str(exc)}),
        }
