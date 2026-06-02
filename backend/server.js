const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const allowDevAuth = process.env.DEV_AUTH_BYPASS === "true";
const supabase = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } }) : null;

app.use(cors());
app.use(express.json({ limit: "15mb" }));

const DDV = [0, 9.5, 22];
const STATUSES = ["v_izdelavi", "dokoncana", "potrjena"];
const PRODUCT_TYPES = ["folija", "adr"];
const PURCHASE_CATEGORIES = ["material", "oprema", "lizing", "gorivo", "bancni_stroski", "place", "smeti", "telefon", "najemnina", "posta", "mehanik", "oglasevanje", "pripomocki", "zavarovanje", "drugo"];
const STATUS_RANK = { v_izdelavi: 0, dokoncana: 1, potrjena: 2 };

function toNumber(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || String(body[field]).trim() === "");
  if (missing.length) throw new Error(`Manjkajo obvezna polja: ${missing.join(", ")}.`);
}

function assertDdv(value) {
  const ddv = toNumber(value, 22);
  if (!DDV.includes(ddv)) throw new Error("DDV mora biti 0, 9.5 ali 22.");
  return ddv;
}

function calcM2(tm, sirina) {
  return sirina ? Number(tm || 0) * Number(sirina) : null;
}

function calcMaterialValue(material) {
  const lot = material.lotProdukt;
  const sirina = lot.produkt?.sirina;
  const qty = sirina ? Number(material.kolicina_tm) * Number(sirina) : Number(material.kolicina_tm);
  return qty * Number(lot.prodajna_cena || lot.produkt?.prodajna_cena || 0);
}

function includeNaloga() {
  return {
    vozilo: true,
    poskodbe: true,
    slike: true,
    materiali: { include: { lotProdukt: { include: { produkt: true } } } }
  };
}

function sanitizeNaloga(naloga) {
  if (!naloga) return naloga;
  return {
    ...naloga,
    materiali: (naloga.materiali || []).map((m) => ({
      ...m,
      kolicina_m2: calcM2(m.kolicina_tm, m.lotProdukt?.produkt?.sirina),
      vrednost: calcMaterialValue(m)
    }))
  };
}

async function auth(req, res, next) {
  try {
    if (allowDevAuth && !req.headers.authorization) {
      req.user = { id: "dev", username: "filip", role: "admin" };
      return next();
    }

    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ message: "Manjka avtentikacijski token." });
    if (!supabase) return res.status(500).json({ message: "Supabase auth ni nastavljen na strežniku." });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) return res.status(401).json({ message: "Neveljavna seja." });

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, role")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !profile) return res.status(401).json({ message: "Profil uporabnika ne obstaja." });
    req.user = profile;
    next();
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
}

function permit(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) return res.status(403).json({ message: "Za to akcijo nimaš dovoljenja." });
    next();
  };
}

app.use("/api", auth);

app.get("/api/auth/me", (req, res) => res.json(req.user));

app.get("/api/produkti", async (req, res) => {
  const produkti = await prisma.produkt.findMany({ orderBy: { naziv_produkta: "asc" } });
  res.json(produkti);
});

