import React, { useEffect, useState, useMemo } from "react";
import {
  getProdukti,
  getLotProdukti,
  getEvidencaZaloge,
  getNalogePlakati,
  getNalogeAvti,
  addProdukt,
  addLotProdukt,
  createNalogaPlakati,
  updateNalogaPlakati,
  createNalogaAvti,
  updateNalogaAvti
} from "./api";

import "./styles.css";

const POSKODBE_V_AVTI = [
    "Praska levo", "Praska desno", "Udrtina spredaj", "Udrtina zadaj", 
    "Poškodovano steklo", "Odrgnina na strehi", "Poškodba platišča"
];

function App() {
  const [activeTab, setActiveTab] = useState("naloge");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [produkti, setProdukti] = useState([]);
  const [lots, setLots] = useState([]);
  const [evidenca, setEvidenca] = useState([]);
  const [plakati, setPlakati] = useState([]);
  const [avti, setAvti] = useState([]);

  async function loadData() {
    try {
      setLoading(true);
      const [pd, ld, ed, ndp, nda] = await Promise.all([
        getProdukti(),
        getLotProdukti(),
        getEvidencaZaloge(),
        getNalogePlakati(),
        getNalogeAvti()
      ]);
      setProdukti(pd);
      setLots(ld);
      setEvidenca(ed);
      setPlakati(ndp);
      setAvti(nda);
    } catch (err) {
      setError(err.message || "Napaka pri nalaganju podatkov.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const displayMessage = (msg, isError = false) => {
      if (isError) {
          setError(msg); setSuccess("");
      } else {
          setSuccess(msg); setError("");
      }
      setTimeout(() => { setError(""); setSuccess(""); }, 5000);
  };

  return (
    <div className="app-container">
      <header className="app-header animated">
        <h1>Venta Design Demo</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>
          Sistem za vodenje zaloge in delovnih nalog
        </p>

        <div className="tabs">
          <button 
            className={`tab-btn ${activeTab === "zaloga" ? "active" : ""}`}
            onClick={() => setActiveTab("zaloga")}
          >
            Zaloga in Produkti
          </button>
          <button 
            className={`tab-btn ${activeTab === "naloge" ? "active" : ""}`}
            onClick={() => setActiveTab("naloge")}
          >
            Delovne Naloge
          </button>
          <button 
            className={`tab-btn ${activeTab === "evidenca" ? "active" : ""}`}
            onClick={() => setActiveTab("evidenca")}
          >
            Evidenca Zaloge
          </button>
        </div>
      </header>

      {error && <div className="alert error animated">{error}</div>}
      {success && <div className="alert success animated">{success}</div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>Nalagam podatke...</div>
      ) : (
        <main>
          {activeTab === "zaloga" && (
            <ZalogaView produkti={produkti} lots={lots} reload={loadData} onMsg={displayMessage} />
          )}
          {activeTab === "naloge" && (
            <NalogeView lots={lots} produkti={produkti} plakati={plakati} avti={avti} reload={loadData} onMsg={displayMessage} />
          )}
          {activeTab === "evidenca" && (
            <EvidencaView evidenca={evidenca} />
          )}
        </main>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// VIEW: ZALOGA IN PRODUKTI
// ----------------------------------------------------------------------------
function ZalogaView({ produkti, lots, reload, onMsg }) {
    const [prodForm, setProdForm] = useState({ koda: "", naziv_produkta: "", prodajna_cena: "", nabavna_cena: "" });
    const [lotForm, setLotForm] = useState({ produkt_id: "", lot_stevilka: "", kolicina_tm: "", dobavitelj: "", stevilka_racuna: "" });
    const [searchingLot, setSearchingLot] = useState("");

    const handleAddProd = async (e) => {
        e.preventDefault();
        try {
            await addProdukt({
                ...prodForm,
                prodajna_cena: Number(prodForm.prodajna_cena),
                nabavna_cena: Number(prodForm.nabavna_cena)
            });
            onMsg("Produkt uspešno dodan.");
            setProdForm({ koda: "", naziv_produkta: "", prodajna_cena: "", nabavna_cena: "" });
            reload();
        } catch (err) { onMsg(err.message, true); }
    };

    const handleAddLot = async (e) => {
        e.preventDefault();
        try {
            await addLotProdukt(lotForm);
            onMsg("LOT prevzem uspešen. Kreirana evidenca.");
            setLotForm({ produkt_id: "", lot_stevilka: "", kolicina_tm: "", dobavitelj: "", stevilka_racuna: "" });
            reload();
        } catch (err) { onMsg(err.message, true); }
    };

    const searchStr = searchingLot.toLowerCase();
    const searchedProdukti = useMemo(() => {
        if (!searchStr) return produkti;
        return produkti.filter(p => p.naziv_produkta.toLowerCase().includes(searchStr) || p.koda.toLowerCase().includes(searchStr));
    }, [produkti, searchStr]);

    return (
        <div className="grid-2 animated">
            <div>
                <section className="card">
                    <h2>Katalog Produktov</h2>
                    <table style={{ marginBottom: "1.5rem" }}>
                        <thead>
                            <tr>
                                <th>Koda</th>
                                <th>Naziv</th>
                                <th>TM na voljo</th>
                                <th>Vrednost zaloge</th>
                            </tr>
                        </thead>
                        <tbody>
                            {produkti.map(p => (
                                <tr key={p.id}>
                                    <td>{p.koda}</td>
                                    <td>{p.naziv_produkta}</td>
                                    <td><strong>{p.kolicina_tm?.toFixed(1) || 0}</strong></td>
                                    <td>{p.vrednost_zaloge?.toFixed(2) || 0} €</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <form onSubmit={handleAddProd}>
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Dodaj nov produkt</h3>
                        <div className="form-group">
                            <label>Koda produkta</label>
                            <input required value={prodForm.koda} onChange={e => setProdForm({...prodForm, koda: e.target.value})} placeholder="Npr. ORC-651" />
                        </div>
                        <div className="form-group">
                            <label>Naziv produkta</label>
                            <input required value={prodForm.naziv_produkta} onChange={e => setProdForm({...prodForm, naziv_produkta: e.target.value})} placeholder="Oracal 651 Mat" />
                        </div>
                        <div className="grid-2" style={{ gap: "1rem" }}>
                            <div className="form-group">
                                <label>Nabavna cena (€/tm)</label>
                                <input type="number" step="0.01" required value={prodForm.nabavna_cena} onChange={e => setProdForm({...prodForm, nabavna_cena: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Prodajna cena (€/tm)</label>
                                <input type="number" step="0.01" required value={prodForm.prodajna_cena} onChange={e => setProdForm({...prodForm, prodajna_cena: e.target.value})} />
                            </div>
                        </div>
                        <button type="submit" className="btn-primary">Ustvari produkt</button>
                    </form>
                </section>
            </div>
            
            <div>
                <section className="card">
                    <h2>LOT Prevzem (Vnos na zalogo)</h2>
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
                                onChange={e => setLotForm({...lotForm, produkt_id: e.target.value})}
                                size="5"
                                style={{ overflowY: "auto" }}
                            >
                                <option value="" disabled>Izberite produkt za prevzem...</option>
                                {searchedProdukti.map(p => (
                                    <option key={p.id} value={p.id}>{p.koda} - {p.naziv_produkta}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>LOT Številka / Oznaka role</label>
                            <input required value={lotForm.lot_stevilka} onChange={e => setLotForm({...lotForm, lot_stevilka: e.target.value})} placeholder="Npr. BATCH-A1" />
                        </div>
                        <div className="form-group">
                            <label>Količina TM (Tekoči metri)</label>
                            <input required type="number" step="0.1" value={lotForm.kolicina_tm} onChange={e => setLotForm({...lotForm, kolicina_tm: e.target.value})} placeholder="Npr. 50" />
                        </div>
                        <div className="grid-2" style={{ gap: "1rem" }}>
                            <div className="form-group">
                                <label>Dobavitelj</label>
                                <input value={lotForm.dobavitelj} onChange={e => setLotForm({...lotForm, dobavitelj: e.target.value})} placeholder="Npr. Print Zupan" />
                            </div>
                            <div className="form-group">
                                <label>Št. Računa (opcijsko)</label>
                                <input value={lotForm.stevilka_racuna} onChange={e => setLotForm({...lotForm, stevilka_racuna: e.target.value})} placeholder="INV-2026-X" />
                            </div>
                        </div>
                        <button type="submit" className="btn-primary">Prevzem na zalogo</button>
                    </form>
                </section>
                
                <section className="card">
                    <h2>Aktivni LOTi na zalogi</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>LOT</th>
                                <th>Produkt</th>
                                <th>Kolicina TM</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lots.map(l => {
                                const prod = produkti.find(p => p.id === Number(l.produkt_id));
                                return (
                                    <tr key={l.id}>
                                        <td>{l.lot_stevilka}</td>
                                        <td>{prod ? prod.naziv_produkta : "Neznan"}</td>
                                        <td>{l.kolicina_tm?.toFixed(1)} tm</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </section>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------------
// VIEW: DELOVNE NALOGE
// ----------------------------------------------------------------------------

function MaterialSelect({ value, onChange, lots, produkti }) {
    const [search, setSearch] = useState("");
    
    const enrichedLots = useMemo(() => lots.map(l => {
        const p = produkti.find(prod => Number(prod.id) === Number(l.produkt_id));
        return { ...l, naziv_produkta: p ? p.naziv_produkta : 'Neznan produkt' };
    }), [lots, produkti]);

    const filtered = enrichedLots.filter(l => {
        if (value && Number(l.id) === Number(value)) return true; // always show selected
        if (l.kolicina_tm <= 0) return false;
        if (!search) return true;
        const normalizedSrc = search.toLowerCase();
        return l.lot_stevilka.toLowerCase().includes(normalizedSrc) || l.naziv_produkta.toLowerCase().includes(normalizedSrc);
    });

    return (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
            <input 
                type="text" 
                placeholder="Išči lot ali material..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} 
            />
            <select required value={value} onChange={e => onChange(e.target.value)} size="3" style={{ height: 'auto', backgroundColor: '#fff', fontSize: '0.85rem' }}>
                <option value="" disabled>-- Izberi LOT --</option>
                {filtered.map(l => (
                    <option key={l.id} value={l.id}>
                        {l.lot_stevilka} - {l.naziv_produkta} (na voljo: {l.kolicina_tm} tm)
                    </option>
                ))}
            </select>
        </div>
    );
}


function NalogeView({ lots, produkti, plakati, avti, reload, onMsg }) {
    const [nalogaType, setNalogaType] = useState("plakati");
    const [editingOrder, setEditingOrder] = useState(null);
    const [viewingDetails, setViewingDetails] = useState(null);

    const activeList = nalogaType === "plakati" ? plakati : avti;

    const startEdit = (order) => {
        setEditingOrder(order);
        setViewingDetails(null);
    };

    const cancelEdit = () => {
        setEditingOrder(null);
    };

    return (
        <div className="animated">
            <div className="big-toggle">
                <button className={`big-btn ${nalogaType === "plakati" ? "active" : ""}`} onClick={() => {setNalogaType("plakati"); setEditingOrder(null);}}>
                    🖼️ Delovne Naloge: PLAKATI / NALEPKE
                </button>
                <button className={`big-btn ${nalogaType === "avti" ? "active" : ""}`} onClick={() => {setNalogaType("avti"); setEditingOrder(null);}}>
                    🚗 Delovne Naloge: AVTI / WRAP
                </button>
            </div>

            <div className="grid-2">
                <div>
                    {nalogaType === "plakati" ? (
                        <FormPlakati lots={lots} produkti={produkti} reload={reload} onMsg={onMsg} editOrder={editingOrder} clearEdit={cancelEdit} />
                    ) : (
                        <FormAvti lots={lots} produkti={produkti} reload={reload} onMsg={onMsg} editOrder={editingOrder} clearEdit={cancelEdit} />
                    )}
                </div>
                <div>
                    <section className="card">
                        <h2>Zgodovina Nalog ({nalogaType === "plakati" ? "Plakati" : "Avti"})</h2>
                        <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                            {activeList.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Ni nalog.</p>}
                            
                            {activeList.map(n => (
                                <div key={n.id} className="list-item" style={{ cursor: "pointer", transition: '0.2s' }} onClick={() => setViewingDetails(n)}>
                                    <div className="list-item-header">
                                        <h3 style={{ margin: 0 }}>{n.naziv_projekta || n.opravljena_storitev}</h3>
                                        <small>{new Date(n.datum).toLocaleDateString()}</small>
                                    </div>
                                    <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>{n.opis || "Brez opisa."}</p>
                                    
                                    <div style={{ background: 'rgba(255,255,255,0.7)', padding: '0.5rem', borderRadius: '8px' }}>
                                        <strong style={{ fontSize: '0.8rem' }}>Porabljeni LOTi: {n.materiali?.length || 0}</strong>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            {/* MODAL ZA PODROBNOSTI */}
            {viewingDetails && (
                <div className="modal-overlay" onClick={() => setViewingDetails(null)}>
                    <div className="modal-content animated" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 style={{margin:0}}>{viewingDetails.naziv_projekta || viewingDetails.opravljena_storitev}</h2>
                            <button className="modal-close" onClick={() => setViewingDetails(null)}>&times;</button>
                        </div>
                        
                        <div style={{ marginBottom: "1.5rem" }}>
                            <strong>ID Naloge:</strong> {viewingDetails.id} <br />
                            <strong>Datum:</strong> {new Date(viewingDetails.datum).toLocaleString()} <br />
                            <strong>Opis:</strong> {viewingDetails.opis || "/"}
                        </div>

                        {viewingDetails.narocnik && (
                            <div style={{ marginBottom: "1.5rem", background: "rgba(0,0,0,0.03)", padding: "1rem", borderRadius: "12px" }}>
                                <h3>Naročnik</h3>
                                <strong>Ime:</strong> {viewingDetails.narocnik.ime_narocnika} <br/>
                                <strong>Kontakt:</strong> {viewingDetails.narocnik.email_narocnika} / {viewingDetails.narocnik.gsm_stevilka}
                            </div>
                        )}

                        {viewingDetails.vozilo && (
                            <div style={{ marginBottom: "1.5rem", background: "rgba(0,0,0,0.03)", padding: "1rem", borderRadius: "12px" }}>
                                <h3>Podatki Vozila & Lastnika</h3>
                                <strong>Znamka:</strong> {viewingDetails.vozilo.znamka_vozila} <br/>
                                <strong>Registrska št.:</strong> {viewingDetails.vozilo.registrska_stevilka} <br/>
                                <strong>Šasija:</strong> {viewingDetails.vozilo.stevilka_sasije} <br/>
                                <hr style={{margin:"0.5rem 0", borderColor: "rgba(0,0,0,0.1)"}}/>
                                <strong>Lastnik:</strong> {viewingDetails.lastnik_vozila?.ime_lastnika} ({viewingDetails.lastnik_vozila?.email_lastnika})
                            </div>
                        )}

                        {viewingDetails.poskodba_vozila && viewingDetails.poskodba_vozila.length > 0 && (
                            <div style={{ marginBottom: "1.5rem" }}>
                                <h3>Poškodbe vozila (Checklist)</h3>
                                <ul>
                                    {viewingDetails.poskodba_vozila.map((p, i) => <li key={i}>{p}</li>)}
                                </ul>
                            </div>
                        )}

                        <div style={{ marginBottom: "1.5rem" }}>
                            <h3>Poraba Materiala</h3>
                            <ul style={{ paddingLeft: '1.5rem' }}>
                                {viewingDetails.materiali?.map((mat, i) => {
                                    const lot = lots.find(l => Number(l.id) === Number(mat.lot_produkt_id));
                                    const prod = lot ? produkti.find(p => Number(p.id) === Number(lot.produkt_id)) : null;
                                    return (
                                        <li key={i}>
                                            <strong>{lot ? lot.lot_stevilka : `Neznan LOT (${mat.lot_produkt_id})`}</strong> 
                                            {prod && ` - ${prod.naziv_produkta}`} — {mat.kolicina_uporabljenega_produkta} TM
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        {viewingDetails.slike && viewingDetails.slike.length > 0 && (
                            <div>
                                <h3>Povezava do Slike</h3>
                                <a href={viewingDetails.slike[0]} target="_blank" rel="noreferrer" style={{color: "var(--accent-color)"}}>{viewingDetails.slike[0]}</a>
                            </div>
                        )}

                        <div style={{ marginTop: "2rem", display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                            <button className="btn-primary" style={{ background: "#f59e0b", width: "auto" }} onClick={() => {
                                startEdit(viewingDetails);
                            }}>Uredi Nalogo</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function FormPlakati({ lots, produkti, reload, onMsg, editOrder, clearEdit }) {
    const defaults = { naziv_projekta: "", opis: "", ime_narocnika: "", gsm: "", email: "", slike: "" };
    const [form, setForm] = useState(defaults);
    const [mats, setMats] = useState([{ lot_produkt_id: "", kolicina_uporabljenega_produkta: "" }]);

    useEffect(() => {
        if (editOrder) {
            setForm({
                naziv_projekta: editOrder.naziv_projekta || "",
                opis: editOrder.opis || "",
                ime_narocnika: editOrder.narocnik?.ime_narocnika || "",
                gsm: editOrder.narocnik?.gsm_stevilka || "",
                email: editOrder.narocnik?.email_narocnika || "",
                slike: editOrder.slike?.[0] || ""
            });
            setMats(editOrder.materiali && editOrder.materiali.length > 0 ? editOrder.materiali : [{ lot_produkt_id: "", kolicina_uporabljenega_produkta: "" }]);
        } else {
            setForm(defaults);
            setMats([{ lot_produkt_id: "", kolicina_uporabljenega_produkta: "" }]);
        }
    }, [editOrder]);

    const addMatRow = () => setMats([...mats, { lot_produkt_id: "", kolicina_uporabljenega_produkta: "" }]);

    const submit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                naziv_projekta: form.naziv_projekta,
                opis: form.opis,
                narocnik: { ime_narocnika: form.ime_narocnika, gsm_stevilka: form.gsm, email_narocnika: form.email },
                slike: form.slike ? [form.slike] : [],
                materiali: mats.filter(m => m.lot_produkt_id !== "")
            };
            
            if (editOrder) {
                await updateNalogaPlakati(editOrder.id, payload);
                onMsg("Delovna naloga uspešno POSODOBLJENA! (Kreirani Storno vnosi)");
                clearEdit();
            } else {
                await createNalogaPlakati(payload);
                onMsg("Nova delovna naloga uspešno posneta!");
            }
            reload();
        } catch (err) { onMsg(err.message, true); }
    };

    return (
        <section className={`card ${editOrder ? "animated" : ""}`} style={editOrder ? { border: '2px solid #f59e0b', boxShadow: '0 0 20px rgba(245, 158, 11, 0.2)'} : {}}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{margin:0}}>{editOrder ? "✏️ Urejanje Naloge" : "Nov Delovni Nalog - Plakati"}</h2>
                {editOrder && <button onClick={clearEdit} style={{ background: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer"}}>Prekliči</button>}
            </div>
            
            <form onSubmit={submit}>
                <div className="form-group">
                    <label>Naziv Projekta</label>
                    <input required value={form.naziv_projekta} onChange={e => setForm({...form, naziv_projekta: e.target.value})} placeholder="Npr. 200 Nalepk za Event" />
                </div>
                <div className="form-group">
                    <label>Opis storitve</label>
                    <textarea value={form.opis} onChange={e => setForm({...form, opis: e.target.value})} rows="2"></textarea>
                </div>
                <div className="grid-2">
                    <div className="form-group">
                        <label>Naročnik (Ime)</label>
                        <input required value={form.ime_narocnika} onChange={e => setForm({...form, ime_narocnika: e.target.value})} />
                    </div>
                    <div className="form-group">
                        <label>Naročnik (Email / GSM)</label>
                        <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                    </div>
                </div>
                
                <h3 style={{ margin: "1rem 0 0.5rem" }}>Poraba Materiala</h3>
                {mats.map((m, idx) => (
                    <div key={idx} className="grid-2" style={{ gap: "1rem", marginBottom: "0.5rem", padding: "1rem", background: "rgba(0,0,0,0.03)", borderRadius: "12px" }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Izberi LOT</label>
                            <MaterialSelect 
                                value={m.lot_produkt_id} 
                                onChange={val => { const newMats = [...mats]; newMats[idx].lot_produkt_id = val; setMats(newMats); }} 
                                lots={lots} 
                                produkti={produkti} 
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Poraba (TM)</label>
                            <input required type="number" step="0.1" value={m.kolicina_uporabljenega_produkta} onChange={e => {
                                const newMats = [...mats]; newMats[idx].kolicina_uporabljenega_produkta = e.target.value; setMats(newMats);
                            }} />
                        </div>
                    </div>
                ))}
                <button type="button" onClick={addMatRow} style={{ background: "transparent", color: "var(--accent-color)", border: "none", cursor: "pointer", fontWeight: "600", marginBottom: "1.5rem" }}>+ Dodaj material</button>

                <div className="form-group">
                    <label>URL končne slike (opcijsko)</label>
                    <input value={form.slike} onChange={e => setForm({...form, slike: e.target.value})} placeholder="https://..." />
                </div>
                
                <button type="submit" className="btn-primary" style={editOrder ? { background: '#f59e0b' } : {}}>
                    {editOrder ? "Posodobi Nalogo" : "Shrani Nalog"}
                </button>
            </form>
        </section>
    );
}

function FormAvti({ lots, produkti, reload, onMsg, editOrder, clearEdit }) {
    const defaults = { opravljena_storitev: "", opis: "", tablica: "", sasija: "", znamka: "", ime_lastnika: "", email: "", slike: "" };
    const [form, setForm] = useState(defaults);
    const [mats, setMats] = useState([{ lot_produkt_id: "", kolicina_uporabljenega_produkta: "" }]);
    const [poskodbe, setPoskodbe] = useState({});

    useEffect(() => {
        if (editOrder) {
            setForm({
                opravljena_storitev: editOrder.opravljena_storitev || "",
                opis: editOrder.opis || "",
                tablica: editOrder.vozilo?.registrska_stevilka || "",
                sasija: editOrder.vozilo?.stevilka_sasije || "",
                znamka: editOrder.vozilo?.znamka_vozila || "",
                ime_lastnika: editOrder.lastnik_vozila?.ime_lastnika || "",
                email: editOrder.lastnik_vozila?.email_lastnika || "",
                slike: editOrder.slike?.[0] || ""
            });
            setMats(editOrder.materiali && editOrder.materiali.length > 0 ? editOrder.materiali : [{ lot_produkt_id: "", kolicina_uporabljenega_produkta: "" }]);
            
            const currentPoskodbe = {};
            (editOrder.poskodba_vozila || []).forEach(p => { currentPoskodbe[p] = true; });
            setPoskodbe(currentPoskodbe);
        } else {
            setForm(defaults);
            setMats([{ lot_produkt_id: "", kolicina_uporabljenega_produkta: "" }]);
            setPoskodbe({});
        }
    }, [editOrder]);

    const addMatRow = () => setMats([...mats, { lot_produkt_id: "", kolicina_uporabljenega_produkta: "" }]);

    const submit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                opravljena_storitev: form.opravljena_storitev,
                opis: form.opis,
                vozilo: { registrska_stevilka: form.tablica, stevilka_sasije: form.sasija, znamka_vozila: form.znamka },
                lastnik_vozila: { ime_lastnika: form.ime_lastnika, email_lastnika: form.email },
                slike: form.slike ? [form.slike] : [],
                materiali: mats.filter(m => m.lot_produkt_id !== ""),
                poskodba_vozila: Object.keys(poskodbe).filter(k => poskodbe[k])
            };
            
            if (editOrder) {
                await updateNalogaAvti(editOrder.id, payload);
                onMsg("Delovna naloga (Avti) uspešno POSODOBLJENA! (Kreirani Storno vnosi)");
                clearEdit();
            } else {
                await createNalogaAvti(payload);
                onMsg("Delovna naloga (Avti) posneta!");
            }
            reload();
        } catch (err) { onMsg(err.message, true); }
    };

    return (
        <section className={`card ${editOrder ? "animated" : ""}`} style={editOrder ? { border: '2px solid #f59e0b', boxShadow: '0 0 20px rgba(245, 158, 11, 0.2)'} : {}}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{margin:0}}>{editOrder ? "✏️ Urejanje Naloge" : "Nov Delovni Nalog - Avtomobili"}</h2>
                {editOrder && <button onClick={clearEdit} style={{ background: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer"}}>Prekliči</button>}
            </div>
            <form onSubmit={submit}>
                <div className="form-group">
                    <label>Opravljena Storitev</label>
                    <input required value={form.opravljena_storitev} onChange={e => setForm({...form, opravljena_storitev: e.target.value})} placeholder="Npr. Full Wrap" />
                </div>
                <div className="grid-2" style={{ gap: '1rem' }}>
                    <div className="form-group"><label>Znamka Vozila</label><input required value={form.znamka} onChange={e => setForm({...form, znamka: e.target.value})} /></div>
                    <div className="form-group"><label>Registrska Št.</label><input value={form.tablica} onChange={e => setForm({...form, tablica: e.target.value})} /></div>
                </div>
                <div className="form-group"><label>Številka Šasije (VIN)</label><input required value={form.sasija} onChange={e => setForm({...form, sasija: e.target.value})} /></div>
                <div className="grid-2" style={{ gap: '1rem' }}>
                    <div className="form-group"><label>Ime lastnika</label><input required value={form.ime_lastnika} onChange={e => setForm({...form, ime_lastnika: e.target.value})} /></div>
                    <div className="form-group"><label>Kontakt (Email/GSM)</label><input value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                </div>
                
                <h3 style={{ margin: "1rem 0 0.5rem", fontSize: "1.1rem" }}>Preverjanje poškodb pred začetkom</h3>
                <div className="checklist" style={{ marginBottom: "1.5rem" }}>
                    {POSKODBE_V_AVTI.map(p => (
                        <label key={p} className="checkbox-label">
                            <input type="checkbox" checked={!!poskodbe[p]} onChange={e => setPoskodbe({...poskodbe, [p]: e.target.checked})} />
                            {p}
                        </label>
                    ))}
                </div>

                <h3 style={{ margin: "1rem 0 0.5rem" }}>Poraba Materiala</h3>
                {mats.map((m, idx) => (
                    <div key={idx} className="grid-2" style={{ gap: "1rem", marginBottom: "0.5rem", padding: "1rem", background: "rgba(0,0,0,0.03)", borderRadius: "12px" }}>
                         <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Izberi LOT</label>
                            <MaterialSelect 
                                value={m.lot_produkt_id} 
                                onChange={val => { const newMats = [...mats]; newMats[idx].lot_produkt_id = val; setMats(newMats); }} 
                                lots={lots} 
                                produkti={produkti} 
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Poraba (TM)</label>
                            <input required type="number" step="0.1" value={m.kolicina_uporabljenega_produkta} onChange={e => {
                                const newMats = [...mats]; newMats[idx].kolicina_uporabljenega_produkta = e.target.value; setMats(newMats);
                            }} />
                        </div>
                    </div>
                ))}
                <button type="button" onClick={addMatRow} style={{ background: "transparent", color: "var(--accent-color)", border: "none", cursor: "pointer", fontWeight: "600", marginBottom: "1.5rem" }}>+ Dodaj material</button>

                <div className="form-group">
                    <label>Slika poškodbe / končna (URL)</label>
                    <input value={form.slike} onChange={e => setForm({...form, slike: e.target.value})} placeholder="https://..." />
                </div>
                
                <button type="submit" className="btn-primary" style={editOrder ? { background: '#f59e0b' } : {}}>
                    {editOrder ? "Posodobi Nalogo" : "Shrani Nalog"}
                </button>
            </form>
        </section>
    );
}


// ----------------------------------------------------------------------------
// VIEW: EVIDENCA ZALOGE (Timeline)
// ----------------------------------------------------------------------------
function EvidencaView({ evidenca }) {
    return (
        <div className="animated">
            <section className="card">
                <h2>Kartica / Evidenca Zaloge</h2>
                <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
                    Samodejni zapisi prevzemov in prodaje s pripadajočimi cenami.
                </p>
                <div style={{ overflowX: "auto" }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Datum</th>
                                <th>Tip</th>
                                <th>Produkt</th>
                                <th>Št. Računa</th>
                                <th>Količina</th>
                                <th>Nab. Cena</th>
                                <th>Skupaj Strosek</th>
                            </tr>
                        </thead>
                        <tbody>
                            {evidenca.map(log => {
                                const isPositive = log.tip === "prevzem" || log.tip === "storno";
                                const cost = log.kolicina_tm * log.nabavna_cena;
                                
                                let badgeColor = "var(--text-muted)";
                                let badgeBg = "rgba(0,0,0,0.1)";
                                if (log.tip === "prevzem") { badgeColor = "var(--success)"; badgeBg = "rgba(16, 185, 129, 0.1)"; }
                                if (log.tip === "prodaja") { badgeColor = "var(--danger)"; badgeBg = "rgba(239, 68, 68, 0.1)"; }
                                if (log.tip === "storno") { badgeColor = "#f59e0b"; badgeBg = "rgba(245, 158, 11, 0.1)"; }

                                return (
                                    <tr key={log.id}>
                                        <td style={{ whiteSpace: "nowrap" }}>{new Date(log.datum).toLocaleString()}</td>
                                        <td>
                                            <span className="type-badge" style={{ color: badgeColor, background: badgeBg }}>
                                                {log.tip}
                                            </span>
                                        </td>
                                        <td>{log.naziv_produkta} <br/><small style={{color:'var(--text-muted)'}}>LOT-ID: {log.lot_produkt_id}</small></td>
                                        <td>{log.stevilka_racuna || "/"}</td>
                                        <td style={{ color: isPositive ? "var(--success)" : "var(--danger)" }}>
                                            <strong>{isPositive ? "+" : "-"}{log.kolicina_tm} tm</strong>
                                        </td>
                                        <td>{log.nabavna_cena} €/tm</td>
                                        <td>{cost.toFixed(2)} €</td>
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

export default App;