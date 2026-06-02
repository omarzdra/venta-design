import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { supabase } from "./supabaseClient";
import logoSvg from "./assets/logo.svg";
import "./styles.css";

const STATUS = { v_izdelavi: "V izdelavi", dokoncana: "Dokončana", potrjena: "Potrjena" };
const TABS = [
  { id: "zaloga", label: "Zaloga Materiala", roles: ["admin", "racunovodkinja", "grega"] },
  { id: "naloge", label: "Ustvari Delovni Nalog", roles: ["admin", "grega"] },
  { id: "evidenca", label: "Evidenca Delovnih Nalogov", roles: ["admin", "grega"] },
  { id: "analiza", label: "Analiza", roles: ["admin"] }
];
const CATS = ["material", "oprema", "lizing", "gorivo", "bancni_stroski", "place", "smeti", "telefon", "najemnina", "posta", "mehanik", "oglasevanje", "pripomocki", "zavarovanje", "drugo"];
const CAT_LABEL = { material: "Material", oprema: "Oprema", lizing: "Lizing", gorivo: "Gorivo", bancni_stroski: "Bančni stroški", place: "Plače", smeti: "Smeti", telefon: "Telefon", najemnina: "Najemnina", posta: "Pošta", mehanik: "Mehanik", oglasevanje: "Oglaševanje", pripomocki: "Pripomočki", zavarovanje: "Zavarovanje", drugo: "Drugo" };
const DAMAGE = ["Sprednji levi žaromet/meglenka/smerokaz", "Sprednji levi blatnik", "Sprednje levo platišče/pnevmatika", "Sprednje levo ogledalo", "Leva vrata/kabina/streha", "Stranski levi spojler", "Medosni levi spojler", "Zadnji levi blatnik", "Zadnje levo platišče", "Zadnji levi žaromet/meglenka/smerokaz", "Sprednji odbijač", "Pokrov motorja", "Vetrobransko steklo", "Streha", "Zadnji del kabine", "Sprednji desni žaromet/meglenka/smerokaz", "Sprednji desni blatnik", "Sprednje desno platišče/pnevmatika", "Sprednje desno ogledalo", "Desna vrata/kabina/streha", "Stranski desni spojler", "Medosni desni spojler", "Zadnji desni blatnik", "Zadnje desno platišče", "Zadnji desni žaromet/meglenka/smerokaz"];

const money = (v) => new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(Number(v || 0));
const d = (v) => v ? new Intl.DateTimeFormat("sl-SI").format(new Date(v)) : "/";
const cx = (...x) => x.filter(Boolean).join(" ");
const emptyTask = (tip = "splosno") => ({ tip, stevilka_delovnega_naloga: "", naziv_projekta: "", status: "v_izdelavi", stevilka_racuna: "", opis: "", opomba: "", kontakt_ime: "", kontakt_gsm: "", kontakt_email: "", vozilo: { registrska_stevilka: "", stevilka_sasije: "", znamka_vozila: "" }, poskodbe: [], materiali: [], slike: [] });

function Toast({ toast }) { return toast ? <div className={cx("toast", toast.type)}>{toast.message}</div> : null; }
function Badge({ value }) { return <span className={cx("badge", value)}>{STATUS[value] || value}</span>; }
function Modal({ title, children, onClose }) { return <div className="modal-backdrop" onMouseDown={onClose}><section className="modal" onMouseDown={(e) => e.stopPropagation()}><div className="modal-title"><h2>{title}</h2><button className="icon-btn" onClick={onClose}>×</button></div>{children}</section></div>; }

function LoginPage({ onLogin, notify }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try {
      const email = `${username.trim().toLowerCase()}@ventadesign.app`;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await onLogin();
    } catch { notify("Napačno uporabniško ime ali geslo.", "error"); }
    finally { setBusy(false); }
  }
  return <main className="login-shell"><form className="panel login-panel" onSubmit={submit}><img src={logoSvg} alt="Venta Design" className="login-logo" /><h1>Prijava</h1><label>Uporabniško ime<input required value={username} onChange={(e) => setUsername(e.target.value)} /></label><label>Geslo<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label><button className="btn primary" disabled={busy}>{busy ? "Vstopam..." : "Vstopi"}</button></form></main>;
}

