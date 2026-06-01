import React, { useMemo, useState } from "react";
import { addNakup, addPrihodek, addProdukt, addLotProdukt } from "../../api";

const KATEGORIJE = [
  { value: "material", label: "Material" },
  { value: "oprema", label: "Oprema" },
  { value: "lizing", label: "Lizing" },
  { value: "gorivo", label: "Gorivo" },
  { value: "bancniStroski", label: "Bančni stroški" },
  { value: "place", label: "Plače" },
  { value: "smeti", label: "Smeti" },
  { value: "telefon", label: "Telefon" },
  { value: "drugo", label: "Drugo" }
];

function ProfitEvidencaView({ profitData, produkti, reload, onMsg }) {
  const [activeTab, setActiveTab] = useState("nakupi");
  const [showAddNakup, setShowAddNakup] = useState(false);
  const [showAddPrihodek, setShowAddPrihodek] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState(null);
  const [viewingSale, setViewingSale] = useState(null);

  const [filters, setFilters] = useState({
    dobavitelj: "",
    kategorije: [],
    datumOd: "",
    datumDo: "",
    znesekOd: "",
    znesekDo: ""
  });

  const [nakupForm, setNakupForm] = useState({
    datum: "",
    dobavitelj: "",
    stevilka_racuna: "",
    postavke: [
      { kategorija: "material", opis: "", neto_cena: "", ddv: 22, produkt_id: "", showNewProdukt: false, newProdukt: null }
    ]
  });

  const [prihodekForm, setPrihodekForm] = useState({
    datum: "",
    datum_placila: "",
    opis: "",
    narocnik: "",
    znesek: "",
    ddv_stopnja: 0,
    stevilka_racuna: ""
  });

  if (!profitData) return <div>Nalagam...</div>;
  const { salesEvents, purchaseEvents } = profitData;

  const filteredProdukti = useMemo(() => {
    const dob = (nakupForm.dobavitelj || "").toLowerCase();
    if (!dob) return produkti;
    return produkti.filter(p => (p.dobavitelj || "").toLowerCase().includes(dob));
  }, [produkti, nakupForm.dobavitelj]);

  const applyFilters = (event) => {
    const date = event.datum ? new Date(event.datum) : null;
    if (filters.datumOd && date && date < new Date(filters.datumOd)) return false;
    if (filters.datumDo && date && date > new Date(filters.datumDo)) return false;

    if (filters.znesekOd !== "") {
      const amount = event.isNakup ? Number(event.neto_znesek || 0) : Number(event.znesek ?? event.znesek_z_ddv ?? 0);
      if (amount < Number(filters.znesekOd)) return false;
    }
    if (filters.znesekDo !== "") {
      const amount = event.isNakup ? Number(event.neto_znesek || 0) : Number(event.znesek ?? event.znesek_z_ddv ?? 0);
      if (amount > Number(filters.znesekDo)) return false;
    }

    if (filters.dobavitelj) {
      const d = (event.dobavitelj || "").toLowerCase();
      if (!d.includes(filters.dobavitelj.toLowerCase())) return false;
    }

    if (filters.kategorije.length > 0) {
      const cats = event.isNakup
        ? (event.postavke || []).map(p => (p.kategorija || "").toLowerCase())
        : [String(event.kategorija || event.podrobnosti || "").toLowerCase()];
      if (!cats.some(c => filters.kategorije.includes(c))) return false;
    }

    return true;
  };

  const filteredPurchases = purchaseEvents.filter(applyFilters);
  const filteredSales = salesEvents.filter(ev => {
    const date = ev.datum ? new Date(ev.datum) : null;
    if (filters.datumOd && date && date < new Date(filters.datumOd)) return false;
    if (filters.datumDo && date && date > new Date(filters.datumDo)) return false;
    if (filters.znesekOd !== "") {
      const amount = Number(ev.znesek ?? ev.znesek_z_ddv ?? 0);
      if (amount < Number(filters.znesekOd)) return false;
    }
    if (filters.znesekDo !== "") {
      const amount = Number(ev.znesek ?? ev.znesek_z_ddv ?? 0);
      if (amount > Number(filters.znesekDo)) return false;
    }
    return true;
  });

  const totalRevenue = filteredSales.reduce((sum, item) => sum + (item.znesek_z_ddv ?? item.znesek), 0);
  const totalExpense = filteredPurchases.reduce((sum, item) => {
    return sum + (item.isNakup ? (item.bruto_znesek || item.neto_znesek) : (item.znesek_z_ddv ?? item.znesek));
  }, 0);
  const netProfit = totalRevenue - totalExpense;

  const updatePostavka = (idx, changes) => {
    setNakupForm(prev => {
      const next = [...prev.postavke];
      next[idx] = { ...next[idx], ...changes };
      return { ...prev, postavke: next };
    });
  };

  const addPostavka = () => {
    setNakupForm(prev => ({
      ...prev,
      postavke: [...prev.postavke, { kategorija: "material", opis: "", neto_cena: "", ddv: 22, produkt_id: "", showNewProdukt: false, newProdukt: null }]
    }));
  };

  const removePostavka = (idx) => {
    setNakupForm(prev => {
      const next = [...prev.postavke];
      next.splice(idx, 1);
      return { ...prev, postavke: next.length ? next : prev.postavke };
    });
  };

  const computedPostavke = nakupForm.postavke.map(p => {
    const neto = Number(p.neto_cena || 0);
    const ddv = Number(p.ddv || 0);
    const bruto = neto * (1 + ddv / 100);
    return { ...p, bruto_cena: bruto };
  });

  const sumNeto = computedPostavke.reduce((sum, p) => sum + Number(p.neto_cena || 0), 0);
  const sumBruto = computedPostavke.reduce((sum, p) => sum + Number(p.bruto_cena || 0), 0);

  const handleAddNakup = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        datum: nakupForm.datum,
        dobavitelj: nakupForm.dobavitelj,
        stevilka_racuna: nakupForm.stevilka_racuna,
        postavke: computedPostavke.map(p => ({
          kategorija: p.kategorija,
          opis: p.opis,
          neto_cena: Number(p.neto_cena || 0),
          ddv: Number(p.ddv || 0),
          produkt_id: p.kategorija === "material" && p.produkt_id ? Number(p.produkt_id) : null
        }))
      };

      await addNakup(payload);
      onMsg("Nakup uspešno dodan.");
      setNakupForm({
        datum: "",
        dobavitelj: "",
        stevilka_racuna: "",
        postavke: [
          { kategorija: "material", opis: "", neto_cena: "", ddv: 22, produkt_id: "", showNewProdukt: false, newProdukt: null }
        ]
      });
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

  const createNewProdukt = async (idx) => {
    const postavka = nakupForm.postavke[idx];
    const np = postavka.newProdukt;
    if (!np) return;

    try {
      const created = await addProdukt({
        koda: np.koda,
        naziv_produkta: np.naziv_produkta,
        tip: np.tip,
        sirina: np.sirina || null,
        dobavitelj: nakupForm.dobavitelj || "",
        nabavna_cena: np.nabavna_cena,
        prodajna_cena: np.prodajna_cena
      });

      if (Number(np.kolicina || 0) > 0) {
        await addLotProdukt({
          produkt_id: created.id,
          lot_stevilka: np.lot_stevilka || `AUTO-${Date.now()}`,
          kolicina_tm: np.enota === "tm" ? np.kolicina : "",
          kolicina_m2: np.enota === "m2" ? np.kolicina : "",
          nabavna_cena: np.nabavna_cena,
          prodajna_cena: np.prodajna_cena,
          datum_prevzema: ""
        });
      }

      updatePostavka(idx, { produkt_id: created.id, showNewProdukt: false, newProdukt: null });
      reload();
    } catch (err) {
      onMsg(err.message, true);
    }
  };

  return (
    <div className="animated">
      <section className="grid-2" style={{ marginBottom: "2rem" }}>
        <div className="card" style={{ textAlign: "center", borderLeft: `8px solid ${netProfit >= 0 ? "var(--color-success)" : "var(--color-error)"}` }}>
          <h3 style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>RAZLIKA (Prihodki - Stroški)</h3>
          <div style={{ fontSize: "2.5rem", fontWeight: "800", color: netProfit >= 0 ? "var(--color-success)" : "var(--color-error)" }}>
            {netProfit >= 0 ? "" : "-"}{Math.abs(netProfit).toFixed(2)} €
          </div>
        </div>
        <div className="grid-2" style={{ gap: "1rem" }}>
          <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
            <h3 style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>SKUPNI PRIHODKI</h3>
            <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--color-success)" }}>{totalRevenue.toFixed(2)} €</div>
          </div>
          <div className="card" style={{ textAlign: "center", padding: "1.5rem" }}>
            <h3 style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>SKUPNI STROŠKI</h3>
            <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--color-error)" }}>{totalExpense.toFixed(2)} €</div>
          </div>
        </div>
      </section>

      <section className="card" style={{ marginBottom: "2rem" }}>
          <h2 style={{ marginBottom: "1rem" }}>Filtri</h2>
        <div className="grid-2" style={{ gap: "1rem" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Dobavitelj</label>
            <input value={filters.dobavitelj} onChange={e => setFilters({ ...filters, dobavitelj: e.target.value })} placeholder="Išči dobavitelja" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Kategorija</label>
            <select multiple value={filters.kategorije} onChange={e => {
              const selected = Array.from(e.target.selectedOptions).map(o => o.value);
              setFilters({ ...filters, kategorije: selected });
            }}>
              {KATEGORIJE.map(k => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid-2" style={{ gap: "1rem" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Datum od</label>
            <input type="date" value={filters.datumOd} onChange={e => setFilters({ ...filters, datumOd: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Datum do</label>
            <input type="date" value={filters.datumDo} onChange={e => setFilters({ ...filters, datumDo: e.target.value })} />
          </div>
        </div>
        <div className="grid-2" style={{ gap: "1rem" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Znesek od</label>
            <input type="number" step="0.01" value={filters.znesekOd} onChange={e => setFilters({ ...filters, znesekOd: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Znesek do</label>
            <input type="number" step="0.01" value={filters.znesekDo} onChange={e => setFilters({ ...filters, znesekDo: e.target.value })} />
          </div>
        </div>
        <button className="btn-primary" style={{ width: "auto" }} onClick={() => setFilters({ dobavitelj: "", kategorije: [], datumOd: "", datumDo: "", znesekOd: "", znesekDo: "" })}>
          Počisti filtre
        </button>
      </section>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button className={`tab-btn ${activeTab === "nakupi" ? "active" : ""}`} onClick={() => setActiveTab("nakupi")}>
            NAKUPI (Stroški)
          </button>
          <button className={`tab-btn ${activeTab === "prodaja" ? "active" : ""}`} onClick={() => setActiveTab("prodaja")}>
            PRODAJA (Prihodki)
          </button>
        </div>
      </div>

      <section className="card">
        {activeTab === "nakupi" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2>Analiza Nakupov</h2>
              <button className="btn-primary" onClick={() => setShowAddNakup(!showAddNakup)}>
                {showAddNakup ? "Prekliči" : "+ Dodaj nakup"}
              </button>
            </div>

            {showAddNakup && (
              <form onSubmit={handleAddNakup} className="card" style={{ marginBottom: "2rem" }}>
                <div className="grid-2" style={{ gap: "1rem" }}>
                  <div className="form-group">
                    <label>Datum</label>
                    <input type="date" value={nakupForm.datum} onChange={e => setNakupForm({ ...nakupForm, datum: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Dobavitelj</label>
                    <input value={nakupForm.dobavitelj} onChange={e => setNakupForm({ ...nakupForm, dobavitelj: e.target.value })} placeholder="Dobavitelj d.o.o." />
                  </div>
                </div>
                <div className="form-group">
                  <label>Številka računa</label>
                  <input value={nakupForm.stevilka_racuna} onChange={e => setNakupForm({ ...nakupForm, stevilka_racuna: e.target.value })} placeholder="R-2024-001" />
                </div>

                <h3 style={{ marginTop: "1.5rem" }}>Postavke računa</h3>
                {computedPostavke.map((postavka, idx) => (
                  <div key={idx} className="card" style={{ marginBottom: "1rem" }}>
                    <div className="grid-2" style={{ gap: "1rem" }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Kategorija</label>
                        <select value={postavka.kategorija} onChange={e => updatePostavka(idx, { kategorija: e.target.value })}>
                          {KATEGORIJE.map(k => (
                            <option key={k.value} value={k.value}>{k.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Opis</label>
                        <input value={postavka.opis} onChange={e => updatePostavka(idx, { opis: e.target.value })} placeholder="Opis postavke" />
                      </div>
                    </div>
                    <div className="grid-2" style={{ gap: "1rem" }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Neto cena</label>
                        <input type="number" step="0.01" value={postavka.neto_cena} onChange={e => updatePostavka(idx, { neto_cena: e.target.value })} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>DDV</label>
                        <select value={postavka.ddv} onChange={e => updatePostavka(idx, { ddv: e.target.value })}>
                          <option value={0}>0%</option>
                          <option value={9.5}>9.5%</option>
                          <option value={22}>22%</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Bruto cena</label>
                      <input readOnly value={`${postavka.bruto_cena.toFixed(2)} €`} />
                    </div>

                    {postavka.kategorija === "material" && (
                      <div className="card" style={{ marginTop: "1rem" }}>
                        <h4>Izberi artikel iz zaloge</h4>
                        <div className="form-group">
                          <label>Artikel</label>
                          <select value={postavka.produkt_id} onChange={e => updatePostavka(idx, { produkt_id: e.target.value })}>
                            <option value="">-- Izberi artikel --</option>
                            {filteredProdukti.map(p => (
                              <option key={p.id} value={p.id}>{p.koda} - {p.naziv_produkta}</option>
                            ))}
                          </select>
                        </div>
                        <button type="button" className="btn-primary" style={{ width: "auto" }} onClick={() => updatePostavka(idx, { showNewProdukt: !postavka.showNewProdukt, newProdukt: postavka.showNewProdukt ? null : { koda: "", naziv_produkta: "", tip: "folija", sirina: "", nabavna_cena: "", prodajna_cena: "", lot_stevilka: "", kolicina: "", enota: "tm" } })}>
                          {postavka.showNewProdukt ? "Skrij" : "Dodaj nov artikel"}
                        </button>

                        {postavka.showNewProdukt && postavka.newProdukt && (
                          <div className="card" style={{ marginTop: "1rem" }}>
                            <div className="grid-2" style={{ gap: "1rem" }}>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>Koda</label>
                                <input value={postavka.newProdukt.koda} onChange={e => updatePostavka(idx, { newProdukt: { ...postavka.newProdukt, koda: e.target.value } })} />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>Naziv artikla</label>
                                <input value={postavka.newProdukt.naziv_produkta} onChange={e => updatePostavka(idx, { newProdukt: { ...postavka.newProdukt, naziv_produkta: e.target.value } })} />
                              </div>
                            </div>
                            <div className="grid-2" style={{ gap: "1rem" }}>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>Tip</label>
                                <select value={postavka.newProdukt.tip} onChange={e => updatePostavka(idx, { newProdukt: { ...postavka.newProdukt, tip: e.target.value } })}>
                                  <option value="folija">Folija</option>
                                  <option value="adr oprema">ADR Oprema</option>
                                </select>
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>Sirina materiala</label>
                                <select value={postavka.newProdukt.sirina} onChange={e => updatePostavka(idx, { newProdukt: { ...postavka.newProdukt, sirina: e.target.value } })}>
                                  <option value="">Ni aplicabilno</option>
                                  <option value={0.6}>0.6</option>
                                  <option value={1.06}>1.06</option>
                                  <option value={1.23}>1.23</option>
                                  <option value={1.37}>1.37</option>
                                  <option value={1.523}>1.523</option>
                                  <option value={1.6}>1.6</option>
                                </select>
                              </div>
                            </div>
                            <div className="grid-2" style={{ gap: "1rem" }}>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>Nabavna cena (€/m2)</label>
                                <input type="number" step="0.01" value={postavka.newProdukt.nabavna_cena} onChange={e => updatePostavka(idx, { newProdukt: { ...postavka.newProdukt, nabavna_cena: e.target.value } })} />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>Prodajna cena (€/m2)</label>
                                <input type="number" step="0.01" value={postavka.newProdukt.prodajna_cena} onChange={e => updatePostavka(idx, { newProdukt: { ...postavka.newProdukt, prodajna_cena: e.target.value } })} />
                              </div>
                            </div>
                            <div className="grid-2" style={{ gap: "1rem" }}>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>LOT stevilka (opcijsko)</label>
                                <input value={postavka.newProdukt.lot_stevilka} onChange={e => updatePostavka(idx, { newProdukt: { ...postavka.newProdukt, lot_stevilka: e.target.value } })} />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>Enota kolicine</label>
                                <select value={postavka.newProdukt.enota} onChange={e => updatePostavka(idx, { newProdukt: { ...postavka.newProdukt, enota: e.target.value } })}>
                                  <option value="tm">Tekoči metri</option>
                                  <option value="m2">Kvadratni metri</option>
                                </select>
                              </div>
                            </div>
                            <div className="form-group">
                              <label>Količina</label>
                              <input type="number" step="0.1" value={postavka.newProdukt.kolicina} onChange={e => updatePostavka(idx, { newProdukt: { ...postavka.newProdukt, kolicina: e.target.value } })} />
                            </div>
                            <button type="button" className="btn-primary" style={{ width: "auto" }} onClick={() => createNewProdukt(idx)}>
                              Shrani artikel
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {computedPostavke.length > 1 && (
                      <button type="button" className="btn-primary" style={{ width: "auto", background: "var(--color-primary-dark)" }} onClick={() => removePostavka(idx)}>
                        Odstrani postavko
                      </button>
                    )}
                  </div>
                ))}

                <button type="button" className="btn-primary" style={{ width: "auto" }} onClick={addPostavka}>+ Dodaj postavko</button>

                <div className="card" style={{ marginTop: "1.5rem" }}>
                  <div><strong>Skupni neto:</strong> {sumNeto.toFixed(2)} €</div>
                  <div><strong>Skupni bruto:</strong> {sumBruto.toFixed(2)} €</div>
                </div>

                <button type="submit" className="btn-primary" style={{ marginTop: "1rem" }}>Shrani račun</button>
              </form>
            )}

            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Dobavitelj</th>
                    <th>Št. računa</th>
                    <th>Neto znesek</th>
                    <th>Bruto znesek</th>
                    <th>Podrobnosti</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.length === 0 && <tr><td colSpan="6" style={{ textAlign: "center" }}>Ni zapisov.</td></tr>}
                  {filteredPurchases.map(p => (
                    <tr key={p.id}>
                      <td>{new Date(p.datum).toLocaleDateString()}</td>
                      <td>{p.dobavitelj || "/"}</td>
                      <td>{p.stevilka_racuna || "/"}</td>
                      <td>{(p.isNakup ? p.neto_znesek : p.znesek).toFixed(2)} €</td>
                      <td>{(p.isNakup ? p.bruto_znesek : (p.znesek_z_ddv ?? p.znesek)).toFixed(2)} €</td>
                      <td><button className="btn-primary" style={{ width: "auto" }} onClick={() => setViewingPurchase(p)}>Podrobnosti</button></td>
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
              <h2>Analiza Prodaje</h2>
              <button className="btn-primary" onClick={() => setShowAddPrihodek(!showAddPrihodek)}>
                {showAddPrihodek ? "Prekliči" : "+ Dodaj prihodek"}
              </button>
            </div>

            {showAddPrihodek && (
              <form onSubmit={handleAddPrihodek} className="card" style={{ marginBottom: "2rem" }}>
                <div className="grid-2" style={{ gap: "1rem" }}>
                  <div className="form-group">
                    <label>Datum</label>
                    <input type="datetime-local" value={prihodekForm.datum} onChange={e => setPrihodekForm({ ...prihodekForm, datum: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Znesek (€)</label>
                    <input required type="number" step="0.01" value={prihodekForm.znesek} onChange={e => setPrihodekForm({ ...prihodekForm, znesek: e.target.value })} />
                  </div>
                </div>
                <div className="grid-2" style={{ gap: "1rem" }}>
                  <div className="form-group">
                    <label>Datum plačila</label>
                    <input type="datetime-local" value={prihodekForm.datum_placila} onChange={e => setPrihodekForm({ ...prihodekForm, datum_placila: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>DDV</label>
                    <select value={prihodekForm.ddv_stopnja} onChange={e => setPrihodekForm({ ...prihodekForm, ddv_stopnja: e.target.value })}>
                      <option value={0}>0%</option>
                      <option value={9.5}>9.5%</option>
                      <option value={22}>22%</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Opis</label>
                  <input required value={prihodekForm.opis} onChange={e => setPrihodekForm({ ...prihodekForm, opis: e.target.value })} placeholder="Npr. Dodatna storitev" />
                </div>
                <div className="grid-2" style={{ gap: "1rem" }}>
                  <div className="form-group">
                    <label>Naročnik</label>
                    <input value={prihodekForm.narocnik} onChange={e => setPrihodekForm({ ...prihodekForm, narocnik: e.target.value })} placeholder="Npr. Podjetje d.o.o." />
                  </div>
                  <div className="form-group">
                    <label>Številka računa</label>
                    <input value={prihodekForm.stevilka_racuna} onChange={e => setPrihodekForm({ ...prihodekForm, stevilka_racuna: e.target.value })} placeholder="Npr. RAC-123" />
                  </div>
                </div>
                <button type="submit" className="btn-primary">Shrani prihodek</button>
              </form>
            )}

            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Naročnik</th>
                    <th>Št. delovnega naloga</th>
                    <th>Neto znesek</th>
                    <th>Bruto znesek</th>
                    <th>Podrobnosti</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.length === 0 && <tr><td colSpan="6" style={{ textAlign: "center" }}>Ni zapisov.</td></tr>}
                  {filteredSales.map(s => (
                    <tr key={s.id}>
                      <td>{new Date(s.datum).toLocaleDateString()}</td>
                      <td>{s.narocnik || "/"}</td>
                      <td>{s.stevilka_delovnega_naloga || "/"}</td>
                      <td>{(s.cena_dela + s.cena_materiala).toFixed(2)} €</td>
                      <td>{(s.cena_dela + s.cena_materiala).toFixed(2)} €</td>
                      <td><button className="btn-primary" style={{ width: "auto" }} onClick={() => setViewingSale(s)}>Podrobnosti</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {viewingPurchase && (
        <div className="modal-overlay" onClick={() => setViewingPurchase(null)}>
          <div className="modal-content animated" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>Podrobnosti nakupa</h2>
              <button className="modal-close" onClick={() => setViewingPurchase(null)}>&times;</button>
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <strong>Datum:</strong> {new Date(viewingPurchase.datum).toLocaleDateString()} <br />
              <strong>Dobavitelj:</strong> {viewingPurchase.dobavitelj || "/"} <br />
              <strong>Stevilka racuna:</strong> {viewingPurchase.stevilka_racuna || "/"}
            </div>

            {viewingPurchase.isNakup ? (
              <>
                <table>
                  <thead>
                    <tr>
                      <th>Kategorija</th>
                      <th>Opis</th>
                      <th>Neto</th>
                      <th>DDV</th>
                      <th>Bruto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewingPurchase.postavke || []).map((p, idx) => (
                      <tr key={idx}>
                        <td>{p.kategorija}</td>
                        <td>{p.opis}</td>
                        <td>{Number(p.neto_cena).toFixed(2)} €</td>
                        <td>{p.ddv}%</td>
                        <td>{Number(p.bruto_cena).toFixed(2)} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="card" style={{ marginTop: "1rem" }}>
                  <div><strong>Skupni neto:</strong> {Number(viewingPurchase.neto_znesek).toFixed(2)} €</div>
                  <div><strong>Skupni bruto:</strong> {Number(viewingPurchase.bruto_znesek).toFixed(2)} €</div>
                </div>
              </>
            ) : (
              <div className="card">
                <div><strong>Opis:</strong> {viewingPurchase.opis}</div>
                <div><strong>Neto:</strong> {Number(viewingPurchase.znesek).toFixed(2)} €</div>
                <div><strong>Bruto:</strong> {Number(viewingPurchase.znesek_z_ddv ?? viewingPurchase.znesek).toFixed(2)} €</div>
              </div>
            )}
          </div>
        </div>
      )}

      {viewingSale && (
        <div className="modal-overlay" onClick={() => setViewingSale(null)}>
          <div className="modal-content animated" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>Podrobnosti delovnega naloga</h2>
              <button className="modal-close" onClick={() => setViewingSale(null)}>&times;</button>
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <strong>Naziv / Storitev:</strong> {viewingSale.naziv_projekta || viewingSale.opravljena_storitev || viewingSale.opis} <br />
              <strong>Opis:</strong> {viewingSale.opis || "/"} <br />
              <strong>Narocnik:</strong> {viewingSale.narocnik || "/"} <br />
              <strong>Stevilka delovnega naloga:</strong> {viewingSale.stevilka_delovnega_naloga || "/"}
            </div>
            <div className="card">
              <div><strong>Cena dela:</strong> {Number(viewingSale.cena_dela || 0).toFixed(2)} €</div>
              <div><strong>Cena materiala:</strong> {Number(viewingSale.cena_materiala || 0).toFixed(2)} €</div>
              <div><strong>Skupaj neto:</strong> {(Number(viewingSale.cena_dela || 0) + Number(viewingSale.cena_materiala || 0)).toFixed(2)} €</div>
              <div><strong>Skupaj bruto:</strong> {(Number(viewingSale.cena_dela || 0) + Number(viewingSale.cena_materiala || 0)).toFixed(2)} €</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfitEvidencaView;