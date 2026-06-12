import { useCallback, useState } from "react";
import { normalizeApiError } from "../lib/errors";

export function useMutation(action, { onSuccess, onError } = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await action(...args);
      await onSuccess?.(result);
      return result;
    } catch (err) {
      const normalized = normalizeApiError(err);
      setError(normalized);
      await onError?.(normalized);
      throw normalized;
    } finally {
      setLoading(false);
    }
  }, [action, onError, onSuccess]);

  return { mutate, loading, error };
}
