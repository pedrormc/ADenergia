import jsPDF from "jspdf";

/**
 * Gera o PDF de economia individual do cliente — estilo AD Energia.
 *
 * @param {object} data - Dados retornados pelo endpoint /api/energy
 * @param {string} data.cliente - Nome do cliente
 * @param {string} data.create_date - Data de ativacao (yyyy-MM-dd)
 * @param {string} data.capacity_kw - Capacidade em kW
 * @param {object} data.economy - { today, month, year, lifetime } em R$
 * @param {object} data.yearly_breakdown - { "2025": kwh, "2026": kwh, ... }
 * @param {number} data.tarifa_kwh - Tarifa R$/kWh usada no calculo
 */
export function generateEconomyPdf(data) {
  const doc = new jsPDF("p", "mm", "a4");
  const pw = doc.internal.pageSize.getWidth(); // 210
  const ph = doc.internal.pageSize.getHeight(); // 297
  const cx = pw / 2;

  // Colors
  const BLUE = [0, 31, 86]; // #001f56
  const YELLOW = [255, 193, 7]; // #ffc107
  const WHITE = [255, 255, 255];
  const LIGHT_BLUE = [173, 216, 230];
  const DARK_TEXT = [30, 30, 50];

  // =========================================================================
  // FAIXA AMARELA TOPO
  // =========================================================================
  doc.setFillColor(...YELLOW);
  doc.rect(0, 0, pw, 45, "F");

  // Nome do cliente
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...BLUE);
  doc.text(data.cliente.toUpperCase(), cx, 20, { align: "center" });

  // Subtitulo
  doc.setFontSize(16);
  doc.text("Economia de sua usina", cx, 35, { align: "center" });

  // =========================================================================
  // FUNDO AZUL PRINCIPAL
  // =========================================================================
  doc.setFillColor(...BLUE);
  doc.rect(0, 45, pw, ph - 45, "F");

  // =========================================================================
  // CARDS: Data de Ativacao + Economia Total
  // =========================================================================
  const cardY = 55;
  const cardH = 30;
  const cardW = 75;
  const gap = 10;
  const card1X = cx - cardW - gap / 2;
  const card2X = cx + gap / 2;

  // Card 1 — Data de Ativacao
  doc.setFillColor(30, 60, 110);
  doc.roundedRect(card1X, cardY, cardW, cardH, 3, 3, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Data de Ativacao", card1X + cardW / 2, cardY + 8, { align: "center" });
  doc.text("da Usina", card1X + cardW / 2, cardY + 13, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const activationFormatted = data.create_date
    ? data.create_date.split("-").reverse().join("/")
    : "--/--/----";
  doc.text(activationFormatted, card1X + cardW / 2, cardY + 25, { align: "center" });

  // Card 2 — Economia Total
  doc.setFillColor(30, 60, 110);
  doc.roundedRect(card2X, cardY, cardW, cardH, 3, 3, "F");
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Economia Total", card2X + cardW / 2, cardY + 8, { align: "center" });
  doc.text("Ate hoje", card2X + cardW / 2, cardY + 13, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const totalEconomy = formatBRL(data.economy.lifetime);
  doc.text(totalEconomy, card2X + cardW / 2, cardY + 25, { align: "center" });

  // =========================================================================
  // GRAFICO DE BARRAS — Economia por Ano
  // =========================================================================
  const chartY = 95;
  const chartW = 150;
  const chartH = 90;
  const chartX = (pw - chartW) / 2;

  // Background branco do grafico
  doc.setFillColor(...WHITE);
  doc.roundedRect(chartX, chartY, chartW, chartH + 15, 3, 3, "F");

  // Titulo do grafico
  doc.setTextColor(...DARK_TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Economia (R$)", chartX + chartW / 2, chartY + 10, { align: "center" });

  // Dados do grafico
  const yearlyEntries = Object.entries(data.yearly_breakdown || {});
  // Adiciona o total
  const barData = [
    ...yearlyEntries.map(([year, kwh]) => ({
      label: year,
      value: Math.round(kwh * data.tarifa_kwh * 100) / 100,
    })),
    { label: "Total", value: data.economy.lifetime },
  ];

  if (barData.length > 0) {
    const maxVal = Math.max(...barData.map((d) => d.value), 1);
    const barAreaY = chartY + 18;
    const barAreaH = chartH - 15;
    const barAreaW = chartW - 30;
    const barAreaX = chartX + 20;
    const barW = Math.min(25, (barAreaW - 10) / barData.length);
    const totalBarsW = barData.length * barW + (barData.length - 1) * 8;
    const startX = barAreaX + (barAreaW - totalBarsW) / 2;

    // Y-axis grid lines
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const gy = barAreaY + barAreaH - (barAreaH * i) / gridSteps;
      doc.line(barAreaX, gy, barAreaX + barAreaW, gy);
      const gridVal = formatBRL((maxVal * i) / gridSteps);
      doc.setFontSize(5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text(gridVal, barAreaX - 2, gy + 1, { align: "right" });
    }

    // Bars
    barData.forEach((d, i) => {
      const bx = startX + i * (barW + 8);
      const barH = (d.value / maxVal) * barAreaH;
      const by = barAreaY + barAreaH - barH;

      // Bar color: last bar (Total) is light blue, others are medium blue
      if (d.label === "Total") {
        doc.setFillColor(...LIGHT_BLUE);
      } else {
        doc.setFillColor(70, 130, 200);
      }
      doc.roundedRect(bx, by, barW, barH, 1, 1, "F");

      // Value on top
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BLUE);
      doc.text(formatBRL(d.value), bx + barW / 2, by - 2, { align: "center" });

      // Label below
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...DARK_TEXT);
      doc.text(d.label, bx + barW / 2, barAreaY + barAreaH + 6, { align: "center" });
    });
  }

  // =========================================================================
  // PILARES ESTRATEGICOS
  // =========================================================================
  const pilaresY = chartY + chartH + 25;

  doc.setTextColor(...YELLOW);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Pilares Estrategicos", cx, pilaresY, { align: "center" });

  const pilares = [
    "Crescimento\nna economia",
    "Personalizacao\ndos Dados",
    "Otimizacao do\nEcossistema",
  ];

  const pilarW = 45;
  const pilarStartX = cx - (pilares.length * pilarW) / 2;

  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  pilares.forEach((text, i) => {
    const px = pilarStartX + i * pilarW + pilarW / 2;
    const py = pilaresY + 10;

    // Circle icon placeholder
    doc.setFillColor(30, 60, 110);
    doc.circle(px, py + 5, 8, "F");
    doc.setDrawColor(...YELLOW);
    doc.setLineWidth(0.5);
    doc.circle(px, py + 5, 8, "S");

    // Icon symbols
    doc.setTextColor(...YELLOW);
    doc.setFontSize(10);
    const icons = ["\u2191", "\u2699", "\u26A1"]; // ↑ ⚙ ⚡
    doc.text(icons[i], px, py + 8, { align: "center" });

    // Label
    doc.setTextColor(...WHITE);
    doc.setFontSize(7);
    const lines = text.split("\n");
    lines.forEach((line, li) => {
      doc.text(line, px, py + 18 + li * 4, { align: "center" });
    });
  });

  // =========================================================================
  // LOGO RODAPE
  // =========================================================================
  doc.setFillColor(...YELLOW);
  doc.roundedRect(cx - 30, ph - 25, 60, 15, 2, 2, "F");
  doc.setTextColor(...BLUE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("AD energia", cx, ph - 15, { align: "center" });

  // =========================================================================
  // SALVAR
  // =========================================================================
  const safeName = data.cliente.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`${safeName}_Relatorio_Economia_AD_ENERGIA.pdf`);
}

function formatBRL(value) {
  return `R$ ${Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
