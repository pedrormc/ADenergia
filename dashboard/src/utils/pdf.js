import jsPDF from "jspdf";

/**
 * Gera o PDF de economia individual do cliente — estilo AD Energia.
 * Async para carregar imagens. Suporte a periodo selecionado.
 *
 * @param {object} data - Dados retornados pelo endpoint /api/energy
 */
export async function generateEconomyPdf(data) {
  const doc = new jsPDF("p", "mm", "a4");
  const pw = doc.internal.pageSize.getWidth(); // 210
  const ph = doc.internal.pageSize.getHeight(); // 297
  const cx = pw / 2;
  const margin = 15;

  // Colors
  const BLUE = [0, 31, 86];
  const BLUE_MID = [30, 60, 110];
  const BLUE_BAR = [70, 130, 200];
  const YELLOW = [255, 193, 7];
  const WHITE = [255, 255, 255];
  const DARK_TEXT = [30, 30, 50];
  const GRAY = [120, 120, 120];

  // Carregar imagens
  const [logoImg, econImg, periodImg] = await Promise.all([
    loadImage("/image/logo-adenergia.png"),
    loadImage("/image/economiatotal.png"),
    loadImage("/image/peridoselecionado.png"),
  ]);

  // =========================================================================
  // FAIXA AMARELA TOPO
  // =========================================================================
  doc.setFillColor(...YELLOW);
  doc.rect(0, 0, pw, 42, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...BLUE);
  doc.text(data.cliente.toUpperCase(), cx, 18, { align: "center" });

  doc.setFontSize(14);
  doc.text("Economia de sua usina", cx, 32, { align: "center" });

  // =========================================================================
  // FUNDO AZUL PRINCIPAL
  // =========================================================================
  doc.setFillColor(...BLUE);
  doc.rect(0, 42, pw, ph - 42, "F");

  // =========================================================================
  // CARDS: Periodo Selecionado + Economia no Periodo
  // =========================================================================
  const cardY = 52;
  const cardH = 35;
  const cardW = 82;
  const gap = 6;
  const card1X = cx - cardW - gap / 2;
  const card2X = cx + gap / 2;
  const iconSize = 8;

  // Card 1: Periodo Selecionado
  doc.setFillColor(...BLUE_MID);
  doc.roundedRect(card1X, cardY, cardW, cardH, 4, 4, "F");
  if (periodImg) {
    doc.addImage(periodImg, "PNG", card1X + 6, cardY + 4, iconSize, iconSize);
  }
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Periodo Selecionado", card1X + 6 + iconSize + 3, cardY + 9);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(formatPeriodLabel(data), card1X + cardW / 2, cardY + 26, {
    align: "center",
  });

  // Card 2: Economia no Periodo
  doc.setFillColor(...BLUE_MID);
  doc.roundedRect(card2X, cardY, cardW, cardH, 4, 4, "F");
  if (econImg) {
    doc.addImage(econImg, "PNG", card2X + 6, cardY + 4, iconSize, iconSize);
  }
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Economia no Periodo", card2X + 6 + iconSize + 3, cardY + 9);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  const periodEconomy = data.period
    ? data.period.economy_total
    : data.economy.lifetime;
  doc.text(formatBRL(periodEconomy), card2X + cardW / 2, cardY + 26, {
    align: "center",
  });

  // =========================================================================
  // GRAFICO DE BARRAS — Economia dinamica (sem barra Total)
  // =========================================================================
  const chartY = cardY + cardH + 10;
  const chartW = pw - margin * 2;
  const chartH = 95;
  const chartX = margin;

  // Background branco do grafico
  doc.setFillColor(...WHITE);
  doc.roundedRect(chartX, chartY, chartW, chartH + 18, 4, 4, "F");

  // Titulo do grafico
  const granularity = data.period ? data.period.granularity : "yearly";
  const chartTitle =
    granularity === "yearly"
      ? "Economia por Ano (R$)"
      : granularity === "monthly"
        ? "Economia por Mes (R$)"
        : "Economia por Dia (R$)";

  doc.setTextColor(...DARK_TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(chartTitle, chartX + chartW / 2, chartY + 10, { align: "center" });

  // Dados do grafico (nunca inclui Total como barra)
  const chartItems = buildChartData(data);
  const isManyBars = chartItems.length > 15;

  if (chartItems.length > 0) {
    const maxVal = Math.max(...chartItems.map((d) => d.value), 1);
    const barAreaY = chartY + 16;
    const barAreaH = chartH - 12;
    const barAreaW = chartW - 40;
    const barAreaX = chartX + 32;

    // Calcular barras — para muitas barras (daily), gap minimo
    const count = chartItems.length;
    const minGap = isManyBars ? 0.5 : 4;
    const maxBarW = isManyBars ? 8 : 30;
    const barW = Math.min(
      maxBarW,
      Math.max(1.5, (barAreaW - minGap * (count - 1)) / count),
    );
    const actualGap =
      count > 1 ? (barAreaW - barW * count) / (count - 1) : 0;
    const totalBarsW = barW * count + actualGap * Math.max(0, count - 1);
    const startX = barAreaX + (barAreaW - totalBarsW) / 2;

    // Y-axis grid lines
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const gy = barAreaY + barAreaH - (barAreaH * i) / gridSteps;
      doc.line(barAreaX, gy, barAreaX + barAreaW, gy);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      doc.text(formatBRLCompact((maxVal * i) / gridSteps), barAreaX - 2, gy + 1, {
        align: "right",
      });
    }

    // Calcular intervalo de labels para daily (a cada N dias)
    const labelEvery = isManyBars ? Math.ceil(count / 10) : 1;

    // Bars
    chartItems.forEach((d, i) => {
      const bx = startX + i * (barW + actualGap);
      const barH = Math.max(0.5, (d.value / maxVal) * barAreaH);
      const by = barAreaY + barAreaH - barH;

      doc.setFillColor(...BLUE_BAR);
      doc.roundedRect(bx, by, barW, barH, isManyBars ? 0.5 : 1.5, isManyBars ? 0.5 : 1.5, "F");

      // Valor em cima da barra — apenas se poucas barras
      if (!isManyBars) {
        doc.setFontSize(5.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BLUE);
        doc.text(formatBRLCompact(d.value), bx + barW / 2, by - 2, {
          align: "center",
        });
      }

      // Label abaixo — a cada N barras para daily
      if (i % labelEvery === 0) {
        doc.setFontSize(isManyBars ? 4.5 : 6);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...DARK_TEXT);
        doc.text(d.label, bx + barW / 2, barAreaY + barAreaH + 5, {
          align: "center",
        });
      }
    });
  }

  // =========================================================================
  // TOTAL DESTAQUE — fora do grafico, abaixo
  // =========================================================================
  const totalY = chartY + chartH + 20;
  const totalValue = data.period
    ? data.period.economy_total
    : data.economy.lifetime;

  doc.setFillColor(...BLUE_MID);
  doc.roundedRect(chartX + 20, totalY, chartW - 40, 12, 3, 3, "F");
  doc.setTextColor(...YELLOW);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(
    `Total no Periodo:  ${formatBRL(totalValue)}`,
    cx,
    totalY + 8,
    { align: "center" },
  );

  // =========================================================================
  // PILARES ESTRATEGICOS — 3 Metricas Reais
  // =========================================================================
  const pilaresY = totalY + 20;

  doc.setDrawColor(...YELLOW);
  doc.setLineWidth(0.8);
  doc.line(margin + 20, pilaresY - 5, pw - margin - 20, pilaresY - 5);

  doc.setTextColor(...YELLOW);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Pilares Estrategicos", cx, pilaresY + 3, { align: "center" });

  // Calcular metricas
  const periodData = data.period || {};
  const totalKwh = periodData.energy_total_kwh || data.energy.lifetime_kwh || 0;
  const co2Avoided = totalKwh * 0.0949;
  const avgMonthly =
    periodData.avg_monthly_economy != null
      ? periodData.avg_monthly_economy
      : data.economy.lifetime / Math.max(1, monthsSinceDate(data.create_date));

  const metricas = [
    {
      icon: "kW",
      label: "Energia Gerada",
      value: `${formatNumber(totalKwh)} kWh`,
      sublabel: "no periodo",
    },
    {
      icon: "CO2",
      label: "CO\u2082 Evitado",
      value: `${formatNumber(co2Avoided)} kg`,
      sublabel: "impacto ambiental",
    },
    {
      icon: "R$",
      label: "Economia Media",
      value: formatBRL(avgMonthly),
      sublabel: "por mes",
    },
  ];

  const metricW = 52;
  const metricStartX = cx - (metricas.length * metricW) / 2;
  const metricY = pilaresY + 12;

  metricas.forEach((m, i) => {
    const px = metricStartX + i * metricW + metricW / 2;

    doc.setFillColor(...BLUE_MID);
    doc.roundedRect(px - 22, metricY, 44, 38, 3, 3, "F");

    doc.setFillColor(20, 45, 90);
    doc.circle(px, metricY + 9, 6, "F");
    doc.setDrawColor(...YELLOW);
    doc.setLineWidth(0.5);
    doc.circle(px, metricY + 9, 6, "S");

    doc.setTextColor(...YELLOW);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(m.icon.length > 2 ? 5 : 6);
    doc.text(m.icon, px, metricY + 11, { align: "center" });

    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(m.value, px, metricY + 22, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...YELLOW);
    doc.text(m.label, px, metricY + 28, { align: "center" });

    doc.setTextColor(180, 180, 200);
    doc.setFontSize(5.5);
    doc.text(m.sublabel, px, metricY + 33, { align: "center" });
  });

  // =========================================================================
  // LOGO RODAPE
  // =========================================================================
  const footerY = ph - 28;

  if (logoImg) {
    const logoW = 55;
    const logoH = 16;
    doc.addImage(logoImg, "PNG", cx - logoW / 2, footerY, logoW, logoH);
  } else {
    doc.setFillColor(...YELLOW);
    doc.roundedRect(cx - 30, footerY, 60, 15, 3, 3, "F");
    doc.setTextColor(...BLUE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("AD energia", cx, footerY + 10, { align: "center" });
  }

  // =========================================================================
  // SALVAR
  // =========================================================================
  const safeName = data.cliente.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`${safeName}_Relatorio_Economia_AD_ENERGIA.pdf`);
}