function Header({ user, tab, setTab, logout }) {
  const tabs = TABS.filter((t) => t.roles.includes(user.role));
  useEffect(() => { if (!tabs.some((t) => t.id === tab)) setTab(tabs[0]?.id || "zaloga"); }, [tab, tabs, setTab]);
  return <header className="topbar"><div className="brand"><img src={logoSvg} alt="Venta Design" /><div><strong>Venta Design</strong><span>{user.username} · {user.role}</span></div></div><nav className="tabs">{tabs.map((t) => <button key={t.id} className={cx("tab", tab === t.id && "active")} onClick={() => setTab(t.id)}>{t.label}</button>)}</nav><button className="btn ghost" onClick={logout}>Odjava</button></header>;
}

function MaterialRows({ rows, setRows, lots }) {
  const update = (i, patch) => setRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const total = rows.reduce((sum, row) => {
    const lot = lots.find((l) => Number(l.id) === Number(row.lot_produkt_id));
    if (!lot) return sum;
    const qty = lot.produkt?.sirina ? Number(row.kolicina_tm || 0) * lot.produkt.sirina : Number(row.kolicina_tm || 0);
    return sum + qty * Number(lot.prodajna_cena || 0);
  }, 0);
  return <div className="form-section"><div className="section-head"><h3>Poraba materiala</h3><button type="button" className="btn secondary" onClick={() => setRows([...rows, { lot_produkt_id: "", kolicina_tm: "" }])}>+ Dodaj material</button></div>{rows.map((row, i) => { const lot = lots.find((l) => Number(l.id) === Number(row.lot_produkt_id)); const m2 = lot?.produkt?.sirina ? Number(row.kolicina_tm || 0) * lot.produkt.sirina : null; return <div className="material-row" key={i}><select value={row.lot_produkt_id} onChange={(e) => update(i, { lot_produkt_id: e.target.value })}><option value="">Izberi LOT</option>{lots.map((l) => <option key={l.id} value={l.id}>{l.lot_stevilka || "/"} - {l.produkt?.koda} - {l.produkt?.naziv_produkta} (tm: {Number(l.kolicina_tm).toFixed(2)})</option>)}</select><input type="number" min="0" step="0.01" value={row.kolicina_tm} onChange={(e) => update(i, { kolicina_tm: e.target.value })} placeholder="Količina tm" /><input readOnly value={m2 === null ? "kos" : `${m2.toFixed(2)} m2`} /><button type="button" className="icon-btn danger" onClick={() => setRows(rows.filter((_, idx) => idx !== i))}>×</button></div>; })}<div className="total-line">Vrednost materiala skupaj: <strong>{money(total)}</strong></div></div>;
}

function ImagesInput({ value, onChange }) {
  async function add(files) {
    const loaded = await Promise.all([...files].map((file) => new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(file); })));
    onChange([...value, ...loaded]);
  }
  return <div className="form-section"><div className="section-head"><h3>Slike</h3><div className="upload-actions"><label className="btn secondary">Naloži slike<input hidden type="file" accept="image/*" multiple onChange={(e) => add(e.target.files)} /></label><label className="btn secondary">Slikaj<input hidden type="file" accept="image/*" capture="environment" onChange={(e) => add(e.target.files)} /></label></div></div><div className="thumbs">{value.map((src, i) => <div className="thumb" key={i}><img src={src} alt="Predogled" /><button type="button" onClick={() => onChange(value.filter((_, idx) => idx !== i))}>×</button></div>)}</div></div>;
}

