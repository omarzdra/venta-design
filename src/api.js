const API_URL = "https://venta-design.onrender.com";

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
        throw new Error(data?.message || "Prišlo je do napake na strežniku.");
    }

    return data;
}

export async function getProdukti() { return request("/produkti?_sort=id&_order=desc"); }
export async function getLotProdukti() { return request("/lot_produkti?_sort=id&_order=desc"); }
export async function getEvidencaZaloge() { return request("/evidencija_zaloge?_sort=id&_order=desc"); }
export async function getNalogePlakati() { return request("/delovne_naloge_plakati?_sort=id&_order=desc"); }
export async function getNalogeAvti() { return request("/delovne_naloge_avti?_sort=id&_order=desc"); }

export async function addProdukt(payload) {
    return request("/produkti", { method: "POST", body: JSON.stringify(payload) });
}
export async function deleteProdukt(id) {
    return request(`/produkti/${id}`, { method: "DELETE" });
}

export async function addLotProdukt(payload) {
    return request("/lot_produkti", { method: "POST", body: JSON.stringify(payload) });
}

export async function addEvidencaZaloge(payload) {
    return request("/evidencija_zaloge", { method: "POST", body: JSON.stringify(payload) });
}

export async function createNalogaPlakati(payload) {
    return request("/delovne_naloge_plakati", { method: "POST", body: JSON.stringify(payload) });
}

export async function createNalogaAvti(payload) {
    return request("/delovne_naloge_avti", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateNalogaPlakati(id, payload) {
    return request(`/delovne_naloge_plakati/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function updateNalogaAvti(id, payload) {
    return request(`/delovne_naloge_avti/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function deleteNalogaPlakati(id) {
    return request(`/delovne_naloge_plakati/${id}`, { method: "DELETE" });
}

export async function deleteNalogaAvti(id) {
    return request(`/delovne_naloge_avti/${id}`, { method: "DELETE" });
}

export async function getOstaliNakupi() { return request("/ostali_nakupi?_sort=id&_order=desc"); }
export async function addOstaliNakup(payload) { return request("/ostali_nakupi", { method: "POST", body: JSON.stringify(payload) }); }
export async function potrdiLotProdukt(id, payload) { return request(`/lot_produkti/${id}/potrdi`, { method: "PUT", body: JSON.stringify(payload) }); }
