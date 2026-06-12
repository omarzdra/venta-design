import { useCallback, useEffect, useState } from "react";
import { normalizeApiError } from "../lib/errors";

export function useAsyncData(loader, { immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loader();
      setData(result);
      return result;
    } catch (err) {
      const normalized = normalizeApiError(err);
      setError(normalized);
      throw normalized;
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    if (!immediate) return undefined;
    let cancelled = false;
    const controller = new AbortController();
    loader()
      .then((result) => { if (!cancelled) setData(result); })
      .catch((err) => { if (!cancelled) setError(normalizeApiError(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; controller.abort(); };
  }, [immediate, loader]);

  return { data, loading, error, reload, setData };
}
