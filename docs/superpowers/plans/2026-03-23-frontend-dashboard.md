# Frontend Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar um dashboard SPA com Vite+React para visualizar dados dos sistemas solares, com filtros avançados (cliente, período, status) e exportação de PDF resumo executivo.

**Architecture:** SPA que consome o Google Apps Script (doGet) como API, aplica filtros client-side e gera PDF no browser. Sem backend — todo o processamento é no client. Deploy no Vercel.

**Tech Stack:** Vite, React 18, CSS puro (tokens do DESIGN.md), jsPDF

**Spec:** `docs/superpowers/specs/2026-03-23-solar-dashboard-design.md`
**Design System:** `DESIGN.md`

---

## Chunk 1: Scaffolding e Design Tokens

### Task 1: Scaffold do projeto Vite + React

**Files:**
- Create: `dashboard/package.json`
- Create: `dashboard/vite.config.js`
- Create: `dashboard/index.html`
- Create: `dashboard/.env.example`

- [ ] **Step 1: Criar o projeto com Vite**

```bash
cd C:/Users/teste/Desktop/ADenergia
npm create vite@latest dashboard -- --template react
```

- [ ] **Step 2: Instalar dependências**

```bash
cd C:/Users/teste/Desktop/ADenergia/dashboard
npm install
npm install jspdf
```

- [ ] **Step 3: Criar .env.example**

Criar `dashboard/.env.example`:

```
VITE_APPS_SCRIPT_URL=
```

- [ ] **Step 4: Verificar que dev server roda**

```bash
cd C:/Users/teste/Desktop/ADenergia/dashboard
npm run dev
```

Expected: servidor local rodando em `http://localhost:5173`

- [ ] **Step 5: Commit**

```bash
git add dashboard/
git commit -m "feat: scaffold Vite + React dashboard project"
```

### Task 2: Design Tokens CSS

**Files:**
- Create: `dashboard/src/styles/tokens.css`
- Create: `dashboard/src/styles/global.css`

- [ ] **Step 1: Criar tokens.css com variáveis do DESIGN.md**

```css
/* dashboard/src/styles/tokens.css */

/* ================================================
   Design Tokens — AD Energia Solar Dashboard
   Source: DESIGN.md
   ================================================ */

:root {
  /* Surfaces */
  --surface: #faf8ff;
  --surface-container-lowest: #ffffff;
  --surface-container-low: #f4f3fa;
  --surface-container: #eeedf4;
  --surface-container-high: #e8e7ef;
  --surface-container-highest: #e2e2e9;
  --surface-bright: rgba(250, 248, 255, 0.7);

  /* Primary */
  --primary: #001f56;
  --primary-container: #003282;
  --on-primary: #ffffff;
  --primary-gradient: linear-gradient(135deg, #001f56, #003282);

  /* Secondary (Yellow — Metric Highlighters) */
  --secondary-container: #fff3cd;

  /* Tertiary (Green — Status OK) */
  --tertiary-fixed: #d4edda;
  --on-tertiary-fixed: #155724;

  /* Error (Red — Status Fault) */
  --error-container: #f8d7da;
  --on-error-container: #721c24;

  /* On-Surface (Text) */
  --on-surface: #1a1b21;
  --on-surface-variant: #44464f;
  --outline-variant: rgba(68, 70, 79, 0.15);

  /* Typography */
  --font-display: "Manrope", sans-serif;
  --font-body: "Inter", sans-serif;

  --display-lg: 3.5rem;
  --display-sm: 2rem;
  --headline-md: 1.5rem;
  --title-md: 1.125rem;
  --body-md: 1rem;
  --body-sm: 0.875rem;
  --label-md: 0.875rem;
  --label-sm: 0.75rem;

  /* Spacing */
  --spacing-2: 0.5rem;
  --spacing-4: 1rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;
  --spacing-12: 3rem;
  --spacing-16: 4rem;

  /* Roundness */
  --roundness-sm: 0.5rem;
  --roundness-md: 0.75rem;
  --roundness-lg: 1rem;
  --roundness-full: 9999px;

  /* Shadows */
  --shadow-ambient: 0px 20px 40px rgba(26, 27, 33, 0.06);

  /* Glassmorphism */
  --glass-blur: 16px;
  --glass-opacity: 0.7;
}
```