// ===========================================================================
// HELPERS
// ===========================================================================

async function loadImage(url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Monta array de barras SEM barra Total (Total fica fora do grafico). */
function buildChartData(data) {
  const tarifa = data.tarifa_kwh || 0.9;

  if (data.period && data.period.chart_data && data.period.chart_data.length > 0) {
    return data.period.chart_data.map((item) => ({
      label: item.label,
      value: Math.round(item.kwh * tarifa * 100) / 100,
    }));
  }

  // Fallback: yearly_breakdown
  return Object.entries(data.yearly_breakdown || {}).map(([year, kwh]) => ({
    label: year,
    value: Math.round(kwh * tarifa * 100) / 100,
  }));
}

function formatPeriodLabel(data) {
  if (data.period) {
    const from = formatDateBR(data.period.from);
    const to = formatDateBR(data.period.to);
    return `${from} a ${to}`;
  }
  if (data.create_date) {
    return `Desde ${formatDateBR(data.create_date)}`;
  }
  return "--/--/----";
}

function formatDateBR(dateStr) {
  if (!dateStr) return "--/--/----";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatBRL(value) {
  return `R$ ${Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatBRLCompact(value) {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}k`;
  }
  return formatBRL(value);
}

function formatNumber(value) {
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function monthsSinceDate(dateStr) {
  if (!dateStr) return 1;
  const parts = dateStr.split("-");
  if (parts.length < 2) return 1;
  const now = new Date();
  const startYear = parseInt(parts[0], 10);
  const startMonth = parseInt(parts[1], 10);
  return Math.max(
    1,
    (now.getFullYear() - startYear) * 12 + (now.getMonth() + 1 - startMonth) + 1,
  );
}
