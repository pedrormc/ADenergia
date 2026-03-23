import jsPDF from "jspdf";

export async function generatePdf({ kpis, problems, periodLabel }) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // Logo
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

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const cols = [margin, margin + 45, margin + 90, margin + 120];
    doc.text("ID Placa", cols[0], y);
    doc.text("Cliente", cols[1], y);
    doc.text("kW", cols[2], y);
    doc.text("Status", cols[3], y);
    y += 6;

    doc.setFont("helvetica", "normal");
    for (const p of problems) {
      if (y > 270) break;
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