app.post("/api/produkti", permit("admin"), async (req, res) => {
  try {
    requireFields(req.body, ["koda", "naziv_produkta", "tip", "nabavna_cena", "prodajna_cena"]);
    if (!PRODUCT_TYPES.includes(req.body.tip)) throw new Error("Tip produkta mora biti folija ali adr.");
    const produkt = await prisma.produkt.create({
      data: {
        koda: String(req.body.koda).trim(),
        naziv_produkta: String(req.body.naziv_produkta).trim(),
        tip: req.body.tip,
        sirina: req.body.tip === "adr" ? null : toNumber(req.body.sirina),
        nabavna_cena: toNumber(req.body.nabavna_cena, 0),
        prodajna_cena: toNumber(req.body.prodajna_cena, 0),
        dobavitelj: req.body.dobavitelj || null
      }
    });
    res.status(201).json(produkt);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/zaloga", async (req, res) => {
  const produkti = await prisma.produkt.findMany({
    include: { lotProdukti: { where: { kolicina_tm: { gt: 0 } }, orderBy: { datum_prevzema: "desc" } } },
    orderBy: { naziv_produkta: "asc" }
  });

  res.json(produkti.map((p) => {
    const lots = p.lotProdukti.map((lot) => {
      const kolicina_m2 = calcM2(lot.kolicina_tm, p.sirina);
      const qty = kolicina_m2 ?? Number(lot.kolicina_tm);
      return { ...lot, kolicina_m2, vrednost_zaloge: qty * Number(lot.nabavna_cena || 0) };
    });
    return {
      ...p,
      lotProdukti: lots,
      totals: {
        kolicina_tm: lots.reduce((s, l) => s + Number(l.kolicina_tm || 0), 0),
        kolicina_m2: lots.reduce((s, l) => s + Number(l.kolicina_m2 || 0), 0),
        vrednost_zaloge: lots.reduce((s, l) => s + Number(l.vrednost_zaloge || 0), 0)
      }
    };
  }));
});

app.get("/api/lot_produkti", async (req, res) => {
  const where = { kolicina_tm: { gt: 0 } };
  if (req.query.produkt_id) where.produkt_id = Number(req.query.produkt_id);
  const lots = await prisma.lotProdukt.findMany({ where, include: { produkt: true }, orderBy: { datum_prevzema: "desc" } });
  res.json(lots.map((lot) => ({ ...lot, kolicina_m2: calcM2(lot.kolicina_tm, lot.produkt.sirina) })));
});

app.patch("/api/lot_produkti/:id/lot_stevilka", permit("admin", "racunovodkinja"), async (req, res) => {
  const lot = await prisma.lotProdukt.update({ where: { id: Number(req.params.id) }, data: { lot_stevilka: req.body.lot_stevilka || null } });
  res.json(lot);
});

app.get("/api/nakupi", permit("admin"), async (req, res) => {
  const { dobavitelj, kategorija, datum_od, datum_do, znesek_od, znesek_do } = req.query;
  const where = {};
  if (dobavitelj) where.dobavitelj = { contains: String(dobavitelj), mode: "insensitive" };
  if (datum_od || datum_do) where.datum = { ...(datum_od ? { gte: new Date(datum_od) } : {}), ...(datum_do ? { lte: new Date(datum_do) } : {}) };
  if (znesek_od || znesek_do) where.neto_znesek = { ...(znesek_od ? { gte: Number(znesek_od) } : {}), ...(znesek_do ? { lte: Number(znesek_do) } : {}) };
  if (kategorija) where.postavke = { some: { kategorija: { in: String(kategorija).split(",") } } };
  const nakupi = await prisma.nakup.findMany({ where, include: { postavke: { include: { produkt: true, lotProdukt: true } } }, orderBy: { datum: "desc" } });
  res.json(nakupi);
});

app.get("/api/nakupi/:id", permit("admin"), async (req, res) => {
  const nakup = await prisma.nakup.findUnique({ where: { id: Number(req.params.id) }, include: { postavke: { include: { produkt: true, lotProdukt: true } } } });
  if (!nakup) return res.status(404).json({ message: "Nakup ne obstaja." });
  res.json(nakup);
});

app.post("/api/nakupi", permit("admin"), async (req, res) => {
  try {
    requireFields(req.body, ["datum", "dobavitelj", "stevilka_racuna"]);
    const postavke = Array.isArray(req.body.postavke) ? req.body.postavke : [];
    if (!postavke.length) throw new Error("Vnesi vsaj eno postavko.");

    const created = await prisma.$transaction(async (tx) => {
      const prepared = [];
      for (const p of postavke) {
        if (!PURCHASE_CATEGORIES.includes(p.kategorija)) throw new Error("Neveljavna kategorija nakupa.");
        const ddv = assertDdv(p.ddv);
        const neto = toNumber(p.neto_cena, 0);
        const bruto = neto * (1 + ddv / 100);
        let produkt = null;
        let kolicina_tm = toNumber(p.kolicina_tm);
        let kolicina_m2 = null;
        if (p.kategorija === "material") {
          if (!p.produkt_id) throw new Error("Pri materialu izberi produkt.");
          produkt = await tx.produkt.findUnique({ where: { id: Number(p.produkt_id) } });
          if (!produkt) throw new Error("Produkt ne obstaja.");
          if (!kolicina_tm && p.kolicina_m2 && produkt.sirina) kolicina_tm = Number(p.kolicina_m2) / Number(produkt.sirina);
          kolicina_m2 = produkt.sirina ? Number(kolicina_tm || 0) * Number(produkt.sirina) : null;
        }
        prepared.push({ p, produkt, neto, ddv, bruto, kolicina_tm, kolicina_m2 });
      }

      const nakup = await tx.nakup.create({
        data: {
          datum: new Date(req.body.datum),
          dobavitelj: String(req.body.dobavitelj).trim(),
          stevilka_racuna: String(req.body.stevilka_racuna).trim(),
          neto_znesek: prepared.reduce((s, x) => s + x.neto, 0),
          bruto_znesek: prepared.reduce((s, x) => s + x.bruto, 0)
        }
      });

      for (const x of prepared) {
        let lotId = null;
        if (x.p.kategorija === "material" && Number(x.kolicina_tm || 0) > 0) {
          const qtyForPrice = x.produkt.sirina ? Number(x.kolicina_m2 || 0) : Number(x.kolicina_tm || 0);
          const lot = await tx.lotProdukt.create({
            data: {
              produkt_id: x.produkt.id,
              lot_stevilka: x.p.lot_stevilka || null,
              kolicina_tm: Number(x.kolicina_tm),
              nabavna_cena: qtyForPrice > 0 ? x.neto / qtyForPrice : x.produkt.nabavna_cena,
              prodajna_cena: x.produkt.prodajna_cena,
              datum_prevzema: new Date(req.body.datum)
            }
          });
          lotId = lot.id;
        }
        await tx.nakupPostavka.create({
          data: {
            nakup_id: nakup.id,
            kategorija: x.p.kategorija,
            opis: x.p.kategorija === "material" ? x.produkt.naziv_produkta : String(x.p.opis || ""),
            neto_cena: x.neto,
            ddv: x.ddv,
            bruto_cena: x.bruto,
            produkt_id: x.produkt?.id || null,
            lot_stevilka: x.p.lot_stevilka || null,
            kolicina_tm: x.kolicina_tm,
            kolicina_m2: x.kolicina_m2,
            lot_produkt_id: lotId
          }
        });
      }
      return tx.nakup.findUnique({ where: { id: nakup.id }, include: { postavke: { include: { produkt: true, lotProdukt: true } } } });
    });

    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

async function syncNalogaMaterials(tx, nalogaId, nextMaterials) {
  const existing = await tx.delovnaNalogaMaterial.findMany({ where: { delovna_naloga_id: nalogaId } });
  for (const old of existing) {
    await tx.lotProdukt.update({ where: { id: old.lot_produkt_id }, data: { kolicina_tm: { increment: old.kolicina_tm } } });
  }
  await tx.delovnaNalogaMaterial.deleteMany({ where: { delovna_naloga_id: nalogaId } });

  for (const item of nextMaterials || []) {
    const lotId = Number(item.lot_produkt_id);
    const qty = toNumber(item.kolicina_tm, 0);
    if (qty <= 0) continue;
    const lot = await tx.lotProdukt.findUnique({ where: { id: lotId } });
    if (!lot) throw new Error("Izbran LOT ne obstaja.");
    if (Number(lot.kolicina_tm) < qty) throw new Error(`Premalo zaloge za LOT ${lot.lot_stevilka || "/"}.`);
    await tx.lotProdukt.update({ where: { id: lotId }, data: { kolicina_tm: { decrement: qty } } });
    await tx.delovnaNalogaMaterial.create({ data: { delovna_naloga_id: nalogaId, lot_produkt_id: lotId, kolicina_tm: qty } });
  }

  const materials = await tx.delovnaNalogaMaterial.findMany({ where: { delovna_naloga_id: nalogaId }, include: { lotProdukt: { include: { produkt: true } } } });
  const cena_materiala = materials.reduce((sum, material) => sum + calcMaterialValue(material), 0);
  await tx.delovnaNaloga.update({ where: { id: nalogaId }, data: { cena_materiala } });
}

function nalogaPayload(body, isCreate = false, current = null, role = "admin") {
  if (isCreate) requireFields(body, ["tip", "stevilka_delovnega_naloga", "naziv_projekta", "kontakt_ime"]);
  if (body.tip && !["splosno", "vozila"].includes(body.tip)) throw new Error("Tip naloge mora biti splosno ali vozila.");
  const status = body.status || current?.status || "v_izdelavi";
  if (!STATUSES.includes(status)) throw new Error("Neveljaven status naloge.");
  if (current && STATUS_RANK[status] < STATUS_RANK[current.status]) throw new Error("Statusa ni dovoljeno vračati nazaj.");

  const data = {
    stevilka_delovnega_naloga: body.stevilka_delovnega_naloga,
    naziv_projekta: body.naziv_projekta,
    opis: body.opis || null,
    opomba: body.opomba || null,
    kontakt_ime: body.kontakt_ime,
    kontakt_gsm: body.kontakt_gsm || null,
    kontakt_email: body.kontakt_email || null
  };
  if (isCreate) data.tip = body.tip;
  if (role === "admin") {
    data.status = status;
    data.stevilka_racuna = body.stevilka_racuna || null;
  }
  return data;
}

app.get("/api/naloge", permit("admin", "grega"), async (req, res) => {
  const { tip, search, status, datum_od, datum_do } = req.query;
  if (!tip) return res.status(400).json({ message: "Query tip je obvezen." });
  const where = { tip: String(tip) };
  if (status) where.status = String(status);
  if (datum_od || datum_do) where.datum = { ...(datum_od ? { gte: new Date(datum_od) } : {}), ...(datum_do ? { lte: new Date(datum_do) } : {}) };
  if (search) {
    const q = String(search);
    where.OR = [
      { naziv_projekta: { contains: q, mode: "insensitive" } },
      { kontakt_ime: { contains: q, mode: "insensitive" } },
      { opis: { contains: q, mode: "insensitive" } },
      { vozilo: { is: { znamka_vozila: { contains: q, mode: "insensitive" } } } },
      { vozilo: { is: { registrska_stevilka: { contains: q, mode: "insensitive" } } } },
      { vozilo: { is: { stevilka_sasije: { contains: q, mode: "insensitive" } } } }
    ];
  }
  const naloge = await prisma.delovnaNaloga.findMany({ where, include: includeNaloga(), orderBy: { datum: "desc" } });
  res.json(naloge.map(sanitizeNaloga));
});

app.get("/api/naloge/:id", permit("admin", "grega"), async (req, res) => {
  const naloga = await prisma.delovnaNaloga.findUnique({ where: { id: Number(req.params.id) }, include: includeNaloga() });
  if (!naloga) return res.status(404).json({ message: "Naloga ne obstaja." });
  res.json(sanitizeNaloga(naloga));
});

app.post("/api/naloge", permit("admin", "grega"), async (req, res) => {
  try {
    const created = await prisma.$transaction(async (tx) => {
      const naloga = await tx.delovnaNaloga.create({ data: nalogaPayload(req.body, true, null, req.user.role) });
      if (req.body.tip === "vozila") {
        requireFields(req.body.vozilo || {}, ["stevilka_sasije", "znamka_vozila"]);
        await tx.vozilo.create({ data: { delovna_naloga_id: naloga.id, registrska_stevilka: req.body.vozilo.registrska_stevilka || null, stevilka_sasije: req.body.vozilo.stevilka_sasije, znamka_vozila: req.body.vozilo.znamka_vozila } });
        for (const opis of req.body.poskodbe || []) await tx.delovnaNalogaPoskodba.create({ data: { delovna_naloga_id: naloga.id, opis } });
      }
      for (const url of req.body.slike || []) await tx.delovnaNalogaSlika.create({ data: { delovna_naloga_id: naloga.id, url: String(url) } });
      await syncNalogaMaterials(tx, naloga.id, req.body.materiali || []);
      return tx.delovnaNaloga.findUnique({ where: { id: naloga.id }, include: includeNaloga() });
    });
    res.status(201).json(sanitizeNaloga(created));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put("/api/naloge/:id", permit("admin", "grega"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const current = await prisma.delovnaNaloga.findUnique({ where: { id }, include: includeNaloga() });
    if (!current) return res.status(404).json({ message: "Naloga ne obstaja." });
    const updated = await prisma.$transaction(async (tx) => {
      await tx.delovnaNaloga.update({ where: { id }, data: nalogaPayload(req.body, false, current, req.user.role) });
      if (current.tip === "vozila" && req.body.vozilo) {
        await tx.vozilo.upsert({ where: { delovna_naloga_id: id }, update: { registrska_stevilka: req.body.vozilo.registrska_stevilka || null, stevilka_sasije: req.body.vozilo.stevilka_sasije || "", znamka_vozila: req.body.vozilo.znamka_vozila || "" }, create: { delovna_naloga_id: id, registrska_stevilka: req.body.vozilo.registrska_stevilka || null, stevilka_sasije: req.body.vozilo.stevilka_sasije || "", znamka_vozila: req.body.vozilo.znamka_vozila || "" } });
        await tx.delovnaNalogaPoskodba.deleteMany({ where: { delovna_naloga_id: id } });
        for (const opis of req.body.poskodbe || []) await tx.delovnaNalogaPoskodba.create({ data: { delovna_naloga_id: id, opis } });
      }
      await tx.delovnaNalogaSlika.deleteMany({ where: { delovna_naloga_id: id } });
      for (const url of req.body.slike || []) await tx.delovnaNalogaSlika.create({ data: { delovna_naloga_id: id, url: String(url) } });
      await syncNalogaMaterials(tx, id, req.body.materiali || []);
      return tx.delovnaNaloga.findUnique({ where: { id }, include: includeNaloga() });
    });
    res.json(sanitizeNaloga(updated));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.patch("/api/naloge/:id/dokoncaj", permit("admin"), async (req, res) => {
  const updated = await prisma.delovnaNaloga.update({ where: { id: Number(req.params.id) }, data: { status: "dokoncana" }, include: includeNaloga() });
  res.json(sanitizeNaloga(updated));
});

app.patch("/api/naloge/:id/potrdi", permit("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const naloga = await prisma.delovnaNaloga.findUnique({ where: { id }, include: { materiali: true } });
    if (!naloga) return res.status(404).json({ message: "Naloga ne obstaja." });
    if (!naloga.stevilka_racuna) throw new Error("Za potrditev mora biti vpisana številka računa.");
    if (!naloga.materiali.length) throw new Error("Za potrditev mora biti dodan vsaj en material.");
    const cena = toNumber(req.body.cena_dela_neto);
    if (!cena || cena <= 0) throw new Error("Vnesi ceno dela.");
    const ddv = assertDdv(req.body.ddv_stopnja ?? 22);
    const updated = await prisma.delovnaNaloga.update({ where: { id }, data: { status: "potrjena", cena_dela_neto: cena, ddv_stopnja: ddv, cena_dela_bruto: cena * (1 + ddv / 100) }, include: includeNaloga() });
    res.json(sanitizeNaloga(updated));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/prihodki", permit("admin"), async (req, res) => {
  const { narocnik, datum_od, datum_do, znesek_od, znesek_do } = req.query;
  const where = {};
  if (narocnik) where.narocnik = { contains: String(narocnik), mode: "insensitive" };
  if (datum_od || datum_do) where.datum = { ...(datum_od ? { gte: new Date(datum_od) } : {}), ...(datum_do ? { lte: new Date(datum_do) } : {}) };
  if (znesek_od || znesek_do) where.neto_znesek = { ...(znesek_od ? { gte: Number(znesek_od) } : {}), ...(znesek_do ? { lte: Number(znesek_do) } : {}) };
  res.json(await prisma.prihodekManual.findMany({ where, orderBy: { datum: "desc" } }));
});

app.get("/api/prihodki/:id", permit("admin"), async (req, res) => {
  const prihodek = await prisma.prihodekManual.findUnique({ where: { id: Number(req.params.id) } });
  if (!prihodek) return res.status(404).json({ message: "Prihodek ne obstaja." });
  res.json(prihodek);
});

app.post("/api/prihodki", permit("admin"), async (req, res) => {
  try {
    requireFields(req.body, ["datum", "opis", "neto_znesek"]);
    const ddv = assertDdv(req.body.ddv);
    const neto = toNumber(req.body.neto_znesek, 0);
    const prihodek = await prisma.prihodekManual.create({ data: { datum: new Date(req.body.datum), opis: req.body.opis, narocnik: req.body.narocnik || null, stevilka_racuna: req.body.stevilka_racuna || null, neto_znesek: neto, ddv, bruto_znesek: neto * (1 + ddv / 100) } });
    res.status(201).json(prihodek);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/analiza/summary", permit("admin"), async (req, res) => {
  const dateWhere = req.query.datum_od || req.query.datum_do ? { datum: { ...(req.query.datum_od ? { gte: new Date(req.query.datum_od) } : {}), ...(req.query.datum_do ? { lte: new Date(req.query.datum_do) } : {}) } } : {};
  const [naloge, prihodki, nakupi] = await Promise.all([
    prisma.delovnaNaloga.findMany({ where: { status: "potrjena", ...dateWhere } }),
    prisma.prihodekManual.findMany({ where: dateWhere }),
    prisma.nakup.findMany({ where: dateWhere })
  ]);
  const skupni_prihodi_neto = naloge.reduce((s, n) => s + Number(n.cena_dela_neto || 0) + Number(n.cena_materiala || 0), 0) + prihodki.reduce((s, p) => s + Number(p.neto_znesek || 0), 0);
  const skupni_prihodi_bruto = naloge.reduce((s, n) => s + Number(n.cena_dela_bruto || 0) + Number(n.cena_materiala || 0), 0) + prihodki.reduce((s, p) => s + Number(p.bruto_znesek || 0), 0);
  const skupni_stroski_neto = nakupi.reduce((s, n) => s + Number(n.neto_znesek || 0), 0);
  const skupni_stroski_bruto = nakupi.reduce((s, n) => s + Number(n.bruto_znesek || 0), 0);
  res.json({ skupni_prihodi_neto, skupni_prihodi_bruto, skupni_stroski_neto, skupni_stroski_bruto, razlika_neto: skupni_prihodi_neto - skupni_stroski_neto, razlika_bruto: skupni_prihodi_bruto - skupni_stroski_bruto });
});

app.get("/api/analiza/prodaja", permit("admin"), async (req, res) => {
  const [naloge, prihodki] = await Promise.all([
    prisma.delovnaNaloga.findMany({ where: { status: "potrjena" }, include: includeNaloga(), orderBy: { datum: "desc" } }),
    prisma.prihodekManual.findMany({ orderBy: { datum: "desc" } })
  ]);
  res.json([
    ...naloge.map((n) => ({ tip: "delovna_naloga", ...sanitizeNaloga(n), neto_znesek: Number(n.cena_dela_neto || 0) + Number(n.cena_materiala || 0), bruto_znesek: Number(n.cena_dela_bruto || 0) + Number(n.cena_materiala || 0) })),
    ...prihodki.map((p) => ({ tip: "drugo", ...p }))
  ].sort((a, b) => new Date(b.datum) - new Date(a.datum)));
});

app.use((err, req, res, next) => res.status(500).json({ message: err.message }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Venta Design API teče na http://localhost:${PORT}`));
