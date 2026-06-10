const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

const app = express();
const prisma = new PrismaClient();
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const nalogaSlikeBucket = process.env.NALOGA_SLIKE_BUCKET || "naloga-slike";
const maintenanceSecret = process.env.MAINTENANCE_SECRET;
const allowDevAuth = process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS === "true";
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const supabase = supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } }) : null;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || !allowedOrigins.length || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS origin ni dovoljen."));
  },
  credentials: false,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "15mb" }));

const DDV = [0, 9.5, 22];
const STATUSES = ["v_izdelavi", "dokoncana", "potrjena"];
const PRODUCT_TYPES = ["folija", "adr", "tabla"];
const PURCHASE_CATEGORIES = ["material", "oprema", "lizing", "gorivo", "bancni_stroski", "place", "smeti", "telefon", "najemnina", "posta", "mehanik", "oglasevanje", "pripomocki", "zavarovanje", "drugo"];
const STATUS_RANK = { v_izdelavi: 0, dokoncana: 1, potrjena: 2 };

function toNumber(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function moneyInput(value, fallback = null) {
  const parsed = toNumber(value, fallback);
  if (parsed === null || parsed === undefined) return parsed;
  return parsed.toFixed(2);
}

function dateOnly(value) {
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error("Neveljaven datum.");
  return date;
}

function dateRangeWhere(from, to) {
  if (!from && !to) return {};
  const range = {};
  if (from) range.gte = dateOnly(from);
  if (to) {
    const end = dateOnly(to);
    end.setUTCDate(end.getUTCDate() + 1);
    range.lt = end;
  }
  return { datum: range };
}

function storagePathFromUrl(url, bucket = nalogaSlikeBucket) {
  try {
    const parsed = new URL(String(url));
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

function imageExtensionFromMime(mimeType) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

async function deleteNalogaStorageUrls(urls = []) {
  if (!supabase) throw new Error("Supabase storage ni nastavljen na strežniku.");
  const paths = [...new Set(urls.map((url) => storagePathFromUrl(url)).filter(Boolean))];
  if (!paths.length) return;
  const { error } = await supabase.storage.from(nalogaSlikeBucket).remove(paths);
  if (error) throw error;
}

async function uploadNalogaImage(dataUrl, filename = "slika") {
  if (!supabase) throw new Error("Supabase storage ni nastavljen na strežniku.");
  const match = String(dataUrl || "").match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/);
  if (!match) throw new Error("Neveljaven format slike.");
  const mimeType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > 5 * 1024 * 1024) throw new Error("Slika je prevelika. Največja velikost je 5 MB.");
  const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName || `slika.${imageExtensionFromMime(mimeType)}`}`;
  const { error } = await supabase.storage.from(nalogaSlikeBucket).upload(path, bytes, { contentType: mimeType, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(nalogaSlikeBucket).getPublicUrl(path);
  return data.publicUrl;
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

function calcM2(tm, produktOrSirina) {
  if (produktOrSirina && typeof produktOrSirina === "object") {
    if (produktOrSirina.tip === "tabla") return Number(tm || 0);
    return produktOrSirina.sirina ? Number(tm || 0) * Number(produktOrSirina.sirina) : null;
  }
  return produktOrSirina ? Number(tm || 0) * Number(produktOrSirina) : null;
}

function calcMaterialValue(material) {
  const lot = material.lotProdukt;
  const qty = calcM2(material.kolicina_tm, lot.produkt) ?? Number(material.kolicina_tm);
  return qty * Number(lot.prodajna_cena || lot.produkt?.prodajna_cena || 0);
}

function includeNaloga() {
  return {
    vozilo: true,
    poskodbe: true,
    slike: true,
    materiali: { include: { lotProdukt: { include: { produkt: true } } } },
    storitve: { include: { storitev: true } },
    dnevniStrosek: true
  };
}

function nalogaListSelect() {
  return {
    id: true,
    tip: true,
    stevilka_delovnega_naloga: true,
    naziv_projekta: true,
    status: true,
    stevilka_racuna: true,
    opis: true,
    kontakt_ime: true,
    datum: true,
    cena_dela_neto: true,
    cena_dela_bruto: true,
    cena_materiala: true,
    vozilo: { select: { registrska_stevilka: true, stevilka_sasije: true, znamka_vozila: true } }
  };
}

function formatNalogaNumber(tip, id, date = new Date()) {
  const prefixes = { splosno: "S", vozila: "V", vb_tisk: "VB" };
  return `${prefixes[tip] || "S"}-${id}-${new Date(date).getFullYear()}`;
}

function sanitizeNaloga(naloga, role = "admin") {
  if (!naloga) return naloga;
  const sanitized = {
    ...naloga,
    materiali: (naloga.materiali || []).map((m) => ({
      ...m,
      kolicina_m2: calcM2(m.kolicina_tm, m.lotProdukt?.produkt),
      vrednost: calcMaterialValue(m)
    }))
  };
  if (role !== "grega") return sanitized;
  return {
    ...sanitized,
    cena_dela_neto: undefined,
    cena_dela_bruto: undefined,
    cena_materiala: undefined,
    dnevniStrosek: undefined,
    storitve: undefined,
    materiali: sanitized.materiali.map((m) => ({
      id: m.id,
      delovna_naloga_id: m.delovna_naloga_id,
      lot_produkt_id: m.lot_produkt_id,
      kolicina_tm: m.kolicina_tm,
      kolicina_m2: m.kolicina_m2,
      lotProdukt: m.lotProdukt ? {
        id: m.lotProdukt.id,
        produkt_id: m.lotProdukt.produkt_id,
        lot_stevilka: m.lotProdukt.lot_stevilka,
        kolicina_tm: m.lotProdukt.kolicina_tm,
        datum_prevzema: m.lotProdukt.datum_prevzema,
        produkt: m.lotProdukt.produkt ? {
          id: m.lotProdukt.produkt.id,
          koda: m.lotProdukt.produkt.koda,
          naziv_produkta: m.lotProdukt.produkt.naziv_produkta,
          tip: m.lotProdukt.produkt.tip,
          sirina: m.lotProdukt.produkt.sirina,
          dobavitelj: m.lotProdukt.produkt.dobavitelj
        } : undefined
      } : undefined
    }))
  };
}

async function auth(req, res, next) {
  try {
    if (req.path === "/maintenance/cleanup-naloga-slike" && maintenanceSecret && req.headers["x-maintenance-secret"] === maintenanceSecret) {
      req.user = { id: "maintenance", username: "maintenance", role: "admin" };
      return next();
    }

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
    if (!PRODUCT_TYPES.includes(req.body.tip)) throw new Error("Tip produkta mora biti folija, adr ali tabla.");
    const produkt = await prisma.produkt.create({
      data: {
        koda: String(req.body.koda).trim(),
        naziv_produkta: String(req.body.naziv_produkta).trim(),
        tip: req.body.tip,
        sirina: req.body.tip === "folija" ? toNumber(req.body.sirina) : null,
        nabavna_cena: moneyInput(req.body.nabavna_cena, 0),
        prodajna_cena: moneyInput(req.body.prodajna_cena, 0),
        dobavitelj: req.body.dobavitelj || null
      }
    });
    res.status(201).json(produkt);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/storitve", async (req, res) => {
  const storitve = await prisma.storitev.findMany({ orderBy: { naziv: "asc" } });
  res.json(storitve);
});

app.post("/api/storitve", permit("admin"), async (req, res) => {
  try {
    requireFields(req.body, ["naziv", "nabavna_cena", "prodajna_cena"]);
    const prodajnaCena = moneyInput(req.body.prodajna_cena ?? req.body.eur_ura, 0);
    const storitev = await prisma.storitev.create({
      data: {
        naziv: String(req.body.naziv).trim(),
        eur_ura: prodajnaCena,
        nabavna_cena: moneyInput(req.body.nabavna_cena, 0),
        prodajna_cena: prodajnaCena
      }
    });
    res.status(201).json(storitev);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put("/api/storitve/:id", permit("admin"), async (req, res) => {
  try {
    const prodajnaCena = req.body.prodajna_cena !== undefined || req.body.eur_ura !== undefined
      ? moneyInput(req.body.prodajna_cena ?? req.body.eur_ura, 0)
      : undefined;
    const storitev = await prisma.storitev.update({
      where: { id: Number(req.params.id) },
      data: {
        naziv: req.body.naziv ? String(req.body.naziv).trim() : undefined,
        eur_ura: prodajnaCena,
        nabavna_cena: req.body.nabavna_cena !== undefined ? moneyInput(req.body.nabavna_cena, 0) : undefined,
        prodajna_cena: prodajnaCena
      }
    });
    res.json(storitev);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete("/api/storitve/:id", permit("admin"), async (req, res) => {
  try {
    await prisma.storitev.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
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
      const kolicina_m2 = calcM2(lot.kolicina_tm, p);
      const qty = kolicina_m2 ?? Number(lot.kolicina_tm);
      const nabavna_vrednost = qty * Number(lot.nabavna_cena || 0);
      const prodajna_vrednost = qty * Number(lot.prodajna_cena || 0);
      const marza = Number(lot.prodajna_cena || 0) - Number(lot.nabavna_cena || 0);
      return {
        ...lot,
        kolicina_m2,
        vrednost_zaloge: nabavna_vrednost,
        nabavna_vrednost,
        prodajna_vrednost,
        marza,
        marza_pct: Number(lot.prodajna_cena || 0) > 0 ? (marza / Number(lot.prodajna_cena || 0)) * 100 : 0
      };
    });
    const item = {
      ...p,
      lotProdukti: lots,
      totals: {
        kolicina_tm: lots.reduce((s, l) => s + Number(l.kolicina_tm || 0), 0),
        kolicina_m2: lots.reduce((s, l) => s + Number(l.kolicina_m2 || 0), 0),
        vrednost_zaloge: lots.reduce((s, l) => s + Number(l.nabavna_vrednost || 0), 0),
        nabavna_vrednost: lots.reduce((s, l) => s + Number(l.nabavna_vrednost || 0), 0),
        prodajna_vrednost: lots.reduce((s, l) => s + Number(l.prodajna_vrednost || 0), 0),
        marza: lots.reduce((s, l) => s + Number(l.marza || 0), 0)
      }
    };
    if (req.user.role !== "grega") return item;
    return {
      id: item.id,
      koda: item.koda,
      naziv_produkta: item.naziv_produkta,
      tip: item.tip,
      sirina: item.sirina,
      dobavitelj: item.dobavitelj,
      created_at: item.created_at,
      lotProdukti: lots.map((lot) => ({
        id: lot.id,
        produkt_id: lot.produkt_id,
        lot_stevilka: lot.lot_stevilka,
        kolicina_tm: lot.kolicina_tm,
        kolicina_m2: lot.kolicina_m2,
        datum_prevzema: lot.datum_prevzema
      })),
      totals: {
        kolicina_tm: item.totals.kolicina_tm,
        kolicina_m2: item.totals.kolicina_m2
      }
    };
  }));
});

app.get("/api/lot_produkti", async (req, res) => {
  const where = { kolicina_tm: { gt: 0 } };
  if (req.query.produkt_id) where.produkt_id = Number(req.query.produkt_id);
  const lots = await prisma.lotProdukt.findMany({ where, include: { produkt: true }, orderBy: { datum_prevzema: "desc" } });
  res.json(lots.map((lot) => {
    const item = { ...lot, kolicina_m2: calcM2(lot.kolicina_tm, lot.produkt) };
    if (req.user.role !== "grega") return item;
    return {
      id: item.id,
      produkt_id: item.produkt_id,
      lot_stevilka: item.lot_stevilka,
      kolicina_tm: item.kolicina_tm,
      kolicina_m2: item.kolicina_m2,
      datum_prevzema: item.datum_prevzema,
      produkt: item.produkt ? {
        id: item.produkt.id,
        koda: item.produkt.koda,
        naziv_produkta: item.produkt.naziv_produkta,
        tip: item.produkt.tip,
        sirina: item.produkt.sirina,
        dobavitelj: item.produkt.dobavitelj
      } : undefined
    };
  }));
});

app.patch("/api/lot_produkti/:id/lot_stevilka", permit("admin", "racunovodkinja"), async (req, res) => {
  const lot = await prisma.lotProdukt.update({ where: { id: Number(req.params.id) }, data: { lot_stevilka: req.body.lot_stevilka || null } });
  res.json(lot);
});

app.get("/api/inventure", permit("admin", "racunovodkinja"), async (req, res) => {
  const inventure = await prisma.inventura.findMany({
    orderBy: { datum: "desc" },
    select: { id: true, datum: true, zakljucena: true, created_at: true, _count: { select: { loti: true } } }
  });
  res.json(inventure.map((inv) => ({ ...inv, loti_count: inv._count.loti })));
});

app.get("/api/inventure/:id", permit("admin", "racunovodkinja"), async (req, res) => {
  const inventura = await prisma.inventura.findUnique({
    where: { id: Number(req.params.id) },
    include: { loti: { include: { lotProdukt: { include: { produkt: true } } }, orderBy: { id: "asc" } } }
  });
  if (!inventura) return res.status(404).json({ message: "Inventura ne obstaja." });
  res.json(inventura);
});

app.post("/api/inventure", permit("admin", "racunovodkinja"), async (req, res) => {
  try {
    requireFields(req.body, ["datum"]);
    const activeLots = await prisma.lotProdukt.findMany({ where: { kolicina_tm: { gt: 0 } }, select: { id: true } });
    const inventura = await prisma.$transaction(async (tx) => {
      const created = await tx.inventura.create({ data: { datum: dateOnly(req.body.datum) } });
      if (activeLots.length) {
        await tx.inventuraLot.createMany({
          data: activeLots.map((lot) => ({ inventura_id: created.id, lot_produkt_id: lot.id, oznacen: false }))
        });
      }
      return tx.inventura.findUnique({
        where: { id: created.id },
        include: { loti: { include: { lotProdukt: { include: { produkt: true } } } } }
      });
    });
    res.status(201).json(inventura);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.patch("/api/inventure/:invId/lot/:lotId", permit("admin", "racunovodkinja"), async (req, res) => {
  try {
    const inventuraId = Number(req.params.invId);
    const lotId = Number(req.params.lotId);
    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.inventuraLot.findFirst({
        where: { inventura_id: inventuraId, lot_produkt_id: lotId }
      });
      if (!record) throw new Error("Zapis ne obstaja.");
      const next = await tx.inventuraLot.update({
        where: { id: record.id },
        data: { oznacen: !record.oznacen }
      });
      const [remaining, total] = await Promise.all([
        tx.inventuraLot.count({ where: { inventura_id: inventuraId, oznacen: false } }),
        tx.inventuraLot.count({ where: { inventura_id: inventuraId } })
      ]);
      const inventura = await tx.inventura.update({
        where: { id: inventuraId },
        data: { zakljucena: remaining === 0 }
      });
      return { ...next, zakljucena: inventura.zakljucena, done: total - remaining, total };
    });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/nakupi", permit("admin"), async (req, res) => {
  const { dobavitelj, kategorija, datum_od, datum_do, znesek_od, znesek_do } = req.query;
  const where = {};
  if (dobavitelj) where.dobavitelj = { contains: String(dobavitelj), mode: "insensitive" };
  Object.assign(where, dateRangeWhere(datum_od, datum_do));
  if (znesek_od || znesek_do) where.neto_znesek = { ...(znesek_od ? { gte: Number(znesek_od) } : {}), ...(znesek_do ? { lte: Number(znesek_do) } : {}) };
  if (kategorija) where.postavke = { some: { kategorija: { in: String(kategorija).split(",") } } };
  const nakupi = await prisma.nakup.findMany({
    where,
    select: { id: true, datum: true, dobavitelj: true, stevilka_racuna: true, neto_znesek: true, bruto_znesek: true, created_at: true },
    orderBy: { datum: "desc" }
  });
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
          if (!kolicina_tm && p.kolicina_m2 && produkt.tip === "tabla") kolicina_tm = Number(p.kolicina_m2);
          kolicina_m2 = calcM2(kolicina_tm || 0, produkt);
        }
        prepared.push({ p, produkt, neto, ddv, bruto, kolicina_tm, kolicina_m2 });
      }

      const nakup = await tx.nakup.create({
        data: {
          datum: dateOnly(req.body.datum),
          dobavitelj: String(req.body.dobavitelj).trim(),
          stevilka_racuna: String(req.body.stevilka_racuna).trim(),
          neto_znesek: moneyInput(prepared.reduce((s, x) => s + x.neto, 0), 0),
          bruto_znesek: moneyInput(prepared.reduce((s, x) => s + x.bruto, 0), 0)
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
              nabavna_cena: moneyInput(qtyForPrice > 0 ? x.neto / qtyForPrice : x.produkt.nabavna_cena, 0),
              prodajna_cena: moneyInput(x.produkt.prodajna_cena, 0),
              datum_prevzema: dateOnly(req.body.datum)
            }
          });
          lotId = lot.id;
        }
        await tx.nakupPostavka.create({
          data: {
            nakup_id: nakup.id,
            kategorija: x.p.kategorija,
            opis: x.p.kategorija === "material" ? x.produkt.naziv_produkta : String(x.p.opis || ""),
            neto_cena: moneyInput(x.neto, 0),
            ddv: x.ddv,
            bruto_cena: moneyInput(x.bruto, 0),
            produkt_id: x.produkt?.id || null,
            lot_stevilka: x.p.lot_stevilka || null,
            kolicina_tm: x.kolicina_tm,
            kolicina_m2: x.kolicina_m2,
            lot_produkt_id: lotId
          }
        });
      }
      return tx.nakup.findUnique({ where: { id: nakup.id }, include: { postavke: { include: { produkt: true, lotProdukt: true } } } });
    }, { timeout: 30000 });

    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

async function syncNalogaMaterials(tx, nalogaId, nextMaterials, nextStoritve = [], nextDnevniStrosek = null) {
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
    const deducted = await tx.lotProdukt.updateMany({
      where: { id: lotId, kolicina_tm: { gte: qty } },
      data: { kolicina_tm: { decrement: qty } }
    });
    if (deducted.count !== 1) throw new Error(`Premalo zaloge za LOT ${lot.lot_stevilka || "/"}.`);
    await tx.delovnaNalogaMaterial.create({ data: { delovna_naloga_id: nalogaId, lot_produkt_id: lotId, kolicina_tm: qty } });
  }

  const materials = await tx.delovnaNalogaMaterial.findMany({ where: { delovna_naloga_id: nalogaId }, include: { lotProdukt: { include: { produkt: true } } } });
  const cena_materiala = materials.reduce((sum, material) => sum + calcMaterialValue(material), 0);
  await tx.delovnaNaloga.update({ where: { id: nalogaId }, data: { cena_materiala: moneyInput(cena_materiala, 0) } });

  await tx.delovnaNalogaStoritev.deleteMany({ where: { delovna_naloga_id: nalogaId } });
  for (const s of nextStoritve || []) {
    const storitev = await tx.storitev.findUnique({ where: { id: Number(s.storitev_id) } });
    if (!storitev) throw new Error("Storitev ne obstaja.");
    const ure = toNumber(s.stevilo_ur, 0);
    if (ure <= 0) continue;
    await tx.delovnaNalogaStoritev.create({
      data: {
        delovna_naloga_id: nalogaId,
        storitev_id: storitev.id,
        stevilo_ur: ure,
        cena_skupaj: moneyInput(ure * Number(storitev.prodajna_cena || storitev.eur_ura), 0)
      }
    });
  }

  await tx.delovnaNalogaDnevniStrosek.deleteMany({ where: { delovna_naloga_id: nalogaId } });
  if (nextDnevniStrosek && toNumber(nextDnevniStrosek.dnevni_strosek, 0) > 0) {
    const ds = toNumber(nextDnevniStrosek.dnevni_strosek, 0);
    const dni = Math.max(1, parseInt(nextDnevniStrosek.stevilo_dni, 10) || 1);
    await tx.delovnaNalogaDnevniStrosek.create({
      data: {
        delovna_naloga_id: nalogaId,
        dnevni_strosek: moneyInput(ds, 0),
        stevilo_dni: dni,
        skupaj: moneyInput(ds * dni, 0)
      }
    });
  }
}

function nalogaPayload(body, isCreate = false, current = null, role = "admin") {
  if (isCreate) requireFields(body, ["tip", "naziv_projekta"]);
  if (body.tip && !["splosno", "vozila", "vb_tisk"].includes(body.tip)) throw new Error("Tip naloge mora biti splosno, vozila ali VB tisk.");
  const status = body.status || current?.status || "v_izdelavi";
  if (!STATUSES.includes(status)) throw new Error("Neveljaven status naloge.");
  if (current && STATUS_RANK[status] < STATUS_RANK[current.status]) throw new Error("Statusa ni dovoljeno vračati nazaj.");

  const data = {
    naziv_projekta: body.naziv_projekta,
    opis: body.opis || null,
    opomba: body.opomba || null,
    kontakt_ime: String(body.kontakt_ime || "").trim() || "/",
    kontakt_gsm: body.kontakt_gsm || null,
    kontakt_email: body.kontakt_email || null
  };
  if (isCreate) data.tip = body.tip;
  if (isCreate) data.stevilka_delovnega_naloga = "pending";
  if (role === "admin") {
    data.status = status;
    data.stevilka_racuna = body.stevilka_racuna || null;
    if (body.cena_dela_neto !== undefined) {
      const cena = toNumber(body.cena_dela_neto, 0);
      const ddv = assertDdv(body.ddv_stopnja ?? 22);
      data.cena_dela_neto = cena > 0 ? moneyInput(cena, 0) : null;
      data.ddv_stopnja = ddv;
      data.cena_dela_bruto = cena > 0 ? moneyInput(cena * (1 + ddv / 100), 0) : null;
    }
  }
  return data;
}

app.get("/api/naloge", permit("admin", "grega"), async (req, res) => {
  const { tip, search, status, datum_od, datum_do } = req.query;
  if (!tip) return res.status(400).json({ message: "Query tip je obvezen." });
  const where = { tip: String(tip) };
  if (status) where.status = String(status);
  Object.assign(where, dateRangeWhere(datum_od, datum_do));
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
  const naloge = await prisma.delovnaNaloga.findMany({ where, select: nalogaListSelect(), orderBy: { datum: "desc" } });
  if (req.user.role !== "grega") return res.json(naloge);
  res.json(naloge.map((naloga) => ({
    ...naloga,
    cena_dela_neto: undefined,
    cena_dela_bruto: undefined,
    cena_materiala: undefined
  })));
});

app.get("/api/naloge/:id", permit("admin", "grega"), async (req, res) => {
  const naloga = await prisma.delovnaNaloga.findUnique({ where: { id: Number(req.params.id) }, include: includeNaloga() });
  if (!naloga) return res.status(404).json({ message: "Naloga ne obstaja." });
  res.json(sanitizeNaloga(naloga, req.user.role));
});

app.post("/api/naloge/slike/upload", permit("admin", "grega"), async (req, res) => {
  try {
    requireFields(req.body, ["dataUrl"]);
    const url = await uploadNalogaImage(req.body.dataUrl, req.body.filename || "slika.jpg");
    res.status(201).json({ url });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/api/naloge", permit("admin", "grega"), async (req, res) => {
  try {
    const createdId = await prisma.$transaction(async (tx) => {
      const naloga = await tx.delovnaNaloga.create({ data: nalogaPayload(req.body, true, null, req.user.role) });
      await tx.delovnaNaloga.update({ where: { id: naloga.id }, data: { stevilka_delovnega_naloga: formatNalogaNumber(req.body.tip, naloga.id, naloga.datum) } });
      if (req.body.tip === "vozila") {
        requireFields(req.body.vozilo || {}, ["znamka_vozila"]);
        await tx.vozilo.create({ data: { delovna_naloga_id: naloga.id, registrska_stevilka: req.body.vozilo.registrska_stevilka || null, stevilka_sasije: req.body.vozilo.stevilka_sasije || "/", znamka_vozila: req.body.vozilo.znamka_vozila } });
        for (const opis of req.body.poskodbe || []) await tx.delovnaNalogaPoskodba.create({ data: { delovna_naloga_id: naloga.id, opis } });
      }
      for (const url of req.body.slike || []) await tx.delovnaNalogaSlika.create({ data: { delovna_naloga_id: naloga.id, url: String(url) } });
      await syncNalogaMaterials(tx, naloga.id, req.body.materiali || [], req.user.role === "admin" ? (req.body.storitve || []) : [], req.user.role === "admin" ? (req.body.dnevniStrosek || null) : null);
      return naloga.id;
    }, { timeout: 30000 });
    const created = await prisma.delovnaNaloga.findUnique({ where: { id: createdId }, include: includeNaloga() });
    res.status(201).json(sanitizeNaloga(created, req.user.role));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put("/api/naloge/:id", permit("admin", "grega"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const current = await prisma.delovnaNaloga.findUnique({ where: { id }, include: includeNaloga() });
    if (!current) return res.status(404).json({ message: "Naloga ne obstaja." });
    const nextSlike = (req.body.slike || []).map(String);
    const removedSlike = (current.slike || []).filter((slika) => !nextSlike.includes(slika.url));
    await prisma.$transaction(async (tx) => {
      await tx.delovnaNaloga.update({ where: { id }, data: nalogaPayload(req.body, false, current, req.user.role) });
      if (current.tip === "vozila" && req.body.vozilo) {
        requireFields(req.body.vozilo || {}, ["znamka_vozila"]);
        await tx.vozilo.upsert({ where: { delovna_naloga_id: id }, update: { registrska_stevilka: req.body.vozilo.registrska_stevilka || null, stevilka_sasije: req.body.vozilo.stevilka_sasije || "/", znamka_vozila: req.body.vozilo.znamka_vozila }, create: { delovna_naloga_id: id, registrska_stevilka: req.body.vozilo.registrska_stevilka || null, stevilka_sasije: req.body.vozilo.stevilka_sasije || "/", znamka_vozila: req.body.vozilo.znamka_vozila } });
        await tx.delovnaNalogaPoskodba.deleteMany({ where: { delovna_naloga_id: id } });
        for (const opis of req.body.poskodbe || []) await tx.delovnaNalogaPoskodba.create({ data: { delovna_naloga_id: id, opis } });
      }
      await tx.delovnaNalogaSlika.deleteMany({ where: { delovna_naloga_id: id } });
      for (const url of nextSlike) await tx.delovnaNalogaSlika.create({ data: { delovna_naloga_id: id, url } });
      await syncNalogaMaterials(tx, id, req.body.materiali || [], req.user.role === "admin" ? (req.body.storitve || []) : (current.storitve || []).map((s) => ({ storitev_id: s.storitev_id, stevilo_ur: s.stevilo_ur })), req.user.role === "admin" ? (req.body.dnevniStrosek || null) : current.dnevniStrosek);
    }, { timeout: 30000 });
    if (removedSlike.length) await deleteNalogaStorageUrls(removedSlike.map((slika) => slika.url));
    const updated = await prisma.delovnaNaloga.findUnique({ where: { id }, include: includeNaloga() });
    res.json(sanitizeNaloga(updated, req.user.role));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.patch("/api/naloge/:id/dokoncaj", permit("admin", "grega"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const current = await prisma.delovnaNaloga.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ message: "Naloga ne obstaja." });
    if (STATUS_RANK[current.status] > STATUS_RANK.dokoncana) throw new Error("Potrjene naloge ni dovoljeno vračati nazaj.");
    const updated = await prisma.delovnaNaloga.update({ where: { id }, data: { status: "dokoncana" }, include: includeNaloga() });
    res.json(sanitizeNaloga(updated, req.user.role));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.patch("/api/naloge/:id/potrdi", permit("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const naloga = await prisma.delovnaNaloga.findUnique({ where: { id }, include: { materiali: true } });
    if (!naloga) return res.status(404).json({ message: "Naloga ne obstaja." });
    if (!naloga.stevilka_racuna) throw new Error("Za potrditev mora biti vpisana številka računa.");
    if (naloga.tip !== "vb_tisk" && !naloga.materiali.length) throw new Error("Za potrditev mora biti dodan vsaj en material.");
    const cena = toNumber(naloga.cena_dela_neto, 0);
    if (!cena || cena <= 0) throw new Error("Za potrditev mora biti vpisana cena (> 0).");
    const updated = await prisma.delovnaNaloga.update({ where: { id }, data: { status: "potrjena", potrjena_at: new Date() }, include: includeNaloga() });
    res.json(sanitizeNaloga(updated, req.user.role));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete("/api/naloge/:id/slike/:slikaId", permit("admin", "grega"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const slikaId = Number(req.params.slikaId);
    const slika = await prisma.delovnaNalogaSlika.findFirst({ where: { id: slikaId, delovna_naloga_id: id } });
    if (!slika) return res.status(404).json({ message: "Slika ne obstaja." });
    await deleteNalogaStorageUrls([slika.url]);
    await prisma.delovnaNalogaSlika.delete({ where: { id: slika.id } });
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/api/maintenance/cleanup-naloga-slike", permit("admin"), async (req, res) => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const naloge = await prisma.delovnaNaloga.findMany({
      where: { status: "potrjena", potrjena_at: { lte: cutoff }, slike: { some: {} } },
      include: { slike: true }
    });
    const slike = naloge.flatMap((naloga) => naloga.slike);
    await deleteNalogaStorageUrls(slike.map((slika) => slika.url));
    await prisma.delovnaNalogaSlika.deleteMany({ where: { id: { in: slike.map((slika) => slika.id) } } });
    res.json({ ok: true, deleted: slike.length, naloge: naloge.length });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/prihodki", permit("admin"), async (req, res) => {
  const { narocnik, datum_od, datum_do, znesek_od, znesek_do } = req.query;
  const where = {};
  if (narocnik) where.narocnik = { contains: String(narocnik), mode: "insensitive" };
  Object.assign(where, dateRangeWhere(datum_od, datum_do));
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
    const prihodek = await prisma.prihodekManual.create({ data: { datum: dateOnly(req.body.datum), opis: req.body.opis, narocnik: req.body.narocnik || null, stevilka_racuna: req.body.stevilka_racuna || null, neto_znesek: moneyInput(neto, 0), ddv, bruto_znesek: moneyInput(neto * (1 + ddv / 100), 0) } });
    res.status(201).json(prihodek);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/analiza/summary", permit("admin"), async (req, res) => {
  const dateWhere = dateRangeWhere(req.query.datum_od, req.query.datum_do);
  const [naloge, prihodki, nakupi] = await Promise.all([
    prisma.delovnaNaloga.aggregate({
      where: { status: "potrjena", ...dateWhere },
      _sum: { cena_dela_neto: true, cena_dela_bruto: true, cena_materiala: true }
    }),
    prisma.prihodekManual.aggregate({
      where: dateWhere,
      _sum: { neto_znesek: true, bruto_znesek: true }
    }),
    prisma.nakup.aggregate({
      where: dateWhere,
      _sum: { neto_znesek: true, bruto_znesek: true }
    })
  ]);
  const skupni_prihodi_neto = Number(naloge._sum.cena_dela_neto || 0) + Number(naloge._sum.cena_materiala || 0) + Number(prihodki._sum.neto_znesek || 0);
  const skupni_prihodi_bruto = Number(naloge._sum.cena_dela_bruto || 0) + Number(naloge._sum.cena_materiala || 0) + Number(prihodki._sum.bruto_znesek || 0);
  const skupni_stroski_neto = Number(nakupi._sum.neto_znesek || 0);
  const skupni_stroski_bruto = Number(nakupi._sum.bruto_znesek || 0);
  res.json({ skupni_prihodi_neto, skupni_prihodi_bruto, skupni_stroski_neto, skupni_stroski_bruto, razlika_neto: skupni_prihodi_neto - skupni_stroski_neto, razlika_bruto: skupni_prihodi_bruto - skupni_stroski_bruto });
});

app.get("/api/analiza/prodaja", permit("admin"), async (req, res) => {
  const dateWhere = dateRangeWhere(req.query.datum_od, req.query.datum_do);
  const search = req.query.search ? String(req.query.search) : "";
  const nalogeWhere = { status: "potrjena", ...dateWhere };
  if (search) {
    nalogeWhere.OR = [
      { kontakt_ime: { contains: search, mode: "insensitive" } },
      { stevilka_delovnega_naloga: { contains: search, mode: "insensitive" } },
      { materiali: { some: { lotProdukt: { produkt: { naziv_produkta: { contains: search, mode: "insensitive" } } } } } },
      { materiali: { some: { lotProdukt: { produkt: { koda: { contains: search, mode: "insensitive" } } } } } }
    ];
  }
  const [naloge, prihodki] = await Promise.all([
    prisma.delovnaNaloga.findMany({ where: nalogeWhere, select: nalogaListSelect(), orderBy: { datum: "desc" } }),
    prisma.prihodekManual.findMany({ where: dateWhere, orderBy: { datum: "desc" } })
  ]);
  res.json([
    ...naloge.map((n) => ({ ...n, izvor_tip: "delovna_naloga", neto_znesek: Number(n.cena_dela_neto || 0) + Number(n.cena_materiala || 0), bruto_znesek: Number(n.cena_dela_bruto || 0) + Number(n.cena_materiala || 0) })),
    ...prihodki.map((p) => ({ ...p, izvor_tip: "drugo" }))
  ].sort((a, b) => new Date(b.datum) - new Date(a.datum)));
});

app.use((err, req, res, next) => res.status(500).json({ message: err.message }));

module.exports = app;
