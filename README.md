# AD Energia — Solar Health Monitor

Sistema completo de monitoramento de sistemas solares APsystems. Health check diario com alertas via WhatsApp, dashboard visual com filtros avancados e exportacao de relatorio de economia individual por cliente em PDF.

**Producao:** https://ad-energia.vercel.app

## Arquitetura

Tudo hospedado no Vercel (frontend + serverless functions) com Google Sheets como banco de dados.

```
                         Vercel
    ┌─────────────────────────────────────────────────┐
    │                                                 │
    │  ┌─────────────┐     ┌───────────────────────┐  │
    │  │ api/cron.py  │     │  Vite + React SPA     │  │
    │  │ (daily cron) │     │  (dashboard)          │  │
    │  └──────┬───┬──┘     └──────────┬────────────┘  │
    │         │   │                   │               │
    │         │   │        ┌──────────┴────────────┐  │
    │         │   │        │  api/energy.py         │  │
    │         │   │        │  (on-demand PDF data)  │  │
    │         │   │        └──────────┬────────────┘  │
    └─────────┼───┼───────────────────┼───────────────┘
              │   │                   │
              ▼   │                   ▼
    ┌──────────┐  │         ┌──────────────────┐
    │ WhatsApp │  │         │  APsystems API   │
    │ (alertas)│  │         │  (energia kWh)   │
    └──────────┘  │         └──────────────────┘
                  ▼
    ┌───────────────────────┐
    │  Google Apps Script   │──▶ Google Sheets (aba "Dados")
    │  (doPost / doGet)     │◀── Frontend le via doGet
    └───────────────────────┘
```

## Componentes

### 1. Vercel Cron — Health Check (`api/cron.py`)

Serverless function Python executada diariamente as 08:00 BRT (11:00 UTC) via `vercel.json`.

- Coleta status de ~30 sistemas solares via APsystems OpenAPI
- Grava snapshot na Google Sheets via Apps Script
- Envia alerta WhatsApp (Evolution API) quando detecta problemas
- Timeout: 10s (Vercel Hobby) — chamadas HTTP com 4s timeout e error handling non-blocking

**Status dos sistemas** (campo `light`):
| Codigo | Significado |
|--------|-------------|
| 1 | Funcionando normalmente |
| 2 | Alarmes em micro-inversores |
| 3 | Problema de conexao ECU |
| 4 | ECU sem dados |

### 2. Vercel Serverless — Energy Data (`api/energy.py`)

Endpoint chamado sob demanda pelo frontend ao gerar o PDF de economia.

```
GET /api/energy?sid=E21E044135257041
```

Retorna para um sistema individual:
- **Energia gerada** (kWh): hoje, mes, ano, lifetime
- **Economia** (R$): kWh × R$ 0,90/kWh (tarifa Neoenergia Brasilia DF)
- **Breakdown anual**: kWh e R$ por ano desde a ativacao
- **Data de ativacao** e capacidade do sistema

### 3. Google Apps Script (`google_apps_script.js`)

Codigo para o editor do Apps Script na planilha Google Sheets.

- **doPost**: recebe JSON do cron, valida `api_key`, grava linhas na aba "Dados"
- **doGet**: retorna dados como JSON com filtros opcionais (`?cliente=`, `?from=`, `?to=`, `?status=`)

### 4. Dashboard Frontend (`dashboard/`)

SPA em Vite + React com design system editorial (DESIGN.md).

- **KPI Cards**: total de sistemas, funcionando OK, com problema, capacidade total kW
- **Filtros**: por cliente, por periodo (dia/semana/mes/custom), por status
- **Tabela**: listagem com ID da placa, cliente, capacidade e status
- **PDF de Economia**: relatorio individual por cliente no estilo AD Energia
  - Nome do cliente em destaque
  - Data de ativacao da usina
  - Economia total e por ano (grafico de barras)
  - Calculo: kWh gerado × R$ 0,90/kWh
  - Branding: faixa amarela, fundo azul, "Pilares Estrategicos", logo

### 5. Standalone Script (`solar_health_monitor.py`)

Mesma logica do `api/cron.py` mas roda como processo long-lived com `while True` loop. Para uso fora do Vercel (VPS, maquina local). Usa `python-dotenv` para carregar credenciais de `.env`.

## Estrutura do Projeto

