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
      onMouseEnter={(e) => {
        e.target.style.opacity = "0.9";
      }}
      onMouseLeave={(e) => {
        e.target.style.opacity = "1";
      }}
    >
      Exportar PDF
    </button>
  );
}
