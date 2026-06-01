import React, { useContext, useEffect, useState } from "react";
import { createNalogaAvti, updateNalogaAvti } from "../../api";
import MaterialSelect from "./MaterialSelect";
import { RoleContext } from "../../RoleContext";

const POSKODBE_V_AVTI = [
  "Praska levo", "Praska desno", "Udrtina spredaj", "Udrtina zadaj",
  "Poškodovano steklo", "Odrgnina na strehi", "Poškodba platišča"
];

function FormAvti({ lots, produkti, reload, onMsg, editOrder, clearEdit }) {
  const role = useContext(RoleContext);
  const canManageFinance = role === "admin";
  const defaults = { status: "v izdelavi", opravljena_storitev: "", opis: "", tablica: "", sasija: "", znamka: "", ime_lastnika: "", email: "", cena_dela: null, opomba: "", stevilka_delovnega_naloga: "", stevilka_racuna: "", enota_materiala: "tm" };
  const [form, setForm] = useState(defaults);
  const [mats, setMats] = useState([]);
  const [poskodbe, setPoskodbe] = useState({});
  const [images, setImages] = useState([]);

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
        cena_dela: editOrder.cena_dela ?? null,
        opomba: editOrder.opomba || "",
        stevilka_delovnega_naloga: editOrder.stevilka_delovnega_naloga || "",
        stevilka_racuna: editOrder.stevilka_racuna || "",
        enota_materiala: editOrder.enota_materiala || "tm"
      });
      setMats(editOrder.materiali && editOrder.materiali.length > 0 ? editOrder.materiali : []);
      setImages((editOrder.slike || []).map((url, idx) => ({ id: `existing-${idx}`, url })));

      const currentPoskodbe = {};
      (editOrder.poskodba_vozila || []).forEach(p => { currentPoskodbe[p] = true; });
      setPoskodbe(currentPoskodbe);
    } else {
      setForm(defaults);
      setMats([]);
      setPoskodbe({});
      setImages([]);
    }
  }, [editOrder]);

  const calcMaterialCost = () => {
    return mats.reduce((acc, m) => {
      const selLot = lots.find(l => Number(l.id) === Number(m.lot_produkt_id));
      const selProd = selLot ? produkti.find(p => Number(p.id) === Number(selLot.produkt_id)) : null;
      const price = selProd ? Number(selProd.prodajna_cena) : 0;
      const qty = Number(m.kolicina_uporabljenega_produkta || 0);
      if (form.enota_materiala === "m2") {
        return acc + (price * qty);
      }
      if (selProd?.sirina) {
        return acc + (price * (qty * Number(selProd.sirina)));
      }
      return acc + (price * qty);
    }, 0);
  };

  const matCost = calcMaterialCost();
  const addMatRow = () => setMats([...mats, { lot_produkt_id: "", kolicina_uporabljenega_produkta: "" }]);
  const removeMatRow = (idx) => {
    const n = [...mats];
    n.splice(idx, 1);
    setMats(n);
  };

  const addImages = (files) => {
    const list = Array.from(files || []);
    list.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages(prev => [...prev, { id: `${file.name}-${file.size}-${file.lastModified}`, url: reader.result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const resolveMaterialQty = (material) => {
    const selLot = lots.find(l => Number(l.id) === Number(material.lot_produkt_id));
    const selProd = selLot ? produkti.find(p => Number(p.id) === Number(selLot.produkt_id)) : null;
    const inputQty = Number(material.kolicina_uporabljenega_produkta || 0);

    if (form.enota_materiala === "m2") {
      if (!selProd?.sirina) {
        throw new Error("Izbran material nima nastavljene širine za preračun na tm.");
      }
      return inputQty / Number(selProd.sirina);
    }

    return inputQty;
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        status: form.status,
        stevilka_delovnega_naloga: form.stevilka_delovnega_naloga,
        stevilka_racuna: form.stevilka_racuna || null,
        enota_materiala: form.enota_materiala,
        opravljena_storitev: form.opravljena_storitev,
        opis: form.opis,
        opomba: form.opomba,
        vozilo: { registrska_stevilka: form.tablica, stevilka_sasije: form.sasija, znamka_vozila: form.znamka },
        lastnik_vozila: { ime_lastnika: form.ime_lastnika, email_lastnika: form.email },
        slike: images.map(i => i.url),
        // TODO: implementiraj upload na server
        materiali: mats.filter(m => m.lot_produkt_id !== "" && Number(m.kolicina_uporabljenega_produkta || 0) > 0).map(m => ({
          lot_produkt_id: m.lot_produkt_id,
          kolicina_uporabljenega_produkta: resolveMaterialQty(m)
        })),
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
        setMats([]);
        setPoskodbe({});
        setImages([]);
      }
      reload();
    } catch (err) {
      onMsg(err.message, true);
    }
  };

  return (
    <section className={`card ${editOrder ? "animated" : ""}`} style={editOrder ? { border: "2px solid #e02020", boxShadow: "0 0 20px rgba(224, 32, 32, 0.2)" } : {}}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
           <h2 style={{ margin: 0 }}>{editOrder ? "✏️ Urejanje Naloge" : "Kreiraj Avto Nalogo"}</h2>
           <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>Vnesite podatke o vozilu in materialih.</p>
        </div>
        <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>Cena materiala</div>
            <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--color-primary)" }}>{matCost.toFixed(2)} €</div>
        </div>
        {editOrder && <button onClick={clearEdit} style={{ background: "transparent", color: "var(--color-text-muted)", border: "none", cursor: "pointer" }}>Prekliči</button>}
      </div>
      <form onSubmit={submit}>
        <div className="grid-2" style={{ gap: "1rem" }}>
          <div className="form-group">
            <label>Številka delovnega naloga</label>
            <input required value={form.stevilka_delovnega_naloga} onChange={e => setForm({ ...form, stevilka_delovnega_naloga: e.target.value })} placeholder="Npr. DN-2026-001" />
          </div>
          <div className="form-group">
            <label>Opravljena Storitev</label>
            <input required value={form.opravljena_storitev} onChange={e => setForm({ ...form, opravljena_storitev: e.target.value })} placeholder="Npr. Full Wrap" />
          </div>
        </div>

        <div className="grid-2" style={{ gap: "1rem" }}>
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} disabled={!canManageFinance}>
              <option value="v izdelavi">V izdelavi</option>
              <option value="dokončana">Dokončana</option>
              <option value="potrjena" disabled={!editOrder || editOrder.status !== "potrjena"}>Potrjena</option>
            </select>
          </div>
          <div className="form-group">
            <label>Številka računa</label>
            <input value={form.stevilka_racuna} onChange={e => setForm({ ...form, stevilka_racuna: e.target.value })} placeholder="Npr. RAČ-2026-55" disabled={!canManageFinance} />
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

        <div className="form-group">
          <label>Enota materiala</label>
          <div style={{ display: "flex", gap: "1rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <input type="radio" name="enota-avti" checked={form.enota_materiala === "tm"} onChange={() => setForm({ ...form, enota_materiala: "tm" })} />
              Tekoči metri (tm)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <input type="radio" name="enota-avti" checked={form.enota_materiala === "m2"} onChange={() => setForm({ ...form, enota_materiala: "m2" })} />
              Kvadratni metri (m2)
            </label>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", margin: "1rem 0 0.5rem" }}>
          <h3 style={{ margin: 0 }}>Poraba Materiala</h3>
          <button type="button" onClick={addMatRow} style={{ background: "transparent", color: "var(--color-primary)", border: "none", cursor: "pointer", fontWeight: "600" }}>+ Dodaj vrstico</button>
        </div>
        {mats.map((m, idx) => {
          const selLot = lots.find(l => Number(l.id) === Number(m.lot_produkt_id));
          const selProd = selLot ? produkti.find(p => Number(p.id) === Number(selLot.produkt_id)) : null;
          const isAdr = selProd?.tip === "adr oprema";

          return (
            <div key={idx} style={{ marginBottom: "0.5rem", padding: "1rem", background: "rgba(0,0,0,0.03)", borderRadius: "12px", position: "relative" }}>
              <button type="button" onClick={() => removeMatRow(idx)} style={{ position: "absolute", top: "10px", right: "10px", background: "var(--color-error)", color: "white", border: "none", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>-</button>
              <div className="grid-2" style={{ gap: "1rem" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Izberi LOT</label>
                  <MaterialSelect value={m.lot_produkt_id} onChange={val => { const newMats = [...mats]; newMats[idx].lot_produkt_id = val; setMats(newMats); }} lots={lots} produkti={produkti} unit={form.enota_materiala} required={false} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Poraba ({isAdr ? "kos" : form.enota_materiala.toUpperCase()})</label>
                  <input type="number" step="0.1" value={m.kolicina_uporabljenega_produkta} onChange={e => {
                    const newMats = [...mats];
                    newMats[idx].kolicina_uporabljenega_produkta = e.target.value;
                    setMats(newMats);
                  }} />
                </div>
              </div>
            </div>
          );
        })}
        {mats.length === 0 && <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>Brez materialov.</p>}

        <div className="form-group">
          <label>Slike</label>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
            {images.map(img => (
              <div key={img.id} style={{ position: "relative" }}>
                <img src={img.url} alt="Predogled" style={{ width: "90px", height: "90px", objectFit: "cover", borderRadius: "10px", border: "1px solid var(--color-border)" }} />
                <button type="button" onClick={() => removeImage(img.id)} style={{ position: "absolute", top: "-8px", right: "-8px", background: "var(--color-error)", color: "white", border: "none", borderRadius: "50%", width: "22px", height: "22px", cursor: "pointer" }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <label className="btn-primary" style={{ width: "auto" }}>
              Naloži slike
              <input type="file" accept="image/png, image/jpeg, image/webp" multiple style={{ display: "none" }} onChange={e => addImages(e.target.files)} />
            </label>
            <label className="btn-primary" style={{ width: "auto" }}>
              Slikaj
              <input type="file" accept="image/png, image/jpeg, image/webp" capture="environment" style={{ display: "none" }} onChange={e => addImages(e.target.files)} />
            </label>
          </div>
        </div>

        <button type="submit" className="btn-primary" style={editOrder ? { background: "var(--color-primary-dark)" } : {}}>
          {editOrder ? "Posodobi Nalogo" : "Ustvari Nalogo"}
        </button>
      </form>
    </section>
  );
}

export default FormAvti;
