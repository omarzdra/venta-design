import { supabase } from "./supabaseClient";

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "");

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(await authHeader()),
    ...(options.headers || {})
  };
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : null;
  if (!response.ok) throw new Error(data?.message || data?.error || "Prišlo je do napake na strežniku.");
  return data;
}

const query = (params = {}) => {
  const clean = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== undefined));
  const qs = new URLSearchParams(clean).toString();
  return qs ? `?${qs}` : "";
};

export const api = {
  me: () => request("/api/auth/me"),
  zaloga: () => request("/api/zaloga"),
  produkti: () => request("/api/produkti"),
  createProdukt: (payload) => request("/api/produkti", { method: "POST", body: JSON.stringify(payload) }),
  lots: (params) => request(`/api/lot_produkti${query(params)}`),
  updateLot: (id, payload) => request(`/api/lot_produkti/${id}/lot_stevilka`, { method: "PATCH", body: JSON.stringify(payload) }),
  nakupi: (params) => request(`/api/nakupi${query(params)}`),
  createNakup: (payload) => request("/api/nakupi", { method: "POST", body: JSON.stringify(payload) }),
  naloge: (params) => request(`/api/naloge${query(params)}`),
  createNaloga: (payload) => request("/api/naloge", { method: "POST", body: JSON.stringify(payload) }),
  updateNaloga: (id, payload) => request(`/api/naloge/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  dokoncajNaloga: (id) => request(`/api/naloge/${id}/dokoncaj`, { method: "PATCH", body: JSON.stringify({}) }),
  potrdiNaloga: (id, payload) => request(`/api/naloge/${id}/potrdi`, { method: "PATCH", body: JSON.stringify(payload) }),
  prihodki: (params) => request(`/api/prihodki${query(params)}`),
  createPrihodek: (payload) => request("/api/prihodki", { method: "POST", body: JSON.stringify(payload) }),
  analizaSummary: (params) => request(`/api/analiza/summary${query(params)}`),
  analizaProdaja: (params) => request(`/api/analiza/prodaja${query(params)}`)
};
