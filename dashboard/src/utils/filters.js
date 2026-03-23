export function filterByCliente(data, cliente) {
  if (!cliente) return data;
  return data.filter((row) => row.cliente === cliente);
}

export function filterByStatus(data, status) {
  if (status === null || status === undefined || status === "") return data;
  return data.filter((row) => String(row.status) === String(status));
}

export function filterByPeriod(data, from, to) {
  const normalizedTo = to && !to.includes("T") ? to + "T23:59:59" : to;

  return data.filter((row) => {
    const ts = row.timestamp;
    if (from && ts < from) return false;
    if (normalizedTo && ts > normalizedTo) return false;
    return true;
  });
}

export function applyFilters(data, { cliente, status, from, to }) {
  let result = data;
  result = filterByCliente(result, cliente);
  result = filterByStatus(result, status);
  result = filterByPeriod(result, from, to);
  return result;
}

export function getUniqueClientes(data) {
  const set = new Set(data.map((row) => row.cliente).filter(Boolean));
  return [...set].sort();
}

export function computeKpis(data) {
  const latestBySystem = new Map();

  for (const row of data) {
    const existing = latestBySystem.get(row.sid);
    if (!existing || row.timestamp > existing.timestamp) {
      latestBySystem.set(row.sid, row);
    }
  }

  const latestRows = [...latestBySystem.values()];
  const total = latestRows.length;
  const ok = latestRows.filter(
    (r) => r.status === 1 || r.status === "1"
  ).length;
  const problems = total - ok;
  const totalKw = latestRows.reduce(
    (sum, r) => sum + (parseFloat(r.capacidade_kw) || 0),
    0
  );

  return { total, ok, problems, totalKw: totalKw.toFixed(2) };
}

export function getPeriodRange(period) {
  const now = new Date();
  const to = now.toISOString();
  let from;

  switch (period) {
    case "day":
      from = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).toISOString();
      break;
    case "week": {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      from = weekAgo.toISOString();
      break;
    }
    case "month": {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      from = monthAgo.toISOString();
      break;
    }
    default:
      from = null;
  }

  return { from, to: period === "all" ? null : to };
}
