# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AD Energia — Solar Health Monitor**: Sistema de monitoramento de saúde de sistemas solares APsystems com dashboard visual e alertas WhatsApp.

## Architecture

Three independent components connected through Google Sheets:

```
Python Cron (24h) ──POST JSON──▶ Google Apps Script (doPost) ──grava──▶ Google Sheets
                                                                            │
Vite+React SPA (Vercel) ◀──GET JSON── Google Apps Script (doGet) ◀──lê─────┘
```

### 1. Python Cron Job (`solar_health_monitor.py`)
- Polls APsystems OpenAPI every 24h, collects status of ~30 solar systems
- Authentication: HMAC-SHA256 signed headers (timestamp, nonce, appId)
- Sends WhatsApp alerts via Evolution API when problems detected
- Sends POST with full system data to Google Apps Script via `send_to_sheets()`
- Credentials externalized to environment variables via `python-dotenv` (`.env`)
- `SYSTEM_CLIENTS` dictionary maps ECU serial (sid) to client name
- Status codes (`light` field): 1=normal, 2=micro-inverter alarms, 3=ECU connection problem, 4=ECU no data

### 2. Google Apps Script (`google_apps_script.js`)
- **doPost**: receives JSON from Python, validates `api_key`, writes rows to "Dados" sheet
- **doGet**: serves sheet data as JSON to frontend, supports filter params (`?cliente=`, `?status=`, `?from=`, `?to=`)
- Spreadsheet ID: `1uwVxKzD6xhuxNcE-hMKE1GZYOxdOyLf40dLAgiYxEeY`
- Published as Web App with public access
- Authentication via shared `api_key` in POST body

### 3. Frontend Dashboard (`dashboard/`)
- **Stack**: Vite + React SPA, deployed on Vercel
- **Features**: KPI cards, system table, status chips, advanced filters (client, period, status), PDF export
- **PDF**: Executive summary (1 page) via jsPDF
- **Data**: fetches from Apps Script doGet endpoint, filters applied client-side

## Running

```bash
# Python cron job
pip install requests python-dotenv
cp .env.example .env   # preencher com credenciais reais
python solar_health_monitor.py

# Frontend dashboard
cd dashboard
npm install
npm run dev        # local dev server
npm run build      # production build
```

## Google Sheets Schema (aba "Dados")

| timestamp | sid | cliente | capacidade_kw | status | status_descricao |
|-----------|-----|---------|---------------|--------|------------------|

~30 rows per execution, ~900 rows/month.

## Design System

Defined in `DESIGN.md`. Key rules:
- Surfaces: `#faf8ff` (base), `#f4f3fa` (container-low) — **no borders**, separation by color/spacing only
- Typography: Manrope (display/headlines) + Inter (body/labels)
- Primary gradient: `#001f56` → `#003282` at 135°
- Shadows max 10% opacity
- StatusChip: green (`tertiary_fixed`) for OK, red (`error_container`) for faults

## Key External Dependencies

- **APsystems OpenAPI** (`api.apsystemsema.com:9282`) — solar system data. Reference: `Apsystems_OpenAPI_User_Manual_Installer_EN.pdf`
- **Evolution API** — WhatsApp messaging gateway
- **Google Sheets + Apps Script** — data storage and API layer

## Environment Variables

All credentials are loaded from `.env` via `python-dotenv`. See `.env.example` for the full list:
- `APSYSTEMS_APP_ID` / `APSYSTEMS_APP_SECRET` — APsystems OpenAPI auth
- `WHATSAPP_API_URL` / `WHATSAPP_API_KEY` / `WHATSAPP_DEST_NUMBER` — Evolution API
- `GOOGLE_SCRIPT_URL` / `GOOGLE_SCRIPT_API_KEY` — Google Apps Script endpoint + auth

**Security:** `.env` is gitignored. Temporary hardcoded fallbacks exist in the Python script for transition — remove after `.env` is configured in production.

## Language

Code comments, log messages, and alert text are in **Brazilian Portuguese (pt-BR)**. Maintain this convention.

## Specs

Design spec: `docs/superpowers/specs/2026-03-23-solar-dashboard-design.md`