function NalogaForm({ lots, initial, role, onSave, onCancel }) {
  const [form, setForm] = useState(initial || emptyTask());
  const isEdit = Boolean(initial?.id);
  const admin = role === "admin";
  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const valid = form.stevilka_delovnega_naloga && form.naziv_projekta && form.kontakt_ime && (form.tip !== "vozila" || (form.vozilo.znamka_vozila && form.vozilo.stevilka_sasije));
  async function submit(e) { e.preventDefault(); await onSave(form); if (!isEdit) setForm(emptyTask(form.tip)); }
  return <form className="panel form-grid" onSubmit={submit}><div className="segmented wide"><button type="button" className={cx(form.tip === "splosno" && "active")} disabled={isEdit} onClick={() => setForm(emptyTask("splosno"))}>Splošno</button><button type="button" className={cx(form.tip === "vozila" && "active")} disabled={isEdit} onClick={() => setForm(emptyTask("vozila"))}>Vozila</button></div><label>Številka delovnega naloga<input required value={form.stevilka_delovnega_naloga} onChange={(e) => set({ stevilka_delovnega_naloga: e.target.value })} /></label><label>Naziv projekta<input required value={form.naziv_projekta} onChange={(e) => set({ naziv_projekta: e.target.value })} /></label><label>Status<select value={form.status} disabled={!admin || !isEdit} onChange={(e) => set({ status: e.target.value })}><option value="v_izdelavi">V izdelavi</option><option value="dokoncana">Dokončano</option>{isEdit && <option value="potrjena">Potrjeno</option>}</select></label><label>Številka računa<input value={form.stevilka_racuna || ""} disabled={!admin} onChange={(e) => set({ stevilka_racuna: e.target.value })} /></label><label className="wide">Opis storitve<textarea value={form.opis || ""} onChange={(e) => set({ opis: e.target.value })} /></label><label>Ime naročnika<input required value={form.kontakt_ime || ""} onChange={(e) => set({ kontakt_ime: e.target.value })} /></label><label>GSM<input value={form.kontakt_gsm || ""} onChange={(e) => set({ kontakt_gsm: e.target.value })} /></label><label>Email<input type="email" value={form.kontakt_email || ""} onChange={(e) => set({ kontakt_email: e.target.value })} /></label><label className="wide">Opomba<textarea value={form.opomba || ""} onChange={(e) => set({ opomba: e.target.value })} /></label>{form.tip === "vozila" && <><label>Znamka vozila<input required value={form.vozilo?.znamka_vozila || ""} onChange={(e) => set({ vozilo: { ...form.vozilo, znamka_vozila: e.target.value } })} /></label><label>Registrska številka<input value={form.vozilo?.registrska_stevilka || ""} onChange={(e) => set({ vozilo: { ...form.vozilo, registrska_stevilka: e.target.value } })} /></label><label>Številka šasije VIN<input required value={form.vozilo?.stevilka_sasije || ""} onChange={(e) => set({ vozilo: { ...form.vozilo, stevilka_sasije: e.target.value } })} /></label><div className="form-section wide"><h3>Poškodbe</h3><div className="check-grid">{DAMAGE.map((item) => <label className="check" key={item}><input type="checkbox" checked={(form.poskodbe || []).includes(item)} onChange={(e) => set({ poskodbe: e.target.checked ? [...(form.poskodbe || []), item] : (form.poskodbe || []).filter((x) => x !== item) })} />{item}</label>)}</div></div></>}<div className="wide"><MaterialRows rows={form.materiali || []} setRows={(materiali) => set({ materiali })} lots={lots} /></div><div className="wide"><ImagesInput value={form.slike || []} onChange={(slike) => set({ slike })} /></div><div className="form-actions wide">{onCancel && <button type="button" className="btn secondary" onClick={onCancel}>Prekliči</button>}<button className="btn primary" disabled={!valid}>{isEdit ? "Shrani spremembe" : "Ustvari nalogo"}</button></div></form>;
}

