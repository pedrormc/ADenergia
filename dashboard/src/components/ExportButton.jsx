import { useState } from "react";
import { generateEconomyPdf } from "../utils/pdf";

export function ExportButton({ selectedCliente, selectedSid }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!selectedSid) return;

    setLoading(true);
    try {
      const resp = await fetch(`/api/energy?sid=${selectedSid}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      generateEconomyPdf(data);
    } catch (err) {
      alert(`Erro ao gerar relatorio: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const disabled = !selectedCliente || loading;

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      title={!selectedCliente ? "Selecione um cliente para exportar" : ""}
      style={{
        padding: "0.625rem 1.5rem",
        borderRadius: "var(--roundness-md)",
        border: "none",
        background: disabled ? "var(--surface-container-highest)" : "var(--primary-gradient)",
        color: disabled ? "var(--on-surface-variant)" : "var(--on-primary)",
        fontFamily: "var(--font-body)",
        fontSize: "var(--body-sm)",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "opacity 0.15s",
        opacity: disabled ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.target.style.opacity = "0.9";
      }}
      onMouseLeave={(e) => {
        e.target.style.opacity = disabled ? "0.6" : "1";
      }}
    >
      {loading ? "Gerando..." : "Exportar PDF"}
    </button>
  );
}
