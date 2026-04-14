const API_URL = "http://localhost:3001";

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
        throw new Error(data?.message || "Prišlo je do napake.");
    }

    return data;
}

export async function getMaterials() {
    return request("/materials");
}

export async function getWorkOrders() {
    return request("/workOrders");
}

export async function getMovementLog() {
    return request("/movementLog");
}

export async function createWorkOrder(payload) {
    return request("/work-orders", {
        method: "POST",
        body: JSON.stringify(payload)
    });
}