```
ADenergia/
├── api/
│   ├── cron.py                  # Vercel cron — health check diario
│   └── energy.py                # Vercel serverless — dados de energia on-demand
├── dashboard/                   # Frontend React (Vercel)
│   ├── src/
│   │   ├── App.jsx              # Layout principal + estado
│   │   ├── config.js            # URLs e constantes
│   │   ├── hooks/
│   │   │   └── useSolarData.js  # Fetch dados da planilha
│   │   ├── utils/
│   │   │   ├── filters.js       # Filtros e KPIs
│   │   │   └── pdf.js           # Gerador PDF de economia
│   │   ├── components/
│   │   │   ├── Header.jsx       # Header com glassmorphism
│   │   │   ├── FilterBar.jsx    # Filtros: cliente, periodo, status
│   │   │   ├── KpiCards.jsx     # Cards de metricas
│   │   │   ├── SystemTable.jsx  # Tabela de sistemas
│   │   │   ├── StatusChip.jsx   # Chip de status colorido
│   │   │   └── ExportButton.jsx # Botao exportar PDF (chama /api/energy)
│   │   └── styles/
│   │       ├── tokens.css       # Design tokens do DESIGN.md
│   │       └── global.css       # Reset + fontes
│   └── public/
│       └── logo-ad-energia.svg
├── solar_health_monitor.py      # Script standalone (alternativa ao cron)
├── google_apps_script.js        # Codigo do Google Apps Script
├── requirements.txt             # Deps Python para Vercel (requests)
├── vercel.json                  # Build config + cron schedule
├── CLAUDE.md                    # Contexto para Claude Code
├── DESIGN.md                    # Design system
└── README.md
```

## Google Sheets (aba "Dados")

| timestamp | sid | cliente | capacidade_kw | status | status_descricao |
|-----------|-----|---------|---------------|--------|------------------|
| 2026-03-23T08:00:00 | E21E044135257041 | Clei Barros | 7.98 | 1 | Funcionando normalmente |

- ~30 linhas por execucao diaria
- ~900 linhas/mes

## Design System

Identidade visual editorial definida em `DESIGN.md`:

- **Superficies**: `#faf8ff` (base), `#f4f3fa` (container-low) — sem bordas, separacao por cor
- **Tipografia**: Manrope (display) + Inter (body)
- **Primario**: gradiente `#001f56` → `#003282` a 135deg
- **Shadows**: max 10% opacity
- **Glassmorphism**: 70% opacity + backdrop-blur 16px no header
- **Status**: verde (OK), amarelo (alarme), vermelho (falha), cinza (sem dados)

## Variaveis de Ambiente

Configuradas no **painel do Vercel** (Settings > Environment Variables):

| Variavel | Uso |
|----------|-----|
| `APSYSTEMS_APP_ID` | APsystems OpenAPI — App ID |
| `APSYSTEMS_APP_SECRET` | APsystems OpenAPI — App Secret |
| `WHATSAPP_API_URL` | Evolution API — URL do endpoint |
| `WHATSAPP_API_KEY` | Evolution API — chave de autenticacao |
| `WHATSAPP_DEST_NUMBER` | WhatsApp — numero destino dos alertas |
| `GOOGLE_SCRIPT_URL` | Google Apps Script — URL do deployment |
| `GOOGLE_SCRIPT_API_KEY` | Google Apps Script — chave compartilhada |
| `VITE_APPS_SCRIPT_URL` | Frontend — URL do doGet (build-time) |

Para desenvolvimento local, copie `.env.example` para `.env` e preencha.

## Como Rodar

### Producao (Vercel)

Tudo roda automaticamente:
- **Dashboard**: https://ad-energia.vercel.app
- **Cron**: executa diariamente as 08:00 BRT
- **PDF**: gerado on-demand ao selecionar cliente e clicar "Exportar PDF"

### Desenvolvimento Local

```bash
# Frontend
cd dashboard
npm install
npm run dev          # http://localhost:5173

# Script standalone (alternativa ao cron do Vercel)
pip install requests python-dotenv
cp .env.example .env # preencher credenciais
python solar_health_monitor.py
```

## Dependencias Externas

| Servico | Uso |
|---------|-----|
| [APsystems OpenAPI](https://api.apsystemsema.com:9282) | Dados dos sistemas solares + energia (kWh) |
| [Evolution API](https://evolution.blackgroup-bia.shop) | Gateway WhatsApp para alertas |
| Google Sheets + Apps Script | Armazenamento de historico e API de dados |
| Vercel | Hosting: frontend, serverless functions, cron |
| Neoenergia Brasilia | Referencia tarifa: R$ 0,90/kWh (faixa 201-300 kWh, DF) |

## Documentacao Tecnica

| Documento | Descricao |
|-----------|-----------|
| `DESIGN.md` | Design system completo |
| `CLAUDE.md` | Contexto para desenvolvimento com IA |
| `docs/superpowers/specs/` | Spec de design do sistema |
| `docs/superpowers/plans/` | Planos de implementacao |
| `Apsystems_OpenAPI_User_Manual_Installer_EN.pdf` | Manual da API APsystems |
