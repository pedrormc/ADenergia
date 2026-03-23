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

const labelStyle = {
  fontSize: "var(--label-sm)",
  color: "var(--on-surface-variant)",
  display: "block",
  marginBottom: 4,
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
        <label style={labelStyle}>Cliente</label>
        <select
          value={selectedCliente}
          onChange={(e) => onClienteChange(e.target.value)}
          style={selectStyle}
          onFocus={selectFocusHandler}
          onBlur={selectBlurHandler}
        >
          <option value="">Todos</option>
          {clientes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Periodo</label>
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
            <label style={labelStyle}>De</label>
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
            <label style={labelStyle}>Ate</label>
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
        <label style={labelStyle}>Status</label>
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
