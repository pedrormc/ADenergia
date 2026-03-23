# AD Energia — Solar Health Monitor

Sistema de monitoramento de saude para sistemas solares APsystems. Coleta dados de ~30 sistemas via API, armazena historico no Google Sheets e exibe um dashboard visual com filtros avancados e exportacao de relatorio PDF.

## Arquitetura

```
┌─────────────────────┐        POST JSON        ┌───────────────────────┐
│   Python Cron Job   │ ──────────────────────▶  │  Google Apps Script   │
│   (a cada 24h)      │                          │  (doPost)             │
│                     │                          └──────────┬────────────┘
│  • APsystems API    │                                     │ grava
│  • WhatsApp alerts  │                                     ▼
└─────────────────────┘                          ┌───────────────────────┐
                                                 │   Google Sheets       │
                                                 │   aba "Dados"         │
                                                 └──────────┬────────────┘
                                                            │ le (JSON)
                                                            ▼
                                                 ┌───────────────────────┐
                                                 │   Vite + React SPA    │
                                                 │   (Vercel)            │
                                                 │                       │
                                                 │  • Dashboard + KPIs   │
                                                 │  • Filtros avancados  │
                                                 │  • Exportar PDF       │
                                                 └───────────────────────┘
```

O fluxo e unidirecional: **Python → Google Sheets → Frontend**. Sem banco de dados tradicional.

## Componentes

### 1. Cron Job Python (`solar_health_monitor.py`)

Script que roda continuamente (loop de 24h) e executa:

- **Coleta**: consulta a APsystems OpenAPI para obter status de todos os sistemas solares
- **Alerta**: envia mensagem WhatsApp via Evolution API quando detecta problemas
- **Armazenamento**: envia snapshot completo dos sistemas para o Google Sheets via Apps Script

**Status dos sistemas** (campo `light`):
| Codigo | Significado |
|--------|-------------|
| 1 | Funcionando normalmente |
| 2 | Alarmes em micro-inversores |
| 3 | Problema de conexao ECU |
| 4 | ECU sem dados |

### 2. Google Apps Script (`google_apps_script.js`)

Codigo para colar no editor do Apps Script (Extensions > Apps Script) da planilha Google Sheets.

- **doPost**: recebe JSON do Python, valida api_key, grava linhas na aba "Dados"
- **doGet**: retorna dados da planilha como JSON, com filtros opcionais (`?cliente=`, `?from=`, `?to=`, `?status=`)

### 3. Dashboard Frontend (`dashboard/`)

SPA em Vite + React deployada no Vercel.

- **KPI Cards**: total de sistemas, funcionando OK, com problema, capacidade total kW
- **Filtros**: por cliente, por periodo (dia/semana/mes/custom), por status
- **Tabela**: listagem completa com ID da placa, cliente, capacidade e status
- **PDF**: exportacao de relatorio resumo executivo (1 pagina)

## Estrutura do Projeto

```
ADenergia/
├── solar_health_monitor.py       # Cron job Python
├── google_apps_script.js         # Codigo do Google Apps Script
├── dashboard/                    # Frontend React (Vercel)
│   ├── src/
│   │   ├── App.jsx               # Layout principal
│   │   ├── config.js             # URL do Apps Script
│   │   ├── hooks/
│   │   │   └── useSolarData.js   # Fetch e cache dos dados
│   │   ├── utils/
│   │   │   ├── filters.js        # Logica de filtros e KPIs
│   │   │   └── pdf.js            # Geracao do PDF
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── FilterBar.jsx
│   │   │   ├── KpiCards.jsx
│   │   │   ├── SystemTable.jsx
│   │   │   ├── StatusChip.jsx
│   │   │   └── ExportButton.jsx
│   │   └── styles/
│   │       ├── tokens.css        # Design tokens
│   │       └── global.css        # Estilos base
│   └── public/
│       └── logo-ad-energia.svg
├── docs/
│   └── superpowers/
│       ├── specs/                # Design spec
│       └── plans/                # Planos de implementacao
├── CLAUDE.md                     # Contexto para Claude Code
├── DESIGN.md                     # Design system
└── README.md
```

## Esquema da Planilha (aba "Dados")

| timestamp | sid | cliente | capacidade_kw | status | status_descricao |
|-----------|-----|---------|---------------|--------|------------------|
| 2026-03-23T08:00:00 | E21E044135257041 | Clei Barros | 7.98 | 1 | Funcionando normalmente |

- ~30 linhas por execucao (1 por sistema)
- ~900 linhas/mes de crescimento

## Design System

Identidade visual definida em `DESIGN.md`. Principais regras:

- **Superficies**: `#faf8ff` (base), `#f4f3fa` (container-low) — sem bordas, separacao por cor
- **Tipografia**: Manrope (display/headlines) + Inter (body/labels)
- **Botao primario**: gradiente `#001f56` → `#003282` a 135°
- **Shadows**: maximo 10% opacity
- **Status**: verde (OK), amarelo (alarme), vermelho (falha), cinza (sem dados)
- **Glassmorphism**: 70% opacity + backdrop-blur 16px no header

## Configuracao

### Variaveis de ambiente — Python

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

### Variaveis de ambiente — Frontend

```bash
VITE_APPS_SCRIPT_URL=   # URL do doGet do Apps Script
```

## Como rodar

### Cron Job

```bash
pip install requests
python solar_health_monitor.py
```

### Dashboard (desenvolvimento local)

```bash
cd dashboard
npm install
npm run dev
```

### Dashboard (deploy)

O projeto `dashboard/` e compativel com Vercel. Basta conectar o repositorio e configurar `VITE_APPS_SCRIPT_URL` nas environment variables do projeto.

## Documentacao tecnica

- **Design spec**: `docs/superpowers/specs/2026-03-23-solar-dashboard-design.md`
- **Plano — Google Integration**: `docs/superpowers/plans/2026-03-23-google-integration.md`
- **Plano — Frontend Dashboard**: `docs/superpowers/plans/2026-03-23-frontend-dashboard.md`
- **API APsystems**: `Apsystems_OpenAPI_User_Manual_Installer_EN.pdf`

## Dependencias externas

| Servico | Uso |
|---------|-----|
| [APsystems OpenAPI](https://api.apsystemsema.com:9282) | Dados dos sistemas solares |
| [Evolution API](https://evolution.blackgroup-bia.shop) | Gateway WhatsApp para alertas |
| Google Sheets + Apps Script | Armazenamento e API de dados |
| Vercel | Hosting do dashboard |