function ZalogaView({ data, role, reload, notify }) {
  const [expanded, setExpanded] = useState(null);
  const [edit, setEdit] = useState({});
  const canEdit = ["admin", "racunovodkinja"].includes(role);
  const totals = data.reduce((a, p) => ({ tm: a.tm + Number(p.totals?.kolicina_tm || 0), m2: a.m2 + Number(p.totals?.kolicina_m2 || 0), value: a.value + Number(p.totals?.vrednost_zaloge || 0) }), { tm: 0, m2: 0, value: 0 });
  async function saveLot(id) { await api.updateLot(id, { lot_stevilka: edit[id] }); notify("LOT številka je shranjena."); reload(); }
  return <div className="stack"><section className="kpi-row"><div className="kpi"><span>Skupaj tm</span><strong>{totals.tm.toFixed(2)}</strong></div><div className="kpi"><span>Skupaj m2</span><strong>{totals.m2.toFixed(2)}</strong></div><div className="kpi"><span>Vrednost zaloge</span><strong>{money(totals.value)}</strong></div></section><section className="panel"><div className="section-head"><h2>Materiali</h2><span>{data.length} artiklov</span></div><div className="dense-list">{data.map((p) => <article className="inventory-item" key={p.id}><button className="item-main" onClick={() => setExpanded(expanded === p.id ? null : p.id)}><div><strong>{p.koda} - {p.naziv_produkta}</strong><span>{p.tip.toUpperCase()} · širina {p.sirina || "/"}</span></div><div className="numbers"><b>{Number(p.totals?.kolicina_tm || 0).toFixed(2)} tm</b><b>{Number(p.totals?.kolicina_m2 || 0).toFixed(2)} m2</b><b>{money(p.totals?.vrednost_zaloge)}</b></div></button>{expanded === p.id && <div className="lot-list">{(p.lotProdukti || []).length === 0 ? <p className="muted">Ni aktivnih LOTov.</p> : p.lotProdukti.map((lot) => <div className="lot-row" key={lot.id}><span>LOT</span>{edit[lot.id] !== undefined ? <input value={edit[lot.id]} onChange={(e) => setEdit({ ...edit, [lot.id]: e.target.value })} /> : <strong>{lot.lot_stevilka || "/"}</strong>}<span>{Number(lot.kolicina_tm).toFixed(2)} {p.tip === "adr" ? "kos" : "tm"}</span><span>{lot.kolicina_m2 ? `${Number(lot.kolicina_m2).toFixed(2)} m2` : "/"}</span>{canEdit && (edit[lot.id] !== undefined ? <button className="btn secondary" onClick={() => saveLot(lot.id)}>Shrani</button> : <button className="icon-btn" onClick={() => setEdit({ ...edit, [lot.id]: lot.lot_stevilka || "" })}>✎</button>)}</div>)}</div>}</article>)}</div></section></div>;
}

function DetailModal({ naloga, role, onClose, onEdit, reload, notify }) {
  const [cena, setCena] = useState("");
  const [ddv, setDdv] = useState(22);
  const canConfirm = role === "admin" && naloga.stevilka_racuna && naloga.materiali?.length >= 1 && cena;
  async function done() { await api.dokoncajNaloga(naloga.id); notify("Naloga je označena kot dokončana."); onClose(); reload(); }
  async function confirm() { await api.potrdiNaloga(naloga.id, { cena_dela_neto: Number(cena), ddv_stopnja: Number(ddv) }); notify("Naloga je potrjena s ceno."); onClose(); reload(); }
  return <Modal title={naloga.naziv_projekta} onClose={onClose}><div className="detail-grid"><div><span>Št. DN</span><strong>{naloga.stevilka_delovnega_naloga}</strong></div><div><span>Status</span><Badge value={naloga.status} /></div><div><span>Datum</span><strong>{d(naloga.datum)}</strong></div><div><span>Št. računa</span><strong>{naloga.stevilka_racuna || "/"}</strong></div><div><span>Kontakt</span><strong>{naloga.kontakt_ime}</strong><small>{[naloga.kontakt_gsm, naloga.kontakt_email].filter(Boolean).join(" · ")}</small></div>{naloga.vozilo && <div><span>Vozilo</span><strong>{naloga.vozilo.znamka_vozila}</strong><small>{naloga.vozilo.registrska_stevilka || "/"} · {naloga.vozilo.stevilka_sasije}</small></div>}<div className="wide"><span>Opis</span><p>{naloga.opis || "/"}</p></div></div>{naloga.poskodbe?.length > 0 && <div className="chips">{naloga.poskodbe.map((p) => <span key={p.id || p.opis}>{p.opis}</span>)}</div>}<h3>Poraba materiala</h3><table><thead><tr><th>LOT</th><th>Material</th><th>tm</th><th>m2</th><th>Vrednost</th></tr></thead><tbody>{(naloga.materiali || []).map((m) => <tr key={m.id}><td>{m.lotProdukt?.lot_stevilka || "/"}</td><td>{m.lotProdukt?.produkt?.naziv_produkta}</td><td>{Number(m.kolicina_tm).toFixed(2)}</td><td>{m.kolicina_m2 ? Number(m.kolicina_m2).toFixed(2) : "/"}</td><td>{money(m.vrednost)}</td></tr>)}</tbody></table><div className="total-line">Skupaj material: <strong>{money(naloga.cena_materiala)}</strong></div>{naloga.slike?.length > 0 && <div className="thumbs">{naloga.slike.map((s) => <div className="thumb" key={s.id}><img src={s.url} alt="Naloga" /></div>)}</div>}<div className="form-actions"><button className="btn secondary" onClick={onEdit}>Uredi</button>{role === "admin" && naloga.status !== "potrjena" && <><button className="btn secondary" onClick={done}>Označi kot dokončano</button><input className="short" type="number" step="0.01" value={cena} onChange={(e) => setCena(e.target.value)} placeholder="Cena dela neto" /><select className="short" value={ddv} onChange={(e) => setDdv(e.target.value)}><option value={0}>0%</option><option value={9.5}>9.5%</option><option value={22}>22%</option></select><input className="short" readOnly value={money(Number(cena || 0) * (1 + Number(ddv) / 100))} /><button className="btn primary" disabled={!canConfirm} onClick={confirm}>Potrdi s ceno</button></>}</div></Modal>;
}

