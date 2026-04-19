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
  const [activeTab, setActiveTab] = useState("zaloga");
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
          <button className={`tab-btn ${activeTab === "zaloga" ? "active" : ""}`} onClick={() => setActiveTab("zaloga")}>
            Zaloga in Produkati
          </button>
          <button className={`tab-btn ${activeTab === "naloge" ? "active" : ""}`} onClick={() => setActiveTab("naloge")}>
            Kreiranje Nalog
          </button>
          <button className={`tab-btn ${activeTab === "evid_nalog" ? "active" : ""}`} onClick={() => setActiveTab("evid_nalog")}>
            Evidenca Nalog
          </button>
          <button className={`tab-btn ${activeTab === "evidenca" ? "active" : ""}`} onClick={() => setActiveTab("evidenca")}>
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
            <NalogeKreiranjeView lots={lots} produkti={produkti} reload={loadData} onMsg={displayMessage} />
          )}
          {activeTab === "evid_nalog" && (
            <NalogeEvidencaView lots={lots} produkti={produkti} plakati={plakati} avti={avti} reload={loadData} onMsg={displayMessage} />
          )}
          {activeTab === "evidenca" && (
            <EvidencaView evidenca={evidenca} produkti={produkti} lots={lots} />
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
    const [prodForm, setProdForm] = useState({ koda: "", naziv_produkta: "", prodajna_cena: "", nabavna_cena: "", tip: "folija" });
    const [lotForm, setLotForm] = useState({ produkt_id: "", lot_stevilka: "", kolicina_tm: "", dobavitelj: "", stevilka_racuna: "", nabavna_cena: "", prodajna_cena: "", datum_prevzema: "" });
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
        } catch (err) { onMsg(err.message, true); }
    };

    const handleAddLot = async (e) => {
        e.preventDefault();
        try {
            await addLotProdukt(lotForm);
            onMsg("LOT prevzem uspešen. Kreirana evidenca.");
            setLotForm({ produkt_id: "", lot_stevilka: "", kolicina_tm: "", dobavitelj: "", stevilka_racuna: "", nabavna_cena: "", prodajna_cena: "", datum_prevzema: "" });
            reload();
        } catch (err) { onMsg(err.message, true); }
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

    return (
        <div className="grid-2 animated">
            <div>
                <section className="card">
                    <h2>Katalog Produktov</h2>
                    <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '2rem' }}>
                        {produkti.map(p => {
                            const isExpanded = expandedProdId === p.id;
                            const prodLots = lots.filter(l => Number(l.produkt_id) === Number(p.id));
                            
                            return (
                                <div key={p.id} className="list-item" style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => setExpandedProdId(isExpanded ? null : p.id)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <strong>{p.koda} - {p.naziv_produkta}</strong>
                                            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tip: {p.tip}</span>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <strong>Skupaj: {p.kolicina_tm?.toFixed(1) || 0} {p.tip === 'adr oprema' ? 'kos' : 'tm'}</strong>
                                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.2rem' }}>Zaloga: {p.vrednost_zaloge?.toFixed(2) || 0} €</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>{isExpanded ? '▲' : '▼'}</div>
                                        </div>
                                    </div>
                                    
                                    {isExpanded && (
                                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }} onClick={e => e.stopPropagation()}>
                                            {(prodLots.length === 0) ? <p style={{fontSize: '0.85rem'}}>Ni aktivnih LOTov.</p> : (
                                                <table style={{ margin: 0, fontSize: '0.85rem' }}>
                                                    <thead>
                                                        <tr>
                                                            <th style={{padding: '0.5rem'}}>LOT Številka</th>
                                                            <th style={{padding: '0.5rem'}}>Ostanek</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {prodLots.map(l => (
                                                            <tr key={l.id}>
                                                                <td style={{padding: '0.5rem'}}>{l.lot_stevilka}</td>
                                                                <td style={{padding: '0.5rem'}}>{l.kolicina_tm} {p.tip === 'adr oprema' ? 'kos' : 'tm'}</td>
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
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Dodaj nov produkt v bazo</h3>
                        <div className="grid-2" style={{ gap: "1rem" }}>
                            <div className="form-group">
                                <label>Koda produkta</label>
                                <input required value={prodForm.koda} onChange={e => setProdForm({...prodForm, koda: e.target.value})} placeholder="Npr. ORC-651" />
                            </div>
                            <div className="form-group">
                                <label>Tip produkta</label>
                                <select required value={prodForm.tip} onChange={e => setProdForm({...prodForm, tip: e.target.value})}>
                                    <option value="folija">Folija</option>
                                    <option value="adr oprema">ADR Oprema</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Naziv produkta</label>
                            <input required value={prodForm.naziv_produkta} onChange={e => setProdForm({...prodForm, naziv_produkta: e.target.value})} placeholder="Oracal 651 Mat" />
                        </div>
                        <div className="grid-2" style={{ gap: "1rem" }}>
                            <div className="form-group">
                                <label>Izhodiščna nabavna cena (€/enota)</label>
                                <input type="number" step="0.01" required value={prodForm.nabavna_cena} onChange={e => setProdForm({...prodForm, nabavna_cena: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Izhodiščna prodajna cena (€/enota)</label>
                                <input type="number" step="0.01" required value={prodForm.prodajna_cena} onChange={e => setProdForm({...prodForm, prodajna_cena: e.target.value})} />
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
                            <div style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--accent-color)', fontWeight: 600 }}>Izbran: {activeSelectedProd.naziv_produkta}</p>
                            </div>
                        )}

                        <div className="grid-2" style={{ gap: "1rem" }}>
                            <div className="form-group">
                                <label>LOT Številka / Oznaka role</label>
                                <input required value={lotForm.lot_stevilka} onChange={e => setLotForm({...lotForm, lot_stevilka: e.target.value})} placeholder="Npr. BATCH-A1" />
                            </div>
                            <div className="form-group">
                                <label>{isAdr ? 'Količina izdelkov (Kosov)' : 'Količina v tekočih metrih (TM)'}</label>
                                <input required type="number" step="0.1" value={lotForm.kolicina_tm} onChange={e => setLotForm({...lotForm, kolicina_tm: e.target.value})} placeholder="Npr. 50" />
                            </div>
                        </div>

                        <div className="grid-2" style={{ gap: "1rem" }}>
                            <div className="form-group">
                                <label>Nabavna Cena za ta LOT (€)</label>
                                <input type="number" step="0.01" value={lotForm.nabavna_cena} onChange={e => setLotForm({...lotForm, nabavna_cena: e.target.value})} placeholder="Prevzeta iz produkta" />
                            </div>
                            <div className="form-group">
                                <label>Prodajna Cena za ta LOT (€)</label>
                                <input type="number" step="0.01" value={lotForm.prodajna_cena} onChange={e => setLotForm({...lotForm, prodajna_cena: e.target.value})} placeholder="Prevzeta iz produkta" />
                            </div>
                        </div>

                        <div className="grid-2" style={{ gap: "1rem" }}>
                            <div className="form-group">
                                <label>Datum Prevzema</label>
                                <input type="datetime-local" value={lotForm.datum_prevzema} onChange={e => setLotForm({...lotForm, datum_prevzema: e.target.value})} />
                                <small style={{display:'block', color:'var(--text-muted)', marginTop:'0.25rem'}}>Pusti prazno za ZDAJ</small>
                            </div>
                            <div className="form-group">
                                <label>Dobavitelj in Št. Računa</label>
                                <input style={{marginBottom: '0.5rem'}} value={lotForm.dobavitelj} onChange={e => setLotForm({...lotForm, dobavitelj: e.target.value})} placeholder="Dobavitelj" />
                                <input value={lotForm.stevilka_racuna} onChange={e => setLotForm({...lotForm, stevilka_racuna: e.target.value})} placeholder="Št. računa" />
                            </div>
                        </div>
                        <button type="submit" className="btn-primary">Sprejmi in kreiraj prevzem</button>
                    </form>
                </section>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------------
// VIEW: KREIRANJE NALOG
// ----------------------------------------------------------------------------
function MaterialSelect({ value, onChange, lots, produkti }) {
    const [search, setSearch] = useState("");
    
    const enrichedLots = useMemo(() => lots.map(l => {
        const p = produkti.find(prod => Number(prod.id) === Number(l.produkt_id));
        return { ...l, naziv_produkta: p ? p.naziv_produkta : 'Neznan produkt', tip: p ? p.tip : 'folija' };
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
                        {l.lot_stevilka} - {l.naziv_produkta} (na voljo: {l.kolicina_tm} {l.tip === 'adr oprema' ? 'kos' : 'tm'})
                    </option>
                ))}
            </select>
        </div>
    );
}

function NalogeKreiranjeView({ lots, produkti, reload, onMsg }) {
    const [nalogaType, setNalogaType] = useState("plakati");

    return (
        <div className="animated">
            <div className="big-toggle">
                <button className={`big-btn ${nalogaType === "plakati" ? "active" : ""}`} onClick={() => setNalogaType("plakati")}>
                    🖼️ Nova Naloga: PLAKATI / NALEPKE
                </button>
                <button className={`big-btn ${nalogaType === "avti" ? "active" : ""}`} onClick={() => setNalogaType("avti")}>
                    🚗 Nova Naloga: AVTI / WRAP
                </button>
            </div>

            <div>
                {nalogaType === "plakati" ? (
                    <FormPlakati lots={lots} produkti={produkti} reload={reload} onMsg={onMsg} editOrder={null} />
                ) : (
                    <FormAvti lots={lots} produkti={produkti} reload={reload} onMsg={onMsg} editOrder={null} />
                )}
            </div>
        </div>
    );
}

function FormPlakati({ lots, produkti, reload, onMsg, editOrder, clearEdit }) {
    const defaults = { status: "v pripravi", naziv_projekta: "", opis: "", ime_narocnika: "", gsm: "", email: "", slike: "" };
    const [form, setForm] = useState(defaults);
    const [mats, setMats] = useState([{ lot_produkt_id: "", kolicina_uporabljenega_produkta: "" }]);

    useEffect(() => {
        if (editOrder) {
            setForm({
                status: editOrder.status || "v pripravi",
                naziv_projekta: editOrder.naziv_projekta || "",
                opis: editOrder.opis || "",
                ime_narocnika: editOrder.narocnik?.ime_narocnika || "",
                gsm: editOrder.narocnik?.gsm_stevilka || "",
                email: editOrder.narocnik?.email_narocnika || "",
                slike: editOrder.slike?.[0] || ""
            });
            setMats(editOrder.materiali && editOrder.materiali.length > 0 ? editOrder.materiali : []);
        } else {
            setForm(defaults);
            setMats([{ lot_produkt_id: "", kolicina_uporabljenega_produkta: "" }]);
        }
    }, [editOrder]);

    const addMatRow = () => setMats([...mats, { lot_produkt_id: "", kolicina_uporabljenega_produkta: "" }]);
    const removeMatRow = (idx) => { const n = [...mats]; n.splice(idx, 1); setMats(n); };

    const submit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                status: form.status,
                naziv_projekta: form.naziv_projekta,
                opis: form.opis,
                narocnik: { ime_narocnika: form.ime_narocnika, gsm_stevilka: form.gsm, email_narocnika: form.email },
                slike: form.slike ? [form.slike] : [],
                materiali: mats.filter(m => m.lot_produkt_id !== "")
            };
            
            if (editOrder) {
                await updateNalogaPlakati(editOrder.id, payload);
                onMsg("Naloga posodobljena!");
                clearEdit();
            } else {
                await createNalogaPlakati(payload);
                onMsg("Naloga kreirana!");
                setForm(defaults);
                setMats([{ lot_produkt_id: "", kolicina_uporabljenega_produkta: "" }]);
            }
            reload();
        } catch (err) { onMsg(err.message, true); }
    };

    return (
        <section className={`card ${editOrder ? "animated" : ""}`} style={editOrder ? { border: '2px solid #f59e0b', boxShadow: '0 0 20px rgba(245, 158, 11, 0.2)'} : {}}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{margin:0}}>{editOrder ? "✏️ Urejanje Naloge" : "Kreiraj Plakat Nalogo"}</h2>
                {editOrder && <button onClick={clearEdit} style={{ background: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer"}}>Prekliči</button>}
            </div>
            
            <form onSubmit={submit}>
                <div className="grid-2" style={{ gap: "1rem" }}>
                    <div className="form-group">
                        <label>Status</label>
                        <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                            <option value="v pripravi">V pripravi</option>
                            <option value="v izdelavi">V izdelavi</option>
                            <option value="končana">Končana</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Naziv Projekta</label>
                        <input required value={form.naziv_projekta} onChange={e => setForm({...form, naziv_projekta: e.target.value})} placeholder="Npr. 200 Nalepk za Event" />
                    </div>
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
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: "1rem 0 0.5rem" }}>
                    <h3 style={{ margin: 0 }}>Poraba Materiala</h3>
                    <button type="button" onClick={addMatRow} style={{ background: "transparent", color: "var(--accent-color)", border: "none", cursor: "pointer", fontWeight: "600" }}>+ Dodaj vrstico</button>
                </div>
                
                {mats.map((m, idx) => {
                    const selLot = lots.find(l=>Number(l.id) === Number(m.lot_produkt_id));
                    const selProd = selLot ? produkti.find(p=>Number(p.id) === Number(selLot.produkt_id)) : null;
                    const isAdr = selProd?.tip === 'adr oprema';

                    return (
                    <div key={idx} style={{ marginBottom: "0.5rem", padding: "1rem", background: "rgba(0,0,0,0.03)", borderRadius: "12px", position: "relative" }}>
                        <button type="button" onClick={()=>removeMatRow(idx)} style={{ position:'absolute', top: '10px', right: '10px', background:'var(--danger)', color:'white', border:'none', borderRadius:'50%', width:'24px', height:'24px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem' }}>-</button>
                        <div className="grid-2" style={{ gap: "1rem" }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>Izberi LOT</label>
                                <MaterialSelect value={m.lot_produkt_id} onChange={val => { const newMats = [...mats]; newMats[idx].lot_produkt_id = val; setMats(newMats); }} lots={lots} produkti={produkti} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>Poraba ({isAdr ? 'kos' : 'TM'})</label>
                                <input required type="number" step="0.1" value={m.kolicina_uporabljenega_produkta} onChange={e => {
                                    const newMats = [...mats]; newMats[idx].kolicina_uporabljenega_produkta = e.target.value; setMats(newMats);
                                }} />
                            </div>
                        </div>
                    </div>
                )})}
                {mats.length === 0 && <p style={{color:'var(--text-muted)', fontSize:'0.9rem', marginBottom:'1rem'}}>Brez materialov.</p>}

                <div className="form-group">
                    <label>URL končne slike (opcijsko)</label>
                    <input value={form.slike} onChange={e => setForm({...form, slike: e.target.value})} placeholder="https://..." />
                </div>
                
                <button type="submit" className="btn-primary" style={editOrder ? { background: '#f59e0b' } : {}}>
                    {editOrder ? "Posodobi Nalogo" : "Ustvari Nalogo"}
                </button>
            </form>
        </section>
    );
}

function FormAvti({ lots, produkti, reload, onMsg, editOrder, clearEdit }) {
    const defaults = { status: "v pripravi", opravljena_storitev: "", opis: "", tablica: "", sasija: "", znamka: "", ime_lastnika: "", email: "", slike: "" };
    const [form, setForm] = useState(defaults);
    const [mats, setMats] = useState([{ lot_produkt_id: "", kolicina_uporabljenega_produkta: "" }]);
    const [poskodbe, setPoskodbe] = useState({});

    useEffect(() => {
        if (editOrder) {
            setForm({
                status: editOrder.status || "v pripravi",
                opravljena_storitev: editOrder.opravljena_storitev || "",
                opis: editOrder.opis || "",
                tablica: editOrder.vozilo?.registrska_stevilka || "",
                sasija: editOrder.vozilo?.stevilka_sasije || "",
                znamka: editOrder.vozilo?.znamka_vozila || "",
                ime_lastnika: editOrder.lastnik_vozila?.ime_lastnika || "",
                email: editOrder.lastnik_vozila?.email_lastnika || "",
                slike: editOrder.slike?.[0] || ""
            });
            setMats(editOrder.materiali && editOrder.materiali.length > 0 ? editOrder.materiali : []);
            
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
    const removeMatRow = (idx) => { const n = [...mats]; n.splice(idx, 1); setMats(n); };

    const submit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                status: form.status,
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
                onMsg("Naloga uspešno posodobljena.");
                clearEdit();
            } else {
                await createNalogaAvti(payload);
                onMsg("Naloga uspešno kreirana.");
                setForm(defaults);
                setMats([{ lot_produkt_id: "", kolicina_uporabljenega_produkta: "" }]);
                setPoskodbe({});
            }
            reload();
        } catch (err) { onMsg(err.message, true); }
    };

    return (
        <section className={`card ${editOrder ? "animated" : ""}`} style={editOrder ? { border: '2px solid #f59e0b', boxShadow: '0 0 20px rgba(245, 158, 11, 0.2)'} : {}}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{margin:0}}>{editOrder ? "✏️ Urejanje Naloge" : "Kreiraj Avto Nalogo"}</h2>
                {editOrder && <button onClick={clearEdit} style={{ background: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer"}}>Prekliči</button>}
            </div>
            <form onSubmit={submit}>
                <div className="grid-2" style={{ gap: '1rem' }}>
                    <div className="form-group">
                        <label>Status</label>
                        <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                            <option value="v pripravi">V pripravi</option>
                            <option value="v izdelavi">V izdelavi</option>
                            <option value="končana">Končana</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Opravljena Storitev</label>
                        <input required value={form.opravljena_storitev} onChange={e => setForm({...form, opravljena_storitev: e.target.value})} placeholder="Npr. Full Wrap" />
                    </div>
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

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: "1rem 0 0.5rem" }}>
                    <h3 style={{ margin: 0 }}>Poraba Materiala</h3>
                    <button type="button" onClick={addMatRow} style={{ background: "transparent", color: "var(--accent-color)", border: "none", cursor: "pointer", fontWeight: "600" }}>+ Dodaj vrstico</button>
                </div>
                {mats.map((m, idx) => {
                    const selLot = lots.find(l=>Number(l.id) === Number(m.lot_produkt_id));
                    const selProd = selLot ? produkti.find(p=>Number(p.id) === Number(selLot.produkt_id)) : null;
                    const isAdr = selProd?.tip === 'adr oprema';

                    return (
                    <div key={idx} style={{ marginBottom: "0.5rem", padding: "1rem", background: "rgba(0,0,0,0.03)", borderRadius: "12px", position: "relative" }}>
                        <button type="button" onClick={()=>removeMatRow(idx)} style={{ position:'absolute', top: '10px', right: '10px', background:'var(--danger)', color:'white', border:'none', borderRadius:'50%', width:'24px', height:'24px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem' }}>-</button>
                        <div className="grid-2" style={{ gap: "1rem" }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>Izberi LOT</label>
                                <MaterialSelect value={m.lot_produkt_id} onChange={val => { const newMats = [...mats]; newMats[idx].lot_produkt_id = val; setMats(newMats); }} lots={lots} produkti={produkti} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label>Poraba ({isAdr ? 'kos' : 'TM'})</label>
                                <input required type="number" step="0.1" value={m.kolicina_uporabljenega_produkta} onChange={e => {
                                    const newMats = [...mats]; newMats[idx].kolicina_uporabljenega_produkta = e.target.value; setMats(newMats);
                                }} />
                            </div>
                        </div>
                    </div>
                )})}
                {mats.length === 0 && <p style={{color:'var(--text-muted)', fontSize:'0.9rem', marginBottom:'1rem'}}>Brez materialov.</p>}

                <div className="form-group">
                    <label>Slika poškodbe / končna (URL)</label>
                    <input value={form.slike} onChange={e => setForm({...form, slike: e.target.value})} placeholder="https://..." />
                </div>
                
                <button type="submit" className="btn-primary" style={editOrder ? { background: '#f59e0b' } : {}}>
                    {editOrder ? "Posodobi Nalogo" : "Ustvari Nalogo"}
                </button>
            </form>
        </section>
    );
}

// ----------------------------------------------------------------------------
// VIEW: EVIDENCA NALOG (History with Modals & Edits)
// ----------------------------------------------------------------------------
function NalogeEvidencaView({ lots, produkti, plakati, avti, reload, onMsg }) {
    const [nalogaType, setNalogaType] = useState("plakati");
    const [editingOrder, setEditingOrder] = useState(null);
    const [viewingDetails, setViewingDetails] = useState(null);
    const [search, setSearch] = useState("");

    const activeList = nalogaType === "plakati" ? plakati : avti;
    
    // Filter by name, status, or vehicle details (for cars)
    const filteredList = activeList.filter(n => {
        if (!search) return true;
        const srt = search.toLowerCase();
        const primary = (n.naziv_projekta || n.opravljena_storitev || "").toLowerCase();
        const stat = (n.status || "").toLowerCase();
        const tablica = (n.vozilo?.registrska_stevilka || "").toLowerCase();
        const sasija = (n.vozilo?.stevilka_sasije || "").toLowerCase();
        
        return primary.includes(srt) || stat.includes(srt) || tablica.includes(srt) || sasija.includes(srt);
    });

    const startEdit = (order) => {
        setEditingOrder(order);
        setViewingDetails(null);
    };

    return (
        <div className="animated">
            <div className="big-toggle">
                <button className={`big-btn ${nalogaType === "plakati" ? "active" : ""}`} onClick={() => {setNalogaType("plakati"); setEditingOrder(null);}}>
                    🖼️ Evidenca: PLAKATI
                </button>
                <button className={`big-btn ${nalogaType === "avti" ? "active" : ""}`} onClick={() => {setNalogaType("avti"); setEditingOrder(null);}}>
                    🚗 Evidenca: AVTI
                </button>
            </div>

            <div className="grid-2">
                <div>
                    <section className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{margin:0}}>Zgodovina Nalog</h2>
                            <input type="text" placeholder="Išči po imenu, statusu, tablici ali šasiji..." value={search} onChange={e=>setSearch(e.target.value)} style={{ width: '300px', padding: '0.4rem 0.8rem' }} />
                        </div>

                        <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                            {filteredList.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Ni nalog za prikaz.</p>}
                            
                            {filteredList.map(n => {
                                let stColor = "var(--text-muted)";
                                if(n.status==="v izdelavi") stColor = "var(--accent-color)";
                                if(n.status==="končana") stColor = "var(--success)";

                                return (
                                <div key={n.id} className="list-item" style={{ cursor: "pointer", transition: '0.2s', position: 'relative' }} onClick={() => setViewingDetails(n)}>
                                    <div style={{position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.05)', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, color: stColor, textTransform: 'uppercase'}}>{n.status}</div>
                                    <div className="list-item-header">
                                        <h3 style={{ margin: 0 }}>{n.naziv_projekta || n.opravljena_storitev}</h3>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Kreirano: {new Date(n.datum).toLocaleDateString()}</p>
                                    <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', marginTop: '0.5rem' }}>{n.opis || "Brez opisa."}</p>
                                    
                                    <div style={{ background: 'rgba(255,255,255,0.7)', padding: '0.5rem', borderRadius: '8px' }}>
                                        <strong style={{ fontSize: '0.8rem' }}>Porabljeni LOTi: {n.materiali?.length || 0}</strong>
                                    </div>
                                </div>
                            )})}
                        </div>
                    </section>
                </div>
                <div>
                    {editingOrder && (
                        nalogaType === "plakati" 
                        ? <FormPlakati lots={lots} produkti={produkti} reload={reload} onMsg={onMsg} editOrder={editingOrder} clearEdit={()=>setEditingOrder(null)} />
                        : <FormAvti lots={lots} produkti={produkti} reload={reload} onMsg={onMsg} editOrder={editingOrder} clearEdit={()=>setEditingOrder(null)} />
                    )}
                    {!editingOrder && (
                        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--text-muted)'}}>
                            <p>Izberi nalogo za ogled in posodabljanje.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL ZA PODROBNOSTI */}
            {viewingDetails && (
                <div className="modal-overlay" onClick={() => setViewingDetails(null)}>
                    <div className="modal-content animated" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2 style={{margin:0}}>{viewingDetails.naziv_projekta || viewingDetails.opravljena_storitev}</h2>
                                <span style={{fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase'}}>{viewingDetails.status}</span>
                            </div>
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
                                    const unit = prod?.tip === 'adr oprema' ? 'kos' : 'tm';
                                    return (
                                        <li key={i}>
                                            <strong>{lot ? lot.lot_stevilka : `Neznan LOT (${mat.lot_produkt_id})`}</strong> 
                                            {prod && ` - ${prod.naziv_produkta}`} — {mat.kolicina_uporabljenega_produkta} {unit}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        <div style={{ marginTop: "2rem", display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                            <button className="btn-primary" style={{ background: "#f59e0b", width: "auto" }} onClick={() => {
                                startEdit(viewingDetails);
                            }}>Uredi to Nalogo v Sidebar-u</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ----------------------------------------------------------------------------
// VIEW: EVIDENCA ZALOGE (Timeline s Filtri)
// ----------------------------------------------------------------------------
function EvidencaView({ evidenca, produkti, lots }) {
    const [filterType, setFilterType] = useState('vse'); // 'vse' | 'prevzem' | 'prodaja'
    const [filterProdType, setFilterProdType] = useState('vse'); // 'vse' | 'folija' | 'adr oprema'

    const enrichedEvidenca = useMemo(() => evidenca.map(log => {
        const lot = lots.find(l => Number(l.id) === Number(log.lot_produkt_id));
        const prod = lot ? produkti.find(p => Number(p.id) === Number(lot.produkt_id)) : null;

        return {
            ...log,
            tip_produkta: prod ? prod.tip : 'folija',
            lot_stevilka: lot ? lot.lot_stevilka : log.lot_produkt_id
        };
    }), [evidenca, lots, produkti]);

    const filtered = enrichedEvidenca.filter(log => {
        if (filterType !== 'vse' && log.tip !== filterType) return false;
        if (filterProdType !== 'vse' && log.tip_produkta !== filterProdType) return false;
        return true;
    });

    return (
        <div className="animated">
            <section className="card">
                <h2>Kartica / Evidenca Zaloge</h2>
                <div style={{ marginBottom: "1.5rem", display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                    
                    <div>
                        <span style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', display:'block', marginBottom:'0.5rem'}}>Tip Transakcije</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className={`tab-btn ${filterType==='vse' ? 'active' : ''}`} style={{padding:'0.4rem 1rem'}} onClick={()=>setFilterType('vse')}>VSE</button>
                            <button className={`tab-btn ${filterType==='prevzem' ? 'active' : ''}`} style={{padding:'0.4rem 1rem', ...(filterType==='prevzem' ? {background:'var(--success)', boxShadow:'none'} : {})}} onClick={()=>setFilterType('prevzem')}>Prevzemi (+)</button>
                            <button className={`tab-btn ${filterType==='prodaja' ? 'active' : ''}`} style={{padding:'0.4rem 1rem', ...(filterType==='prodaja' ? {background:'var(--danger)', boxShadow:'none'} : {})}} onClick={()=>setFilterType('prodaja')}>Prodaje (-)</button>
                        </div>
                    </div>

                    <div>
                        <span style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', display:'block', marginBottom:'0.5rem'}}>Tip Produkta</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className={`tab-btn ${filterProdType==='vse' ? 'active' : ''}`} style={{padding:'0.4rem 1rem'}} onClick={()=>setFilterProdType('vse')}>VSE</button>
                            <button className={`tab-btn ${filterProdType==='folija' ? 'active' : ''}`} style={{padding:'0.4rem 1rem', ...(filterProdType==='folija' ? {background:'#3b82f6', boxShadow:'none'} : {})}} onClick={()=>setFilterProdType('folija')}>Folije</button>
                            <button className={`tab-btn ${filterProdType==='adr oprema' ? 'active' : ''}`} style={{padding:'0.4rem 1rem', ...(filterProdType==='adr oprema' ? {background:'#a855f7', boxShadow:'none'} : {})}} onClick={()=>setFilterProdType('adr oprema')}>ADR Oprema</button>
                        </div>
                    </div>
                    
                </div>
                
                <div style={{ overflowX: "auto" }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Datum</th>
                                <th>Transakcija</th>
                                <th>Produkt & LOT Številka</th>
                                <th>Račun / Opis</th>
                                <th>Količina</th>
                                <th>Nab. Cena</th>
                                <th>Skupaj Strosek</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr><td colSpan="7" style={{textAlign:'center', color:'var(--text-muted)', paddingTop:'2rem'}}>Ni rezultatov.</td></tr>
                            )}
                            {filtered.map(log => {
                                const isPositive = log.tip === "prevzem" || log.tip === "storno";
                                const cost = log.kolicina_tm * log.nabavna_cena;
                                
                                let badgeColor = "var(--text-muted)";
                                let badgeBg = "rgba(0,0,0,0.1)";
                                if (log.tip === "prevzem") { badgeColor = "var(--success)"; badgeBg = "rgba(16, 185, 129, 0.1)"; }
                                if (log.tip === "prodaja") { badgeColor = "var(--danger)"; badgeBg = "rgba(239, 68, 68, 0.1)"; }
                                if (log.tip === "storno") { badgeColor = "#f59e0b"; badgeBg = "rgba(245, 158, 11, 0.1)"; }

                                // Determine unit text based on what is selected
                                let unitText = "";
                                if (filterProdType === 'folija') unitText = " tm";
                                else if (filterProdType === 'adr oprema') unitText = " kos";
                                // If viewing "VSE", do not append unit or just keep it dynamic from product type. User requested: "če se prikazujejo oba se prikazuje samo količina".
                                if (filterProdType === 'vse') unitText = "";

                                return (
                                    <tr key={log.id}>
                                        <td style={{ whiteSpace: "nowrap" }}>{new Date(log.datum).toLocaleString()}</td>
                                        <td>
                                            <span className="type-badge" style={{ color: badgeColor, background: badgeBg }}>
                                                {log.tip}
                                            </span>
                                        </td>
                                        <td>{log.naziv_produkta} <br/><small style={{color:'var(--text-muted)'}}>LOT: {log.lot_stevilka}</small></td>
                                        <td>{log.stevilka_racuna || "/"}<br/><small style={{color:'var(--text-muted)'}}>{log.dobavitelj}</small></td>
                                        <td style={{ color: isPositive ? "var(--success)" : "var(--danger)" }}>
                                            <strong>{isPositive ? "+" : "-"}{log.kolicina_tm}{unitText}</strong>
                                        </td>
                                        <td>{log.nabavna_cena} €</td>
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