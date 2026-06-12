export class ApiError extends Error {
  constructor(message, { status = 0, code = "UNKNOWN_ERROR", details = null, requestId = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

export function normalizeApiError(error) {
  if (error instanceof ApiError) return error;
  if (error?.name === "AbortError") {
    return new ApiError("Zahteva traja predolgo. Preveri povezavo in poskusi znova.", { code: "TIMEOUT" });
  }
  if (error instanceof TypeError) {
    return new ApiError("Povezava s streznikom ni uspela. Preveri, ali backend deluje.", { code: "NETWORK_ERROR" });
  }
  return new ApiError(error?.message || "Prislo je do nepricakovane napake.", { code: "UNKNOWN_ERROR" });
}

export function messageForStatus(status, fallback) {
  if (status === 401) return "Seja je potekla. Prijavi se ponovno.";
  if (status === 403) return "Nimas dovoljenja za to akcijo.";
  if (status === 404) return "Zahtevani podatek ne obstaja.";
  if (status === 409) return "Tega ni mogoce shraniti, ker je v konfliktu z obstojecimi podatki.";
  if (status >= 500) return "Napaka na strezniku. Poskusi ponovno ali javi administratorju.";
  return fallback || "Prislo je do napake.";
}
