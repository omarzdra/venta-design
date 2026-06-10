import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./lib/api";
import { supabase } from "./lib/supabaseClient";
import { CATS, CAT_LABEL } from "./constants/categories";
import { DAMAGE } from "./constants/damage";
import { TABS } from "./constants/tabs";
import { calcDnevniTotal, calcMaterialCost, calcMaterialTotal, calcStoritveCost, calcStoritveTotal, materialQtyM2 } from "./utils/calculations";
import { Badge } from "./components/ui/Badge";
import { LoadingPopup } from "./components/ui/LoadingPopup";
import { Modal } from "./components/ui/Modal";
import { Toast } from "./components/ui/Toast";
import { clearForm, loadForm, saveForm } from "./utils/formStorage";
import { cx, d, money } from "./utils/formatters";
import logoSvg from "./assets/logo.png";

const emptyTask = (tip = "splosno") => ({ tip, naziv_projekta: "", status: "v_izdelavi", stevilka_racuna: "", opis: "", opomba: "", kontakt_ime: "", kontakt_gsm: "", kontakt_email: "", cena_dela_neto: "", ddv_stopnja: 22, vozilo: { registrska_stevilka: "", stevilka_sasije: "", znamka_vozila: "" }, poskodbe: [], materiali: [], storitve: [], dnevniStrosek: { dnevni_strosek: "", stevilo_dni: "" }, slike: [] });

function PencilIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
function imageFileName(image) {
  const fallback = `naloga-slika-${image?.id || Date.now()}.jpg`;
  const rawName = image?.url?.split("/").pop()?.split("?")[0];
  return rawName ? decodeURIComponent(rawName) : fallback;
}

async function downloadImage(image, notify) {
  const filename = imageFileName(image);
  try {
    const response = await fetch(image.url);
    if (!response.ok) throw new Error("Prenos slike ni uspel.");
    const blobUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    window.open(image.url, "_blank", "noopener,noreferrer");
    notify?.("Slika se je odprla v novem zavihku. Tam jo lahko shranis.", "error");
  }
}

function PictureViewer({ image, onClose, notify }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!image) return null;
  return (
    <div className="picture-viewer" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="picture-viewer-inner" onClick={(event) => event.stopPropagation()}>
        <div className="picture-viewer-actions">
          <button type="button" className="btn secondary" onClick={() => downloadImage(image, notify)}>Prenesi</button>
          <button type="button" className="icon-btn" aria-label="Zapri pregled slike" onClick={onClose}>x</button>
        </div>
        <img src={image.url} alt="Slika delovnega naloga" />
      </div>
    </div>
  );
}

function SearchSelect({ options, value, onChange, placeholder, disabled = false, clearable = true }) {
  const selected = options.find((o) => String(o.value) === String(value));
  const [query, setQuery] = useState(selected?.label || "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const filtered = options.filter((o) => `${o.label} ${o.sub || ""}`.toLowerCase().includes(query.toLowerCase()));
  const choose = (option) => { onChange(option.value); setQuery(option.label); setOpen(false); };
  return <div className="search-select" ref={ref}>
    <input disabled={disabled} value={open ? query : selected?.label || query} placeholder={placeholder} onFocus={() => { setQuery(""); setOpen(true); }} onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }} onKeyDown={(e) => {
      if (!open && ["ArrowDown", "ArrowUp"].includes(e.key)) setOpen(true);
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
      if (e.key === "Enter" && open && filtered[active]) { e.preventDefault(); choose(filtered[active]); }
      if (e.key === "Escape") setOpen(false);
    }} />
    {clearable && value && <button type="button" className="search-select-clear" onClick={() => { onChange(""); setQuery(""); }}>x</button>}
    {open && !disabled && <div className="search-select-dropdown">
      {filtered.length === 0 ? <div className="search-select-empty">Ni zadetkov.</div> : filtered.map((option, i) => <div key={option.value} className={cx("search-select-option", i === active && "active")} onMouseDown={(e) => { e.preventDefault(); choose(option); }}><strong>{option.label}</strong>{option.sub && <small>{option.sub}</small>}</div>)}
    </div>}
  </div>;
}

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
    } catch { notify("Napacno uporabnisko ime ali geslo.", "error"); }
    finally { setBusy(false); }
  }
  return <main className="login-shell"><form className="panel login-panel" onSubmit={submit}><img src={logoSvg} alt="Venta Design" className="login-logo" /><h1>Prijava</h1><label>Uporabnisko ime<input required value={username} onChange={(e) => setUsername(e.target.value)} /></label><label>Geslo<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label><button className="btn primary" disabled={busy}>{busy ? "Vstopam..." : "Vstopi"}</button></form></main>;
}

function Header({ user, tab, setTab, logout }) {
  const tabs = useMemo(() => TABS.filter((t) => t.roles.includes(user.role)), [user.role]);
  useEffect(() => { if (!tabs.some((t) => t.id === tab)) setTab(tabs[0]?.id || "zaloga"); }, [tab, tabs, setTab]);
  return <>
    <header className="topbar"><div className="brand"><img src={logoSvg} alt="Venta Design" /><div><strong>Venta Design</strong><span>{user.username} - {user.role}</span></div></div><nav className="tabs">{tabs.map((t) => <button key={t.id} className={cx("tab", tab === t.id && "active")} onClick={() => setTab(t.id)}>{t.label}</button>)}</nav><button className="btn ghost" onClick={logout}>Odjava</button></header>
    <nav className="tab-bar-mobile">{tabs.map((t) => <button key={t.id} className={cx(tab === t.id && "active")} onClick={() => setTab(t.id)}>{t.mobileLabel}</button>)}</nav>
  </>;
}

function ProductFormModal({ title = "Dodaj material", onClose, onSaved }) {
  const [form, setForm] = useState({ koda: "", naziv_produkta: "", tip: "folija", sirina: "", nabavna_cena: "", prodajna_cena: "", dobavitelj: "" });
  async function save() {
    const payload = { ...form, sirina: form.tip === "folija" ? form.sirina : "" };
    const created = await api.createProdukt(payload);
    await onSaved(created);
    onClose();
  }
  return <Modal title={title} onClose={onClose}><div className="form-grid"><label>Koda<input value={form.koda} onChange={(e) => setForm({ ...form, koda: e.target.value })} /></label><label>Naziv<input value={form.naziv_produkta} onChange={(e) => setForm({ ...form, naziv_produkta: e.target.value })} /></label><label>Tip<select value={form.tip} onChange={(e) => setForm({ ...form, tip: e.target.value, sirina: e.target.value === "folija" ? form.sirina : "" })}><option value="folija">Folija</option><option value="adr">ADR</option><option value="tabla">Tabla</option></select></label><label>Sirina<select disabled={form.tip !== "folija"} value={form.sirina} onChange={(e) => setForm({ ...form, sirina: e.target.value })}><option value="">Ni aplicabilno</option>{[0.6, 1.06, 1.23, 1.37, 1.523, 1.6].map((w) => <option key={w} value={w}>{w}</option>)}</select></label><label>Nabavna cena EUR/m2<input type="number" step="0.01" value={form.nabavna_cena} onChange={(e) => setForm({ ...form, nabavna_cena: e.target.value })} /></label><label>Prodajna cena EUR/m2<input type="number" step="0.01" value={form.prodajna_cena} onChange={(e) => setForm({ ...form, prodajna_cena: e.target.value })} /></label><label>Dobavitelj<input value={form.dobavitelj} onChange={(e) => setForm({ ...form, dobavitelj: e.target.value })} /></label></div><div className="form-actions"><button className="btn secondary" onClick={onClose}>Preklici</button><button className="btn primary" onClick={save}>Shrani</button></div></Modal>;
}

function MaterialRowItem({ row, idx, lots, update, remove }) {
  const lot = lots.find((l) => Number(l.id) === Number(row.lot_produkt_id));
  const produkt = lot?.produkt;
  const isAdr = produkt?.tip === "adr";
  const isTabla = produkt?.tip === "tabla";
  const tm = row.kolicina_tm || "";
  const m2 = row.kolicina_m2 !== undefined ? row.kolicina_m2 : (produkt?.sirina && tm ? (Number(tm) * produkt.sirina).toFixed(2) : isTabla ? tm : "");
  const overStock = lot && Number(row.kolicina_tm || 0) > Number(lot.kolicina_tm || 0);
  const options = lots.map((l) => ({ value: l.id, label: `${l.lot_stevilka || "/"} - ${l.produkt?.koda} - ${l.produkt?.naziv_produkta}`, sub: `${l.produkt?.tip === "adr" ? "kos" : l.produkt?.tip === "tabla" ? "m2" : "tm"}: ${Number(l.kolicina_tm).toFixed(2)}` }));
  return <div className="material-row">
    <SearchSelect options={options} value={row.lot_produkt_id} onChange={(val) => update(idx, { lot_produkt_id: val, kolicina_tm: "", kolicina_m2: "" })} placeholder="Izberi LOT ali material..." />
    {isAdr ? <><input type="number" min="0" step="0.01" value={tm} onChange={(e) => update(idx, { kolicina_tm: e.target.value, kolicina_m2: "" })} placeholder="Kolicina (kos)" /><div /></> : isTabla ? <><input type="number" min="0" step="0.01" value={tm} onChange={(e) => update(idx, { kolicina_tm: e.target.value, kolicina_m2: e.target.value })} placeholder="Kolicina m2" /><div /></> : <><input type="number" min="0" step="0.01" value={tm} onChange={(e) => update(idx, { kolicina_tm: e.target.value, kolicina_m2: produkt?.sirina ? (Number(e.target.value) * produkt.sirina).toFixed(2) : "" })} placeholder="Kolicina tm" /><input type="number" min="0" step="0.01" value={m2} onChange={(e) => update(idx, { kolicina_m2: e.target.value, kolicina_tm: produkt?.sirina ? (Number(e.target.value) / produkt.sirina).toFixed(2) : e.target.value })} placeholder="Kolicina m2" /></>}
    <button type="button" className="icon-btn danger" onClick={() => remove(idx)}>x</button>
    {overStock && <div className="alert-inline">Vpisana kolicina ({Number(row.kolicina_tm || 0).toFixed(2)}) presega razpolozljivo zalogo ({Number(lot.kolicina_tm || 0).toFixed(2)}).</div>}
  </div>;
}

