export const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || "";

export const STATUS_MAP = {
  1: { label: "Funcionando normalmente", type: "ok" },
  2: { label: "Alarmes em micro-inversores", type: "warning" },
  3: { label: "Problema de conexao ECU", type: "error" },
  4: { label: "ECU sem dados", type: "inactive" },
};
