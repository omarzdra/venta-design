import React, { useMemo, useState } from "react";

function MaterialSelect({ value, onChange, lots, produkti }) {
  const [search, setSearch] = useState("");

  const enrichedLots = useMemo(() => lots.map(l => {
    const p = produkti.find(prod => Number(prod.id) === Number(l.produkt_id));
    return { ...l, naziv_produkta: p ? p.naziv_produkta : "Neznan produkt", tip: p ? p.tip : "folija" };
  }), [lots, produkti]);

  const filtered = enrichedLots.filter(l => {
    if (value && Number(l.id) === Number(value)) return true;
    if (l.kolicina_tm <= 0) return false;
    if (!search) return true;
    const normalizedSrc = search.toLowerCase();
    return l.lot_stevilka.toLowerCase().includes(normalizedSrc) || l.naziv_produkta.toLowerCase().includes(normalizedSrc);
  });

  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <input
        type="text"
        placeholder="Išči lot ali material..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
      />
      <select required value={value} onChange={e => onChange(e.target.value)} size="3" style={{ height: "auto", backgroundColor: "#fff", fontSize: "0.85rem" }}>
        <option value="" disabled>-- Izberi LOT --</option>
        {filtered.map(l => (
          <option key={l.id} value={l.id}>
            {l.lot_stevilka} - {l.naziv_produkta} (na voljo: {l.kolicina_tm} {l.tip === "adr oprema" ? "kos" : "tm"})
          </option>
        ))}
      </select>
    </div>
  );
}

export default MaterialSelect;
