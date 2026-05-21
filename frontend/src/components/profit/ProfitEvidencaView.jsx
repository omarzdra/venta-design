import React, { useState } from "react";
import { addOstaliNakup, addPrihodek, potrdiLotProdukt } from "../../api";

function ProfitEvidencaView({ profitData, reload, onMsg }) {
  const [activeTab, setActiveTab] = useState("nakupi");
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");

    const [nakupForm, setNakupForm] = useState({ datum: "", datum_placila: "", opis: "", dobavitelj: "", podrobnosti: "Material", znesek: "", ddv_stopnja: 0, stevilka_racuna: "" });
  const [showAddNakup, setShowAddNakup] = useState(false);

        const [prihodekForm, setPrihodekForm] = useState({ datum: "", datum_placila: "", opis: "", narocnik: "", znesek: "", ddv_stopnja: 0, stevilka_racuna: "" });
    const [showAddPrihodek, setShowAddPrihodek] = useState(false);

    const [confirmingLot, setConfirmingLot] = useState(null);
        const [confirmForm, setConfirmForm] = useState({ dobavitelj: "", stevilka_racuna: "", znesek: "", ddv_stopnja: 0, datum_placila: "" });
        const [viewingPurchase, setViewingPurchase] = useState(null);
        const [viewingSale, setViewingSale] = useState(null);

  if (!profitData) return <div>Nalagam...</div>;
  const { salesEvents, purchaseEvents, availableMonths } = profitData;

  const handleAddNakup = async (e) => {
      e.preventDefault();
      try {
          await addOstaliNakup(nakupForm);
          onMsg("Nakup uspešno dodan.");
          setNakupForm({ datum: "", datum_placila: "", opis: "", dobavitelj: "", podrobnosti: "Material", znesek: "", ddv_stopnja: 0, stevilka_racuna: "" });
          setShowAddNakup(false);
          reload();
      } catch (err) {
          onMsg(err.message, true);
      }
  };

  const handleAddPrihodek = async (e) => {
      e.preventDefault();
      try {
          await addPrihodek(prihodekForm);
          onMsg("Prihodek uspešno dodan.");
          setPrihodekForm({ datum: "", datum_placila: "", opis: "", narocnik: "", znesek: "", ddv_stopnja: 0, stevilka_racuna: "" });
          setShowAddPrihodek(false);
          reload();
      } catch (err) {
          onMsg(err.message, true);
      }
  };

  const openConfirmLot = (purchase) => {
      setConfirmingLot(purchase);
            setConfirmForm({
                dobavitelj: purchase.dobavitelj || "",
                stevilka_racuna: purchase.stevilka_racuna || "",
                znesek: purchase.znesek || "",
                ddv_stopnja: purchase.ddv_stopnja ?? 0,
                datum_placila: purchase.datum_placila ? new Date(purchase.datum_placila).toISOString().slice(0, 16) : ""
            });
  };

  const handleConfirmLot = async (e) => {
      e.preventDefault();
      try {
          await potrdiLotProdukt(confirmingLot.lot_id, confirmForm);
          onMsg("LOT uspešno potrjen.");
          setConfirmingLot(null);
          reload();
      } catch (err) {
          onMsg(err.message, true);
      }
  };

  const currentSales = filterMonth === "all" ? salesEvents : salesEvents.filter(e => e.datum && e.datum.startsWith(filterMonth));
  const currentPurchases = filterMonth === "all" ? purchaseEvents : purchaseEvents.filter(e => e.datum && e.datum.startsWith(filterMonth));

    const totalRevenue = currentSales.reduce((sum, item) => sum + (item.znesek_z_ddv ?? item.znesek), 0);
    const totalExpense = currentPurchases.reduce((sum, item) => sum + (item.znesek_z_ddv ?? item.znesek), 0);
  const netProfit = totalRevenue - totalExpense;

  const filteredSales = currentSales.filter(s => {
      if (!search) return true;
      const term = search.toLowerCase();
      return (s.opis || "").toLowerCase().includes(term) || (s.narocnik || "").toLowerCase().includes(term);
  });

  const filteredPurchases = currentPurchases.filter(p => {
      if (!search) return true;
      const term = search.toLowerCase();
      return (p.opis || "").toLowerCase().includes(term) || (p.dobavitelj || "").toLowerCase().includes(term) || (p.podrobnosti || "").toLowerCase().includes(term);
  });

    const confirmZnesek = Number(confirmForm.znesek || 0);
    const confirmDDV = Number(confirmForm.ddv_stopnja || 0);
    const confirmZnesekDDV = Number.isFinite(confirmZnesek) ? confirmZnesek * (1 + confirmDDV / 100) : 0;
    const nakupZnesek = Number(nakupForm.znesek || 0);
    const nakupDDV = Number(nakupForm.ddv_stopnja || 0);
    const nakupZnesekDDV = Number.isFinite(nakupZnesek) ? nakupZnesek * (1 + nakupDDV / 100) : 0;
    const prihodekZnesek = Number(prihodekForm.znesek || 0);
    const prihodekDDV = Number(prihodekForm.ddv_stopnja || 0);
    const prihodekZnesekDDV = Number.isFinite(prihodekZnesek) ? prihodekZnesek * (1 + prihodekDDV / 100) : 0;

  return (
    <div className="animated">
      <section className="grid-2" style={{ marginBottom: "2rem" }}>
        <div className="card" style={{ textAlign: "center", borderLeft: `8px solid ${netProfit >= 0 ? "var(--success)" : "var(--danger)"}` }}>
           <h3 style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>RAZLIKA (Prihodki - Stroški)</h3>
           <div style={{ fontSize: "2.5rem", fontWeight: "800", color: netProfit >= 0 ? "var(--success)" : "var(--danger)" }}>
                {netProfit >= 0 ? "" : "-"}{Math.abs(netProfit).toFixed(2)} €
           </div>
        </div>
        <div className="grid-2" style={{ gap: "1rem" }}>
            <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
                <h3 style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>SKUPNI PRIHODKI</h3>
                <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--success)" }}>{totalRevenue.toFixed(2)} €</div>
            </div>
            <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
                <h3 style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>SKUPNI STROŠKI</h3>
                <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--danger)" }}>{totalExpense.toFixed(2)} €</div>
            </div>
        </div>
      </section>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "1rem" }}>
            <button className={`tab-btn ${activeTab === "nakupi" ? "active" : ""}`} onClick={() => setActiveTab("nakupi")} style={activeTab === "nakupi" ? {background: "var(--danger)", color:"white"} : {}}>
                NAKUPI (Stroški)
            </button>
            <button className={`tab-btn ${activeTab === "prodaja" ? "active" : ""}`} onClick={() => setActiveTab("prodaja")} style={activeTab === "prodaja" ? {background: "var(--success)", color:"white"} : {}}>
                PRODAJA (Prihodki)
            </button>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ padding: "0.4rem 0.8rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                <option value="all">Vsi meseci</option>
                {availableMonths.map(m => (
                    <option key={m} value={m}>{m}</option>
                ))}
            </select>
            <input type="text" placeholder="Išči..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: "0.4rem 0.8rem", width: "250px" }} />
        </div>
      </div>

      <section className="card">
        {activeTab === "nakupi" && (
            <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h2>Evidenca Nakupov</h2>
                    <button className="btn-primary" onClick={() => setShowAddNakup(!showAddNakup)}>
                        {showAddNakup ? "Prekliči" : "+ Dodaj Nakup"}
                    </button>
                </div>

                {showAddNakup && (
                    <form onSubmit={handleAddNakup} style={{ background: "rgba(0,0,0,0.03)", padding: "1.5rem", borderRadius: "12px", marginBottom: "2rem" }}>
                        <div className="grid-2" style={{ gap: "1rem" }}>
                            <div className="form-group">
                                <label>Datum</label>
                                <input type="datetime-local" value={nakupForm.datum} onChange={e => setNakupForm({...nakupForm, datum: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Znesek (€)</label>
                                <input required type="number" step="0.01" value={nakupForm.znesek} onChange={e => setNakupForm({...nakupForm, znesek: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid-2" style={{ gap: "1rem" }}>
                            <div className="form-group">
                                <label>Datum plačila</label>
                                <input type="datetime-local" value={nakupForm.datum_placila} onChange={e => setNakupForm({...nakupForm, datum_placila: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>DDV</label>
                                <select value={nakupForm.ddv_stopnja} onChange={e => setNakupForm({...nakupForm, ddv_stopnja: e.target.value})}>
                                    <option value={0}>0%</option>
                                    <option value={9.5}>9.5%</option>
                                    <option value={22}>22%</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Znesek z DDV</label>
                            <input readOnly value={`${nakupZnesekDDV.toFixed(2)} €`} />
                        </div>
                        <div className="form-group">
                            <label>Opis / Ime nakupa</label>
                            <input required value={nakupForm.opis} onChange={e => setNakupForm({...nakupForm, opis: e.target.value})} placeholder="Npr. Nakup orodja" />
                        </div>
                        <div className="grid-2" style={{ gap: "1rem" }}>
                            <div className="form-group">
                                <label>Dobavitelj</label>
                                <input value={nakupForm.dobavitelj} onChange={e => setNakupForm({...nakupForm, dobavitelj: e.target.value})} placeholder="Npr. Bauhaus" />
                            </div>
                            <div className="form-group">
                                <label>Številka Računa</label>
                                <input value={nakupForm.stevilka_racuna} onChange={e => setNakupForm({...nakupForm, stevilka_racuna: e.target.value})} placeholder="Npr. RAČ-123" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Podrobnosti (Kategorija)</label>
                            <select value={nakupForm.podrobnosti} onChange={e => setNakupForm({...nakupForm, podrobnosti: e.target.value})}>
                                <option value="Material">Material</option>
                                <option value="Gorivo">Gorivo</option>
                                <option value="Lizing">Lizing</option>
                                <option value="Pošta">Pošta</option>
                                <option value="Drugo">Drugo</option>
                            </select>
                        </div>
                        <button type="submit" className="btn-primary" style={{ background: "var(--success)" }}>Shrani Nakup</button>
                    </form>
                )}

                <div style={{ overflowX: "auto" }}>
                <table>
                    <thead>
                    <tr>
                        <th>Datum</th>
                        <th>Opis</th>
                        <th>Dobavitelj & Račun</th>
                        <th>Podrobnosti</th>
                        <th style={{ textAlign: "right" }}>Znesek</th>
                        <th style={{ textAlign: "center" }}>Potrjeno</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredPurchases.length === 0 && <tr><td colSpan="6" style={{textAlign:"center"}}>Ni zapisov.</td></tr>}
                    {filteredPurchases.map(p => (
                        <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => setViewingPurchase(p)}>
                            <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{new Date(p.datum).toLocaleDateString()}</td>
                            <td><strong>{p.opis}</strong> {p.lot_stevilka && <small style={{display:"block", color:"var(--text-muted)"}}>LOT: {p.lot_stevilka}</small>}</td>
                            <td>{p.dobavitelj || "/"}<br/>{p.stevilka_racuna && <small style={{color:"var(--text-muted)"}}>Račun: {p.stevilka_racuna}</small>}</td>
                            <td>{p.podrobnosti}</td>
                            <td style={{ textAlign: "right", color: "var(--danger)", fontWeight: "bold" }}>
                                {(p.znesek_z_ddv ?? p.znesek).toFixed(2)} €
                            </td>
                            <td style={{ textAlign: "center" }}>
                                {p.isLot ? (
                                    p.potrjeno ? (
                                        <button onClick={() => openConfirmLot(p)} style={{ background: "var(--success)", color: "white", border: "none", borderRadius: "8px", padding: "0.3rem 0.6rem", cursor: "pointer", fontWeight: "bold" }}>
                                            ✓ POTRJENO
                                        </button>
                                    ) : (
                                        <button onClick={() => openConfirmLot(p)} style={{ background: "#f59e0b", color: "white", border: "none", borderRadius: "8px", padding: "0.3rem 0.6rem", cursor: "pointer", fontWeight: "bold" }}>
                                            POTRDI
                                        </button>
                                    )
                                ) : (
                                    <span style={{ color: "var(--success)" }}>✓</span>
                                )}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </div>
        )}

        {activeTab === "prodaja" && (
            <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h2>Evidenca Prodaje</h2>
                    <button className="btn-primary" onClick={() => setShowAddPrihodek(!showAddPrihodek)}>
                        {showAddPrihodek ? "Prekliči" : "+ Dodaj Prihodek"}
                    </button>
                </div>

                {showAddPrihodek && (
                    <form onSubmit={handleAddPrihodek} style={{ background: "rgba(0,0,0,0.03)", padding: "1.5rem", borderRadius: "12px", marginBottom: "2rem" }}>
                        <div className="grid-2" style={{ gap: "1rem" }}>
                            <div className="form-group">
                                <label>Datum</label>
                                <input type="datetime-local" value={prihodekForm.datum} onChange={e => setPrihodekForm({...prihodekForm, datum: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Znesek (€)</label>
                                <input required type="number" step="0.01" value={prihodekForm.znesek} onChange={e => setPrihodekForm({...prihodekForm, znesek: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid-2" style={{ gap: "1rem" }}>
                            <div className="form-group">
                                <label>Datum plačila</label>
                                <input type="datetime-local" value={prihodekForm.datum_placila} onChange={e => setPrihodekForm({...prihodekForm, datum_placila: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>DDV</label>
                                <select value={prihodekForm.ddv_stopnja} onChange={e => setPrihodekForm({...prihodekForm, ddv_stopnja: e.target.value})}>
                                    <option value={0}>0%</option>
                                    <option value={9.5}>9.5%</option>
                                    <option value={22}>22%</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Znesek z DDV</label>
                            <input readOnly value={`${prihodekZnesekDDV.toFixed(2)} €`} />
                        </div>
                        <div className="form-group">
                            <label>Opis</label>
                            <input required value={prihodekForm.opis} onChange={e => setPrihodekForm({...prihodekForm, opis: e.target.value})} placeholder="Npr. Dodatna storitev" />
                        </div>
                        <div className="grid-2" style={{ gap: "1rem" }}>
                            <div className="form-group">
                                <label>Naročnik</label>
                                <input value={prihodekForm.narocnik} onChange={e => setPrihodekForm({...prihodekForm, narocnik: e.target.value})} placeholder="Npr. Podjetje d.o.o." />
                            </div>
                            <div className="form-group">
                                <label>Številka računa</label>
                                <input value={prihodekForm.stevilka_racuna} onChange={e => setPrihodekForm({...prihodekForm, stevilka_racuna: e.target.value})} placeholder="Npr. RAČ-123" />
                            </div>
                        </div>
                        <button type="submit" className="btn-primary" style={{ background: "var(--success)" }}>Shrani Prihodek</button>
                    </form>
                )}
                <div style={{ overflowX: "auto" }}>
                <table>
                    <thead>
                    <tr>
                        <th>Datum</th>
                        <th>Opis (Naziv naloge)</th>
                        <th>Naročnik</th>
                        <th>Podrobnosti</th>
                        <th style={{ textAlign: "right" }}>Znesek</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredSales.length === 0 && <tr><td colSpan="5" style={{textAlign:"center"}}>Ni zapisov.</td></tr>}
                    {filteredSales.map(s => (
                        <tr key={s.id} style={{ cursor: "pointer" }} onClick={() => setViewingSale(s)}>
                            <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{new Date(s.datum).toLocaleDateString()}</td>
                            <td><strong>{s.opis}</strong></td>
                            <td>{s.narocnik || "/"}</td>
                            <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{s.podrobnosti}</td>
                            <td style={{ textAlign: "right", color: "var(--success)", fontWeight: "bold" }}>
                                {(s.znesek_z_ddv ?? s.znesek).toFixed(2)} €
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </div>
        )}
      </section>

      {confirmingLot && (
        <div className="modal-overlay" onClick={() => setConfirmingLot(null)}>
            <div className="modal-content animated" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 style={{ margin: 0 }}>Potrditev LOT Prevzema</h2>
                    <button className="modal-close" onClick={() => setConfirmingLot(null)}>&times;</button>
                </div>
                
                <div style={{ marginBottom: "1.5rem", background: "rgba(0,0,0,0.03)", padding: "1rem", borderRadius: "8px" }}>
                    <strong>Produkt:</strong> {confirmingLot.opis} <br />
                    <strong>LOT Številka:</strong> {confirmingLot.lot_stevilka} <br />
                    <strong>Znesek Prevzema:</strong> {confirmingLot.znesek.toFixed(2)} €
                </div>

                <form onSubmit={handleConfirmLot}>
                    <div className="grid-2" style={{ gap: "1rem" }}>
                        <div className="form-group">
                            <label>Znesek (brez DDV)</label>
                            <input required type="number" step="0.01" value={confirmForm.znesek} onChange={e => setConfirmForm({...confirmForm, znesek: e.target.value})} placeholder="Npr. 150.00" />
                        </div>
                        <div className="form-group">
                            <label>DDV</label>
                            <select value={confirmForm.ddv_stopnja} onChange={e => setConfirmForm({...confirmForm, ddv_stopnja: e.target.value})}>
                                <option value={0}>0%</option>
                                <option value={9.5}>9.5%</option>
                                <option value={22}>22%</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Znesek z DDV</label>
                        <input readOnly value={`${confirmZnesekDDV.toFixed(2)} €`} />
                    </div>
                    <div className="form-group">
                        <label>Datum plačila</label>
                        <input type="datetime-local" value={confirmForm.datum_placila} onChange={e => setConfirmForm({...confirmForm, datum_placila: e.target.value})} />
                    </div>
                    <div className="form-group">
                        <label>Dobavitelj</label>
                        <input required value={confirmForm.dobavitelj} onChange={e => setConfirmForm({...confirmForm, dobavitelj: e.target.value})} placeholder="Npr. Antalis" />
                    </div>
                    <div className="form-group">
                        <label>Številka Računa</label>
                        <input required value={confirmForm.stevilka_racuna} onChange={e => setConfirmForm({...confirmForm, stevilka_racuna: e.target.value})} placeholder="Npr. 2026-155" />
                    </div>
                    <button type="submit" className="btn-primary" style={{ background: "var(--success)" }}>Shrani in Potrdi</button>
                </form>
            </div>
        </div>
      )}

      {viewingPurchase && (
        <div className="modal-overlay" onClick={() => setViewingPurchase(null)}>
            <div className="modal-content animated" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 style={{ margin: 0 }}>Podrobnosti stroška</h2>
                    <button className="modal-close" onClick={() => setViewingPurchase(null)}>&times;</button>
                </div>
                <div style={{ marginBottom: "1.5rem" }}>
                    <strong>Opis:</strong> {viewingPurchase.opis} <br />
                    <strong>Datum:</strong> {new Date(viewingPurchase.datum).toLocaleString()} <br />
                    <strong>Datum plačila:</strong> {viewingPurchase.datum_placila ? new Date(viewingPurchase.datum_placila).toLocaleString() : "/"} <br />
                    <strong>Dobavitelj:</strong> {viewingPurchase.dobavitelj || "/"} <br />
                    <strong>Račun:</strong> {viewingPurchase.stevilka_racuna || "/"}
                </div>
                <div style={{ background: "rgba(0,0,0,0.03)", padding: "1rem", borderRadius: "8px" }}>
                    <strong>Neto:</strong> {viewingPurchase.znesek.toFixed(2)} € <br />
                    <strong>DDV:</strong> {(viewingPurchase.ddv_stopnja ?? 0)}% <br />
                    <strong>Bruto:</strong> {(viewingPurchase.znesek_z_ddv ?? viewingPurchase.znesek).toFixed(2)} €
                </div>
            </div>
        </div>
      )}

      {viewingSale && (
        <div className="modal-overlay" onClick={() => setViewingSale(null)}>
            <div className="modal-content animated" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 style={{ margin: 0 }}>Podrobnosti prihodka</h2>
                    <button className="modal-close" onClick={() => setViewingSale(null)}>&times;</button>
                </div>
                <div style={{ marginBottom: "1.5rem" }}>
                    <strong>Opis:</strong> {viewingSale.opis} <br />
                    <strong>Datum:</strong> {new Date(viewingSale.datum).toLocaleString()} <br />
                    <strong>Datum plačila:</strong> {viewingSale.datum_placila ? new Date(viewingSale.datum_placila).toLocaleString() : "/"} <br />
                    <strong>Naročnik:</strong> {viewingSale.narocnik || "/"} <br />
                    <strong>Račun:</strong> {viewingSale.stevilka_racuna || "/"}
                </div>
                <div style={{ background: "rgba(0,0,0,0.03)", padding: "1rem", borderRadius: "8px" }}>
                    <strong>Neto:</strong> {viewingSale.znesek.toFixed(2)} € <br />
                    <strong>DDV:</strong> {(viewingSale.ddv_stopnja ?? 0)}% <br />
                    <strong>Bruto:</strong> {(viewingSale.znesek_z_ddv ?? viewingSale.znesek).toFixed(2)} €
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

export default ProfitEvidencaView;