function EvidenceView({ lots, role, reload, notify }) {
  const [tip, setTip] = useState("splosno");
  const [filters, setFilters] = useState({ search: "", status: "", datum_od: "", datum_do: "" });
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const load = () => api.naloge({ tip, ...filters }).then(setItems).catch((e) => notify(e.message, "error"));
  useEffect(() => { load(); }, [tip, filters.search, filters.status, filters.datum_od, filters.datum_do]);
  async function save(payload) { await api.updateNaloga(editing.id, payload); notify("Naloga je posodobljena."); setEditing(null); await load(); reload(); }
  return <div className="grid-layout"><section className="panel"><div className="segmented"><button className={cx(tip === "splosno" && "active")} onClick={() => setTip("splosno")}>Evidenca: Splošno</button><button className={cx(tip === "vozila" && "active")} onClick={() => setTip("vozila")}>Evidenca: Vozila</button></div><div className="filters"><input placeholder="Išči naloge" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /><input type="date" value={filters.datum_od} onChange={(e) => setFilters({ ...filters, datum_od: e.target.value })} /><input type="date" value={filters.datum_do} onChange={(e) => setFilters({ ...filters, datum_do: e.target.value })} /><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">Vsi statusi</option><option value="v_izdelavi">V izdelavi</option><option value="dokoncana">Dokončana</option><option value="potrjena">Potrjena</option></select><button className="btn secondary" onClick={() => setFilters({ search: "", status: "", datum_od: "", datum_do: "" })}>Počisti filtre</button></div><div className="dense-list">{items.length === 0 && <p className="muted">Ni nalogov za prikaz.</p>}{items.map((n) => <button key={n.id} className="work-item" onClick={() => setSelected(n)}><div><strong>{n.naziv_projekta}</strong><span>{d(n.datum)} · {(n.opis || "Brez opisa").slice(0, 80)}</span></div><Badge value={n.status} /></button>)}</div></section><aside>{editing ? <NalogaForm initial={editing} lots={lots} role={role} onSave={save} onCancel={() => setEditing(null)} /> : <div className="panel empty-side">Izberi nalogo za podrobnosti ali urejanje.</div>}</aside>{selected && <DetailModal naloga={selected} role={role} reload={reload} notify={notify} onClose={() => setSelected(null)} onEdit={() => { setEditing({ ...selected, slike: selected.slike?.map((s) => s.url) || [], poskodbe: selected.poskodbe?.map((p) => p.opis) || [], materiali: selected.materiali?.map((m) => ({ lot_produkt_id: m.lot_produkt_id, kolicina_tm: m.kolicina_tm })) || [] }); setSelected(null); }} />}</div>;
}

