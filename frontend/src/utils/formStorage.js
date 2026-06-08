const KEYS = {
  nalogaSplosno: "venta_form_naloga_splosno",
  nalogaVozila: "venta_form_naloga_vozila",
  nakup: "venta_form_nakup"
};

export function saveForm(key, data) {
  try {
    localStorage.setItem(KEYS[key], JSON.stringify(data));
  } catch {
    // Local storage can be unavailable in private mode.
  }
}

export function loadForm(key) {
  try {
    const value = localStorage.getItem(KEYS[key]);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function clearForm(key) {
  try {
    localStorage.removeItem(KEYS[key]);
  } catch {
    // Ignore storage cleanup errors.
  }
}
