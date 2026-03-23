# Google Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar o cron job Python ao Google Sheets via Apps Script, externalizando credenciais e criando a camada de dados para o dashboard.

**Architecture:** O Python envia POST com dados dos sistemas para o Google Apps Script (doPost), que valida a api_key e grava na planilha. O Apps Script também expõe um doGet que retorna JSON filtrado para consumo do frontend.

**Tech Stack:** Python 3 + requests, Google Apps Script (JavaScript), Google Sheets

**Spec:** `docs/superpowers/specs/2026-03-23-solar-dashboard-design.md`

---

## Chunk 1: Google Apps Script

### Task 1: Criar o Google Apps Script — doPost

**Files:**
- Create: `google_apps_script.js`

- [ ] **Step 1: Criar arquivo `google_apps_script.js` com constantes e doPost**

```javascript
// google_apps_script.js
// Colar este codigo no editor do Google Apps Script (Extensions > Apps Script)

const API_KEY = "TROCAR_POR_UMA_CHAVE_SEGURA";
const SHEET_NAME = "Dados";

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);

    if (payload.api_key !== API_KEY) {
      return ContentService.createTextOutput(
        JSON.stringify({ error: "Unauthorized" })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    var sheet =
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_NAME);
      sheet.appendRow([
        "timestamp",
        "sid",
        "cliente",
        "capacidade_kw",
        "status",
        "status_descricao",
      ]);
    }

    var data = payload.data;
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      sheet.appendRow([
        row.timestamp,
        row.sid,
        row.cliente,
        row.capacidade_kw,
        row.status,
        row.status_descricao,
      ]);
    }

    return ContentService.createTextOutput(
      JSON.stringify({ success: true, rows: data.length })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
```

- [ ] **Step 2: Verificar que o arquivo foi criado corretamente**

Ler o arquivo e confirmar que tem: constante API_KEY, validação, criação de aba se não existir, loop de append.

### Task 2: Criar o Google Apps Script — doGet

**Files:**
- Modify: `google_apps_script.js`

- [ ] **Step 1: Adicionar função doGet com filtros ao arquivo**

Adicionar ao final de `google_apps_script.js`:

```javascript
function doGet(e) {
  try {
    var sheet =
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    if (!sheet) {
      return ContentService.createTextOutput(
        JSON.stringify({ data: [] })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var rows = [];

    var paramCliente = e.parameter.cliente || null;
    var paramFrom = e.parameter.from || null;
    var paramTo = e.parameter.to || null;
    var paramStatus = e.parameter.status || null;

    for (var i = 1; i < data.length; i++) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j];
      }

      if (paramCliente && row.cliente !== paramCliente) continue;
      if (paramStatus && String(row.status) !== String(paramStatus)) continue;
      if (paramFrom && row.timestamp < paramFrom) continue;
      if (paramTo && row.timestamp > paramTo) continue;

      rows.push(row);
    }

    var output = ContentService.createTextOutput(
      JSON.stringify({ data: rows })
    ).setMimeType(ContentService.MimeType.JSON);

    return output;
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
```

- [ ] **Step 2: Verificar arquivo completo**

Ler `google_apps_script.js` e confirmar que tem doPost e doGet, ambos com try/catch e retorno JSON.

### Task 3: Instruções de deploy do Apps Script

**Files:**
- Modify: `google_apps_script.js`

- [ ] **Step 1: Adicionar comentário de deploy no topo do arquivo**

Adicionar bloco de instruções no topo de `google_apps_script.js`, antes das constantes:

```javascript
/*
 * ==========================================================================
 * INSTRUCOES DE DEPLOY
 * ==========================================================================
 *
 * 1. Criar uma planilha no Google Sheets
 * 2. Ir em Extensions > Apps Script
 * 3. Colar todo o conteudo deste arquivo no editor
 * 4. Trocar API_KEY por uma chave segura (gerar com: python -c "import secrets; print(secrets.token_hex(32))")
 * 5. Deploy > New deployment
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copiar a URL do deployment (usar como GOOGLE_SCRIPT_URL no Python)
 * 7. A aba "Dados" sera criada automaticamente no primeiro POST
 *
 * ==========================================================================
 */
```

- [ ] **Step 2: Commit do Apps Script completo**

```bash
git add google_apps_script.js
git commit -m "feat: add Google Apps Script for data storage (doPost + doGet)"
```

---

## Chunk 2: Python — Externalizar credenciais e enviar dados

### Task 4: Criar .gitignore

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Criar .gitignore na raiz do projeto**

```
.env
__pycache__/
*.pyc
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add .gitignore for env files and Python cache"
```

### Task 5: Externalizar credenciais para variáveis de ambiente

**Files:**
- Modify: `solar_health_monitor.py`

- [ ] **Step 1: Adicionar import os e migrar credenciais**

No topo do arquivo, após `import logging`, adicionar `import os`.

Substituir o bloco de configuração (de `APP_ID = "2c9f95c7..."` até `PAGE_SIZE = 50`) por:

```python
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
```

- [ ] **Step 2: Verificar que o script ainda roda sem erros de syntax**

```bash
python -c "import py_compile; py_compile.compile('solar_health_monitor.py', doraise=True)"
```

Expected: sem output (sucesso).

- [ ] **Step 3: Commit**

```bash
git add solar_health_monitor.py
git commit -m "refactor: externalize credentials to environment variables"
```

### Task 6: Adicionar dicionário SYSTEM_CLIENTS

**Files:**
- Modify: `solar_health_monitor.py`

- [ ] **Step 1: Adicionar dicionário de clientes após LIGHT_STATUS**

Inserir após o `}` que fecha o dicionário `LIGHT_STATUS`:

```python
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
```

- [ ] **Step 2: Verificar syntax**

```bash
python -c "import py_compile; py_compile.compile('solar_health_monitor.py', doraise=True)"
```

- [ ] **Step 3: Commit**

```bash
git add solar_health_monitor.py
git commit -m "feat: add system-to-client name mapping dictionary"
```

### Task 7: Adicionar função send_to_sheets e integrar no health check

**Files:**
- Modify: `solar_health_monitor.py`

- [ ] **Step 1: Adicionar função send_to_sheets após send_whatsapp**

Inserir após o `return False` que fecha a função `send_whatsapp`:

```python
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
```

- [ ] **Step 2: Integrar send_to_sheets no run_health_check**

Na função `run_health_check`, após o bloco `if not systems: ... return` e antes da linha `problems = [...]`, adicionar a chamada. O trecho ficará:

```python
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
```

- [ ] **Step 3: Verificar syntax**

```bash
python -c "import py_compile; py_compile.compile('solar_health_monitor.py', doraise=True)"
```

- [ ] **Step 4: Commit**

```bash
git add solar_health_monitor.py
git commit -m "feat: send system data to Google Sheets via Apps Script"
```

### Task 8: Criar arquivo .env.example

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Criar .env.example na raiz do projeto**

```bash
# APsystems OpenAPI
APSYSTEMS_APP_ID=
APSYSTEMS_APP_SECRET=

# WhatsApp - Evolution API
WHATSAPP_API_URL=
WHATSAPP_API_KEY=
WHATSAPP_DEST_NUMBER=

# Google Apps Script
GOOGLE_SCRIPT_URL=
GOOGLE_SCRIPT_API_KEY=
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add .env.example with all required environment variables"
```
