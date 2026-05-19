import React, { useState, useMemo } from "react";
import { addOstaliNakup, potrdiLotProdukt } from "../../api";

function ProfitEvidencaView({ plakati, avti, evidenca, lots, ostaliNakupi, reload, onMsg }) {
  const [activeTab, setActiveTab] = useState("nakupi");
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");

  const [nakupForm, setNakupForm] = useState({ datum: "", opis: "", dobavitelj: "", podrobnosti: "Material", znesek: "", stevilka_racuna: "" });
  const [showAddNakup, setShowAddNakup] = useState(false);

  const [confirmingLot, setConfirmingLot] = useState(null);
  const [confirmForm, setConfirmForm] = useState({ dobavitelj: "", stevilka_racuna: "" });

  const handleAddNakup = async (e) => {
      e.preventDefault();
      try {
          await addOstaliNakup({
              ...nakupForm,
              datum: nakupForm.datum || new Date().toISOString(),
              znesek: Number(nakupForm.znesek)
          });
          onMsg("Nakup uspešno dodan.");
          setNakupForm({ datum: "", opis: "", dobavitelj: "", podrobnosti: "Material", znesek: "", stevilka_racuna: "" });
          setShowAddNakup(false);
          reload();
      } catch (err) {
          onMsg(err.message, true);
      }
  };

  const openConfirmLot = (purchase) => {
      setConfirmingLot(purchase);
      setConfirmForm({ dobavitelj: purchase.dobavitelj || "", stevilka_racuna: purchase.stevilka_racuna || "" });
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

  // 1. Prodaja (Sales)
  const salesEvents = useMemo(() => {
      const revPlakati = plakati.map(n => ({
          id: n.id,
          datum: n.datum,
          opis: n.naziv_projekta,
          narocnik: n.narocnik?.ime_narocnika,
          podrobnosti: `Delo: ${Number(n.cena_dela || 0).toFixed(2)} €, Material: ${Number(n.cena_materiala || 0).toFixed(2)} €`,
          znesek: Number(n.cena_dela || 0) + Number(n.cena_materiala || 0)
      }));
      const revAvti = avti.map(n => ({
          id: n.id,
          datum: n.datum,
          opis: `${n.opravljena_storitev || n.vozilo?.znamka_vozila}`,
          narocnik: n.lastnik_vozila?.ime_lastnika,
          podrobnosti: `Delo: ${Number(n.cena_dela || 0).toFixed(2)} €, Material: ${Number(n.cena_materiala || 0).toFixed(2)} €`,
          znesek: Number(n.cena_dela || 0) + Number(n.cena_materiala || 0)
      }));
      return [...revPlakati, ...revAvti].sort((a, b) => new Date(b.datum || 0) - new Date(a.datum || 0));
  }, [plakati, avti]);

  // 2. Nakupi (Purchases)
  const purchaseEvents = useMemo(() => {
      const expEvidenca = evidenca.filter(log => log.tip === "prevzem").map(log => {
          const lot = lots.find(l => Number(l.id) === Number(log.lot_produkt_id));
          return {
              id: log.id,
              lot_id: log.lot_produkt_id,
              isLot: true,
              potrjeno: lot ? lot.potrjeno : true, // fallback if no lot found
              datum: log.datum,
              opis: log.naziv_produkta,
              dobavitelj: lot?.dobavitelj || log.dobavitelj || "",
              stevilka_racuna: lot?.stevilka_racuna || log.stevilka_racuna || "",
              podrobnosti: "Material",
              znesek: Number(log.znesek !== undefined ? log.znesek : (Number(log.kolicina_tm || 0) * Number(log.nabavna_cena || 0))),
              lot_stevilka: lot ? lot.lot_stevilka : ""
          };
      });

      const expOstali = ostaliNakupi.map(n => ({
          id: n.id,
          isLot: false,
          potrjeno: true,
          datum: n.datum,
          opis: n.opis,
          dobavitelj: n.dobavitelj,
          stevilka_racuna: n.stevilka_racuna || "",
          podrobnosti: n.podrobnosti,
          znesek: Number(n.znesek || 0)
      }));

      return [...expEvidenca, ...expOstali].sort((a, b) => new Date(b.datum || 0) - new Date(a.datum || 0));
  }, [evidenca, lots, ostaliNakupi]);

  const availableMonths = useMemo(() => {
      const allDates = [...salesEvents, ...purchaseEvents].map(e => e.datum).filter(Boolean);
      const months = new Set(allDates.map(d => d.substring(0, 7))); // "YYYY-MM"
      return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [salesEvents, purchaseEvents]);

  const currentSales = useMemo(() => {
      if (filterMonth === "all") return salesEvents;
      return salesEvents.filter(e => e.datum && e.datum.startsWith(filterMonth));
  }, [salesEvents, filterMonth]);

  const currentPurchases = useMemo(() => {
      if (filterMonth === "all") return purchaseEvents;
      return purchaseEvents.filter(e => e.datum && e.datum.startsWith(filterMonth));
  }, [purchaseEvents, filterMonth]);

  const stats = useMemo(() => {
      const totalRevenue = currentSales.reduce((sum, item) => sum + item.znesek, 0);
      const totalExpense = currentPurchases.reduce((sum, item) => sum + item.znesek, 0);
      return { totalRevenue, totalExpense, netProfit: totalRevenue - totalExpense };
  }, [currentSales, currentPurchases]);

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

  return (
    <div className="animated">
      {/* STATISTIKA */}
      <section className="grid-2" style={{ marginBottom: "2rem" }}>
        <div className="card" style={{ textAlign: "center", borderLeft: `8px solid ${stats.netProfit >= 0 ? "var(--success)" : "var(--danger)"}` }}>
           <h3 style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>RAZLIKA (Prihodki - Stroški)</h3>
           <div style={{ fontSize: "2.5rem", fontWeight: "800", color: stats.netProfit >= 0 ? "var(--success)" : "var(--danger)" }}>
                {stats.netProfit >= 0 ? "" : "-"}{Math.abs(stats.netProfit).toFixed(2)} €
           </div>
        </div>
        <div className="grid-2" style={{ gap: "1rem" }}>
            <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
                <h3 style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>SKUPNI PRIHODKI</h3>
                <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--success)" }}>{stats.totalRevenue.toFixed(2)} €</div>
            </div>
            <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
                <h3 style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>SKUPNI STROŠKI</h3>
                <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--danger)" }}>{stats.totalExpense.toFixed(2)} €</div>
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
                        <tr key={p.id}>
                            <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{new Date(p.datum).toLocaleDateString()}</td>
                            <td><strong>{p.opis}</strong> {p.lot_stevilka && <small style={{display:"block", color:"var(--text-muted)"}}>LOT: {p.lot_stevilka}</small>}</td>
                            <td>{p.dobavitelj || "/"}<br/>{p.stevilka_racuna && <small style={{color:"var(--text-muted)"}}>Račun: {p.stevilka_racuna}</small>}</td>
                            <td>{p.podrobnosti}</td>
                            <td style={{ textAlign: "right", color: "var(--danger)", fontWeight: "bold" }}>
                                {p.znesek.toFixed(2)} €
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
                <div style={{ marginBottom: "1rem" }}>
                    <h2>Evidenca Prodaje</h2>
                </div>
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
                        <tr key={s.id}>
                            <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{new Date(s.datum).toLocaleDateString()}</td>
                            <td><strong>{s.opis}</strong></td>
                            <td>{s.narocnik || "/"}</td>
                            <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{s.podrobnosti}</td>
                            <td style={{ textAlign: "right", color: "var(--success)", fontWeight: "bold" }}>
                                {s.znesek.toFixed(2)} €
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </div>
        )}
      </section>

      {/* CONFIRM LOT MODAL */}
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
    </div>
  );
}

export default ProfitEvidencaView;
