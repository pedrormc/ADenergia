# Solar Dashboard — Design Spec

## 1. Overview

Sistema de monitoramento visual para os sistemas solares da AD Energia, composto por três peças:

1. **Python Cron Job** — coleta dados da APsystems API a cada 24h e envia para Google Sheets via Apps Script
2. **Google Apps Script + Sheets** — recebe dados (doPost), armazena histórico, serve JSON (doGet)
3. **Vite + React SPA** — dashboard com filtros avançados, KPIs, tabela e exportação PDF. Deploy no Vercel.

## 2. Arquitetura

```
Python Cron (24h)
    │ POST JSON (array de sistemas + api_key)
    ▼
Google Apps Script (doPost)
    │ valida api_key, grava na planilha
    ▼
Google Sheets — aba "Dados"
    │ lê via doGet (JSON público)
    ▼
Vite + React SPA (Vercel)
    Dashboard + filtros + PDF export
```

Fluxo unidirecional: Python → Sheets → Frontend. Sem banco de dados tradicional.

## 3. Estrutura da Planilha

Aba **"Dados"** com colunas:

| timestamp | sid | cliente | capacidade_kw | status | status_descricao |
|-----------|-----|---------|---------------|--------|------------------|
| 2026-03-23T08:00:00 | E21E044135257041 | Clei Barros | 7.98 | 1 | Funcionando normalmente |

- Cada execução grava ~30 linhas (1 por sistema), mesmo timestamp
- Crescimento: ~30 linhas/dia, ~900/mês
- Status: 1=OK, 2=alarme micro-inversor, 3=problema ECU, 4=ECU sem dados
- Retenção: sem limpeza automática. Google Sheets suporta até 10M de células (~900 anos nesse ritmo).

### Mapeamento de campos (APsystems API → Planilha)

| Campo API (`system`) | Coluna Planilha | Notas |
|----------------------|-----------------|-------|
| — (gerado no script) | `timestamp` | `datetime.now().isoformat()` no momento da execução |
| `sid` | `sid` | ID único do sistema/placa |
| — (dicionário hardcoded) | `cliente` | Mapeado via `SYSTEM_CLIENTS` dict no Python: `{sid: nome_cliente}` |
| `capacity` | `capacidade_kw` | Valor numérico em kW |
| `light` | `status` | Código inteiro: 1, 2, 3 ou 4 |
| — (derivado de `light`) | `status_descricao` | Lookup no `LIGHT_STATUS` dict existente |

> **Nota sobre `cliente`:** A API APsystems não retorna nome do cliente. O script Python mantém um dicionário `SYSTEM_CLIENTS` que mapeia cada `sid` ao nome do cliente. Esse mapeamento é mantido manualmente conforme novos clientes são adicionados.

## 4. Google Apps Script

Dois endpoints:

### doPost(e)
- Recebe JSON do Python com `{ api_key: string, data: [...] }`
- **Valida `api_key`** contra uma constante no script. Rejeita com 401 se inválida.
- Grava cada item do array como uma linha na aba "Dados"

### doGet(e)
- Retorna JSON com os dados da planilha
- Acesso público (dados não são sensíveis — apenas status operacional)
- Parâmetros de query opcionais:
  - `?cliente=Clei+Barros` — filtra por nome do cliente
  - `?from=2026-03-01&to=2026-03-23` — filtra por intervalo de datas (ISO 8601)
  - `?status=2` — filtra por código de status
- Se nenhum parâmetro é enviado, retorna todos os dados
- **Nota:** Google Apps Script não permite controlar headers HTTP. O frontend deve usar cache-busting (`?t=Date.now()`) nas chamadas ao doGet.

Publicado como Web App com acesso "Anyone" para o frontend consumir.

## 5. Python — Adaptações

### Externalizar credenciais

Todas as credenciais serão migradas para variáveis de ambiente:
- `APSYSTEMS_APP_ID`
- `APSYSTEMS_APP_SECRET`
- `WHATSAPP_API_URL`
- `WHATSAPP_API_KEY`
- `WHATSAPP_DEST_NUMBER`
- `GOOGLE_SCRIPT_URL` (nova)
- `GOOGLE_SCRIPT_API_KEY` (nova)