function MaterialRows({ rows, setRows, lots, showPrices = true }) {
  const update = (i, patch) => setRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const remove = (i) => setRows(rows.filter((_, idx) => idx !== i));
  const overStock = rows.some((row) => {
    const lot = lots.find((l) => Number(l.id) === Number(row.lot_produkt_id));
    return lot && Number(row.kolicina_tm || 0) > Number(lot.kolicina_tm || 0);
  });
  return <div className="form-section"><div className="section-head"><h3>Poraba materiala</h3><button type="button" className="btn secondary" onClick={() => setRows([...rows, { lot_produkt_id: "", kolicina_tm: "", kolicina_m2: "" }])}>+ Dodaj material</button></div>{rows.map((row, i) => <MaterialRowItem key={i} idx={i} row={row} lots={lots} update={update} remove={remove} />)}{showPrices && <div className="total-line"><span>Material nabavno: <strong>{money(calcMaterialCost(rows, lots))}</strong></span><span>Material prodajno: <strong>{money(calcMaterialTotal(rows, lots))}</strong></span></div>}{overStock && <div className="alert-inline">Popravi porabo materiala, ker ena od vrstic presega zalogo.</div>}</div>;
}

const IMAGE_MAX_SIZE = 1600;
const IMAGE_QUALITY = 0.75;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

async function compressImage(file) {
  const originalDataUrl = await readFileAsDataUrl(file);
  try {
    const image = await loadImage(originalDataUrl);
    const scale = Math.min(IMAGE_MAX_SIZE / image.width, IMAGE_MAX_SIZE / image.height, 1);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return { dataUrl: originalDataUrl, filename: file.name };
    context.drawImage(image, 0, 0, width, height);
    return { dataUrl: canvas.toDataURL("image/jpeg", IMAGE_QUALITY), filename: file.name.replace(/\.[^.]+$/, "") + ".jpg" };
  } catch {
    return { dataUrl: originalDataUrl, filename: file.name };
  }
}

function ImagesInput({ value, onChange, notify }) {
  async function add(files) {
    const uploaded = [];
    for (const file of [...files]) {
      if (!file.type.startsWith("image/")) { notify?.("Naloziti je mogoce samo slike.", "error"); continue; }
      if (file.size > 5 * 1024 * 1024) { notify?.("Slika je prevelika. Najvecja velikost je 5 MB.", "error"); continue; }
      try {
        const compressed = await compressImage(file);
        const { url } = await api.uploadNalogaSlika(compressed);
        uploaded.push(url);
      } catch (error) {
        notify?.(error.message, "error");
      }
    }
    if (uploaded.length) onChange([...value, ...uploaded]);
  }
  return <div className="form-section"><div className="section-head"><h3>Slike</h3><div className="upload-actions"><label className="btn secondary">Nalozi slike<input hidden type="file" accept="image/*" multiple onChange={(e) => add(e.target.files)} /></label><label className="btn secondary">Slikaj<input hidden type="file" accept="image/*" capture="environment" onChange={(e) => add(e.target.files)} /></label></div></div><div className="thumbs">{value.map((src, i) => <div className="thumb" key={i}><img src={src} alt="Predogled" /><button type="button" onClick={() => onChange(value.filter((_, idx) => idx !== i))}>x</button></div>)}</div></div>;
}

