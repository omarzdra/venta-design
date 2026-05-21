import React, { useEffect, useState } from "react";
import { createNalogaAvti, updateNalogaAvti } from "../../api";
import MaterialSelect from "./MaterialSelect";

const POSKODBE_V_AVTI = [
  "Praska levo", "Praska desno", "Udrtina spredaj", "Udrtina zadaj",
  "Poškodovano steklo", "Odrgnina na strehi", "Poškodba platišča"
];

function FormAvti({ lots, produkti, reload, onMsg, editOrder, clearEdit }) {
  const defaults = { status: "v izdelavi", opravljena_storitev: "", opis: "", tablica: "", sasija: "", znamka: "", ime_lastnika: "", email: "", slike: "", cena_dela: null, opomba: "" };
  const [form, setForm] = useState(defaults);
  const [mats, setMats] = useState([{ lot_produkt_id: "", kolicina_uporabljenega_produkta: "" }]);
  const [poskodbe, setPoskodbe] = useState({});

  useEffect(() => {
    if (editOrder) {
      setForm({
        status: editOrder.status || "v izdelavi",
        opravljena_storitev: editOrder.opravljena_storitev || "",
        opis: editOrder.opis || "",
        tablica: editOrder.vozilo?.registrska_stevilka || "",
        sasija: editOrder.vozilo?.stevilka_sasije || "",
        znamka: editOrder.vozilo?.znamka_vozila || "",
        ime_lastnika: editOrder.lastnik_vozila?.ime_lastnika || "",
        email: editOrder.lastnik_vozila?.email_lastnika || "",
        slike: editOrder.slike?.[0] || "",
        cena_dela: editOrder.cena_dela ?? null,
        opomba: editOrder.opomba || ""
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

  const calcMaterialCost = () => {
    return mats.reduce((acc, m) => {
      const selLot = lots.find(l => Number(l.id) === Number(m.lot_produkt_id));
      const selProd = selLot ? produkti.find(p => Number(p.id) === Number(selLot.produkt_id)) : null;
      const price = selProd ? Number(selProd.prodajna_cena) : 0;
      return acc + (price * Number(m.kolicina_uporabljenega_produkta || 0));
    }, 0);
  };

  const matCost = calcMaterialCost();
  const addMatRow = () => setMats([...mats, { lot_produkt_id: "", kolicina_uporabljenega_produkta: "" }]);
  const removeMatRow = (idx) => {
    const n = [...mats];
    n.splice(idx, 1);
    setMats(n);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        status: form.status,
        opravljena_storitev: form.opravljena_storitev,
        opis: form.opis,
        opomba: form.opomba,
        vozilo: { registrska_stevilka: form.tablica, stevilka_sasije: form.sasija, znamka_vozila: form.znamka },
        lastnik_vozila: { ime_lastnika: form.ime_lastnika, email_lastnika: form.email },
        slike: form.slike ? [form.slike] : [],
        materiali: mats.filter(m => m.lot_produkt_id !== ""),
        poskodba_vozila: Object.keys(poskodbe).filter(k => poskodbe[k]),
        cena_dela: form.cena_dela === null || form.cena_dela === undefined || form.cena_dela === "" ? null : Number(form.cena_dela),
        cena_materiala: matCost,
        datum: new Date().toISOString()
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
    } catch (err) {
      onMsg(err.message, true);
    }
  };

  return (
    <section className={`card ${editOrder ? "animated" : ""}`} style={editOrder ? { border: "2px solid #f59e0b", boxShadow: "0 0 20px rgba(245, 158, 11, 0.2)" } : {}}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
           <h2 style={{ margin: 0 }}>{editOrder ? "✏️ Urejanje Naloge" : "Kreiraj Avto Nalogo"}</h2>
           <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Vnesite podatke o vozilu in materialih.</p>
        </div>
        <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Cena materiala</div>
            <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--accent-color)" }}>{matCost.toFixed(2)} €</div>
        </div>
        {editOrder && <button onClick={clearEdit} style={{ background: "transparent", color: "var(--text-muted)", border: "none", cursor: "pointer" }}>Prekliči</button>}
      </div>
      <form onSubmit={submit}>
        <div className="grid-2" style={{ gap: "1rem" }}>
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="v izdelavi">V izdelavi</option>
              <option value="dokončana">Dokončana</option>
              <option value="potrjena" disabled={!editOrder || editOrder.status !== "potrjena"}>Potrjena</option>
            </select>
          </div>
          <div className="form-group">
            <label>Opravljena Storitev</label>
            <input required value={form.opravljena_storitev} onChange={e => setForm({ ...form, opravljena_storitev: e.target.value })} placeholder="Npr. Full Wrap" />
          </div>
        </div>

        <div className="grid-2" style={{ gap: "1rem" }}>
          <div className="form-group"><label>Znamka Vozila</label><input required value={form.znamka} onChange={e => setForm({ ...form, znamka: e.target.value })} /></div>
          <div className="form-group"><label>Registrska Št.</label><input value={form.tablica} onChange={e => setForm({ ...form, tablica: e.target.value })} /></div>
        </div>
        <div className="form-group"><label>Številka Šasije (VIN)</label><input required value={form.sasija} onChange={e => setForm({ ...form, sasija: e.target.value })} /></div>
        <div className="grid-2" style={{ gap: "1rem" }}>
          <div className="form-group"><label>Ime lastnika</label><input required value={form.ime_lastnika} onChange={e => setForm({ ...form, ime_lastnika: e.target.value })} /></div>
          <div className="form-group"><label>Kontakt (Email/GSM)</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        </div>

        <div className="form-group">
          <label>Opomba</label>
          <textarea value={form.opomba} onChange={e => setForm({ ...form, opomba: e.target.value })} rows="2" placeholder="Dodatne opombe za vozilo..."></textarea>
        </div>

        <h3 style={{ margin: "1rem 0 0.5rem", fontSize: "1.1rem" }}>Preverjanje poškodb pred začetkom</h3>
        <div className="checklist" style={{ marginBottom: "1.5rem" }}>
          {POSKODBE_V_AVTI.map(p => (
            <label key={p} className="checkbox-label">
              <input type="checkbox" checked={!!poskodbe[p]} onChange={e => setPoskodbe({ ...poskodbe, [p]: e.target.checked })} />
              {p}
            </label>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", margin: "1rem 0 0.5rem" }}>
          <h3 style={{ margin: 0 }}>Poraba Materiala</h3>
          <button type="button" onClick={addMatRow} style={{ background: "transparent", color: "var(--accent-color)", border: "none", cursor: "pointer", fontWeight: "600" }}>+ Dodaj vrstico</button>
        </div>
        {mats.map((m, idx) => {
          const selLot = lots.find(l => Number(l.id) === Number(m.lot_produkt_id));
          const selProd = selLot ? produkti.find(p => Number(p.id) === Number(selLot.produkt_id)) : null;
          const isAdr = selProd?.tip === "adr oprema";

          return (
            <div key={idx} style={{ marginBottom: "0.5rem", padding: "1rem", background: "rgba(0,0,0,0.03)", borderRadius: "12px", position: "relative" }}>
              <button type="button" onClick={() => removeMatRow(idx)} style={{ position: "absolute", top: "10px", right: "10px", background: "var(--danger)", color: "white", border: "none", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>-</button>
              <div className="grid-2" style={{ gap: "1rem" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Izberi LOT</label>
                  <MaterialSelect value={m.lot_produkt_id} onChange={val => { const newMats = [...mats]; newMats[idx].lot_produkt_id = val; setMats(newMats); }} lots={lots} produkti={produkti} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Poraba ({isAdr ? "kos" : "TM"})</label>
                  <input required type="number" step="0.1" value={m.kolicina_uporabljenega_produkta} onChange={e => {
                    const newMats = [...mats];
                    newMats[idx].kolicina_uporabljenega_produkta = e.target.value;
                    setMats(newMats);
                  }} />
                </div>
              </div>
            </div>
          );
        })}
        {mats.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>Brez materialov.</p>}

        <div className="form-group">
          <label>Slika poškodbe / končna (URL)</label>
          <input value={form.slike} onChange={e => setForm({ ...form, slike: e.target.value })} placeholder="https://..." />
        </div>

        <button type="submit" className="btn-primary" style={editOrder ? { background: "#f59e0b" } : {}}>
          {editOrder ? "Posodobi Nalogo" : "Ustvari Nalogo"}
        </button>
      </form>
    </section>
  );
}

export default FormAvti;
