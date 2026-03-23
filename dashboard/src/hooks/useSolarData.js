import { useState, useEffect, useCallback } from "react";
import { APPS_SCRIPT_URL } from "../config";

export function useSolarData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!APPS_SCRIPT_URL) {
      setError("URL do Apps Script nao configurada");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `${APPS_SCRIPT_URL}${APPS_SCRIPT_URL.includes("?") ? "&" : "?"}t=${Date.now()}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      setData(json.data || []);
    } catch (err) {
      setError("Nao foi possivel carregar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, retry: fetchData };
}
