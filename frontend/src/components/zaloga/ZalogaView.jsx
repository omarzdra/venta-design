import React, { useContext, useMemo, useState } from "react";
import { addProdukt, addLotProdukt } from "../../api";
import { RoleContext } from "../../RoleContext";

function ZalogaView({ zalogaData, produkti, reload, onMsg }) {
  const role = useContext(RoleContext);
  const canEditZaloga = role !== "grega";
  const [prodForm, setProdForm] = useState({ koda: "", naziv_produkta: "", prodajna_cena: "", nabavna_cena: "", tip: "folija", sirina: "", dobavitelj: "" });
  const [lotForm, setLotForm] = useState({ produkt_id: "", lot_stevilka: "", kolicina_tm: "", kolicina_m2: "", nabavna_cena: "", prodajna_cena: "", datum_prevzema: "" });
  const [lotUnit, setLotUnit] = useState("tm");
  const [searchingLot, setSearchingLot] = useState("");
  const [expandedProdId, setExpandedProdId] = useState(null);

  const handleAddProd = async (e) => {
    e.preventDefault();
    try {
      await addProdukt(prodForm);
      onMsg("Produkt uspešno dodan.");
      setProdForm({ koda: "", naziv_produkta: "", prodajna_cena: "", nabavna_cena: "", tip: "folija", sirina: "", dobavitelj: "" });
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
      setLotForm({ produkt_id: "", lot_stevilka: "", kolicina_tm: "", kolicina_m2: "", nabavna_cena: "", prodajna_cena: "", datum_prevzema: "" });
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
  const searchedProdukti = !searchStr ? produkti : produkti.filter(p => p.naziv_produkta.toLowerCase().includes(searchStr) || p.koda.toLowerCase().includes(searchStr));

  const activeSelectedProd = produkti.find(p => Number(p.id) === Number(lotForm.produkt_id));
  const isAdr = activeSelectedProd?.tip === "adr oprema";
  const selectedSirina = activeSelectedProd?.sirina ? Number(activeSelectedProd.sirina) : null;

  const totals = useMemo(() => {
    return (zalogaData || []).reduce((acc, p) => {
      const t = p.totals || { kolicina_tm: 0, kolicina_m2: 0, vrednost: 0 };
      acc.tm += Number(t.kolicina_tm || 0);
      acc.m2 += Number(t.kolicina_m2 || 0);
      acc.vrednost += Number(t.vrednost || 0);
      return acc;
    }, { tm: 0, m2: 0, vrednost: 0 });
  }, [zalogaData]);

  return (
    <div className="grid-2 animated">
      <div>
        <section className="card">
          <h2>Artikli</h2>
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <div><strong>Skupaj tekočih metrov v zalogi:</strong> {totals.tm.toFixed(2)} tm</div>
              <div><strong>Skupaj kvadratnih metrov v zalogi:</strong> {totals.m2.toFixed(2)} m2</div>
              <div><strong>Vrednost zaloge:</strong> {totals.vrednost.toFixed(2)} €</div>
            </div>
          </div>
          <div style={{ display: "grid", gap: "0.75rem", marginBottom: "2rem" }}>
            {zalogaData.map(p => {
              const isExpanded = expandedProdId === p.id;
              const prodLots = p.lotProdukti || [];
              const totals = p.totals || { kolicina_tm: 0, kolicina_m2: 0, vrednost: 0 };

              return (
                <div key={p.id} className="list-item" style={{ padding: "1rem", cursor: "pointer" }} onClick={() => setExpandedProdId(isExpanded ? null : p.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong>{p.koda} - {p.naziv_produkta}</strong>
                      <span style={{ display: "block", fontSize: "0.8rem", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Tip: {p.tip}</span>
                      <span style={{ display: "block", fontSize: "0.8rem", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Širina: {p.sirina ? `${p.sirina} m` : "-"}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <strong>Skupaj: {totals.kolicina_tm.toFixed(2)} {p.tip === "adr oprema" ? "kos" : "tm"} | {totals.kolicina_m2.toFixed(2)} m2</strong>
                      <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--color-text)", marginTop: "0.2rem" }}>Zaloga: {totals.vrednost.toFixed(2)} €</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "0.3rem" }}>{isExpanded ? "▲" : "▼"}</div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0" }} onClick={e => e.stopPropagation()}>
                      {(prodLots.length === 0) ? <p style={{ fontSize: "0.85rem" }}>Ni aktivnih LOTov.</p> : (
                        <table style={{ margin: 0, fontSize: "0.85rem" }}>
                          <thead>
                            <tr>
                              <th style={{ padding: "0.5rem" }}>LOT Številka</th>
                              <th style={{ padding: "0.5rem" }}>Ostanek (tm)</th>
                              <th style={{ padding: "0.5rem" }}>Ostanek (m2)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {prodLots.map(l => (
                              <tr key={l.id}>
                                <td style={{ padding: "0.5rem" }}>{l.lot_stevilka}</td>
                                <td style={{ padding: "0.5rem" }}>{l.kolicina_tm} {p.tip === "adr oprema" ? "kos" : "tm"}</td>
                                <td style={{ padding: "0.5rem" }}>{l.kolicina_m2 ?? (p.sirina ? (l.kolicina_tm * p.sirina).toFixed(2) : "-")}</td>
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

          {canEditZaloga && (
            <form onSubmit={handleAddProd}>
              <h3 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>Dodaj nov artikel</h3>
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
                <label>Širina materiala (m)</label>
                <select value={prodForm.sirina} onChange={e => setProdForm({ ...prodForm, sirina: e.target.value })}>
                  <option value="">Ni aplicabilno</option>
                  <option value={0.6}>0.6</option>
                  <option value={1.06}>1.06</option>
                  <option value={1.23}>1.23</option>
                  <option value={1.37}>1.37</option>
                  <option value={1.523}>1.523</option>
                  <option value={1.6}>1.6</option>
                </select>
              </div>
              <div className="form-group">
                <label>Dobavitelj</label>
                <input value={prodForm.dobavitelj} onChange={e => setProdForm({ ...prodForm, dobavitelj: e.target.value })} placeholder="Npr. Antalis" />
              </div>
            </div>
            <div className="grid-2" style={{ gap: "1rem" }}>
              <div className="form-group">
                <label>Izhodiščna nabavna cena (€/m2)</label>
                <input type="number" step="0.01" required value={prodForm.nabavna_cena} onChange={e => setProdForm({ ...prodForm, nabavna_cena: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Izhodiščna prodajna cena (€/m2)</label>
                <input type="number" step="0.01" required value={prodForm.prodajna_cena} onChange={e => setProdForm({ ...prodForm, prodajna_cena: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="btn-primary">Ustvari produkt</button>
            </form>
          )}
        </section>
      </div>

      <div>
        <section className="card">
          <h2>LOT Prevzem (Vnos materiala na zalogo)</h2>
          {canEditZaloga ? (
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
                <div style={{ padding: "1rem", background: "rgba(224, 32, 32, 0.05)", borderRadius: "12px", marginBottom: "1.5rem", border: "1px solid rgba(224, 32, 32, 0.2)" }}>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-primary)", fontWeight: 600 }}>Izbran: {activeSelectedProd.naziv_produkta}</p>
              </div>
            )}

            <div className="grid-2" style={{ gap: "1rem" }}>
              <div className="form-group">
                <label>LOT Številka / Oznaka role</label>
                <input required value={lotForm.lot_stevilka} onChange={e => setLotForm({ ...lotForm, lot_stevilka: e.target.value })} placeholder="Npr. BATCH-A1" />
              </div>
              <div className="form-group">
                  <label>Enota količine</label>
                  <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.3rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <input type="radio" name="lotUnit" checked={lotUnit === "tm"} onChange={() => setLotUnit("tm")} />
                      Tekoči metri (tm)
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <input type="radio" name="lotUnit" checked={lotUnit === "m2"} onChange={() => setLotUnit("m2")} disabled={!selectedSirina || isAdr} />
                      Kvadratni metri (m2)
                    </label>
                  </div>
              </div>
            </div>

              <div className="grid-2" style={{ gap: "1rem" }}>
                <div className="form-group">
                  <label>{isAdr ? "Količina izdelkov (Kosov)" : "Količina"} ({lotUnit})</label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    value={lotUnit === "tm" ? lotForm.kolicina_tm : lotForm.kolicina_m2}
                    onChange={e => setLotForm({
                      ...lotForm,
                      kolicina_tm: lotUnit === "tm" ? e.target.value : lotForm.kolicina_tm,
                      kolicina_m2: lotUnit === "m2" ? e.target.value : lotForm.kolicina_m2
                    })}
                    placeholder="Npr. 50"
                  />
                </div>
                <div className="form-group">
                  <label>Preračun</label>
                  <input
                    readOnly
                    value={
                      lotUnit === "tm"
                        ? (selectedSirina ? `${(Number(lotForm.kolicina_tm || 0) * selectedSirina).toFixed(2)} m2` : "-")
                        : (selectedSirina ? `${(Number(lotForm.kolicina_m2 || 0) / selectedSirina).toFixed(2)} tm` : "-")
                    }
                  />
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
          ) : (
            <p style={{ color: "var(--color-text-muted)" }}>Za urejanje zaloge nimaš dovoljenja.</p>
          )}
        </section>
      </div>
    </div>
  );
}

export default ZalogaView;