function NalogaForm({ lots, storitve, initial, role, onSave, onConfirm, onCancel, notify }) {
  const draftKey = (tip) => tip === "vozila" ? "nalogaVozila" : tip === "vb_tisk" ? "nalogaVbTisk" : "nalogaSplosno";
  const storageKey = draftKey(initial?.tip || "splosno");
  const [form, setForm] = useState(() => initial || loadForm(storageKey) || emptyTask());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = Boolean(initial?.id);
  const admin = role === "admin";
  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const overStock = (form.materiali || []).some((row) => {
    const lot = lots.find((l) => Number(l.id) === Number(row.lot_produkt_id));
    return lot && Number(row.kolicina_tm || 0) > Number(lot.kolicina_tm || 0);
  });
  useEffect(() => {
    if (isEdit) return undefined;
    const key = draftKey(form.tip);
    const timer = setTimeout(() => saveForm(key, form), 400);
    return () => clearTimeout(timer);
  }, [form, isEdit]);
  const storitveTotal = calcStoritveTotal(form.storitve, storitve);
  const storitveCost = calcStoritveCost(form.storitve, storitve);
  const dnevniTotal = calcDnevniTotal(form.dnevniStrosek);
  const materialTotal = calcMaterialTotal(form.materiali, lots);
  const materialCost = calcMaterialCost(form.materiali, lots);
  const predvideniStrosek = materialCost + storitveCost + dnevniTotal;
  const predvidenaVrednost = materialTotal + storitveTotal + dnevniTotal;
  const cena = Number(form.cena_dela_neto || 0);
  const razlikaCena = cena - predvidenaVrednost;
  const showCosts = admin;
  const showFinanceSections = admin && form.tip !== "vb_tisk";
  const showMaterialSection = form.tip !== "vb_tisk";
  const valid = form.naziv_projekta && form.kontakt_ime && !overStock && (form.tip !== "vozila" || (form.vozilo?.znamka_vozila && form.vozilo?.stevilka_sasije));
  async function submit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = form.tip === "vb_tisk"
        ? { ...form, materiali: [], storitve: [], dnevniStrosek: null }
        : !admin
          ? { ...form, storitve: [], dnevniStrosek: null }
          : form;
      await onSave(payload);
      if (!isEdit) {
        clearForm(draftKey(form.tip));
        setForm(emptyTask(form.tip));
      }
    } finally { setIsSubmitting(false); }
  }
  async function confirmNaloga() {
    setIsSubmitting(true);
    try {
      await onConfirm?.(form);
    } finally { setIsSubmitting(false); }
  }
  const addStoritev = () => set({ storitve: [...(form.storitve || []), { storitev_id: "", stevilo_ur: "" }] });
  const updateStoritev = (i, patch) => set({ storitve: form.storitve.map((s, idx) => idx === i ? { ...s, ...patch } : s) });
  const removeStoritev = (i) => set({ storitve: form.storitve.filter((_, idx) => idx !== i) });
  return <form className="panel form-grid" onSubmit={submit}>
    <div className="segmented wide"><button type="button" className={cx(form.tip === "splosno" && "active")} disabled={isEdit} onClick={() => setForm(loadForm("nalogaSplosno") || emptyTask("splosno"))}>Splosno</button><button type="button" className={cx(form.tip === "vozila" && "active")} disabled={isEdit} onClick={() => setForm(loadForm("nalogaVozila") || emptyTask("vozila"))}>Vozila</button><button type="button" className={cx(form.tip === "vb_tisk" && "active")} disabled={isEdit} onClick={() => setForm(loadForm("nalogaVbTisk") || emptyTask("vb_tisk"))}>VB tisk</button></div>
    <div className="dn-number"><span>Stevilka DN</span><strong>{isEdit ? form.stevilka_delovnega_naloga : "Samodejno dodeljeno"}</strong></div>
    <label>Naziv projekta<input required value={form.naziv_projekta} onChange={(e) => set({ naziv_projekta: e.target.value })} /></label>
    <label>Status<select value={form.status} disabled={!admin || !isEdit} onChange={(e) => set({ status: e.target.value })}><option value="v_izdelavi">V izdelavi</option><option value="dokoncana">Dokoncano</option>{isEdit && <option value="potrjena">Potrjeno</option>}</select></label>
    <label>Stevilka racuna<input value={form.stevilka_racuna || ""} disabled={!admin} onChange={(e) => set({ stevilka_racuna: e.target.value })} />{admin && isEdit && form.status !== "potrjena" && <button type="button" className="btn primary inline-action" disabled={isSubmitting || !onConfirm} onClick={confirmNaloga}>Potrdi nalog</button>}</label>
    <label className="wide">Opis storitve<textarea value={form.opis || ""} onChange={(e) => set({ opis: e.target.value })} /></label>
    <label>Ime narocnika<input required value={form.kontakt_ime || ""} onChange={(e) => set({ kontakt_ime: e.target.value })} /></label><label>GSM<input value={form.kontakt_gsm || ""} onChange={(e) => set({ kontakt_gsm: e.target.value })} /></label><label>Email<input type="email" value={form.kontakt_email || ""} onChange={(e) => set({ kontakt_email: e.target.value })} /></label>
    <label className="wide">Opomba<textarea value={form.opomba || ""} onChange={(e) => set({ opomba: e.target.value })} /></label>
    {admin && <div className="form-section wide"><h3>Cena</h3><div className="form-grid"><label>Neto cena (EUR)<input type="number" step="0.01" value={form.cena_dela_neto || ""} onChange={(e) => set({ cena_dela_neto: e.target.value })} /></label><label>DDV<select value={form.ddv_stopnja || 22} onChange={(e) => set({ ddv_stopnja: e.target.value })}><option value={0}>0%</option><option value={9.5}>9.5%</option><option value={22}>22%</option></select></label><label>Bruto (EUR)<input readOnly value={money(cena * (1 + Number(form.ddv_stopnja || 22) / 100))} /></label></div></div>}
    {form.tip === "vozila" && <><label>Znamka vozila<input required value={form.vozilo?.znamka_vozila || ""} onChange={(e) => set({ vozilo: { ...form.vozilo, znamka_vozila: e.target.value } })} /></label><label>Registrska stevilka<input value={form.vozilo?.registrska_stevilka || ""} onChange={(e) => set({ vozilo: { ...form.vozilo, registrska_stevilka: e.target.value } })} /></label><label>Stevilka sasije VIN<input required value={form.vozilo?.stevilka_sasije || ""} onChange={(e) => set({ vozilo: { ...form.vozilo, stevilka_sasije: e.target.value } })} /></label><div className="form-section wide"><h3>Poskodbe</h3><div className="check-grid">{DAMAGE.map((item) => <label className="check" key={item}><input type="checkbox" checked={(form.poskodbe || []).includes(item)} onChange={(e) => set({ poskodbe: e.target.checked ? [...(form.poskodbe || []), item] : (form.poskodbe || []).filter((x) => x !== item) })} />{item}</label>)}</div></div></>}
    {showMaterialSection && <div className="wide"><MaterialRows rows={form.materiali || []} setRows={(materiali) => set({ materiali })} lots={lots} showPrices={showCosts} /></div>}
    {showFinanceSections && <div className="form-section wide"><div className="section-head"><h3>Storitve</h3><button type="button" className="btn secondary" onClick={addStoritev}>+ Dodaj storitev</button></div>{(form.storitve || []).map((s, i) => <div className="material-row" key={i}><SearchSelect options={storitve.map((sv) => ({ value: sv.id, label: sv.naziv, sub: `${sv.prodajna_cena ?? sv.eur_ura} EUR/uro` }))} value={s.storitev_id} onChange={(val) => updateStoritev(i, { storitev_id: val })} placeholder="Izberi storitev..." /><input type="number" step="0.01" value={s.stevilo_ur} onChange={(e) => updateStoritev(i, { stevilo_ur: e.target.value })} placeholder="Stevilo ur" /><span>{money(calcStoritveTotal([s], storitve))}</span><button type="button" className="icon-btn danger" onClick={() => removeStoritev(i)}>x</button></div>)}<div className="total-line"><span>Storitve nabavno: <strong>{money(storitveCost)}</strong></span><span>Storitve prodajno: <strong>{money(storitveTotal)}</strong></span></div></div>}
    {showFinanceSections && <div className="form-section wide"><h3>Dnevni strosek</h3><div className="form-grid"><label>Dnevni strosek (EUR/dan)<input type="number" step="0.01" value={form.dnevniStrosek?.dnevni_strosek || ""} onChange={(e) => set({ dnevniStrosek: { ...form.dnevniStrosek, dnevni_strosek: e.target.value } })} /></label><label>Stevilo dni<input type="number" min="1" value={form.dnevniStrosek?.stevilo_dni || ""} onChange={(e) => set({ dnevniStrosek: { ...form.dnevniStrosek, stevilo_dni: e.target.value } })} /></label><label>Skupaj<input readOnly value={money(dnevniTotal)} /></label></div></div>}
    <div className="wide"><ImagesInput value={form.slike || []} onChange={(slike) => set({ slike })} notify={notify} /></div>
    {showCosts && <div className="total-line wide"><span>Predviden strosek projekta: <strong>{money(predvideniStrosek)}</strong></span><span>Predvidena vrednost projekta: <strong>{money(predvidenaVrednost)}</strong></span>{cena > 0 && <span>Razlika: <strong>{money(razlikaCena)}</strong></span>}</div>}
    <div className="form-actions wide">{onCancel && <button type="button" className="btn secondary" onClick={onCancel}>Preklici</button>}<button className="btn primary" disabled={!valid || isSubmitting}>{isEdit ? (isSubmitting ? "Shranjujem..." : "Shrani spremembe") : (isSubmitting ? "Ustvarjam..." : "Ustvari nalog")}</button></div>
  </form>;
}

function InventuraModal({ onClose, notify }) {
  const [inventure, setInventure] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [datum, setDatum] = useState(new Date().toISOString().slice(0, 10));
  const load = useCallback(() => api.inventure().then(setInventure), []);
  useEffect(() => { load().catch((e) => notify(e.message, "error")); }, [load, notify]);
  async function openInventura(id) { setDetailLoading(true); try { setSelected(await api.inventura(id)); } catch (e) { notify(e.message, "error"); } finally { setDetailLoading(false); } }
  async function create() { const inv = await api.createInventura({ datum }); notify("Inventura je ustvarjena."); await load(); setSelected(inv); }
  async function toggle(lotId) {
    const updated = await api.toggleInventuraLot(selected.id, lotId);
    setSelected((prev) => prev ? { ...prev, zakljucena: updated.zakljucena, loti: prev.loti.map((l) => l.lot_produkt_id === lotId ? { ...l, oznacen: updated.oznacen } : l) } : prev);
    setInventure((prev) => prev.map((inv) => inv.id === selected.id ? { ...inv, zakljucena: updated.zakljucena } : inv));
  }
  const done = selected?.loti?.filter((l) => l.oznacen).length || 0;
  const total = selected?.loti?.length || 0;
  return <Modal title="Inventure" onClose={onClose}><div className="grid-layout"><section><div className="form-actions" style={{ justifyContent: "space-between" }}><button className="btn secondary" onClick={onClose}>Nazaj</button><label>Datum<input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} /></label><button className="btn primary" onClick={create}>+ Nova inventura</button></div><div className="dense-list">{inventure.map((inv) => <button key={inv.id} className="work-item" onClick={() => openInventura(inv.id)}><div><strong>{d(inv.datum)}</strong><span>{inv.loti_count || inv.loti?.length || 0} LOT zapisov</span></div><span className={cx("badge", inv.zakljucena && "potrjena")}>{inv.zakljucena ? "Zakljucena" : "V teku"}</span></button>)}</div></section><aside>{detailLoading ? <div className="panel empty-side">Nalaganje inventure...</div> : selected ? <section className="panel"><div className="section-head"><h2>{d(selected.datum)}</h2></div><p className="muted">{done} / {total} oznacenih</p>{done === total && total > 0 && <div className="alert-inline">Inventura zakljucena!</div>}<div className="dense-list">{selected.loti.map((l) => { const p = l.lotProdukt.produkt; return <label className="check" key={l.id}><input type="checkbox" checked={l.oznacen} onChange={() => toggle(l.lot_produkt_id)} />{p.tip === "adr" ? "" : `LOT ${l.lotProdukt.lot_stevilka || "/"} - `}{p.koda} - {p.naziv_produkta} - {Number(l.lotProdukt.kolicina_tm).toFixed(2)} {p.tip === "adr" ? "kos" : p.tip === "tabla" ? "m2" : "tm"}</label>; })}</div></section> : <div className="panel empty-side">Izberi inventuro.</div>}</aside></div></Modal>;
}

