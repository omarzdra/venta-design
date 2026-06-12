import { useCallback, useMemo, useState } from "react";
import { Toast } from "../components/ui/Toast";
import { normalizeApiError } from "../lib/errors";
import { ToastContext } from "./toastContext";

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const notify = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);
  const value = useMemo(() => ({
    notifySuccess: (message) => notify(message, "success"),
    notifyInfo: (message) => notify(message, "info"),
    notifyError: (error) => notify(normalizeApiError(error).message, "error")
  }), [notify]);

  return <ToastContext.Provider value={value}>{children}<Toast toast={toast} /></ToastContext.Provider>;
}
