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
      <KpiCard
        label="Com Problema"
        value={kpis.problems}
        highlight={kpis.problems > 0}
      />
      <KpiCard label="Capacidade Total" value={`${kpis.totalKw} kW`} />
    </div>
  );
}
