# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AD Energia — Solar Health Monitor**: Sistema de monitoramento de saude de sistemas solares APsystems com dashboard visual e alertas WhatsApp. Tudo hospedado no Vercel.

## Architecture

```
Vercel Cron (daily 11:00 UTC) ──triggers──▶ api/cron.py (serverless Python)
    │                                            │
    │  1. GET APsystems API (status dos sistemas)
    │  2. POST Google Apps Script (grava na planilha)
    │  3. POST WhatsApp (alerta se houver problemas)
    │                                            │
    ▼                                            ▼
Vite+React SPA (Vercel) ◀──GET JSON── Google Apps Script (doGet) ◀── Google Sheets
```

### 1. Vercel Cron Job (`api/cron.py`)
- **Serverless Python function** triggered daily via `vercel.json` cron schedule
- Polls APsystems OpenAPI, collects status of ~30 solar systems
- Authentication: HMAC-SHA256 signed headers (timestamp, nonce, appId)
- Sends data to Google Sheets via Apps Script POST
- Sends WhatsApp alerts via Evolution API when problems detected
- **Timeout constraint**: 10s (Hobby plan). All HTTP calls use 4s timeout with non-blocking error handling
- `SYSTEM_CLIENTS` dictionary maps ECU serial (sid) to client name
- Status codes (`light` field): 1=normal, 2=micro-inverter alarms, 3=ECU connection problem, 4=ECU no data

### 1b. Standalone Script (`solar_health_monitor.py`)
- Same logic as `api/cron.py` but runs as a long-lived process with `while True` loop
- Uses `python-dotenv` to load credentials from `.env`
- For running outside Vercel (VPS, local machine, etc.)

### 2. Google Apps Script (`google_apps_script.js`)
- **doPost**: receives JSON from Python, validates `api_key`, writes rows to "Dados" sheet
- **doGet**: serves sheet data as JSON to frontend, supports filter params (`?cliente=`, `?status=`, `?from=`, `?to=`)
- Spreadsheet ID: `1uwVxKzD6xhuxNcE-hMKE1GZYOxdOyLf40dLAgiYxEeY`
- Published as Web App with public access

### 3. Frontend Dashboard (`dashboard/`)
- **Stack**: Vite + React SPA, deployed on Vercel
- **Features**: KPI cards, system table, status chips, advanced filters (client, period, status), PDF export
- **PDF**: Executive summary (1 page) via jsPDF
- **Data**: fetches from Apps Script doGet endpoint with cache-busting, filters applied client-side

## Vercel Deployment

- **Project**: `ad-energia` on Vercel
- **Production URL**: `https://ad-energia.vercel.app`
- **Cron endpoint**: `https://ad-energia.vercel.app/api/cron` (daily 08:00 BRT / 11:00 UTC)
- **Config**: `vercel.json` at repo root — builds `dashboard/dist` and schedules cron
- **Env vars**: configured in Vercel dashboard (8 vars: APsystems, WhatsApp, Google Script, Vite)

## Running Locally

```bash
# Standalone Python cron job
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

All env vars are set in the **Vercel dashboard** for production. For local dev, use `.env` with `python-dotenv`:
- `APSYSTEMS_APP_ID` / `APSYSTEMS_APP_SECRET` — APsystems OpenAPI auth
- `WHATSAPP_API_URL` / `WHATSAPP_API_KEY` / `WHATSAPP_DEST_NUMBER` — Evolution API
- `GOOGLE_SCRIPT_URL` / `GOOGLE_SCRIPT_API_KEY` — Google Apps Script endpoint + auth
- `VITE_APPS_SCRIPT_URL` — Apps Script doGet URL (frontend build-time)

## Language

Code comments, log messages, and alert text are in **Brazilian Portuguese (pt-BR)**. Maintain this convention.

## Specs

Design spec: `docs/superpowers/specs/2026-03-23-solar-dashboard-design.md`