- [ ] **Step 2: Criar global.css com reset e estilos base**

```css
/* dashboard/src/styles/global.css */

@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Inter:wght@400;500;600&display=swap");

*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-body);
  background-color: var(--surface);
  color: var(--on-surface);
  line-height: 1.5;
}

h1,
h2,
h3,
h4 {
  font-family: var(--font-display);
  font-weight: 700;
}

/* No borders — separation by surface color only (DESIGN.md rule) */
```

- [ ] **Step 3: Atualizar main.jsx para importar estilos**

Substituir o conteúdo de `dashboard/src/main.jsx`:

```jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/global.css";
import App from "./App";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 4: Atualizar index.html com título correto**

No `dashboard/index.html`, alterar o `<title>` para:

```html
<title>AD Energia — Solar Health Monitor</title>
```

- [ ] **Step 5: Remover arquivos boilerplate desnecessários**

```bash
rm dashboard/src/App.css dashboard/src/index.css dashboard/src/assets/react.svg
```

- [ ] **Step 6: Commit**

```bash
git add dashboard/
git commit -m "feat: add design tokens and global styles from DESIGN.md"
```

---

## Chunk 2: Config, Hook de dados e Utilitários

### Task 3: Config e Hook useSolarData

**Files:**
- Create: `dashboard/src/config.js`
- Create: `dashboard/src/hooks/useSolarData.js`

- [ ] **Step 1: Criar config.js**

```jsx
// dashboard/src/config.js

export const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || "";

export const STATUS_MAP = {
  1: { label: "Funcionando normalmente", type: "ok" },
  2: { label: "Alarmes em micro-inversores", type: "warning" },
  3: { label: "Problema de conexao ECU", type: "error" },
  4: { label: "ECU sem dados", type: "inactive" },
};
```

- [ ] **Step 2: Criar hook useSolarData**

```jsx
// dashboard/src/hooks/useSolarData.js

import { useState, useEffect, useCallback } from "react";
import { APPS_SCRIPT_URL } from "../config";

