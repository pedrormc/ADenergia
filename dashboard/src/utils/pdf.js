import jsPDF from "jspdf";

/**
 * Gera o PDF de economia individual do cliente — estilo AD Energia.
 * Agora async para carregar imagens e com suporte a periodo selecionado.
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
  const BLUE = [0, 31, 86]; // #001f56
  const BLUE_MID = [30, 60, 110];
  const BLUE_BAR = [70, 130, 200];
  const YELLOW = [255, 193, 7]; // #ffc107
  const WHITE = [255, 255, 255];
  const LIGHT_BLUE = [173, 216, 230];
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

  // Nome do cliente
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...BLUE);
  doc.text(data.cliente.toUpperCase(), cx, 18, { align: "center" });

  // Subtitulo
  doc.setFontSize(14);
  doc.text("Economia de sua usina", cx, 32, { align: "center" });

  // Linha divisoria amarela fina abaixo
  doc.setDrawColor(...YELLOW);
  doc.setLineWidth(0.5);

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

  // --- Card 1: Periodo Selecionado ---
  doc.setFillColor(...BLUE_MID);
  doc.roundedRect(card1X, cardY, cardW, cardH, 4, 4, "F");

  // Icone do periodo (peridoselecionado.png)
  if (periodImg) {
    doc.addImage(periodImg, "PNG", card1X + 6, cardY + 4, iconSize, iconSize);
  }

  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Periodo Selecionado", card1X + 6 + iconSize + 3, cardY + 9);

  // Datas do periodo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  const periodText = formatPeriodLabel(data);
  doc.text(periodText, card1X + cardW / 2, cardY + 26, { align: "center" });

  // --- Card 2: Economia no Periodo ---
  doc.setFillColor(...BLUE_MID);
  doc.roundedRect(card2X, cardY, cardW, cardH, 4, 4, "F");

  // Icone da economia (economiatotal.png)
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
  // GRAFICO DE BARRAS — Economia dinamica
  // =========================================================================
  const chartY = cardY + cardH + 10;
  const chartW = pw - margin * 2;
  const chartH = 95;
  const chartX = margin;

  // Background branco do grafico
  doc.setFillColor(...WHITE);
  doc.roundedRect(chartX, chartY, chartW, chartH + 18, 4, 4, "F");

  // Titulo do grafico
  doc.setTextColor(...DARK_TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);

  const granularity = data.period ? data.period.granularity : "yearly";
  const chartTitle = granularity === "yearly"
    ? "Economia por Ano (R$)"
    : granularity === "monthly"
      ? "Economia por Mes (R$)"
      : "Economia por Dia (R$)";

  doc.text(chartTitle, chartX + chartW / 2, chartY + 10, { align: "center" });

  // Dados do grafico
  const chartItems = buildChartData(data);

  if (chartItems.length > 0) {
    const maxVal = Math.max(...chartItems.map((d) => d.value), 1);
    const barAreaY = chartY + 16;
    const barAreaH = chartH - 12;
    const barAreaW = chartW - 40;
    const barAreaX = chartX + 32;

    // Limitar largura das barras e calcular espacamento proporcional
    const maxBarW = 30;
    const minGap = 4;
    const count = chartItems.length;
    const availW = barAreaW;
    const barW = Math.min(maxBarW, (availW - minGap * (count - 1)) / count);
    const actualGap = count > 1
      ? (availW - barW * count) / (count - 1)
      : 0;
    const totalBarsW = barW * count + actualGap * (count - 1);
    const startX = barAreaX + (barAreaW - totalBarsW) / 2;

    // Y-axis grid lines
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const gy = barAreaY + barAreaH - (barAreaH * i) / gridSteps;
      doc.line(barAreaX, gy, barAreaX + barAreaW, gy);

      const gridVal = formatBRLCompact((maxVal * i) / gridSteps);
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      doc.text(gridVal, barAreaX - 2, gy + 1, { align: "right" });
    }

    // Bars
    chartItems.forEach((d, i) => {
      const bx = startX + i * (barW + actualGap);
      const barH = Math.max(1, (d.value / maxVal) * barAreaH);
      const by = barAreaY + barAreaH - barH;

      // Cor: ultima barra (Total) em azul claro, demais em azul medio
      if (d.isTotal) {
        doc.setFillColor(...LIGHT_BLUE);
      } else {
        doc.setFillColor(...BLUE_BAR);
      }
      doc.roundedRect(bx, by, barW, barH, 1.5, 1.5, "F");

      // Valor em cima da barra
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BLUE);
      doc.text(formatBRLCompact(d.value), bx + barW / 2, by - 2, {
        align: "center",
      });

      // Label abaixo
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...DARK_TEXT);
      doc.text(d.label, bx + barW / 2, barAreaY + barAreaH + 5, {
        align: "center",
      });
    });
  }

  // =========================================================================
  // PILARES ESTRATEGICOS — 3 Metricas Reais
  // =========================================================================
  const pilaresY = chartY + chartH + 28;

  // Linha divisoria amarela
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
  const co2Avoided = totalKwh * 0.0949; // kg CO2/kWh — fator MCTIC/SIN
  const avgMonthly = periodData.avg_monthly_economy != null
    ? periodData.avg_monthly_economy
    : (data.economy.lifetime / Math.max(1, monthsSinceDate(data.create_date)));

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

    // Card background escuro
    doc.setFillColor(...BLUE_MID);
    doc.roundedRect(px - 22, metricY, 44, 38, 3, 3, "F");

    // Circulo com icone
    doc.setFillColor(20, 45, 90);
    doc.circle(px, metricY + 9, 6, "F");
    doc.setDrawColor(...YELLOW);
    doc.setLineWidth(0.5);
    doc.circle(px, metricY + 9, 6, "S");

    // Icone (texto)
    doc.setTextColor(...YELLOW);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(m.icon.length > 2 ? 5 : 6);
    doc.text(m.icon, px, metricY + 11, { align: "center" });

    // Valor da metrica
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(m.value, px, metricY + 22, { align: "center" });

    // Label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...YELLOW);
    doc.text(m.label, px, metricY + 28, { align: "center" });

    // Sublabel
    doc.setTextColor(180, 180, 200);
    doc.setFontSize(5.5);
    doc.text(m.sublabel, px, metricY + 33, { align: "center" });
  });

  // =========================================================================
  // LOGO RODAPE
  // =========================================================================
  const footerY = ph - 28;

  if (logoImg) {
    // Logo real — proporcao ~3.5:1 (largura:altura)
    const logoW = 55;
    const logoH = 16;
    doc.addImage(logoImg, "PNG", cx - logoW / 2, footerY, logoW, logoH);
  } else {
    // Fallback texto
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

/** Carrega uma imagem como base64 data URL. Retorna null em caso de erro. */
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