function ZalogaView({ data, role, reload, notify }) {
  const [expanded, setExpanded] = useState(null);
  const [edit, setEdit] = useState({});
  const [search, setSearch] = useState("");
  const [showProduct, setShowProduct] = useState(false);
  const [showInventura, setShowInventura] = useState(false);
  const canEdit = ["admin", "racunovodkinja"].includes(role);
  const showCosts = role !== "grega";
  const filtered = data.filter((p) => `${p.koda} ${p.naziv_produkta} ${p.dobavitelj || ""}`.toLowerCase().includes(search.toLowerCase()));
  const totals = filtered.reduce((a, p) => ({
    nabavna: a.nabavna + Number(p.totals?.nabavna_vrednost || p.totals?.vrednost_zaloge || 0),
    prodajna: a.prodajna + Number(p.totals?.prodajna_vrednost || 0),
    marza: a.marza + Number(p.totals?.marza || 0)
  }), { nabavna: 0, prodajna: 0, marza: 0 });
  async function saveLot(id) { await api.updateLot(id, { lot_stevilka: edit[id] }); notify("LOT stevilka je shranjena."); reload(); }
  return <div className="stack">
    {showCosts && <section className="kpi-row">
      <div className="kpi"><span>Nabavna vrednost</span><strong>{money(totals.nabavna)}</strong></div>
    </section>}
    <section className="panel">
      <div className="section-head"><h2>Materiali</h2><div className="form-actions"><button className="btn secondary" onClick={() => setShowInventura(true)}>+ Inventura</button>{role === "admin" && <button className="btn primary" onClick={() => setShowProduct(true)}>+ Dodaj material</button>}</div></div>
      <input placeholder="Isci po kodi, nazivu, dobavitelju..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="dense-list" style={{ marginTop: 12 }}>{filtered.map((p) => {
        const nabavna = Number(p.totals?.nabavna_vrednost || p.totals?.vrednost_zaloge || 0);
        const unit = p.tip === "adr" ? "kos" : p.tip === "tabla" ? "m2" : "tm";
        return <article className="inventory-item" key={p.id}>
          <button className="item-main" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
            <div><strong>{p.koda} - {p.naziv_produkta}</strong><span className="muted">{p.dobavitelj || "Brez dobavitelja"}</span><span>{p.tip.toUpperCase()} {p.sirina ? `- sirina ${p.sirina}` : ""}</span></div>
            <div className="numbers inventory-summary">
              <b>{Number(p.totals?.kolicina_tm || 0).toFixed(2)} {unit}</b>
              {showCosts && <b>Nabavna vrednost {money(nabavna)}</b>}
            </div>
          </button>
          {expanded === p.id && <div className="lot-list">{(p.lotProdukti || []).length === 0 ? <p className="muted">Ni aktivnih LOTov.</p> : p.lotProdukti.map((lot) => {
            const lotQtyUnit = p.tip === "adr" ? "kos" : p.tip === "tabla" ? "m2" : "tm";
            return <div className="lot-row inventory-lot-row" key={lot.id}>
              <div className="lot-identity">
                <span>LOT</span>
                {p.tip !== "adr" && edit[lot.id] !== undefined ? <input value={edit[lot.id]} onChange={(e) => setEdit({ ...edit, [lot.id]: e.target.value })} /> : <strong>{p.tip === "adr" ? "/" : lot.lot_stevilka || "/"}</strong>}
              </div>
              <div><span>Kolicina</span><strong>{Number(lot.kolicina_tm).toFixed(2)} {lotQtyUnit}</strong>{p.tip === "folija" && <small>{lot.kolicina_m2 ? `${Number(lot.kolicina_m2).toFixed(2)} m2` : "/"}</small>}</div>
              {showCosts && <div><span>Nabavna cena</span><strong>{money(lot.nabavna_cena)}</strong><small>{p.tip === "adr" ? "/kos" : "/m2"}</small></div>}
              {showCosts && <div><span>Prodajna cena</span><strong>{money(lot.prodajna_cena)}</strong><small>{p.tip === "adr" ? "/kos" : "/m2"}</small></div>}
              {showCosts && <div><span>Marza</span><strong>{money(Number(lot.prodajna_cena || 0) - Number(lot.nabavna_cena || 0))}</strong><small>na enoto</small></div>}
              {canEdit && p.tip !== "adr" && (edit[lot.id] !== undefined ? <button className="btn secondary" onClick={() => saveLot(lot.id)}>Shrani</button> : <button className="icon-btn" title="Uredi LOT" aria-label="Uredi LOT" onClick={() => setEdit({ ...edit, [lot.id]: lot.lot_stevilka || "" })}><PencilIcon /></button>)}
            </div>;
          })}</div>}
        </article>;
      })}</div>
    </section>
    {showProduct && <ProductFormModal onClose={() => setShowProduct(false)} onSaved={async () => { notify("Material je dodan."); await reload(); }} />}
    {showInventura && <InventuraModal onClose={() => setShowInventura(false)} notify={notify} />}
  </div>;
}

function DetailModal({ naloga, role, onClose, onEdit, reload, notify }) {
  const [viewerImage, setViewerImage] = useState(null);
  const canConfirm = role === "admin" && naloga.stevilka_racuna && (naloga.tip === "vb_tisk" || naloga.materiali?.length >= 1) && Number(naloga.cena_dela_neto || 0) > 0;
  const canComplete = ["admin", "grega"].includes(role) && naloga.status !== "potrjena";
  const canEditNaloga = ["admin", "grega"].includes(role);
  const showCosts = role === "admin";
  const materialCost = (naloga.materiali || []).reduce((sum, m) => sum + Number(m.kolicina_m2 || m.kolicina_tm || 0) * Number(m.lotProdukt?.nabavna_cena || 0), 0);
  const materialSale = (naloga.materiali || []).reduce((sum, m) => sum + Number(m.vrednost || 0), 0);
  const storitveCost = (naloga.storitve || []).reduce((sum, s) => sum + Number(s.stevilo_ur || 0) * Number(s.storitev?.nabavna_cena || 0), 0);
  const storitveSale = (naloga.storitve || []).reduce((sum, s) => sum + Number(s.cena_skupaj || 0), 0);
  const dnevniSale = naloga.dnevniStrosek ? Number(naloga.dnevniStrosek.skupaj || 0) : 0;
  const predvideniStrosek = materialCost + storitveCost + dnevniSale;
  const predvidenaVrednost = materialSale + storitveSale + dnevniSale;
  const razlikaCena = Number(naloga.cena_dela_neto || 0) - predvidenaVrednost;
  async function done() { await api.dokoncajNaloga(naloga.id); notify("Naloga je oznacena kot dokoncana."); if (reload) await reload(); onClose(); }
  async function confirm() { await api.potrdiNaloga(naloga.id, {}); notify("Naloga je potrjena."); if (reload) await reload(); onClose(); }
  async function removeImage(slikaId) { await api.deleteNalogaSlika(naloga.id, slikaId); notify("Slika je odstranjena."); if (reload) await reload(); onClose(); }
  return (
    <Modal title={naloga.naziv_projekta} onClose={onClose}>
      <div className="detail-grid">
        <div><span>St. DN</span><strong>{naloga.stevilka_delovnega_naloga}</strong></div>
        <div><span>Status</span><Badge value={naloga.status} /></div>
        <div><span>Datum</span><strong>{d(naloga.datum)}</strong></div>
        <div><span>St. racuna</span><strong>{naloga.stevilka_racuna || "/"}</strong></div>
        <div><span>Kontakt</span><strong>{naloga.kontakt_ime}</strong><small>{[naloga.kontakt_gsm, naloga.kontakt_email].filter(Boolean).join(" - ")}</small></div>
        {role === "admin" && naloga.cena_dela_neto && <div><span>Neto cena</span><strong>{money(naloga.cena_dela_neto)}</strong><small>Bruto {money(naloga.cena_dela_bruto)}</small></div>}
        {naloga.vozilo && <div><span>Vozilo</span><strong>{naloga.vozilo.znamka_vozila}</strong><small>{naloga.vozilo.registrska_stevilka || "/"} - {naloga.vozilo.stevilka_sasije}</small></div>}
        <div className="wide"><span>Opis</span><p>{naloga.opis || "/"}</p></div>
      </div>
      {naloga.poskodbe?.length > 0 && <div className="chips">{naloga.poskodbe.map((p) => <span key={p.id || p.opis}>{p.opis}</span>)}</div>}
      {naloga.materiali?.length > 0 && <><h3>Poraba materiala</h3><table className="mobile-cards"><thead><tr><th>LOT</th><th>Material</th><th>Kolicina</th><th>m2</th>{showCosts && <th>Nabavno</th>}{showCosts && <th>Prodajno</th>}</tr></thead><tbody>{(naloga.materiali || []).map((m) => <tr key={m.id}><td data-label="LOT">{m.lotProdukt?.produkt?.tip === "adr" ? "/" : m.lotProdukt?.lot_stevilka || "/"}</td><td data-label="Material">{m.lotProdukt?.produkt?.naziv_produkta}</td><td data-label="Kolicina">{Number(m.kolicina_tm).toFixed(2)} {m.lotProdukt?.produkt?.tip === "adr" ? "kos" : m.lotProdukt?.produkt?.tip === "tabla" ? "m2" : "tm"}</td><td data-label="m2">{m.kolicina_m2 ? Number(m.kolicina_m2).toFixed(2) : "/"}</td>{showCosts && <td data-label="Nabavno">{money(Number(m.kolicina_m2 || m.kolicina_tm || 0) * Number(m.lotProdukt?.nabavna_cena || 0))}</td>}{showCosts && <td data-label="Prodajno">{money(m.vrednost)}</td>}</tr>)}</tbody></table>{showCosts && <div className="total-line"><span>Material nabavno: <strong>{money(materialCost)}</strong></span><span>Material prodajno: <strong>{money(materialSale)}</strong></span></div>}</>}
      {showCosts && naloga.storitve?.length > 0 && <><h3>Storitve</h3><table className="mobile-cards"><thead><tr><th>Storitev</th><th>Ure</th><th>Nabavno</th><th>Prodajno</th></tr></thead><tbody>{naloga.storitve.map((s) => <tr key={s.id}><td data-label="Storitev">{s.storitev.naziv}</td><td data-label="Ure">{s.stevilo_ur}h</td><td data-label="Nabavno">{money(Number(s.stevilo_ur || 0) * Number(s.storitev?.nabavna_cena || 0))}</td><td data-label="Prodajno">{money(s.cena_skupaj)}</td></tr>)}</tbody></table></>}
      {showCosts && naloga.dnevniStrosek && <div className="total-line">Dnevni strosek: {money(naloga.dnevniStrosek.dnevni_strosek)}/dan x {naloga.dnevniStrosek.stevilo_dni} dni = <strong>{money(dnevniSale)}</strong></div>}
      {showCosts && <div className="total-line"><span>Predviden strosek projekta: <strong>{money(predvideniStrosek)}</strong></span><span>Predvidena vrednost projekta: <strong>{money(predvidenaVrednost)}</strong></span>{Number(naloga.cena_dela_neto || 0) > 0 && <span>Razlika: <strong>{money(razlikaCena)}</strong></span>}</div>}
      {naloga.slike?.length > 0 && <><h3>Slike</h3><div className="thumbs">{naloga.slike.map((s) => <div className="thumb" key={s.id}><button type="button" className="thumb-preview" title="Odpri sliko" onClick={() => setViewerImage(s)}><img src={s.url} alt="Naloga" /></button><button type="button" title="Odstrani sliko" onClick={() => removeImage(s.id)}>x</button></div>)}</div></>}
      <div className="form-actions">{canEditNaloga && <button className="btn secondary" onClick={onEdit}>Uredi</button>}{canComplete && <button className="btn secondary" onClick={done}>Oznaci kot dokoncano</button>}{role === "admin" && naloga.status !== "potrjena" && <button className="btn primary" disabled={!canConfirm} onClick={confirm}>Potrdi nalog</button>}</div>
      <PictureViewer image={viewerImage} onClose={() => setViewerImage(null)} notify={notify} />
    </Modal>
  );
}

