export const money = (value) =>
  new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(Number(value || 0));

export const d = (value) => (value ? new Intl.DateTimeFormat("sl-SI").format(new Date(value)) : "/");

export const cx = (...values) => values.filter(Boolean).join(" ");
