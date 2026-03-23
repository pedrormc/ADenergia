import { useState, useMemo } from "react";
import { useSolarData } from "./hooks/useSolarData";
import {
  applyFilters,
  getUniqueClientes,
  computeKpis,
  getPeriodRange,
} from "./utils/filters";
import { Header } from "./components/Header";
import { FilterBar } from "./components/FilterBar";
import { KpiCards } from "./components/KpiCards";
import { SystemTable } from "./components/SystemTable";
import { ExportButton } from "./components/ExportButton";

const PERIOD_LABELS = {
  all: "Todos os periodos",
  day: "Hoje",
  week: "Ultima semana",
  month: "Ultimo mes",
  custom: "Personalizado",
};

export default function App() {
  const { data, loading, error, retry } = useSolarData();

  const [selectedCliente, setSelectedCliente] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const clientes = useMemo(() => getUniqueClientes(data), [data]);

  const filteredData = useMemo(() => {
    const { from, to } =
      selectedPeriod === "custom"
        ? { from: customFrom, to: customTo }
        : getPeriodRange(selectedPeriod);

    return applyFilters(data, {
      cliente: selectedCliente,
      status: selectedStatus,
      from,
      to,
    });
  }, [data, selectedCliente, selectedPeriod, selectedStatus, customFrom, customTo]);

  const kpis = useMemo(() => computeKpis(filteredData), [filteredData]);

  const periodProblems = useMemo(() => {
    const { from, to } =
      selectedPeriod === "custom"
        ? { from: customFrom, to: customTo }
        : getPeriodRange(selectedPeriod);

    const periodData = applyFilters(data, {
      cliente: selectedCliente,
      status: "",
      from,
      to,
    });
    return periodData.filter((r) => r.status !== 1 && r.status !== "1");
  }, [data, selectedCliente, selectedPeriod, customFrom, customTo]);

  const periodLabel =
    selectedPeriod === "custom"
      ? `${customFrom || "inicio"} a ${customTo || "hoje"}`
      : PERIOD_LABELS[selectedPeriod];

  // Resolve sid for selected client (pick latest entry)
  const selectedSid = useMemo(() => {
    if (!selectedCliente) return "";
    const match = data.find((row) => row.cliente === selectedCliente);
    return match ? match.sid : "";
  }, [data, selectedCliente]);

  if (loading) {
    return (
      <div>
        <Header />
        <main style={{ padding: "var(--spacing-8)" }}>
          <div
            style={{
              display: "flex",
              gap: "var(--spacing-6)",
              marginBottom: "var(--spacing-8)",
            }}
          >
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                style={{
                  flex: 1,
                  height: 100,
                  borderRadius: "var(--roundness-md)",
                  background: "var(--surface-container-low)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ))}
          </div>
          <div
            style={{
              height: 300,
              borderRadius: "var(--roundness-md)",
              background: "var(--surface-container-low)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header />
        <main
          style={{
            padding: "var(--spacing-16)",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "var(--body-md)",
              color: "var(--on-surface-variant)",
              marginBottom: "var(--spacing-4)",
            }}
          >
            {error}
          </p>
          <button
            onClick={retry}
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
            }}
          >
            Tentar novamente
          </button>
        </main>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <main style={{ padding: "var(--spacing-8)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: "var(--spacing-6)",
          }}
        >
          <FilterBar
            clientes={clientes}
            selectedCliente={selectedCliente}
            onClienteChange={setSelectedCliente}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
          />
          <ExportButton
            selectedCliente={selectedCliente}
            selectedSid={selectedSid}
            selectedPeriod={selectedPeriod}
            customFrom={customFrom}
            customTo={customTo}
          />
        </div>

        <div style={{ marginBottom: "var(--spacing-8)" }}>
          <KpiCards kpis={kpis} />
        </div>

        <SystemTable data={filteredData} />
      </main>
    </div>
  );
}
