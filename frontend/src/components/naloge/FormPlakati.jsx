import React, { useEffect, useState } from "react";
import { createNalogaPlakati, updateNalogaPlakati } from "../../api";
import MaterialSelect from "./MaterialSelect";

function FormPlakati({ lots, produkti, reload, onMsg, editOrder, clearEdit }) {
  const defaults = { status: "v izdelavi", naziv_projekta: "", opis: "", ime_narocnika: "", gsm: "", email: "", slike: "", cena_dela: null, opomba: "" };
  const [form, setForm] = useState(defaults);
  const [mats, setMats] = useState([{ lot_produkt_id: "", kolicina_uporabljenega_produkta: "" }]);

  useEffect(() => {
    if (editOrder) {
      setForm({
        status: editOrder.status || "v izdelavi",
        naziv_projekta: editOrder.naziv_projekta || "",
        opis: editOrder.opis || "",
        ime_narocnika: editOrder.narocnik?.ime_narocnika || "",
        gsm: editOrder.narocnik?.gsm_stevilka || "",
        email: editOrder.narocnik?.email_narocnika || "",
        slike: editOrder.slike?.[0] || "",
        cena_dela: editOrder.cena_dela ?? null,
        opomba: editOrder.opomba || ""
      });
      setMats(editOrder.materiali && editOrder.materiali.length > 0 ? editOrder.materiali : []);
    } else {
      setForm(defaults);
      setMats([{ lot_produkt_id: "", kolicina_uporabljenega_produkta: "" }]);
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
        naziv_projekta: form.naziv_projekta,
        opis: form.opis,
        opomba: form.opomba,
        narocnik: { ime_narocnika: form.ime_narocnika, gsm_stevilka: form.gsm, email_narocnika: form.email },
        slike: form.slike ? [form.slike] : [],
        materiali: mats.filter(m => m.lot_produkt_id !== ""),
        cena_dela: form.cena_dela === null || form.cena_dela === undefined || form.cena_dela === "" ? null : Number(form.cena_dela),
        cena_materiala: matCost,
        datum: new Date().toISOString()
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
    } catch (err) {
      onMsg(err.message, true);
    }
  };

  return (
    <section className={`card ${editOrder ? "animated" : ""}`} style={editOrder ? { border: "2px solid #f59e0b", boxShadow: "0 0 20px rgba(245, 158, 11, 0.2)" } : {}}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
           <h2 style={{ margin: 0 }}>{editOrder ? "✏️ Urejanje Naloge" : "Kreiraj Plakat Nalogo"}</h2>
           <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Vnesite podatke o delovni nalogi in materialih.</p>
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
            <label>Naziv Projekta</label>
            <input required value={form.naziv_projekta} onChange={e => setForm({ ...form, naziv_projekta: e.target.value })} placeholder="Npr. 200 Nalepk za Event" />
          </div>
        </div>

        <div className="form-group">
          <label>Opis storitve</label>
          <textarea value={form.opis} onChange={e => setForm({ ...form, opis: e.target.value })} rows="2"></textarea>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label>Naročnik (Ime)</label>
            <input required value={form.ime_narocnika} onChange={e => setForm({ ...form, ime_narocnika: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Naročnik (Email / GSM)</label>
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>

        <div className="form-group">
          <label>Opomba</label>
          <textarea value={form.opomba} onChange={e => setForm({ ...form, opomba: e.target.value })} rows="2" placeholder="Dodatne opombe za delo..."></textarea>
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
          <label>URL končne slike (opcijsko)</label>
          <input value={form.slike} onChange={e => setForm({ ...form, slike: e.target.value })} placeholder="https://..." />
        </div>

        <button type="submit" className="btn-primary" style={editOrder ? { background: "#f59e0b" } : {}}>
          {editOrder ? "Posodobi Nalogo" : "Ustvari Nalogo"}
        </button>
      </form>
    </section>
  );
}

export default FormPlakati;