function EvidenceView({ lots, storitve, role, reload, notify }) {
  const [tip, setTip] = useState("splosno");
  const [filters, setFilters] = useState({ search: "", status: "", datum_od: "", datum_do: "" });
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const load = useCallback(() => api.naloge({ tip, ...filters }).then(setItems).catch((e) => notify(e.message, "error")), [tip, filters, notify]);
  useEffect(() => { load(); }, [load]);
  async function save(payload) { await api.updateNaloga(editing.id, payload); notify("Naloga je posodobljena."); setEditing(null); await load(); reload(); }
  async function confirmEdit(payload) { await api.updateNaloga(editing.id, payload); const updated = await api.potrdiNaloga(editing.id, {}); notify("Naloga je potrjena."); setEditing(null); setSelected(updated); await load(); await reload(); }
  async function openDetail(id) { setDetailLoading(true); try { setSelected(await api.naloga(id)); } catch (e) { notify(e.message, "error"); } finally { setDetailLoading(false); } }
  const toEdit = (selectedNaloga) => ({ ...selectedNaloga, slike: selectedNaloga.slike?.map((s) => s.url) || [], poskodbe: selectedNaloga.poskodbe?.map((p) => p.opis) || [], materiali: selectedNaloga.materiali?.map((m) => ({ lot_produkt_id: m.lot_produkt_id, kolicina_tm: m.kolicina_tm })) || [], storitve: selectedNaloga.storitve?.map((s) => ({ storitev_id: s.storitev_id, stevilo_ur: s.stevilo_ur })) || [], dnevniStrosek: selectedNaloga.dnevniStrosek || { dnevni_strosek: "", stevilo_dni: "" } });
  return <div className="grid-layout"><section className="panel"><div className="segmented"><button className={cx(tip === "splosno" && "active")} onClick={() => setTip("splosno")}>Evidenca: Splosno</button><button className={cx(tip === "vozila" && "active")} onClick={() => setTip("vozila")}>Evidenca: Vozila</button><button className={cx(tip === "vb_tisk" && "active")} onClick={() => setTip("vb_tisk")}>Evidenca: VB tisk</button></div><div className="filters" style={{ alignItems: "end" }}><label>Iskanje<input placeholder="Isci naloge" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></label><label>Datum od<input type="date" value={filters.datum_od} onChange={(e) => setFilters({ ...filters, datum_od: e.target.value })} /></label><label>Datum do<input type="date" value={filters.datum_do} onChange={(e) => setFilters({ ...filters, datum_do: e.target.value })} /></label><label>Status<select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">Vsi statusi</option><option value="v_izdelavi">V izdelavi</option><option value="dokoncana">Dokoncana</option><option value="potrjena">Potrjena</option></select></label><button className="btn secondary" onClick={() => setFilters({ search: "", status: "", datum_od: "", datum_do: "" })}>Pocisti filtre</button></div><div className="dense-list">{items.length === 0 && <p className="muted">Ni nalogov za prikaz.</p>}{items.map((n) => <button key={n.id} className="work-item" onClick={() => openDetail(n.id)} disabled={detailLoading}><div><strong>{n.kontakt_ime}</strong><span>{n.naziv_projekta} - {d(n.datum)}</span><span>{(n.opis || "").slice(0, 60)}</span></div><Badge value={n.status} /></button>)}</div></section><aside><div className="panel empty-side">{detailLoading ? "Nalaganje podrobnosti..." : "Izberi nalogo za podrobnosti ali urejanje."}</div></aside>{selected && <DetailModal naloga={selected} role={role} reload={async () => { await load(); await reload(); }} notify={notify} onClose={() => setSelected(null)} onEdit={() => { setEditing(toEdit(selected)); setSelected(null); }} />}{editing && <Modal title={`Uredi nalog ${editing.stevilka_delovnega_naloga || ""}`} onClose={() => setEditing(null)} fullscreen><NalogaForm key={editing.id} initial={editing} lots={lots} storitve={storitve} role={role} onSave={save} onConfirm={confirmEdit} onCancel={() => setEditing(null)} notify={notify} /></Modal>}</div>;
}

function NakupForm({ produkti, onSave, onClose, notify, reload }) {
  const [productModal, setProductModal] = useState(false);
  const [form, setForm] = useState(() => loadForm("nakup") || { datum: "", dobavitelj: "", stevilka_racuna: "", postavke: [{ kategorija: "material", opis: "", produkt_id: "", lot_stevilka: "", kolicina_tm: "", neto_cena: "", ddv: 22 }] });
  useEffect(() => { const timer = setTimeout(() => saveForm("nakup", form), 400); return () => clearTimeout(timer); }, [form]);
  const rows = form.postavke.map((p) => ({ ...p, bruto_cena: Number(p.neto_cena || 0) * (1 + Number(p.ddv) / 100) }));
  const setRow = (i, patch) => setForm({ ...form, postavke: form.postavke.map((p, idx) => idx === i ? { ...p, ...patch } : p) });
  async function submit(e) { e.preventDefault(); await onSave(form); clearForm("nakup"); setForm({ datum: "", dobavitelj: "", stevilka_racuna: "", postavke: [{ kategorija: "material", opis: "", produkt_id: "", lot_stevilka: "", kolicina_tm: "", neto_cena: "", ddv: 22 }] }); }
  return <form className="panel" onSubmit={submit}><div className="form-grid"><label>Datum<input required type="date" max={new Date().toISOString().slice(0, 10)} value={form.datum} onChange={(e) => setForm({ ...form, datum: e.target.value })} /></label><label>Dobavitelj<input required value={form.dobavitelj} onChange={(e) => setForm({ ...form, dobavitelj: e.target.value })} /></label><label>Stevilka racuna<input required value={form.stevilka_racuna} onChange={(e) => setForm({ ...form, stevilka_racuna: e.target.value })} /></label></div><h3>Postavke racuna</h3>{rows.map((row, i) => { const produkt = produkti.find((p) => Number(p.id) === Number(row.produkt_id)); const kolicinaM2 = produkt ? materialQtyM2(row.kolicina_tm, produkt) : 0; const priceDiff = produkt && kolicinaM2 > 0 && Number(row.neto_cena || 0) > 0 && Math.abs((Number(row.neto_cena) / kolicinaM2) - Number(produkt.nabavna_cena)) > 0.01; return <div className="purchase-row" key={i}><select value={row.kategorija} onChange={(e) => setRow(i, { kategorija: e.target.value })}>{CATS.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}</select>{row.kategorija === "material" ? <div style={{ display: "flex", gap: "8px", flex: 1 }}><SearchSelect options={produkti.map((p) => ({ value: p.id, label: `${p.koda} - ${p.naziv_produkta}`, sub: p.dobavitelj || "" }))} value={row.produkt_id} onChange={(val) => setRow(i, { produkt_id: val })} placeholder="Izberi material" /><input style={{ width: "90px" }} value={row.lot_stevilka} onChange={(e) => setRow(i, { lot_stevilka: e.target.value })} placeholder="LOT st." /><input style={{ width: "90px" }} type="number" step="0.01" value={row.kolicina_tm} onChange={(e) => setRow(i, { kolicina_tm: e.target.value })} placeholder={produkt?.tip === "adr" ? "Kos" : produkt?.tip === "tabla" ? "m2" : "tm"} />{priceDiff && <span className="price-warn" title={`Prejsnja nabavna cena: ${produkt.nabavna_cena} EUR/m2`}>!</span>}</div> : <input style={{ flex: 1 }} value={row.opis} onChange={(e) => setRow(i, { opis: e.target.value })} placeholder="Opis" />}<input required type="number" step="0.01" value={row.neto_cena} onChange={(e) => setRow(i, { neto_cena: e.target.value })} placeholder="Neto" /><select value={row.ddv} onChange={(e) => setRow(i, { ddv: e.target.value })}><option value={0}>0%</option><option value={9.5}>9.5%</option><option value={22}>22%</option></select><strong>{money(row.bruto_cena)}</strong><button type="button" className="icon-btn danger" onClick={() => setForm({ ...form, postavke: form.postavke.filter((_, idx) => idx !== i) })}>x</button>{row.kategorija === "material" ? <button type="button" className="btn" onClick={() => setProductModal(true)}>+ Material</button> : <div />}</div>; })}<div className="form-actions"><button type="button" className="btn secondary" onClick={() => setForm({ ...form, postavke: [...form.postavke, { kategorija: "material", opis: "", produkt_id: "", lot_stevilka: "", kolicina_tm: "", neto_cena: "", ddv: 22 }] })}>+ Dodaj postavko</button><span>Skupni neto: <strong>{money(rows.reduce((s, p) => s + Number(p.neto_cena || 0), 0))}</strong></span><span>Skupni bruto: <strong>{money(rows.reduce((s, p) => s + p.bruto_cena, 0))}</strong></span><button type="button" className="btn secondary" onClick={onClose}>Zapri</button><button className="btn primary">Shrani nakup</button></div>{productModal && <ProductFormModal onClose={() => setProductModal(false)} onSaved={async () => { notify("Material je dodan."); await reload(); }} />}</form>;
}