function NakupForm({ produkti, onSave, onClose, notify }) {
  const [productModal, setProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ koda: "", naziv_produkta: "", tip: "folija", sirina: "", nabavna_cena: "", prodajna_cena: "" });
  const [form, setForm] = useState({ datum: "", dobavitelj: "", stevilka_racuna: "", postavke: [{ kategorija: "material", opis: "", produkt_id: "", lot_stevilka: "", kolicina_tm: "", neto_cena: "", ddv: 22 }] });
  const rows = form.postavke.map((p) => ({ ...p, bruto_cena: Number(p.neto_cena || 0) * (1 + Number(p.ddv) / 100) }));
  const setRow = (i, patch) => setForm({ ...form, postavke: form.postavke.map((p, idx) => idx === i ? { ...p, ...patch } : p) });
  async function addProduct() { await api.createProdukt(newProduct); notify("Material je dodan."); setProductModal(false); }
  async function submit(e) { e.preventDefault(); await onSave({ ...form, postavke: rows }); }
  return <form className="panel" onSubmit={submit}><div className="form-grid"><label>Datum<input required type="date" max={new Date().toISOString().slice(0,10)} value={form.datum} onChange={(e) => setForm({ ...form, datum: e.target.value })} /></label><label>Dobavitelj<input required value={form.dobavitelj} onChange={(e) => setForm({ ...form, dobavitelj: e.target.value })} /></label><label>Številka računa<input required value={form.stevilka_racuna} onChange={(e) => setForm({ ...form, stevilka_racuna: e.target.value })} /></label></div><h3>Postavke računa</h3>{rows.map((row, i) => <div className="purchase-row" key={i}><select value={row.kategorija} onChange={(e) => setRow(i, { kategorija: e.target.value })}>{CATS.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}</select>{row.kategorija === "material" ? <><select value={row.produkt_id} onChange={(e) => setRow(i, { produkt_id: e.target.value })}><option value="">Izberi material</option>{produkti.map((p) => <option key={p.id} value={p.id}>{p.koda} - {p.naziv_produkta}</option>)}</select><input value={row.lot_stevilka} onChange={(e) => setRow(i, { lot_stevilka: e.target.value })} placeholder="LOT št." /><input type="number" step="0.01" value={row.kolicina_tm} onChange={(e) => setRow(i, { kolicina_tm: e.target.value })} placeholder="Količina tm" /><button type="button" className="btn secondary" onClick={() => setProductModal(true)}>+ Material</button></> : <input value={row.opis} onChange={(e) => setRow(i, { opis: e.target.value })} placeholder="Opis" />}<input required type="number" step="0.01" value={row.neto_cena} onChange={(e) => setRow(i, { neto_cena: e.target.value })} placeholder="Neto" /><select value={row.ddv} onChange={(e) => setRow(i, { ddv: e.target.value })}><option value={0}>0%</option><option value={9.5}>9.5%</option><option value={22}>22%</option></select><strong>{money(row.bruto_cena)}</strong><button type="button" className="icon-btn danger" onClick={() => setForm({ ...form, postavke: form.postavke.filter((_, idx) => idx !== i) })}>×</button></div>)}<div className="form-actions"><button type="button" className="btn secondary" onClick={() => setForm({ ...form, postavke: [...form.postavke, { kategorija: "material", opis: "", produkt_id: "", lot_stevilka: "", kolicina_tm: "", neto_cena: "", ddv: 22 }] })}>+ Dodaj postavko</button><span>Skupni neto: <strong>{money(rows.reduce((s, p) => s + Number(p.neto_cena || 0), 0))}</strong></span><span>Skupni bruto: <strong>{money(rows.reduce((s, p) => s + p.bruto_cena, 0))}</strong></span><button type="button" className="btn secondary" onClick={onClose}>Zapri</button><button className="btn primary">Shrani nakup</button></div>{productModal && <Modal title="Dodaj material" onClose={() => setProductModal(false)}><div className="form-grid"><label>Koda<input value={newProduct.koda} onChange={(e) => setNewProduct({ ...newProduct, koda: e.target.value })} /></label><label>Naziv<input value={newProduct.naziv_produkta} onChange={(e) => setNewProduct({ ...newProduct, naziv_produkta: e.target.value })} /></label><label>Tip<select value={newProduct.tip} onChange={(e) => setNewProduct({ ...newProduct, tip: e.target.value, sirina: e.target.value === "adr" ? "" : newProduct.sirina })}><option value="folija">Folija</option><option value="adr">ADR</option></select></label><label>Širina<select disabled={newProduct.tip === "adr"} value={newProduct.sirina} onChange={(e) => setNewProduct({ ...newProduct, sirina: e.target.value })}><option value="">Ni aplicabilno</option>{[0.6, 1.06, 1.23, 1.37, 1.523, 1.6].map((w) => <option key={w} value={w}>{w}</option>)}</select></label><label>Nabavna cena<input type="number" step="0.01" value={newProduct.nabavna_cena} onChange={(e) => setNewProduct({ ...newProduct, nabavna_cena: e.target.value })} /></label><label>Prodajna cena<input type="number" step="0.01" value={newProduct.prodajna_cena} onChange={(e) => setNewProduct({ ...newProduct, prodajna_cena: e.target.value })} /></label></div><button className="btn primary" onClick={addProduct}>Dodaj</button></Modal>}</form>;
}