O script lê via `os.environ` com fallback para os valores atuais durante a transição.

### Novo fluxo após health check

1. Montar array com `{timestamp, sid, cliente, capacidade_kw, status, status_descricao}` por sistema
2. Enviar POST para a URL do Apps Script com `{ api_key, data }` no body
3. **Em caso de falha no POST:** logar o erro e continuar. Dados não são perdidos pois o próximo ciclo enviará o snapshot atualizado. Não há retry — o cron roda a cada 24h.
4. Manter o envio de WhatsApp existente (não é substituído)

### Dicionário de clientes

```python
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

## 6. Frontend — Dashboard

### Stack
- Vite + React (SPA), CSS puro (sem framework CSS)
- jsPDF para PDF
- Deploy no Vercel
- Desktop-only (não há requisito de responsividade mobile)

### Configuração (`src/config.js`)
- `APPS_SCRIPT_URL` — URL do doGet do Apps Script (via `import.meta.env.VITE_APPS_SCRIPT_URL`)

### Layout
- **Header**: logo AD Energia + título "Solar Health Monitor"
- **FilterBar**: dropdown cliente, seletor período (dia/semana/mês/custom), filtro status
- **KpiCards**: 4 cards — total sistemas, funcionando OK, com problema, capacidade total kW
- **SystemTable**: tabela com data, ID placa, cliente, kW, status (StatusChip)
- **ExportButton**: gera PDF resumo executivo

### Estados da UI
- **Loading**: skeleton/shimmer nos cards e tabela enquanto fetch está em andamento
- **Erro**: mensagem "Não foi possível carregar dados. Tente novamente." com botão de retry
- **Vazio**: mensagem "Nenhum resultado encontrado para os filtros selecionados."

### Filtros (client-side)
- Por cliente (dropdown com todos os nomes)
- Por período: dia, semana, mês, intervalo custom
- Por status: OK, alarme, problema ECU, sem dados

### PDF Resumo Executivo (1 página)
- Cabeçalho: "AD Energia — Relatório Solar" + período
- KPIs resumidos em linha
- Tabela com sistemas com problema (se houver)
- Rodapé: total monitorados + data de geração
- Logo carregado de `public/` (mesmo domínio, sem CORS)

## 7. Design System

Conforme `DESIGN.md`:
- Superfícies: `#faf8ff` (base), `#f4f3fa` (container-low), `#e2e2e9` (container-highest)
- Sem bordas — separação por cor/espaçamento
- Tipografia: Manrope (display/headlines) + Inter (body/labels)
- Cards: `surface_container_lowest`, padding 2rem, sem dividers
- StatusChip: `tertiary_fixed` (verde/OK), `error_container` (vermelho/falha)
- Botão primário: gradiente `#001f56` → `#003282` a 135°
- Shadows: máximo 10% opacity, `0px 20px 40px rgba(26,27,33,0.06)`
- Glassmorphism: 70% opacity + backdrop-blur 16px (meio-termo do range 12-20px do DESIGN.md)

## 8. Estrutura de Arquivos

```
ADenergia/
├── solar_health_monitor.py          # cron job (adaptar)
├── google_apps_script.js            # Apps Script (doPost + doGet)
├── dashboard/                       # Vite + React SPA
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── .env.example                 # VITE_APPS_SCRIPT_URL=
│   ├── public/
│   │   └── logo-ad-energia.svg
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── config.js
│       ├── hooks/
│       │   └── useSolarData.js
│       ├── utils/
│       │   ├── filters.js
│       │   └── pdf.js
│       ├── components/
│       │   ├── Header.jsx
│       │   ├── FilterBar.jsx
│       │   ├── KpiCards.jsx
│       │   ├── SystemTable.jsx
│       │   ├── StatusChip.jsx
│       │   └── ExportButton.jsx
│       └── styles/
│           ├── tokens.css
│           └── global.css
├── CLAUDE.md
└── DESIGN.md
```
