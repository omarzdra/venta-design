import React, { useMemo, useState } from "react";

function EvidencaView({ evidenca, produkti, lots }) {
  const [filterType, setFilterType] = useState("vse");
  const [filterProdType, setFilterProdType] = useState("vse");
  const [searchQuery, setSearchQuery] = useState("");

  const enrichedEvidenca = useMemo(() => evidenca.map(log => {
    const lot = lots.find(l => Number(l.id) === Number(log.lot_produkt_id));
    const prod = lot ? produkti.find(p => Number(p.id) === Number(lot.produkt_id)) : null;

    return {
      ...log,
      tip_produkta: prod ? prod.tip : "folija",
      lot_stevilka: lot ? lot.lot_stevilka : log.lot_produkt_id
    };
  }), [evidenca, lots, produkti]);

  const filtered = enrichedEvidenca.filter(log => {
    if (filterType !== "vse" && log.tip !== filterType) return false;
    if (filterProdType !== "vse" && log.tip_produkta !== filterProdType) return false;
    if (searchQuery) {
      const sq = searchQuery.toLowerCase();
      const naziv = (log.naziv_produkta || "").toLowerCase();
      const lot = (log.lot_stevilka || "").toLowerCase();
      if (!naziv.includes(sq) && !lot.includes(sq)) return false;
    }
    return true;
  });

  return (
    <div className="animated">
      <section className="card">
        <h2>Kartica / Evidenca Zaloge</h2>
        <div style={{ marginBottom: "1.5rem", display: "flex", gap: "2rem", flexWrap: "wrap" }}>

          <div>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.5rem" }}>Tip Transakcije</span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className={`tab-btn ${filterType === "vse" ? "active" : ""}`} style={{ padding: "0.4rem 1rem" }} onClick={() => setFilterType("vse")}>VSE</button>
              <button className={`tab-btn ${filterType === "prevzem" ? "active" : ""}`} style={{ padding: "0.4rem 1rem", ...(filterType === "prevzem" ? { background: "var(--danger)", boxShadow: "none" } : {}) }} onClick={() => setFilterType("prevzem")}>Stroški (-)</button>
              <button className={`tab-btn ${filterType === "prodaja" ? "active" : ""}`} style={{ padding: "0.4rem 1rem", ...(filterType === "prodaja" ? { background: "var(--success)", boxShadow: "none" } : {}) }} onClick={() => setFilterType("prodaja")}>Dobiček (+)</button>
            </div>
          </div>

          <div>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.5rem" }}>Tip Produkta</span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className={`tab-btn ${filterProdType === "vse" ? "active" : ""}`} style={{ padding: "0.4rem 1rem" }} onClick={() => setFilterProdType("vse")}>VSE</button>
              <button className={`tab-btn ${filterProdType === "folija" ? "active" : ""}`} style={{ padding: "0.4rem 1rem", ...(filterProdType === "folija" ? { background: "var(--info)", boxShadow: "none" } : {}) }} onClick={() => setFilterProdType("folija")}>Folije</button>
              <button className={`tab-btn ${filterProdType === "adr oprema" ? "active" : ""}`} style={{ padding: "0.4rem 1rem", ...(filterProdType === "adr oprema" ? { background: "#a855f7", boxShadow: "none" } : {}) }} onClick={() => setFilterProdType("adr oprema")}>ADR Oprema</button>
            </div>
          </div>

          <div>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.5rem" }}>Iskanje</span>
            <input type="text" placeholder="Išči po nazivu ali LOT..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ padding: "0.4rem 0.8rem", width: "250px" }} />
          </div>

        </div>

        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Tip</th>
                <th>Produkt & LOT Številka</th>
                <th style={{ textAlign: "right" }}>Količina</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", paddingTop: "2rem" }}>Ni rezultatov.</td></tr>
              )}
              {filtered.map(log => {
                const isRevenue = log.tip === "prodaja";
                const amount = log.znesek || (log.kolicina_tm * (isRevenue ? 0 : log.nabavna_cena)); // Fallback if znesek missing

                let badgeClass = "type-badge";
                if (log.tip === "prevzem") badgeClass += " type-prevzem";
                if (log.tip === "prodaja") badgeClass += " type-prodaja";

                let unitText = "";
                if (log.tip_produkta === "folija") unitText = " tm";
                else if (log.tip_produkta === "adr oprema") unitText = " kos";

                return (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{new Date(log.datum).toLocaleString()}</td>
                    <td>
                      <span className={badgeClass}>
                        {log.tip}
                      </span>
                    </td>
                    <td>{log.naziv_produkta} <br /><small style={{ color: "var(--text-muted)" }}>LOT: {log.lot_stevilka}</small></td>
                    <td style={{ textAlign: "right" }}>
                      <strong className={isRevenue ? "money-minus" : "money-plus"}>
                        {isRevenue ? "" : ""}{log.kolicina_tm}{unitText}
                      </strong>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default EvidencaView;