export function useSolarData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!APPS_SCRIPT_URL) {
      setError("URL do Apps Script nao configurada");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `${APPS_SCRIPT_URL}${APPS_SCRIPT_URL.includes("?") ? "&" : "?"}t=${Date.now()}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      setData(json.data || []);
    } catch (err) {
      setError("Nao foi possivel carregar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, retry: fetchData };
}
```

- [ ] **Step 3: Commit**

```bash
git add dashboard/src/config.js dashboard/src/hooks/
git commit -m "feat: add config and useSolarData hook"
```

### Task 4: Utilitário de filtros

**Files:**
- Create: `dashboard/src/utils/filters.js`

- [ ] **Step 1: Criar filters.js**

```jsx
// dashboard/src/utils/filters.js

export function filterByCliente(data, cliente) {
  if (!cliente) return data;
  return data.filter((row) => row.cliente === cliente);
}

export function filterByStatus(data, status) {
  if (status === null || status === undefined || status === "") return data;
  return data.filter((row) => String(row.status) === String(status));
}

export function filterByPeriod(data, from, to) {
  // Normaliza datas sem horario para incluir o dia inteiro
  const normalizedTo = to && !to.includes("T") ? to + "T23:59:59" : to;

  return data.filter((row) => {
    const ts = row.timestamp;
    if (from && ts < from) return false;
    if (normalizedTo && ts > normalizedTo) return false;
    return true;
  });
}

export function applyFilters(data, { cliente, status, from, to }) {
  let result = data;
  result = filterByCliente(result, cliente);
  result = filterByStatus(result, status);
  result = filterByPeriod(result, from, to);
  return result;
}

export function getUniqueClientes(data) {
  const set = new Set(data.map((row) => row.cliente).filter(Boolean));
  return [...set].sort();
}

export function computeKpis(data) {
  const total = new Set(data.map((row) => row.sid)).size;
  const latestBySystem = new Map();

  for (const row of data) {
    const existing = latestBySystem.get(row.sid);
    if (!existing || row.timestamp > existing.timestamp) {
      latestBySystem.set(row.sid, row);
    }
  }

  const latestRows = [...latestBySystem.values()];
  const ok = latestRows.filter((r) => r.status === 1 || r.status === "1").length;
  const problems = latestRows.length - ok;
  const totalKw = latestRows.reduce(
    (sum, r) => sum + (parseFloat(r.capacidade_kw) || 0),
    0
  );

  return { total, ok, problems, totalKw: totalKw.toFixed(2) };
}

export function getPeriodRange(period) {
  const now = new Date();
  const to = now.toISOString();
  let from;

  switch (period) {
    case "day":
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      break;
    case "week": {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      from = weekAgo.toISOString();
      break;
    }
    case "month": {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      from = monthAgo.toISOString();
      break;
    }
    default:
      from = null;
  }

  return { from, to: period === "all" ? null : to };
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/utils/filters.js
git commit -m "feat: add filter utilities and KPI computation"
```

### Task 5: Utilitário de PDF

**Files:**
- Create: `dashboard/src/utils/pdf.js`

- [ ] **Step 1: Criar pdf.js para geração de resumo executivo**

```jsx
// dashboard/src/utils/pdf.js

import jsPDF from "jspdf";

export async function generatePdf({ kpis, problems, periodLabel }) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // Logo (carregado de /logo-ad-energia.svg convertido para data URL)
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = "/logo-ad-energia.svg";
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d").drawImage(img, 0, 0);
    doc.addImage(canvas.toDataURL("image/png"), "PNG", margin, y, 30, 6);
    y += 12;
  } catch {
    // Logo nao disponivel, continua sem
    y += 5;
  }

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("AD Energia — Relatorio Solar", margin, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Periodo: ${periodLabel}`, margin, y);
  y += 5;
  doc.text(
    `Gerado em: ${new Date().toLocaleDateString("pt-BR")} as ${new Date().toLocaleTimeString("pt-BR")}`,
    margin,
    y
  );
  y += 15;

  // Linha separadora
  doc.setDrawColor(0, 31, 86);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  // KPIs
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Resumo", margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const kpiLines = [
    `Total de sistemas: ${kpis.total}`,
    `Funcionando OK: ${kpis.ok}`,
    `Com problema: ${kpis.problems}`,
    `Capacidade total: ${kpis.totalKw} kW`,
  ];
  for (const line of kpiLines) {
    doc.text(line, margin, y);
    y += 6;
  }
  y += 8;

  // Tabela de problemas
  if (problems.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Sistemas com Problema", margin, y);
    y += 8;

    // Header da tabela
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const cols = [margin, margin + 45, margin + 90, margin + 120];
    doc.text("ID Placa", cols[0], y);
    doc.text("Cliente", cols[1], y);
    doc.text("kW", cols[2], y);
    doc.text("Status", cols[3], y);
    y += 6;

    // Linhas
    doc.setFont("helvetica", "normal");
    for (const p of problems) {
      if (y > 270) break; // nao ultrapassa a pagina
      doc.text(String(p.sid || ""), cols[0], y);
      doc.text(String(p.cliente || ""), cols[1], y);
      doc.text(String(p.capacidade_kw || ""), cols[2], y);
      doc.text(String(p.status_descricao || ""), cols[3], y);
      y += 5;
    }
    y += 8;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text("Todos os sistemas estao funcionando normalmente.", margin, y);
    y += 8;
  }

  // Rodape
  doc.setDrawColor(0, 31, 86);
  doc.setLineWidth(0.3);
  doc.line(margin, 280, pageWidth - margin, 280);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `${kpis.total} sistemas monitorados | Gerado automaticamente por AD Energia Solar Monitor`,
    margin,
    285
  );

  doc.save(`relatorio-solar-${new Date().toISOString().slice(0, 10)}.pdf`);
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/utils/pdf.js
git commit -m "feat: add PDF executive summary generator"
```

---

## Chunk 3: Componentes UI

### Task 6: StatusChip

**Files:**
- Create: `dashboard/src/components/StatusChip.jsx`

- [ ] **Step 1: Criar StatusChip**

```jsx
// dashboard/src/components/StatusChip.jsx

