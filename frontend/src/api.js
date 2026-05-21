const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        },
        ...options
    });

    const isJson = response.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
        throw new Error(data?.message || data?.error || "Prišlo je do napake na strežniku.");
    }

    return data;
}

// Nove backend rute, ki vračajo že strukturirane in preračunane podatke
export async function getZaloga() { return request("/api/zaloga"); }
export async function getEvidenca() { return request("/api/evidenca"); }
export async function getProfit() { return request("/api/profit"); }

// Stare rute (očiščene _sort in _order, saj backend zdaj sam sortira)
export async function getProdukti() { return request("/api/produkti"); }
export async function getLotProdukti() { return request("/api/lot_produkti"); }
export async function getNalogePlakati() { return request("/api/delovne_naloge_plakati"); }
export async function getNalogeAvti() { return request("/api/delovne_naloge_avti"); }

// Akcije
export async function addProdukt(payload) { return request("/api/produkti", { method: "POST", body: JSON.stringify(payload) }); }
export async function addLotProdukt(payload) { return request("/api/lot_produkti", { method: "POST", body: JSON.stringify(payload) }); }
export async function createNalogaPlakati(payload) { return request("/api/delovne_naloge_plakati", { method: "POST", body: JSON.stringify(payload) }); }
export async function createNalogaAvti(payload) { return request("/api/delovne_naloge_avti", { method: "POST", body: JSON.stringify(payload) }); }
export async function updateNalogaPlakati(id, payload) { return request(`/api/delovne_naloge_plakati/${id}`, { method: "PUT", body: JSON.stringify(payload) }); }
export async function updateNalogaAvti(id, payload) { return request(`/api/delovne_naloge_avti/${id}`, { method: "PUT", body: JSON.stringify(payload) }); }
export async function addOstaliNakup(payload) { return request("/api/ostali_nakupi", { method: "POST", body: JSON.stringify(payload) }); }
export async function addPrihodek(payload) { return request("/api/prihodki", { method: "POST", body: JSON.stringify(payload) }); }
export async function potrdiLotProdukt(id, payload) { return request(`/api/lot_produkti/${id}/potrdi`, { method: "PUT", body: JSON.stringify(payload) }); }
