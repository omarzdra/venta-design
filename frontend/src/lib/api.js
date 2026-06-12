import { supabase } from "./supabaseClient";
import { cacheKey, getCached, getInFlight, invalidateCache, setCached, setInFlight } from "./cache";
import { ApiError, messageForStatus, normalizeApiError } from "./errors";

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "");
const REQUEST_TIMEOUT_MS = 30000;
const DEFAULT_STALE_TIME_MS = 30000;
const LOOKUP_STALE_TIME_MS = 60000;

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  if (!API_URL) {
    throw new ApiError("Aplikacija ni pravilno konfigurirana: manjka VITE_API_URL.", { code: "MISSING_API_URL" });
  }

  const method = (options.method || "GET").toUpperCase();
  const useCache = method === "GET" && options.cache !== false;
  const key = cacheKey(path);
  const staleTime = options.staleTime || DEFAULT_STALE_TIME_MS;
  if (useCache) {
    const cached = getCached(key, staleTime);
    if (cached) return cached;
    const pending = getInFlight(key);
    if (pending) return pending;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || REQUEST_TIMEOUT_MS);
  const headers = {
    "Content-Type": "application/json",
    ...(await authHeader()),
    ...(options.headers || {})
  };

  const run = (async () => {
    const response = await fetch(`${API_URL}${path}`, { ...options, headers, signal: options.signal || controller.signal });
    const requestId = response.headers.get("X-Request-Id");
    const isJson = response.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await response.json().catch(() => null) : await response.text().catch(() => "");
    if (!response.ok) {
      const serverMessage = typeof data === "object" ? (data?.message || data?.error) : data;
      throw new ApiError(messageForStatus(response.status, serverMessage), {
        status: response.status,
        code: typeof data === "object" ? data?.code : undefined,
        details: typeof data === "object" ? data?.details : null,
        requestId
      });
    }
    if (method !== "GET") invalidateByPath(path);
    if (useCache) setCached(key, data);
    return data;
  })();

  if (useCache) setInFlight(key, run);

  try {
    return await run;
  } catch (error) {
    throw normalizeApiError(error);
  } finally {
    clearTimeout(timeout);
  }
}

function invalidateByPath(path) {
  if (path.includes("/api/produkti") || path.includes("/api/lot_produkti")) invalidateCache(["/api/zaloga", "/api/produkti", "/api/lot_produkti"]);
  if (path.includes("/api/storitve")) invalidateCache(["/api/storitve"]);
  if (path.includes("/api/nakupi")) invalidateCache(["/api/nakupi", "/api/zaloga", "/api/lot_produkti", "/api/analiza"]);
  if (path.includes("/api/naloge")) invalidateCache(["/api/naloge", "/api/zaloga", "/api/lot_produkti", "/api/analiza"]);
  if (path.includes("/api/prihodki")) invalidateCache(["/api/prihodki", "/api/analiza"]);
  if (path.includes("/api/ponudbe")) invalidateCache(["/api/ponudbe"]);
  if (path.includes("/api/inventure")) invalidateCache(["/api/inventure"]);
}

const query = (params = {}) => {
  const clean = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined));
  const qs = new URLSearchParams(clean).toString();
  return qs ? `?${qs}` : "";
};

export const api = {
  me: () => request("/api/auth/me"),
  bootstrap: () => request("/api/bootstrap", { staleTime: LOOKUP_STALE_TIME_MS }),
  taskFormLookups: () => request("/api/lookups/task-form", { staleTime: LOOKUP_STALE_TIME_MS }),
  offerFormLookups: () => request("/api/lookups/offer-form", { staleTime: LOOKUP_STALE_TIME_MS }),
  zaloga: () => request("/api/zaloga", { staleTime: DEFAULT_STALE_TIME_MS }),
  produkti: () => request("/api/produkti", { staleTime: LOOKUP_STALE_TIME_MS }),
  createProdukt: (payload) => request("/api/produkti", { method: "POST", body: JSON.stringify(payload) }),
  storitve: () => request("/api/storitve", { staleTime: LOOKUP_STALE_TIME_MS }),
  createStoritev: (payload) => request("/api/storitve", { method: "POST", body: JSON.stringify(payload) }),
  updateStoritev: (id, payload) => request(`/api/storitve/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteStoritev: (id) => request(`/api/storitve/${id}`, { method: "DELETE" }),
  lots: (params) => Array.isArray(params)
    ? request(`/api/lot_produkti${query({ include_ids: params.join(",") })}`, { staleTime: LOOKUP_STALE_TIME_MS })
    : request(`/api/lot_produkti${query(params)}`, { staleTime: LOOKUP_STALE_TIME_MS }),
  updateLot: (id, payload) => request(`/api/lot_produkti/${id}/lot_stevilka`, { method: "PATCH", body: JSON.stringify(payload) }),
  inventure: () => request("/api/inventure"),
  inventura: (id) => request(`/api/inventure/${id}`),
  createInventura: (payload) => request("/api/inventure", { method: "POST", body: JSON.stringify(payload) }),
  toggleInventuraLot: (invId, lotId) => request(`/api/inventure/${invId}/lot/${lotId}`, { method: "PATCH", body: JSON.stringify({}) }),
  nakupi: (params) => request(`/api/nakupi${query(params)}`),
  nakup: (id) => request(`/api/nakupi/${id}`),
  createNakup: (payload) => request("/api/nakupi", { method: "POST", body: JSON.stringify(payload) }),
  updateNakup: (id, payload) => request(`/api/nakupi/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteNakup: (id) => request(`/api/nakupi/${id}`, { method: "DELETE" }),
  naloge: (params) => request(`/api/naloge${query(params)}`),
  naloga: (id) => request(`/api/naloge/${id}`),
  createNaloga: (payload) => request("/api/naloge", { method: "POST", body: JSON.stringify(payload) }),
  updateNaloga: (id, payload) => request(`/api/naloge/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteNaloga: (id) => request(`/api/naloge/${id}`, { method: "DELETE" }),
  uploadNalogaSlika: (payload) => request("/api/naloge/slike/upload", { method: "POST", body: JSON.stringify(payload) }),
  dokoncajNaloga: (id) => request(`/api/naloge/${id}/dokoncaj`, { method: "PATCH", body: JSON.stringify({}) }),
  potrdiNaloga: (id, payload) => request(`/api/naloge/${id}/potrdi`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteNalogaSlika: (nalogaId, slikaId) => request(`/api/naloge/${nalogaId}/slike/${slikaId}`, { method: "DELETE" }),
  prihodki: (params) => request(`/api/prihodki${query(params)}`),
  createPrihodek: (payload) => request("/api/prihodki", { method: "POST", body: JSON.stringify(payload) }),
  updatePrihodek: (id, payload) => request(`/api/prihodki/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deletePrihodek: (id) => request(`/api/prihodki/${id}`, { method: "DELETE" }),
  analizaSummary: (params) => request(`/api/analiza/summary${query(params)}`),
  analizaProdaja: (params) => request(`/api/analiza/prodaja${query(params)}`),
  ponudbe: () => request("/api/ponudbe", { staleTime: DEFAULT_STALE_TIME_MS }),
  createPonudba: (payload) => request("/api/ponudbe", { method: "POST", body: JSON.stringify(payload) }),
  deletePonudba: (id) => request(`/api/ponudbe/${id}`, { method: "DELETE" })
};