import { STATUS_MAP } from "../config";

const TYPE_STYLES = {
  ok: {
    background: "var(--tertiary-fixed)",
    color: "var(--on-tertiary-fixed)",
  },
  warning: {
    background: "var(--secondary-container)",
    color: "#856404",
  },
  error: {
    background: "var(--error-container)",
    color: "var(--on-error-container)",
  },
  inactive: {
    background: "var(--surface-container-highest)",
    color: "var(--on-surface-variant)",
  },
};

export function StatusChip({ status }) {
  const info = STATUS_MAP[status] || { label: "Desconhecido", type: "inactive" };
  const style = TYPE_STYLES[info.type] || TYPE_STYLES.inactive;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.25rem 0.75rem",
        borderRadius: "var(--roundness-full)",
        fontSize: "var(--label-md)",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.02em",
        ...style,
      }}
    >
      {info.label}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/StatusChip.jsx
git commit -m "feat: add StatusChip component with design system styles"
```

### Task 7: Header

**Files:**
- Create: `dashboard/src/components/Header.jsx`

- [ ] **Step 1: Criar Header**

```jsx
// dashboard/src/components/Header.jsx

export function Header() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-4)",
        padding: "var(--spacing-6) var(--spacing-8)",
        background: "var(--surface-bright)",
        backdropFilter: "blur(var(--glass-blur))",
        WebkitBackdropFilter: "blur(var(--glass-blur))",
      }}
    >
      <img
        src="/logo-ad-energia.svg"
        alt="AD Energia"
        style={{ height: 40 }}
        onError={(e) => { e.target.style.display = "none"; }}
      />
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--headline-md)",
          fontWeight: 700,
          color: "var(--primary)",
        }}
      >
        Solar Health Monitor
      </h1>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/Header.jsx
git commit -m "feat: add Header component"
```

### Task 8: KpiCards

**Files:**
- Create: `dashboard/src/components/KpiCards.jsx`

- [ ] **Step 1: Criar KpiCards**

```jsx
// dashboard/src/components/KpiCards.jsx

function KpiCard({ label, value, highlight }) {
  return (
    <div
      style={{
        flex: 1,
        padding: "var(--spacing-8)",
        borderRadius: "var(--roundness-md)",
        background: highlight
          ? "var(--secondary-container)"
          : "var(--surface-container-lowest)",
        boxShadow: "var(--shadow-ambient)",
        minWidth: 180,
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--label-sm)",
          color: "var(--on-surface-variant)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: "var(--spacing-2)",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--display-sm)",
          fontWeight: 800,
          color: "var(--on-surface)",
        }}
      >
        {value}
      </p>
    </div>
  );
}

export function KpiCards({ kpis }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "var(--spacing-6)",
        flexWrap: "wrap",
      }}
    >
      <KpiCard label="Total Sistemas" value={kpis.total} />
      <KpiCard label="Funcionando" value={kpis.ok} />
      <KpiCard label="Com Problema" value={kpis.problems} highlight={kpis.problems > 0} />
      <KpiCard label="Capacidade Total" value={`${kpis.totalKw} kW`} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/KpiCards.jsx
git commit -m "feat: add KpiCards component with metric highlighter"
```

### Task 9: FilterBar

**Files:**
- Create: `dashboard/src/components/FilterBar.jsx`

- [ ] **Step 1: Criar FilterBar**

```jsx
// dashboard/src/components/FilterBar.jsx

const selectStyle = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--body-sm)",
  padding: "0.5rem 1rem",
  borderRadius: "var(--roundness-sm)",
  border: "none",
  background: "var(--surface-container-low)",
  color: "var(--on-surface)",
  cursor: "pointer",
  outline: "none",
  boxShadow: "0 0 0 1px var(--outline-variant)",
};

