"""
Monitoramento de Saude - Sistemas Solares APsystems
AD Energia - Script de verificacao diaria via OpenAPI

Envia alerta via WhatsApp (Evolution API) quando detecta problemas.
"""

import hashlib
import hmac
import base64
import uuid
import time
import datetime
import json
import logging
import os

import requests
from dotenv import load_dotenv

load_dotenv()

# ==============================================================================
# CONFIGURACAO
# ==============================================================================

# NOTA: fallbacks temporarios para transicao. Remover apos configurar .env
APP_ID = os.environ.get("APSYSTEMS_APP_ID", "2c9f95c799b4fb790199bfb7bc1607f1")
APP_SECRET = os.environ.get("APSYSTEMS_APP_SECRET", "bfb7bc1407f0")
BASE_URL = "https://api.apsystemsema.com:9282"

WHATSAPP_API_URL = os.environ.get(
    "WHATSAPP_API_URL",
    "https://evolution.blackgroup-bia.shop/message/sendText/EVENTO",
)
WHATSAPP_API_KEY = os.environ.get(
    "WHATSAPP_API_KEY", "E9384B815BE2-4F55-BE5A-42C3716F74A4"
)
WHATSAPP_DEST_NUMBER = os.environ.get(
    "WHATSAPP_DEST_NUMBER", "556199272347@s.whatsapp.net"
)

GOOGLE_SCRIPT_URL = os.environ.get("GOOGLE_SCRIPT_URL", "")
GOOGLE_SCRIPT_API_KEY = os.environ.get("GOOGLE_SCRIPT_API_KEY", "")

CHECK_INTERVAL_HOURS = 24
PAGE_SIZE = 50

# ==============================================================================
# LOGGING
# ==============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("solar_monitor")

# ==============================================================================
# STATUS MAP
# ==============================================================================

LIGHT_STATUS = {
    1: ("🟢", "Funcionando normalmente"),
    2: ("🟡", "Alarmes em micro-inversores"),
    3: ("🔴", "Problema de conexao ECU"),
    4: ("⚪", "ECU sem dados"),
}

