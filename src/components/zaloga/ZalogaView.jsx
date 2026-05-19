import React, { useMemo, useState } from "react";
import { addProdukt, addLotProdukt, addEvidencaZaloge } from "../../api";

function ZalogaView({ produkti, lots, reload, onMsg }) {
  const [prodForm, setProdForm] = useState({ koda: "", naziv_produkta: "", prodajna_cena: "", nabavna_cena: "", tip: "folija" });
  const [lotForm, setLotForm] = useState({ produkt_id: "", lot_stevilka: "", kolicina_tm: "", nabavna_cena: "", prodajna_cena: "", datum_prevzema: "" });
  const [searchingLot, setSearchingLot] = useState("");
  const [expandedProdId, setExpandedProdId] = useState(null);

  const handleAddProd = async (e) => {
    e.preventDefault();
    try {
      await addProdukt({
        ...prodForm,
        prodajna_cena: Number(prodForm.prodajna_cena),
        nabavna_cena: Number(prodForm.nabavna_cena)
      });
      onMsg("Produkt uspešno dodan.");
      setProdForm({ koda: "", naziv_produkta: "", prodajna_cena: "", nabavna_cena: "", tip: "folija" });
      reload();
    } catch (err) {
      onMsg(err.message, true);
    }
  };

  const handleAddLot = async (e) => {
    e.preventDefault();
    try {
      await addLotProdukt(lotForm);
      onMsg("LOT prevzem uspešen. Kreirana evidenca.");
      setLotForm({ produkt_id: "", lot_stevilka: "", kolicina_tm: "", nabavna_cena: "", prodajna_cena: "", datum_prevzema: "" });
      reload();
    } catch (err) {
      onMsg(err.message, true);
    }
  };

  const handleSelectProdForLot = (prodId) => {
    const prod = produkti.find(p => Number(p.id) === Number(prodId));
    if (prod) {
      setLotForm(prev => ({
        ...prev,
        produkt_id: prodId,
        nabavna_cena: prod.nabavna_cena,
        prodajna_cena: prod.prodajna_cena
      }));
    } else {
      setLotForm(prev => ({ ...prev, produkt_id: prodId }));
    }
  };

  const searchStr = searchingLot.toLowerCase();
  const searchedProdukti = useMemo(() => {
    if (!searchStr) return produkti;
    return produkti.filter(p => p.naziv_produkta.toLowerCase().includes(searchStr) || p.koda.toLowerCase().includes(searchStr));
  }, [produkti, searchStr]);

  const activeSelectedProd = produkti.find(p => Number(p.id) === Number(lotForm.produkt_id));
  const isAdr = activeSelectedProd?.tip === "adr oprema";

  const lotTotalsByProdId = useMemo(() => {
    const totals = {};
    lots.forEach(lot => {
      const prodId = Number(lot.produkt_id);
      if (!prodId) return;
      if (!totals[prodId]) totals[prodId] = { kolicina: 0, vrednost: 0 };

      const lotKolicina = Number(lot.kolicina_tm) || 0;
      const prod = produkti.find(p => Number(p.id) === prodId);
      const nabavna = Number(lot.nabavna_cena ?? prod?.nabavna_cena) || 0;

      totals[prodId].kolicina += lotKolicina;
      totals[prodId].vrednost += lotKolicina * nabavna;
    });
    return totals;
  }, [lots, produkti]);

  return (
    <div className="grid-2 animated">
      <div>
        <section className="card">
          <h2>Katalog Produktov</h2>
          <div style={{ display: "grid", gap: "0.75rem", marginBottom: "2rem" }}>
            {produkti.map(p => {
              const isExpanded = expandedProdId === p.id;
              const prodLots = lots.filter(l => Number(l.produkt_id) === Number(p.id));
              const totals = lotTotalsByProdId[Number(p.id)] || { kolicina: 0, vrednost: 0 };

              return (
                <div key={p.id} className="list-item" style={{ padding: "1rem", cursor: "pointer" }} onClick={() => setExpandedProdId(isExpanded ? null : p.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong>{p.koda} - {p.naziv_produkta}</strong>
                      <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Tip: {p.tip}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <strong>Skupaj: {totals.kolicina.toFixed(1)} {p.tip === "adr oprema" ? "kos" : "tm"}</strong>
                      <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-main)", marginTop: "0.2rem" }}>Zaloga: {totals.vrednost.toFixed(2)} €</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>{isExpanded ? "▲" : "▼"}</div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0" }} onClick={e => e.stopPropagation()}>
                      {(prodLots.length === 0) ? <p style={{ fontSize: "0.85rem" }}>Ni aktivnih LOTov.</p> : (
                        <table style={{ margin: 0, fontSize: "0.85rem" }}>
                          <thead>
                            <tr>
                              <th style={{ padding: "0.5rem" }}>LOT Številka</th>
                              <th style={{ padding: "0.5rem" }}>Ostanek</th>
                            </tr>
                          </thead>
                          <tbody>
                            {prodLots.map(l => (
                              <tr key={l.id}>
                                <td style={{ padding: "0.5rem" }}>{l.lot_stevilka}</td>
                                <td style={{ padding: "0.5rem" }}>{l.kolicina_tm} {p.tip === "adr oprema" ? "kos" : "tm"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <form onSubmit={handleAddProd}>
            <h3 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>Dodaj nov produkt v bazo</h3>
            <div className="grid-2" style={{ gap: "1rem" }}>
              <div className="form-group">
                <label>Koda produkta</label>
                <input required value={prodForm.koda} onChange={e => setProdForm({ ...prodForm, koda: e.target.value })} placeholder="Npr. ORC-651" />
              </div>
              <div className="form-group">
                <label>Tip produkta</label>
                <select required value={prodForm.tip} onChange={e => setProdForm({ ...prodForm, tip: e.target.value })}>
                  <option value="folija">Folija</option>
                  <option value="adr oprema">ADR Oprema</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Naziv produkta</label>
              <input required value={prodForm.naziv_produkta} onChange={e => setProdForm({ ...prodForm, naziv_produkta: e.target.value })} placeholder="Oracal 651 Mat" />
            </div>
            <div className="grid-2" style={{ gap: "1rem" }}>
              <div className="form-group">
                <label>Izhodiščna nabavna cena (€/enota)</label>
                <input type="number" step="0.01" required value={prodForm.nabavna_cena} onChange={e => setProdForm({ ...prodForm, nabavna_cena: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Izhodiščna prodajna cena (€/enota)</label>
                <input type="number" step="0.01" required value={prodForm.prodajna_cena} onChange={e => setProdForm({ ...prodForm, prodajna_cena: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="btn-primary">Ustvari produkt</button>
          </form>
        </section>
      </div>

      <div>
        <section className="card">
          <h2>LOT Prevzem (Vnos materiala na zalogo)</h2>
          <form onSubmit={handleAddLot}>
            <div className="form-group">
              <label>Išči in izberi produkt</label>
              <input
                placeholder="Išči po nazivu ali kodi..."
                value={searchingLot}
                onChange={e => setSearchingLot(e.target.value)}
                style={{ marginBottom: "0.5rem" }}
              />
              <select
                required
                value={lotForm.produkt_id}
                onChange={e => handleSelectProdForLot(e.target.value)}
                size="4"
                style={{ overflowY: "auto" }}
              >
                <option value="" disabled>Izberite produkt za prevzem...</option>
                {searchedProdukti.map(p => (
                  <option key={p.id} value={p.id}>{p.koda} - {p.naziv_produkta} ({p.tip})</option>
                ))}
              </select>
            </div>

            {activeSelectedProd && (
              <div style={{ padding: "1rem", background: "rgba(99, 102, 241, 0.05)", borderRadius: "12px", marginBottom: "1.5rem", border: "1px solid rgba(99, 102, 241, 0.2)" }}>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--accent-color)", fontWeight: 600 }}>Izbran: {activeSelectedProd.naziv_produkta}</p>
              </div>
            )}

            <div className="grid-2" style={{ gap: "1rem" }}>
              <div className="form-group">
                <label>LOT Številka / Oznaka role</label>
                <input required value={lotForm.lot_stevilka} onChange={e => setLotForm({ ...lotForm, lot_stevilka: e.target.value })} placeholder="Npr. BATCH-A1" />
              </div>
              <div className="form-group">
                <label>{isAdr ? "Količina izdelkov (Kosov)" : "Količina v tekočih metrih (TM)"}</label>
                <input required type="number" step="0.1" value={lotForm.kolicina_tm} onChange={e => setLotForm({ ...lotForm, kolicina_tm: e.target.value })} placeholder="Npr. 50" />
              </div>
            </div>

            <div className="grid-2" style={{ gap: "1rem" }}>
              <div className="form-group">
                <label>Nabavna Cena za ta LOT (€)</label>
                <input type="number" step="0.01" value={lotForm.nabavna_cena} onChange={e => setLotForm({ ...lotForm, nabavna_cena: e.target.value })} placeholder="Prevzeta iz produkta" />
              </div>
              <div className="form-group">
                <label>Prodajna Cena za ta LOT (€)</label>
                <input type="number" step="0.01" value={lotForm.prodajna_cena} onChange={e => setLotForm({ ...lotForm, prodajna_cena: e.target.value })} placeholder="Prevzeta iz produkta" />
              </div>
            </div>

            <div className="form-group">
              <label>Datum Prevzema</label>
              <input type="datetime-local" value={lotForm.datum_prevzema} onChange={e => setLotForm({ ...lotForm, datum_prevzema: e.target.value })} />
              <small style={{ display: "block", color: "var(--text-muted)", marginTop: "0.25rem" }}>Pusti prazno za ZDAJ</small>
            </div>
            <button type="submit" className="btn-primary">Sprejmi in kreiraj prevzem</button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default ZalogaView;