const selectFocusHandler = (e) => {
  e.target.style.background = "var(--surface-container-lowest)";
  e.target.style.borderBottom = "2px solid var(--primary)";
};

const selectBlurHandler = (e) => {
  e.target.style.background = "var(--surface-container-low)";
  e.target.style.borderBottom = "none";
};

export function FilterBar({
  clientes,
  selectedCliente,
  onClienteChange,
  selectedPeriod,
  onPeriodChange,
  selectedStatus,
  onStatusChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: "var(--spacing-4)",
        alignItems: "flex-end",
        flexWrap: "wrap",
        padding: "var(--spacing-4) 0",
      }}
    >
      <div>
        <label style={{ fontSize: "var(--label-sm)", color: "var(--on-surface-variant)", display: "block", marginBottom: 4 }}>
          Cliente
        </label>
        <select
          value={selectedCliente}
          onChange={(e) => onClienteChange(e.target.value)}
          style={selectStyle}
          onFocus={selectFocusHandler}
          onBlur={selectBlurHandler}
        >
          <option value="">Todos</option>
          {clientes.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ fontSize: "var(--label-sm)", color: "var(--on-surface-variant)", display: "block", marginBottom: 4 }}>
          Periodo
        </label>
        <select
          value={selectedPeriod}
          onChange={(e) => onPeriodChange(e.target.value)}
          style={selectStyle}
          onFocus={selectFocusHandler}
          onBlur={selectBlurHandler}
        >
          <option value="all">Todos</option>
          <option value="day">Hoje</option>
          <option value="week">Ultima semana</option>
          <option value="month">Ultimo mes</option>
          <option value="custom">Personalizado</option>
        </select>
      </div>

      {selectedPeriod === "custom" && (
        <>
          <div>
            <label style={{ fontSize: "var(--label-sm)", color: "var(--on-surface-variant)", display: "block", marginBottom: 4 }}>
              De
            </label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => onCustomFromChange(e.target.value)}
              style={selectStyle}
              onFocus={selectFocusHandler}
              onBlur={selectBlurHandler}
            />
          </div>
          <div>
            <label style={{ fontSize: "var(--label-sm)", color: "var(--on-surface-variant)", display: "block", marginBottom: 4 }}>
              Ate
            </label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => onCustomToChange(e.target.value)}
              style={selectStyle}
              onFocus={selectFocusHandler}
              onBlur={selectBlurHandler}
            />
          </div>
        </>
      )}

      <div>
        <label style={{ fontSize: "var(--label-sm)", color: "var(--on-surface-variant)", display: "block", marginBottom: 4 }}>
          Status
        </label>
        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          style={selectStyle}
          onFocus={selectFocusHandler}
          onBlur={selectBlurHandler}
        >
          <option value="">Todos</option>
          <option value="1">OK</option>
          <option value="2">Alarme</option>
          <option value="3">Problema ECU</option>
          <option value="4">Sem dados</option>
        </select>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/FilterBar.jsx
git commit -m "feat: add FilterBar with client, period, and status filters"
```

### Task 10: SystemTable

**Files:**
- Create: `dashboard/src/components/SystemTable.jsx`

- [ ] **Step 1: Criar SystemTable**

```jsx
// dashboard/src/components/SystemTable.jsx

import { StatusChip } from "./StatusChip";

const cellStyle = {
  padding: "0.75rem 1rem",
  fontSize: "var(--body-sm)",
  fontFamily: "var(--font-body)",
  border: "none",
};

const headerCellStyle = {
  ...cellStyle,
  fontSize: "var(--label-sm)",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--on-surface-variant)",
  textAlign: "left",
};

