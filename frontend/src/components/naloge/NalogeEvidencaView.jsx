import React, { useContext, useMemo, useState } from "react";
import FormPlakati from "./FormPlakati";
import FormAvti from "./FormAvti";
import { updateNalogaPlakati, updateNalogaAvti } from "../../api";
import { RoleContext } from "../../RoleContext";

function NalogeEvidencaView({ lots, produkti, plakati, avti, reload, onMsg }) {
  const role = useContext(RoleContext);
  const canManageFinance = role === "admin";
  const [nalogaType, setNalogaType] = useState("plakati");
  const [editingOrder, setEditingOrder] = useState(null);
  const [viewingDetails, setViewingDetails] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("vsi");
  const [datumOd, setDatumOd] = useState("");
  const [datumDo, setDatumDo] = useState("");
  const [confirmCena, setConfirmCena] = useState("");
  const canConfirm = useMemo(() => {
    if (!viewingDetails) return false;
    const hasCena = confirmCena !== "" && !Number.isNaN(Number(confirmCena));
    const hasDN = !!viewingDetails.stevilka_delovnega_naloga;

    if (nalogaType === "plakati") {
      const hasNaziv = !!viewingDetails.naziv_projekta;
      const hasNarocnik = !!viewingDetails.narocnik?.ime_narocnika;
      return hasCena && hasDN && hasNaziv && hasNarocnik;
    }

    const hasStoritev = !!viewingDetails.opravljena_storitev;
    const hasRegOrSasija = !!viewingDetails.vozilo?.registrska_stevilka || !!viewingDetails.vozilo?.stevilka_sasije;
    const hasLastnik = !!viewingDetails.lastnik_vozila?.ime_lastnika;
    return hasCena && hasDN && hasStoritev && hasRegOrSasija && hasLastnik;
  }, [viewingDetails, confirmCena, nalogaType]);

  const activeList = nalogaType === "plakati" ? plakati : avti;

  const filteredList = useMemo(() => activeList.filter(n => {
    const srt = search.toLowerCase();
    const primary = (n.naziv_projekta || n.opravljena_storitev || "").toLowerCase();
    const tablica = (n.vozilo?.registrska_stevilka || "").toLowerCase();
    const sasija = (n.vozilo?.stevilka_sasije || "").toLowerCase();
    const narocnik = (n.narocnik?.ime_narocnika || n.lastnik_vozila?.ime_lastnika || "").toLowerCase();

    if (search && !(primary.includes(srt) || tablica.includes(srt) || sasija.includes(srt) || narocnik.includes(srt))) {
      return false;
    }
    if (statusFilter !== "vsi" && (n.status || "") !== statusFilter) {
      return false;
    }
    if (datumOd && new Date(n.datum) < new Date(datumOd)) {
      return false;
    }
    if (datumDo && new Date(n.datum) > new Date(datumDo)) {
      return false;
    }
    return true;
  }), [activeList, search, statusFilter, datumOd, datumDo]);

  const startEdit = (order) => {
    setEditingOrder(order);
    setViewingDetails(null);
  };

  const handleDokoncaj = async () => {
    try {
      const payload = { ...viewingDetails, status: "dokončana", cena_dela: viewingDetails.cena_dela ?? null };
      if (nalogaType === "plakati") {
        await updateNalogaPlakati(viewingDetails.id, payload);
      } else {
        await updateNalogaAvti(viewingDetails.id, payload);
      }
      onMsg("Naloga uspešno označena kot dokončana.");
      setViewingDetails(null);
      setConfirmCena("");
      reload();
    } catch (err) {
      onMsg(err.message, true);
    }
  };

  const handlePotrdi = async () => {
    const cenaNum = Number(confirmCena);
    if (!confirmCena || Number.isNaN(cenaNum)) {
      onMsg("Vnesi veljavno ceno.", true);
      return;
    }

    try {
      const payload = { ...viewingDetails, status: "potrjena", cena_dela: cenaNum };
      if (nalogaType === "plakati") {
        await updateNalogaPlakati(viewingDetails.id, payload);
      } else {
        await updateNalogaAvti(viewingDetails.id, payload);
      }
      onMsg("Naloga potrjena s ceno.");
      setViewingDetails(null);
      setConfirmCena("");
      reload();
    } catch (err) {
      onMsg(err.message, true);
    }
  };

  return (
    <div className="animated">
      <div className="big-toggle">
        <button className={`big-btn ${nalogaType === "plakati" ? "active" : ""}`} onClick={() => { setNalogaType("plakati"); setEditingOrder(null); }}>
          🖼️ Evidenca: PLAKATI
        </button>
        <button className={`big-btn ${nalogaType === "avti" ? "active" : ""}`} onClick={() => { setNalogaType("avti"); setEditingOrder(null); }}>
          🚗 Evidenca: AVTI
        </button>
      </div>

      <div className="grid-2">
        <div>
          <section className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0 }}>Zgodovina Nalog</h2>
              <input type="text" placeholder="Išči po registraciji, šasiji, naročniku ali imenu..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: "300px", padding: "0.4rem 0.8rem" }} />
            </div>

            <div className="grid-2" style={{ gap: "1rem", marginTop: "1rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Status</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="vsi">Vsi</option>
                  <option value="v izdelavi">V izdelavi</option>
                  <option value="dokončana">Dokončana</option>
                  <option value="potrjena">Potrjena</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Datum od</label>
                <input type="date" value={datumOd} onChange={e => setDatumOd(e.target.value)} />
              </div>
            </div>
            <div className="grid-2" style={{ gap: "1rem", marginTop: "1rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Datum do</label>
                <input type="date" value={datumDo} onChange={e => setDatumDo(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                <button type="button" className="btn-primary" style={{ width: "auto" }} onClick={() => { setSearch(""); setStatusFilter("vsi"); setDatumOd(""); setDatumDo(""); }}>
                  Počisti filtre
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
              {filteredList.length === 0 && <p style={{ color: "var(--text-muted)" }}>Ni nalog za prikaz.</p>}

              {filteredList.map(n => {
                let stColor = "var(--text-muted)";
                if (n.status === "v izdelavi") stColor = "var(--accent-color)";
                if (n.status === "dokončana") stColor = "#f59e0b";
                if (n.status === "potrjena") stColor = "var(--success)";

                return (
                  <div key={n.id} className="list-item" style={{ cursor: "pointer", transition: "0.2s", position: "relative" }} onClick={() => { setViewingDetails(n); setConfirmCena(""); }}>
                    <div style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.05)", padding: "4px 8px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600, color: stColor, textTransform: "uppercase" }}>{n.status}</div>
                    <div className="list-item-header">
                      <h3 style={{ margin: 0 }}>{n.naziv_projekta || n.opravljena_storitev}</h3>
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Kreirano: {new Date(n.datum).toLocaleDateString()}</p>
                    <p style={{ fontSize: "0.9rem", marginBottom: "0.5rem", marginTop: "0.5rem" }}>{n.opis || "Brez opisa."}</p>

                    <div style={{ background: "rgba(255,255,255,0.7)", padding: "0.5rem", borderRadius: "8px" }}>
                      <strong style={{ fontSize: "0.8rem" }}>Porabljeni LOTi: {n.materiali?.length || 0}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
        <div>
          {editingOrder && (
            nalogaType === "plakati"
              ? <FormPlakati lots={lots} produkti={produkti} reload={reload} onMsg={onMsg} editOrder={editingOrder} clearEdit={() => setEditingOrder(null)} />
              : <FormAvti lots={lots} produkti={produkti} reload={reload} onMsg={onMsg} editOrder={editingOrder} clearEdit={() => setEditingOrder(null)} />
          )}
          {!editingOrder && (
            <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "300px", color: "var(--text-muted)" }}>
              <p>Izberi nalogo za ogled in posodabljanje.</p>
            </div>
          )}
        </div>
      </div>

      {viewingDetails && (
        <div className="modal-overlay" onClick={() => { setViewingDetails(null); setConfirmCena(""); }}>
          <div className="modal-content animated" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ margin: 0 }}>{viewingDetails.naziv_projekta || viewingDetails.opravljena_storitev}</h2>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase" }}>{viewingDetails.status}</span>
              </div>
              <button className="modal-close" onClick={() => { setViewingDetails(null); setConfirmCena(""); }}>&times;</button>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <strong>ID Naloge:</strong> {viewingDetails.id} <br />
              <strong>Datum:</strong> {new Date(viewingDetails.datum).toLocaleString()} <br />
              <strong>Opis:</strong> {viewingDetails.opis || "/"}
            </div>

            {viewingDetails.narocnik && (
              <div style={{ marginBottom: "1.5rem", background: "rgba(0,0,0,0.03)", padding: "1rem", borderRadius: "12px" }}>
                <h3>Naročnik</h3>
                <strong>Ime:</strong> {viewingDetails.narocnik.ime_narocnika} <br />
                <strong>Kontakt:</strong> {viewingDetails.narocnik.email_narocnika} / {viewingDetails.narocnik.gsm_stevilka}
              </div>
            )}

            {viewingDetails.vozilo && (
              <div style={{ marginBottom: "1.5rem", background: "rgba(0,0,0,0.03)", padding: "1rem", borderRadius: "12px" }}>
                <h3>Podatki Vozila & Lastnika</h3>
                <strong>Znamka:</strong> {viewingDetails.vozilo.znamka_vozila} <br />
                <strong>Registrska št.:</strong> {viewingDetails.vozilo.registrska_stevilka} <br />
                <strong>Šasija:</strong> {viewingDetails.vozilo.stevilka_sasije} <br />
                <hr style={{ margin: "0.5rem 0", borderColor: "rgba(0,0,0,0.1)" }} />
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
              <ul style={{ paddingLeft: "1.5rem" }}>
                {viewingDetails.materiali?.map((mat, i) => {
                  const lot = lots.find(l => Number(l.id) === Number(mat.lot_produkt_id));
                  const prod = lot ? produkti.find(p => Number(p.id) === Number(lot.produkt_id)) : null;
                  const unit = prod?.tip === "adr oprema" ? "kos" : "tm";
                  return (
                    <li key={i}>
                      <strong>{lot ? lot.lot_stevilka : `Neznan LOT (${mat.lot_produkt_id})`}</strong>
                      {prod && ` - ${prod.naziv_produkta}`} — {mat.kolicina_uporabljenega_produkta} {unit}
                    </li>
                  );
                })}
              </ul>
            </div>

            {canManageFinance && viewingDetails.status !== "potrjena" && (
              <div style={{ marginTop: "1.5rem", background: "rgba(0,0,0,0.03)", padding: "1rem", borderRadius: "12px" }}>
                <h3>Potrditev s ceno</h3>
                <div className="grid-2" style={{ gap: "1rem" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Cena dela (€)</label>
                    <input type="number" step="0.01" value={confirmCena} onChange={e => setConfirmCena(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Skupaj (Material + Delo)</label>
                    <input readOnly value={`${(Number(confirmCena || 0) + Number(viewingDetails.cena_materiala || 0)).toFixed(2)} €`} style={{ fontWeight: "bold", background: "rgba(16, 185, 129, 0.1)", color: "var(--success)" }} />
                  </div>
                </div>
                <div style={{ marginTop: "1rem", display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                  {viewingDetails.status !== "dokončana" && (
                    <button className="btn-primary" style={{ background: "#f59e0b", width: "auto" }} onClick={handleDokoncaj}>
                      Označi dokončano
                    </button>
                  )}
                  <button className="btn-primary" style={{ background: "var(--success)", width: "auto" }} onClick={handlePotrdi} disabled={!canConfirm}>
                    ✓ Potrdi s ceno
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
              <button className="btn-primary" style={{ background: "#f59e0b", width: "auto" }} onClick={() => {
                startEdit(viewingDetails);
              }}>Uredi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NalogeEvidencaView;
