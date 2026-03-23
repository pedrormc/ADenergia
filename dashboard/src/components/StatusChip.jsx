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
