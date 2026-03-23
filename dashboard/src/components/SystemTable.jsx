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
                  : "\u2014"}
              </td>
              <td
                style={{
                  ...cellStyle,
                  fontFamily: "monospace",
                  fontSize: "var(--label-sm)",
                }}
              >
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