/** Monta o array de barras do grafico a partir dos dados da API. */
function buildChartData(data) {
  const tarifa = data.tarifa_kwh || 0.9;

  // Se tem dados de periodo do backend, usar chart_data
  if (data.period && data.period.chart_data && data.period.chart_data.length > 0) {
    const items = data.period.chart_data.map((item) => ({
      label: item.label,
      value: Math.round(item.kwh * tarifa * 100) / 100,
      isTotal: false,
    }));

    // Adicionar barra de Total apenas se houver mais de 1 barra
    if (items.length > 1) {
      items.push({
        label: "Total",
        value: data.period.economy_total,
        isTotal: true,
      });
    }
    return items;
  }

  // Fallback: yearly_breakdown (compatibilidade)
  const yearlyEntries = Object.entries(data.yearly_breakdown || {});
  const items = yearlyEntries.map(([year, kwh]) => ({
    label: year,
    value: Math.round(kwh * tarifa * 100) / 100,
    isTotal: false,
  }));

  if (items.length > 1) {
    items.push({
      label: "Total",
      value: data.economy.lifetime,
      isTotal: true,
    });
  }
  return items;
}

/** Formata label do periodo para o card. */
function formatPeriodLabel(data) {
  if (data.period) {
    const from = formatDateBR(data.period.from);
    const to = formatDateBR(data.period.to);
    return `${from} a ${to}`;
  }
  // Fallback: desde create_date
  if (data.create_date) {
    return `Desde ${formatDateBR(data.create_date)}`;
  }
  return "--/--/----";
}

/** Converte YYYY-MM-DD para DD/MM/YYYY. */
function formatDateBR(dateStr) {
  if (!dateStr) return "--/--/----";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/** Formata valor em Reais. */
function formatBRL(value) {
  return `R$ ${Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Formata valor em Reais — versao compacta para eixos de grafico. */
function formatBRLCompact(value) {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}k`;
  }
  return formatBRL(value);
}

/** Formata numero com separador de milhar pt-BR. */
function formatNumber(value) {
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** Calcula meses desde uma data YYYY-MM-DD ate hoje. */
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