function NakupDetailModal({ nakup, onClose }) {
  const postavke = nakup.postavke || [];
  return <Modal title={`Podrobnosti nakupa - ${nakup.stevilka_racuna || "Brez stevilke"}`} onClose={onClose}>
    <div className="detail-grid">
      <div><span>Datum</span><strong>{d(nakup.datum)}</strong></div>
      <div><span>Dobavitelj</span><strong>{nakup.dobavitelj || "/"}</strong></div>
      <div><span>Stevilka racuna</span><strong>{nakup.stevilka_racuna || "/"}</strong></div>
      <div><span>Stevilo postavk</span><strong>{postavke.length}</strong></div>
      <div><span>Neto skupaj</span><strong>{money(nakup.neto_znesek)}</strong></div>
      <div><span>Bruto skupaj</span><strong>{money(nakup.bruto_znesek)}</strong></div>
    </div>
    <h3>Postavke racuna</h3>
    <table className="mobile-cards">
      <thead><tr><th>Kategorija</th><th>Opis / material</th><th>LOT</th><th>Kolicina</th><th>Neto</th><th>DDV</th><th>Bruto</th></tr></thead>
      <tbody>{postavke.map((p) => {
        const produkt = p.produkt;
        const lot = p.lotProdukt;
        const unit = produkt?.tip === "adr" ? "kos" : produkt?.tip === "tabla" ? "m2" : "tm";
        const materialName = produkt ? `${produkt.koda} - ${produkt.naziv_produkta}` : p.opis;
        return <tr key={p.id}>
          <td data-label="Kategorija">{CAT_LABEL[p.kategorija] || p.kategorija}</td>
          <td data-label="Opis / material">{materialName || "/"}</td>
          <td data-label="LOT">{p.kategorija === "material" ? (lot?.lot_stevilka || p.lot_stevilka || "/") : "/"}</td>
          <td data-label="Kolicina">{p.kategorija === "material" ? `${Number(p.kolicina_tm || 0).toFixed(2)} ${unit}` : "/"}</td>
          <td data-label="Neto">{money(p.neto_cena)}</td>
          <td data-label="DDV">{Number(p.ddv || 0)}%</td>
          <td data-label="Bruto">{money(p.bruto_cena)}</td>
        </tr>;
      })}</tbody>
    </table>
  </Modal>;
}