function AnalysisView({ produkti, reload, notify }) {
  const [tab, setTab] = useState("nakupi");
  const [summary, setSummary] = useState(null);
  const [nakupi, setNakupi] = useState([]);
  const [prodaja, setProdaja] = useState([]);
  const [showNakup, setShowNakup] = useState(false);
  const [showSale, setShowSale] = useState(false);
  const [sale, setSale] = useState({ datum: "", opis: "", narocnik: "", stevilka_racuna: "", neto_znesek: "", ddv: 22 });
  const load = () => Promise.all([api.analizaSummary(), api.nakupi(), api.analizaProdaja()]).then(([s, n, p]) => { setSummary(s); setNakupi(n); setProdaja(p); }).catch((e) => notify(e.message, "error"));
  useEffect(() => { load(); }, []);
  async function saveNakup(payload) { await api.createNakup(payload); notify("Nakup je shranjen."); setShowNakup(false); await load(); reload(); }
  async function saveSale(e) { e.preventDefault(); await api.createPrihodek(sale); notify("Prihodek je shranjen."); setShowSale(false); setSale({ datum: "", opis: "", narocnik: "", stevilka_racuna: "", neto_znesek: "", ddv: 22 }); await load(); }
  return <div className="stack"><section className="kpi-grid"><div className={cx("kpi hero", (summary?.razlika_neto || 0) >= 0 ? "positive" : "negative")}><span>Razlika</span><strong>{money(summary?.razlika_neto)}</strong><small>Bruto {money(summary?.razlika_bruto)}</small></div><div className="kpi"><span>Skupni prihodki</span><strong>{money(summary?.skupni_prihodi_neto)}</strong><small>Bruto {money(summary?.skupni_prihodi_bruto)}</small></div><div className="kpi"><span>Skupni stroški</span><strong>{money(summary?.skupni_stroski_neto)}</strong><small>Bruto {money(summary?.skupni_stroski_bruto)}</small></div></section><section className="panel"><div className="section-head"><div className="segmented"><button className={cx(tab === "nakupi" && "active")} onClick={() => setTab("nakupi")}>NAKUPI (Stroški)</button><button className={cx(tab === "prodaja" && "active")} onClick={() => setTab("prodaja")}>PRODAJA (Prihodki)</button></div>{tab === "nakupi" ? <button className="btn primary" onClick={() => setShowNakup(true)}>+ Dodaj nakup</button> : <button className="btn primary" onClick={() => setShowSale(true)}>+ Dodaj prodajo</button>}</div>{tab === "nakupi" ? <table><thead><tr><th>Datum</th><th>Dobavitelj</th><th>Št. računa</th><th>Neto</th><th>Bruto</th></tr></thead><tbody>{nakupi.map((n) => <tr key={n.id}><td>{d(n.datum)}</td><td>{n.dobavitelj}</td><td>{n.stevilka_racuna}</td><td>{money(n.neto_znesek)}</td><td>{money(n.bruto_znesek)}</td></tr>)}</tbody></table> : <table><thead><tr><th>Datum</th><th>Tip</th><th>Naročnik</th><th>Št. DN</th><th>Neto</th><th>Bruto</th></tr></thead><tbody>{prodaja.map((p) => <tr key={`${p.tip}_${p.id}`}><td>{d(p.datum)}</td><td>{p.tip === "delovna_naloga" ? "Delovna naloga" : "Drugo"}</td><td>{p.kontakt_ime || p.narocnik || "/"}</td><td>{p.stevilka_delovnega_naloga || "/"}</td><td>{money(p.neto_znesek)}</td><td>{money(p.bruto_znesek)}</td></tr>)}</tbody></table>}</section>{showNakup && <Modal title="Dodaj nakup" onClose={() => setShowNakup(false)}><NakupForm produkti={produkti} onSave={saveNakup} onClose={() => setShowNakup(false)} notify={notify} /></Modal>}{showSale && <Modal title="Dodaj prodajo" onClose={() => setShowSale(false)}><form className="form-grid" onSubmit={saveSale}><label>Datum<input required type="date" max={new Date().toISOString().slice(0,10)} value={sale.datum} onChange={(e) => setSale({ ...sale, datum: e.target.value })} /></label><label>Opis<input required value={sale.opis} onChange={(e) => setSale({ ...sale, opis: e.target.value })} /></label><label>Naročnik<input value={sale.narocnik} onChange={(e) => setSale({ ...sale, narocnik: e.target.value })} /></label><label>Številka računa<input value={sale.stevilka_racuna} onChange={(e) => setSale({ ...sale, stevilka_racuna: e.target.value })} /></label><label>Neto znesek<input required type="number" step="0.01" value={sale.neto_znesek} onChange={(e) => setSale({ ...sale, neto_znesek: e.target.value })} /></label><label>DDV<select value={sale.ddv} onChange={(e) => setSale({ ...sale, ddv: e.target.value })}><option value={0}>0%</option><option value={9.5}>9.5%</option><option value={22}>22%</option></select></label><label>Bruto<input readOnly value={money(Number(sale.neto_znesek || 0) * (1 + Number(sale.ddv) / 100))} /></label><button className="btn primary">Shrani prihodek</button></form></Modal>}</div>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("zaloga");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [zaloga, setZaloga] = useState([]);
  const [produkti, setProdukti] = useState([]);
  const [lots, setLots] = useState([]);
  const notify = (message, type = "success") => { setToast({ message, type }); setTimeout(() => setToast(null), 5000); };
  async function loadData() { const [z, p, l] = await Promise.all([api.zaloga(), api.produkti(), api.lots()]); setZaloga(z); setProdukti(p); setLots(l); }
  async function loadUser() { const profile = await api.me(); setUser(profile); return profile; }
  async function boot(session) {
    setLoading(true);
    try {
      if (session) {
        await loadUser();
        await loadData();
      } else {
        setUser(null);
      }
    } catch (e) {
      if (!String(e.message).toLowerCase().includes("token")) notify(e.message, "error");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) boot(data.session);
    }).catch((e) => {
      if (mounted) {
        notify(e.message, "error");
        setLoading(false);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        if (mounted) boot(session);
      }, 0);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);
  async function logout() { await supabase.auth.signOut(); setUser(null); }
  if (loading) return <div className="loading">Nalagam...</div>;
  if (!user) return <><LoginPage notify={notify} onLogin={async () => { await loadUser(); await loadData(); }} /><Toast toast={toast} /></>;
  return <div className="app"><Header user={user} tab={tab} setTab={setTab} logout={logout} /><main className="content">{tab === "zaloga" && <ZalogaView data={zaloga} role={user.role} reload={loadData} notify={notify} />}{tab === "naloge" && <NalogaForm lots={lots} role={user.role} onSave={async (payload) => { await api.createNaloga(payload); notify("Delovni nalog je ustvarjen."); await loadData(); }} />}{tab === "evidenca" && <EvidenceView lots={lots} role={user.role} reload={loadData} notify={notify} />}{tab === "analiza" && <AnalysisView produkti={produkti} reload={loadData} notify={notify} />}</main><Toast toast={toast} /></div>;
}