# ==============================================================================
# MAPEAMENTO SISTEMA -> CLIENTE
# ==============================================================================

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
    """
    Gera os headers de autenticacao conforme doc APsystems OpenAPI.

    stringToSign = Timestamp/Nonce/AppId/RequestPath/HTTPMethod/SignatureMethod
    signature = Base64(HMAC-SHA256(APP_SECRET, stringToSign))

    request_path: ultimo segmento da URL (ex: "systems", "details", etc.)
    """
    timestamp = str(int(time.time() * 1000))
    nonce = uuid.uuid4().hex
    signature_method = "HmacSHA256"

    string_to_sign = "/".join([
        timestamp,
        nonce,
        APP_ID,
        request_path,
        http_method.upper(),
        signature_method,
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
# CHAMADAS API
# ==============================================================================


def api_request(method, path, body=None):
    """Faz uma requisicao autenticada para a APsystems OpenAPI."""
    last_segment = path.rstrip("/").split("/")[-1]
    headers = build_signature(method, last_segment)
    url = BASE_URL + path

    try:
        if method.upper() == "POST":
            resp = requests.post(url, headers=headers, json=body, timeout=30)
        else:
            resp = requests.get(url, headers=headers, timeout=30)

        resp.raise_for_status()
        data = resp.json()

        if data.get("code") != 0:
            log.error("API retornou code=%s para %s", data.get("code"), path)
            return None

        return data

    except requests.RequestException as exc:
        log.error("Erro na requisicao %s %s: %s", method, path, exc)
        return None


def get_all_systems():
    """
    Busca todos os sistemas paginando ate o fim.
    Retorna lista de dicts com sid, light, capacity, type, ecu, etc.
    """
    all_systems = []
    page = 1

    while True:
        body = {"page": page, "size": PAGE_SIZE}
        result = api_request("POST", "/installer/api/v2/systems", body)

        if result is None:
            log.error("Falha ao buscar sistemas na pagina %d", page)
            break

        data = result.get("data", {})
        systems = data.get("systems", [])
        total = data.get("total", 0)

        all_systems.extend(systems)
        log.info(
            "Pagina %d: %d sistemas recebidos (total=%d)",
            page, len(systems), total,
        )

        if len(all_systems) >= total or len(systems) == 0:
            break

        page += 1

    return all_systems


# ==============================================================================
# WHATSAPP - EVOLUTION API
# ==============================================================================


def send_whatsapp(message):
    """Envia mensagem de texto via Evolution API."""
    headers = {
        "apikey": WHATSAPP_API_KEY,
        "Content-Type": "application/json",
    }
    body = {
        "number": WHATSAPP_DEST_NUMBER,
        "text": message,
    }

    try:
        resp = requests.post(
            WHATSAPP_API_URL,
            headers=headers,
            json=body,
            timeout=15,
        )
        resp.raise_for_status()
        log.info("WhatsApp enviado com sucesso")
        return True
    except requests.RequestException as exc:
        log.error("Erro ao enviar WhatsApp: %s", exc)
        return False


# ==============================================================================
# GOOGLE SHEETS - APPS SCRIPT
# ==============================================================================


def send_to_sheets(systems):
    """Envia dados dos sistemas para o Google Sheets via Apps Script."""
    if not GOOGLE_SCRIPT_URL:
        log.warning("GOOGLE_SCRIPT_URL nao configurada, pulando envio para Sheets")
        return False

    timestamp = datetime.datetime.now().isoformat()

    data = []
    for s in systems:
        sid = s.get("sid", "")
        light = s.get("light", 0)
        _, status_descricao = LIGHT_STATUS.get(light, ("", "Status desconhecido"))

        data.append({
            "timestamp": timestamp,
            "sid": sid,
            "cliente": SYSTEM_CLIENTS.get(sid, "Desconhecido"),
            "capacidade_kw": s.get("capacity", 0),
            "status": light,
            "status_descricao": status_descricao,
        })

    body = {
        "api_key": GOOGLE_SCRIPT_API_KEY,
        "data": data,
    }

    try:
        resp = requests.post(GOOGLE_SCRIPT_URL, json=body, timeout=30)
        resp.raise_for_status()
        result = resp.json()

        if result.get("error"):
            log.error("Apps Script retornou erro: %s", result["error"])
            return False

        log.info("Dados enviados para Sheets: %d linhas", len(data))
        return True
    except requests.RequestException as exc:
        log.error("Erro ao enviar para Sheets: %s", exc)
        return False


# ==============================================================================
# HEALTH CHECK
# ==============================================================================


def build_alert_message(problems, total_systems):
    """Monta a mensagem de alerta formatada para WhatsApp."""
    now = datetime.datetime.now().strftime("%d/%m/%Y as %H:%M")

    lines = [
        "⚠️ *ALERTA - Monitoramento Solar AD Energia*",
        "",
        f"Problemas detectados em {now}:",
        "",
    ]

    for system in problems:
        sid = system.get("sid", "???")
        capacity = system.get("capacity", "?")
        light = system.get("light", 0)
        icon, description = LIGHT_STATUS.get(light, ("❓", "Status desconhecido"))
        lines.append(f"{icon} *{sid}* ({capacity}kW) - {description}")

    lines.append("")
    lines.append(f"{len(problems)} com problema / {total_systems} monitorados")

    return "\n".join(lines)


def run_health_check():
    """Executa a verificacao de saude de todos os sistemas."""
    log.info("=" * 50)
    log.info("Iniciando verificacao de saude...")

    systems = get_all_systems()

    if not systems:
        log.warning("Nenhum sistema retornado pela API")
        send_whatsapp(
            "⚠️ *ALERTA - Monitoramento Solar AD Energia*\n\n"
            "Nao foi possivel obter dados dos sistemas. "
            "Verificar conexao com a API APsystems."
        )
        return

    # Envia para Google Sheets (falha nao bloqueia o fluxo)
    send_to_sheets(systems)

    problems = [s for s in systems if s.get("light") != 1]

    log.info(
        "Resultado: %d sistemas verificados, %d com problemas",
        len(systems), len(problems),
    )

    if problems:
        for s in problems:
            light = s.get("light", 0)
            icon, desc = LIGHT_STATUS.get(light, ("❓", "???"))
            log.warning("  %s %s (%skW) - %s", icon, s["sid"], s.get("capacity", "?"), desc)

        message = build_alert_message(problems, len(systems))
        send_whatsapp(message)
    else:
        log.info("Todos os %d sistemas estao funcionando normalmente ✅", len(systems))


# ==============================================================================
# MAIN LOOP
# ==============================================================================


def main():
    log.info("Solar Health Monitor - AD Energia")
    log.info("Intervalo entre checks: %dh", CHECK_INTERVAL_HOURS)
    log.info("Destino WhatsApp: %s", WHATSAPP_DEST_NUMBER)
    log.info("-" * 50)

    while True:
        try:
            run_health_check()
        except Exception as exc:
            log.exception("Erro inesperado durante health check: %s", exc)
            try:
                send_whatsapp(
                    "🚨 *ERRO - Monitoramento Solar AD Energia*\n\n"
                    f"Erro inesperado no script: {exc}\n"
                    "Verificar logs do servidor."
                )
            except Exception:
                log.exception("Falha ao enviar alerta de erro")

        log.info("Proximo check em %dh...", CHECK_INTERVAL_HOURS)
        time.sleep(CHECK_INTERVAL_HOURS * 3600)


if __name__ == "__main__":
    main()