function AnalysisView({ produkti, reload, notify, role }) {
  const [tab, setTab] = useState("nakupi");
  const [summary, setSummary] = useState(null);
  const [nakupi, setNakupi] = useState([]);
  const [prodaja, setProdaja] = useState([]);
  const [showNakup, setShowNakup] = useState(() => localStorage.getItem("venta_modal_nakup_open") === "true");
  const [showSale, setShowSale] = useState(() => localStorage.getItem("venta_modal_prodaja_open") === "true");
  const [sale, setSale] = useState(() => loadForm("prodaja") || { datum: "", opis: "", narocnik: "", stevilka_racuna: "", neto_znesek: "", ddv: 22 });
  const [nakupFilters, setNakupFilters] = useState({ search: "", znesek_od: "", znesek_do: "", datum_od: "", datum_do: "" });
  const [prodajaFilters, setProdajaFilters] = useState({ search: "", znesek_od: "", znesek_do: "", datum_od: "", datum_do: "", tip: "" });
  const [detailNakup, setDetailNakup] = useState(null);
  const [detailSale, setDetailSale] = useState(null);
  const loadSummary = useCallback(() => api.analizaSummary({}).then(setSummary).catch((e) => notify(e.message, "error")), [notify]);
  const loadNakupi = useCallback(() => api.nakupi({}).then(setNakupi).catch((e) => notify(e.message, "error")), [notify]);
  const loadProdaja = useCallback(() => api.analizaProdaja({ search: prodajaFilters.search }).then(setProdaja).catch((e) => notify(e.message, "error")), [notify, prodajaFilters.search]);
  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { if (tab === "nakupi") loadNakupi(); else loadProdaja(); }, [tab, loadNakupi, loadProdaja]);
  useEffect(() => { localStorage.setItem("venta_modal_nakup_open", showNakup ? "true" : "false"); }, [showNakup]);
  useEffect(() => { localStorage.setItem("venta_modal_prodaja_open", showSale ? "true" : "false"); }, [showSale]);
  useEffect(() => { const timer = setTimeout(() => saveForm("prodaja", sale), 400); return () => clearTimeout(timer); }, [sale]);
  async function saveNakup(payload) { await api.createNakup(payload); notify("Nakup je shranjen."); setShowNakup(false); await Promise.all([loadSummary(), loadNakupi()]); reload(); }
  async function saveSale(e) { e.preventDefault(); await api.createPrihodek(sale); notify("Prihodek je shranjen."); setShowSale(false); clearForm("prodaja"); setSale({ datum: "", opis: "", narocnik: "", stevilka_racuna: "", neto_znesek: "", ddv: 22 }); await Promise.all([loadSummary(), loadProdaja()]); }
  async function openNakupDetail(id) { try { setDetailNakup(await api.nakup(id)); } catch (e) { notify(e.message, "error"); } }
  async function openSaleDetail(item) { try { setDetailSale(item.izvor_tip === "delovna_naloga" ? { ...(await api.naloga(item.id)), izvor_tip: "delovna_naloga" } : item); } catch (e) { notify(e.message, "error"); } }
  const filteredNakupi = nakupi.filter((n) => !nakupFilters.search || `${n.dobavitelj} ${n.stevilka_racuna}`.toLowerCase().includes(nakupFilters.search.toLowerCase()));
  const filteredProdaja = prodaja.filter((p) => {
    const q = prodajaFilters.search.toLowerCase();
    if (q && !`${p.narocnik || p.kontakt_ime || ""} ${p.stevilka_delovnega_naloga || ""} ${p.stevilka_racuna || ""}`.toLowerCase().includes(q)) return false;
    if (prodajaFilters.tip && p.izvor_tip !== prodajaFilters.tip) return false;
    return true;
  });
  return <div className="stack"><section className="kpi-grid"><div className={cx("kpi hero", (summary?.razlika_neto || 0) >= 0 ? "positive" : "negative")}><span>Razlika</span><strong>{money(summary?.razlika_neto)}</strong><small>Bruto {money(summary?.razlika_bruto)}</small></div><div className="kpi"><span>Skupni prihodki</span><strong>{money(summary?.skupni_prihodi_neto)}</strong><small>Bruto {money(summary?.skupni_prihodi_bruto)}</small></div><div className="kpi"><span>Skupni stroski</span><strong>{money(summary?.skupni_stroski_neto)}</strong><small>Bruto {money(summary?.skupni_stroski_bruto)}</small></div></section><section className="panel"><div className="section-head"><div className="segmented"><button className={cx(tab === "nakupi" && "active")} onClick={() => setTab("nakupi")}>NAKUPI</button><button className={cx(tab === "prodaja" && "active")} onClick={() => setTab("prodaja")}>PRODAJA</button></div>{tab === "nakupi" ? <button className="btn primary" onClick={() => setShowNakup(true)}>+ Dodaj nakup</button> : <button className="btn primary" onClick={() => setShowSale(true)}>+ Dodaj prodajo</button>}</div>{tab === "nakupi" && <div className="filters"><label>Iskanje<input value={nakupFilters.search} onChange={(e) => setNakupFilters({ ...nakupFilters, search: e.target.value })} /></label></div>}{tab === "prodaja" && <div className="filters"><label>Iskanje (Narocnik, St. DN, Material)<input value={prodajaFilters.search} onChange={(e) => setProdajaFilters({ ...prodajaFilters, search: e.target.value })} placeholder="Narocnik, st. DN, koda materiala..." /></label><label>Tip<select value={prodajaFilters.tip} onChange={(e) => setProdajaFilters({ ...prodajaFilters, tip: e.target.value })}><option value="">Vsi</option><option value="delovna_naloga">Delovna naloga</option><option value="drugo">Drugo</option></select></label></div>}{tab === "nakupi" ? <table className="mobile-cards"><thead><tr><th>Datum</th><th>Dobavitelj</th><th>St. racuna</th><th>Neto</th><th>Bruto</th><th>Akcija</th></tr></thead><tbody>{filteredNakupi.map((n) => <tr key={n.id}><td data-label="Datum">{d(n.datum)}</td><td data-label="Dobavitelj">{n.dobavitelj}</td><td data-label="St. racuna">{n.stevilka_racuna}</td><td data-label="Neto">{money(n.neto_znesek)}</td><td data-label="Bruto">{money(n.bruto_znesek)}</td><td data-label="Akcija"><button className="btn secondary" onClick={() => openNakupDetail(n.id)}>Podrobnosti</button></td></tr>)}</tbody></table> : <table className="mobile-cards"><thead><tr><th>Datum</th><th>Tip</th><th>Narocnik</th><th>St. DN</th><th>Neto</th><th>Bruto</th><th>Akcija</th></tr></thead><tbody>{filteredProdaja.map((p) => <tr key={`${p.izvor_tip}_${p.id}`}><td data-label="Datum">{d(p.datum)}</td><td data-label="Tip">{p.izvor_tip === "delovna_naloga" ? "Delovna naloga" : "Drugo"}</td><td data-label="Narocnik">{p.kontakt_ime || p.narocnik || "/"}</td><td data-label="St. DN">{p.stevilka_delovnega_naloga || "/"}</td><td data-label="Neto">{money(p.neto_znesek)}</td><td data-label="Bruto">{money(p.bruto_znesek)}</td><td data-label="Akcija"><button className="btn secondary" onClick={() => openSaleDetail(p)}>Podrobnosti</button></td></tr>)}</tbody></table>}</section>{showNakup && <Modal title="Dodaj nakup" onClose={() => setShowNakup(false)}><NakupForm produkti={produkti} onSave={saveNakup} onClose={() => setShowNakup(false)} notify={notify} reload={reload} /></Modal>}{showSale && <Modal title="Dodaj prodajo" onClose={() => setShowSale(false)}><form className="form-grid" onSubmit={saveSale}><label>Datum<input required type="date" max={new Date().toISOString().slice(0, 10)} value={sale.datum} onChange={(e) => setSale({ ...sale, datum: e.target.value })} /></label><label>Opis<input required value={sale.opis} onChange={(e) => setSale({ ...sale, opis: e.target.value })} /></label><label>Narocnik<input value={sale.narocnik} onChange={(e) => setSale({ ...sale, narocnik: e.target.value })} /></label><label>Stevilka racuna<input value={sale.stevilka_racuna} onChange={(e) => setSale({ ...sale, stevilka_racuna: e.target.value })} /></label><label>Neto znesek<input required type="number" step="0.01" value={sale.neto_znesek} onChange={(e) => setSale({ ...sale, neto_znesek: e.target.value })} /></label><label>DDV<select value={sale.ddv} onChange={(e) => setSale({ ...sale, ddv: e.target.value })}><option value={0}>0%</option><option value={9.5}>9.5%</option><option value={22}>22%</option></select></label><label>Bruto<input readOnly value={money(Number(sale.neto_znesek || 0) * (1 + Number(sale.ddv) / 100))} /></label><button className="btn primary">Shrani prihodek</button></form></Modal>}{detailNakup && <NakupDetailModal nakup={detailNakup} onClose={() => setDetailNakup(null)} />}{detailSale && (detailSale.izvor_tip === "delovna_naloga" ? <DetailModal naloga={detailSale} role={role} onClose={() => setDetailSale(null)} reload={loadProdaja} notify={notify} onEdit={() => notify("Urejanje iz tega pogleda ni omogoceno.", "error")} /> : <Modal title="Podrobnosti prihodka" onClose={() => setDetailSale(null)}><div className="detail-grid"><div><span>Datum</span><strong>{d(detailSale.datum)}</strong></div><div><span>Narocnik</span><strong>{detailSale.narocnik || "/"}</strong></div><div><span>Opis</span><strong>{detailSale.opis || "/"}</strong></div><div><span>Neto</span><strong>{money(detailSale.neto_znesek)}</strong></div></div></Modal>)}</div>;
}

function StoritveView({ storitve, reload, notify }) {
  const [editing, setEditing] = useState(null);
  const empty = { naziv: "", nabavna_cena: "", prodajna_cena: "" };
  const [form, setForm] = useState(empty);
  async function save(e) { e.preventDefault(); if (editing) await api.updateStoritev(editing.id, form); else await api.createStoritev(form); notify("Storitev je shranjena."); setEditing(null); setForm(empty); await reload(); }
  async function del(id) { await api.deleteStoritev(id); notify("Storitev je izbrisana."); await reload(); }
  return <div className="stack"><section className="panel"><div className="section-head"><h2>Storitve</h2></div><form className="form-grid" onSubmit={save}><label>Naziv<input required value={form.naziv} onChange={(e) => setForm({ ...form, naziv: e.target.value })} /></label><label>Nabavna cena EUR/ura<input required type="number" step="0.01" value={form.nabavna_cena} onChange={(e) => setForm({ ...form, nabavna_cena: e.target.value })} /></label><label>Prodajna cena EUR/ura<input required type="number" step="0.01" value={form.prodajna_cena} onChange={(e) => setForm({ ...form, prodajna_cena: e.target.value })} /></label><div className="form-actions wide"><button className="btn primary">Shrani</button>{editing && <button type="button" className="btn secondary" onClick={() => { setEditing(null); setForm(empty); }}>Preklici</button>}</div></form><table className="mobile-cards"><thead><tr><th>Naziv</th><th>Nabavna EUR/ura</th><th>Prodajna EUR/ura</th><th>Dobicek EUR/ura</th><th>Akcije</th></tr></thead><tbody>{storitve.map((s) => { const nabavna = Number(s.nabavna_cena || 0); const prodajna = Number(s.prodajna_cena ?? s.eur_ura ?? 0); return <tr key={s.id}><td data-label="Naziv">{s.naziv}</td><td data-label="Nabavna EUR/ura">{money(nabavna)}</td><td data-label="Prodajna EUR/ura">{money(prodajna)}</td><td data-label="Dobicek EUR/ura">{money(prodajna - nabavna)}</td><td data-label="Akcije"><button className="btn secondary" onClick={() => { setEditing(s); setForm({ naziv: s.naziv, nabavna_cena: s.nabavna_cena || "", prodajna_cena: s.prodajna_cena ?? s.eur_ura ?? "" }); }}>Uredi</button> <button className="btn secondary danger" onClick={() => del(s.id)}>Zbrisi</button></td></tr>; })}</tbody></table></section></div>;
}