export function SystemTable({ data }) {
  if (data.length === 0) {
    return (
      <div
        style={{
          padding: "var(--spacing-12)",
          textAlign: "center",
          color: "var(--on-surface-variant)",
          fontFamily: "var(--font-body)",
          fontSize: "var(--body-md)",
          background: "var(--surface-container-lowest)",
          borderRadius: "var(--roundness-md)",
        }}
      >
        Nenhum resultado encontrado para os filtros selecionados.
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: "var(--roundness-md)",
        overflow: "hidden",
        boxShadow: "var(--shadow-ambient)",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr style={{ background: "var(--surface-container-low)" }}>
            <th style={headerCellStyle}>Data</th>
            <th style={headerCellStyle}>ID Placa</th>
            <th style={headerCellStyle}>Cliente</th>
            <th style={headerCellStyle}>kW</th>
            <th style={headerCellStyle}>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={`${row.sid}-${row.timestamp}-${i}`}
              style={{
                background:
                  i % 2 === 0
                    ? "var(--surface-container-lowest)"
                    : "var(--surface)",
              }}
            >
              <td style={cellStyle}>
                {row.timestamp
                  ? new Date(row.timestamp).toLocaleDateString("pt-BR")
                  : "—"}
              </td>
              <td style={{ ...cellStyle, fontFamily: "monospace", fontSize: "var(--label-sm)" }}>
                {row.sid}
              </td>
              <td style={cellStyle}>{row.cliente}</td>
              <td style={cellStyle}>{row.capacidade_kw}</td>
              <td style={cellStyle}>
                <StatusChip status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/SystemTable.jsx
git commit -m "feat: add SystemTable with alternating row colors and StatusChip"
```

### Task 11: ExportButton

**Files:**
- Create: `dashboard/src/components/ExportButton.jsx`

- [ ] **Step 1: Criar ExportButton**

```jsx
// dashboard/src/components/ExportButton.jsx

import { generatePdf } from "../utils/pdf";

export function ExportButton({ kpis, periodProblems, periodLabel }) {
  const handleClick = async () => {
    await generatePdf({ kpis, problems: periodProblems, periodLabel });
  };

  return (
    <button
      onClick={handleClick}
      style={{
        padding: "0.625rem 1.5rem",
        borderRadius: "var(--roundness-md)",
        border: "none",
        background: "var(--primary-gradient)",
        color: "var(--on-primary)",
        fontFamily: "var(--font-body)",
        fontSize: "var(--body-sm)",
        fontWeight: 600,
        cursor: "pointer",
        transition: "opacity 0.15s",
      }}
      onMouseEnter={(e) => { e.target.style.opacity = "0.9"; }}
      onMouseLeave={(e) => { e.target.style.opacity = "1"; }}
    >
      Exportar PDF
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard/src/components/ExportButton.jsx
git commit -m "feat: add ExportButton with PDF generation"
```

---

## Chunk 4: App principal e integração

### Task 12: Montar App.jsx com todos os componentes

**Files:**
- Modify: `dashboard/src/App.jsx`

- [ ] **Step 1: Reescrever App.jsx integrando tudo**

```jsx
// dashboard/src/App.jsx

import { useState, useMemo } from "react";
import { useSolarData } from "./hooks/useSolarData";
import {
  applyFilters,
  getUniqueClientes,
  computeKpis,
  getPeriodRange,
} from "./utils/filters";
import { Header } from "./components/Header";
import { FilterBar } from "./components/FilterBar";
import { KpiCards } from "./components/KpiCards";
import { SystemTable } from "./components/SystemTable";
import { ExportButton } from "./components/ExportButton";

const PERIOD_LABELS = {
  all: "Todos os periodos",
  day: "Hoje",
  week: "Ultima semana",
  month: "Ultimo mes",
  custom: "Personalizado",
};

export default function App() {
  const { data, loading, error, retry } = useSolarData();

  const [selectedCliente, setSelectedCliente] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const clientes = useMemo(() => getUniqueClientes(data), [data]);

  const filteredData = useMemo(() => {
    const { from, to } =
      selectedPeriod === "custom"
        ? { from: customFrom, to: customTo }
        : getPeriodRange(selectedPeriod);

    return applyFilters(data, {
      cliente: selectedCliente,
      status: selectedStatus,
      from,
      to,
    });
  }, [data, selectedCliente, selectedPeriod, selectedStatus, customFrom, customTo]);

  const kpis = useMemo(() => computeKpis(filteredData), [filteredData]);

  // Problemas filtrados apenas por periodo (ignora filtro de status) para o PDF
  const periodProblems = useMemo(() => {
    const { from, to } =
      selectedPeriod === "custom"
        ? { from: customFrom, to: customTo }
        : getPeriodRange(selectedPeriod);

    const periodData = applyFilters(data, {
      cliente: selectedCliente,
      status: "",
      from,
      to,
    });
    return periodData.filter((r) => r.status !== 1 && r.status !== "1");
  }, [data, selectedCliente, selectedPeriod, customFrom, customTo]);

  const periodLabel =
    selectedPeriod === "custom"
      ? `${customFrom || "inicio"} a ${customTo || "hoje"}`
      : PERIOD_LABELS[selectedPeriod];

  if (loading) {
    return (
      <div>
        <Header />
        <main style={{ padding: "var(--spacing-8)" }}>
          <div
            style={{
              display: "flex",
              gap: "var(--spacing-6)",
              marginBottom: "var(--spacing-8)",
            }}
          >
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                style={{
                  flex: 1,
                  height: 100,
                  borderRadius: "var(--roundness-md)",
                  background: "var(--surface-container-low)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ))}
          </div>
          <div
            style={{
              height: 300,
              borderRadius: "var(--roundness-md)",
              background: "var(--surface-container-low)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header />
        <main
          style={{
            padding: "var(--spacing-16)",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "var(--body-md)",
              color: "var(--on-surface-variant)",
              marginBottom: "var(--spacing-4)",
            }}
          >
            {error}
          </p>
          <button
            onClick={retry}
            style={{
              padding: "0.625rem 1.5rem",
              borderRadius: "var(--roundness-md)",
              border: "none",
              background: "var(--primary-gradient)",
              color: "var(--on-primary)",
              fontFamily: "var(--font-body)",
              fontSize: "var(--body-sm)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </main>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <main style={{ padding: "var(--spacing-8)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: "var(--spacing-6)",
          }}
        >
          <FilterBar
            clientes={clientes}
            selectedCliente={selectedCliente}
            onClienteChange={setSelectedCliente}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
          />
          <ExportButton
            kpis={kpis}
            periodProblems={periodProblems}
            periodLabel={periodLabel}
          />
        </div>

        <div style={{ marginBottom: "var(--spacing-8)" }}>
          <KpiCards kpis={kpis} />
        </div>

        <SystemTable data={filteredData} />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que o build roda sem erros**

```bash
cd C:/Users/teste/Desktop/ADenergia/dashboard
npm run build
```

Expected: build completa sem erros.

- [ ] **Step 3: Commit**

```bash
git add dashboard/src/App.jsx
git commit -m "feat: integrate all components in App with filters, KPIs, and table"
```

### Task 13: Placeholder de logo e deploy config

**Files:**
- Create: `dashboard/public/logo-ad-energia.svg`

- [ ] **Step 1: Criar SVG placeholder para o logo**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40" fill="none">
  <rect width="200" height="40" rx="4" fill="#001f56"/>
  <text x="100" y="26" text-anchor="middle" fill="white" font-family="sans-serif" font-size="16" font-weight="bold">AD Energia</text>
</svg>
```

> Substituir pelo logo real da AD Energia quando disponível.

- [ ] **Step 2: Commit**

```bash
git add dashboard/public/logo-ad-energia.svg
git commit -m "feat: add placeholder logo SVG"
```

### Task 14: Commit final e verificação

- [ ] **Step 1: Rodar build final**

```bash
cd C:/Users/teste/Desktop/ADenergia/dashboard
npm run build
```

Expected: pasta `dist/` gerada sem erros.

- [ ] **Step 2: Testar com preview local**

```bash
cd C:/Users/teste/Desktop/ADenergia/dashboard
npm run preview
```

Expected: aplicação acessível em `http://localhost:4173`. Mostrará estado de erro (URL do Apps Script não configurada) — isso é esperado.

- [ ] **Step 3: Commit final**

```bash
git add -A dashboard/
git commit -m "feat: complete solar dashboard frontend ready for Vercel deploy"
```