function PonudbaView({ produkti, lots, storitve, setPreneseniPodatki, setTab }) {
  const [form, setForm] = useState({ tip: "splosno", materiali: [], storitve: [], dnevniStrosek: { dnevni_strosek: "", stevilo_dni: "" } });
  const setRows = (key, rows) => setForm({ ...form, [key]: rows });
  const materialRows = form.materiali.map((m) => ({ ...m, produkt: produkti.find((p) => Number(p.id) === Number(m.produkt_id)) }));
  const nabavna = materialRows.reduce((s, m) => s + materialQtyM2(m.kolicina_tm, m.produkt) * Number(m.produkt?.nabavna_cena || 0), 0);
  const prodajna = materialRows.reduce((s, m) => s + materialQtyM2(m.kolicina_tm, m.produkt) * Number(m.produkt?.prodajna_cena || 0), 0);
  const storitveTotal = calcStoritveTotal(form.storitve, storitve);
  const storitveCost = calcStoritveCost(form.storitve, storitve);
  const dnevniTotal = calcDnevniTotal(form.dnevniStrosek);
  const totalSale = prodajna + storitveTotal + dnevniTotal;
  const totalCost = nabavna + storitveCost + dnevniTotal;
  function prenesiVNalogo() {
    const materiali = form.materiali.map((m) => {
      const firstLot = lots.filter((l) => Number(l.produkt_id) === Number(m.produkt_id) && Number(l.kolicina_tm) > 0).sort((a, b) => new Date(a.datum_prevzema) - new Date(b.datum_prevzema))[0];
      return firstLot ? { lot_produkt_id: firstLot.id, kolicina_tm: m.kolicina_tm } : null;
    }).filter(Boolean);
    setPreneseniPodatki({ ...emptyTask(form.tip), materiali, storitve: form.storitve, dnevniStrosek: form.dnevniStrosek });
    setTab("naloge");
  }
  return <div className="stack"><section className="panel form-grid"><div className="segmented wide"><button className={cx(form.tip === "splosno" && "active")} onClick={() => setForm({ ...form, tip: "splosno" })}>Splosno</button><button className={cx(form.tip === "vozila" && "active")} onClick={() => setForm({ ...form, tip: "vozila" })}>Vozila</button></div><div className="form-section wide"><div className="section-head"><h3>Materiali</h3><button className="btn secondary" onClick={() => setRows("materiali", [...form.materiali, { produkt_id: "", kolicina_tm: "" }])}>+ Dodaj material</button></div>{form.materiali.map((m, i) => { const produkt = produkti.find((p) => Number(p.id) === Number(m.produkt_id)); return <div className="material-row" key={i}><SearchSelect options={produkti.map((p) => ({ value: p.id, label: `${p.koda} - ${p.naziv_produkta}`, sub: p.dobavitelj || "" }))} value={m.produkt_id} onChange={(val) => setRows("materiali", form.materiali.map((r, idx) => idx === i ? { ...r, produkt_id: val } : r))} placeholder="Izberi produkt" /><input type="number" step="0.01" value={m.kolicina_tm} onChange={(e) => setRows("materiali", form.materiali.map((r, idx) => idx === i ? { ...r, kolicina_tm: e.target.value } : r))} placeholder={produkt?.tip === "adr" ? "Kos" : produkt?.tip === "tabla" ? "m2" : "tm"} /><span>{money(materialQtyM2(m.kolicina_tm, produkt) * Number(produkt?.prodajna_cena || 0))}</span><button className="icon-btn danger" onClick={() => setRows("materiali", form.materiali.filter((_, idx) => idx !== i))}>x</button></div>; })}</div><div className="form-section wide"><div className="section-head"><h3>Storitve</h3><button className="btn secondary" onClick={() => setRows("storitve", [...form.storitve, { storitev_id: "", stevilo_ur: "" }])}>+ Dodaj storitev</button></div>{form.storitve.map((s, i) => <div className="material-row" key={i}><SearchSelect options={storitve.map((sv) => ({ value: sv.id, label: sv.naziv, sub: `${sv.prodajna_cena ?? sv.eur_ura} EUR/uro` }))} value={s.storitev_id} onChange={(val) => setRows("storitve", form.storitve.map((r, idx) => idx === i ? { ...r, storitev_id: val } : r))} placeholder="Izberi storitev" /><input type="number" step="0.01" value={s.stevilo_ur} onChange={(e) => setRows("storitve", form.storitve.map((r, idx) => idx === i ? { ...r, stevilo_ur: e.target.value } : r))} placeholder="Ure" /><span>{money(calcStoritveTotal([s], storitve))}</span><button className="icon-btn danger" onClick={() => setRows("storitve", form.storitve.filter((_, idx) => idx !== i))}>x</button></div>)}</div><div className="form-section wide"><h3>Dnevni strosek</h3><div className="form-grid"><label>EUR/dan<input type="number" step="0.01" value={form.dnevniStrosek.dnevni_strosek} onChange={(e) => setForm({ ...form, dnevniStrosek: { ...form.dnevniStrosek, dnevni_strosek: e.target.value } })} /></label><label>Dni<input type="number" min="1" value={form.dnevniStrosek.stevilo_dni} onChange={(e) => setForm({ ...form, dnevniStrosek: { ...form.dnevniStrosek, stevilo_dni: e.target.value } })} /></label><label>Skupaj<input readOnly value={money(dnevniTotal)} /></label></div></div><div className="panel wide"><h3>Povzetek ponudbe</h3><p>Nabavna vrednost materialov: <strong>{money(nabavna)}</strong></p><p>Prodajna vrednost materialov: <strong>{money(prodajna)}</strong></p><p>Storitve nabavno: <strong>{money(storitveCost)}</strong></p><p>Storitve prodajno: <strong>{money(storitveTotal)}</strong></p><p>Dnevni strosek: <strong>{money(dnevniTotal)}</strong></p><hr /><p>Skupna prodajna vrednost: <strong>{money(totalSale)}</strong></p><p>Skupna nabavna vrednost: <strong>{money(totalCost)}</strong></p><p>Marza: <strong>{money(totalSale - totalCost)} ({totalSale ? (((totalSale - totalCost) / totalSale) * 100).toFixed(1) : 0}%)</strong></p><button className="btn primary" onClick={prenesiVNalogo}>Prenesi v Delovni Nalog</button></div></section></div>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("zaloga");
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [zaloga, setZaloga] = useState([]);
  const [produkti, setProdukti] = useState([]);
  const [lots, setLots] = useState([]);
  const [storitve, setStoritve] = useState([]);
  const [preneseniPodatki, setPreneseniPodatki] = useState(null);
  const notify = useCallback((message, type = "success") => { setToast({ message, type }); setTimeout(() => setToast(null), 5000); }, []);
  const loadZaloga = useCallback(async function loadZaloga() { setZaloga(await api.zaloga()); }, []);
  const loadProdukti = useCallback(async function loadProdukti() { setProdukti(await api.produkti()); }, []);
  const loadLots = useCallback(async function loadLots() { setLots(await api.lots()); }, []);
  const loadStoritve = useCallback(async function loadStoritve() { setStoritve(await api.storitve()); }, []);
  const loadTaskData = useCallback(async function loadTaskData() { await Promise.all([loadLots(), loadStoritve()]); }, [loadLots, loadStoritve]);
  const loadOfferData = useCallback(async function loadOfferData() { await Promise.all([loadProdukti(), loadLots(), loadStoritve()]); }, [loadProdukti, loadLots, loadStoritve]);
  const loadUser = useCallback(async function loadUser() { const profile = await api.me(); setUser(profile); return profile; }, []);
  const boot = useCallback(async function boot(session, showLoading = false, markAuthChecked = false) { if (showLoading) setLoading(true); try { if (session) { await loadUser(); } else { setUser(null); } } catch { setUser(null); } finally { if (showLoading) setLoading(false); if (markAuthChecked) setAuthChecked(true); } }, [loadUser]);
  useEffect(() => { let mounted = true; supabase.auth.getSession().then(({ data }) => { if (mounted) boot(data.session, true, true); }).catch((e) => { if (mounted) { notify(e.message, "error"); setLoading(false); setAuthChecked(true); } }); const { data } = supabase.auth.onAuthStateChange((_event, session) => { setTimeout(() => { if (mounted) boot(session, false); }, 0); }); return () => { mounted = false; data.subscription.unsubscribe(); }; }, [boot, notify]);
  useEffect(() => { if (!user) return; const loaders = { zaloga: loadZaloga, naloge: loadTaskData, evidenca: loadTaskData, storitve: loadStoritve, ponudba: loadOfferData, analiza: loadProdukti }; loaders[tab]?.().catch((e) => notify(e.message, "error")); }, [user, tab, loadZaloga, loadTaskData, loadStoritve, loadOfferData, loadProdukti, notify]);
  async function logout() { await supabase.auth.signOut(); setUser(null); }
  const initialNaloga = preneseniPodatki;
  if (!authChecked) return <div className="app"><LoadingPopup /></div>;
  if (!user) return <><LoginPage notify={notify} onLogin={loadUser} /><Toast toast={toast} /></>;
  return <div className="app"><Header user={user} tab={tab} setTab={setTab} logout={logout} /><main className="content">{tab === "zaloga" && <ZalogaView data={zaloga} role={user.role} reload={loadZaloga} notify={notify} />}{tab === "naloge" && <NalogaForm key={initialNaloga ? "prenesi" : "new"} initial={initialNaloga || undefined} lots={lots} storitve={storitve} role={user.role} notify={notify} onSave={async (payload) => { const created = await api.createNaloga(payload); setPreneseniPodatki(null); notify(`Delovni nalog st. ${created.stevilka_delovnega_naloga} je ustvarjen.`); await loadTaskData(); }} />}{tab === "evidenca" && <EvidenceView lots={lots} storitve={storitve} role={user.role} reload={loadTaskData} notify={notify} />}{tab === "storitve" && <StoritveView storitve={storitve} reload={loadStoritve} notify={notify} />}{tab === "ponudba" && <PonudbaView produkti={produkti} lots={lots} storitve={storitve} setPreneseniPodatki={setPreneseniPodatki} setTab={setTab} />}{tab === "analiza" && <AnalysisView produkti={produkti} reload={loadProdukti} notify={notify} role={user.role} />}</main>{loading && <LoadingPopup />}<Toast toast={toast} /></div>;
}


