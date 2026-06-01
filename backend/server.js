const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Helper function to stringify BigInt correctly
BigInt.prototype.toJSON = function () { return this.toString() };

const mapPlakatiRecord = (n) => ({
  id: n.id,
  status: n.status,
  naziv_projekta: n.naziv_projekta,
  opis: n.opis,
  opomba: n.opomba,
  stevilka_delovnega_naloga: n.stevilka_delovnega_naloga,
  stevilka_racuna: n.stevilka_racuna,
  enota_materiala: n.enota_materiala,
  narocnik: n.narocnik ? {
    ime_narocnika: n.narocnik.ime_narocnika,
    gsm_stevilka: n.narocnik.gsm_stevilka,
    email_narocnika: n.narocnik.email_narocnika
  } : null,
  slike: (n.slike || []).map(s => s.url),
  materiali: (n.materiali || []).map(m => ({
    lot_produkt_id: m.lot_produkt_id,
    kolicina_uporabljenega_produkta: m.kolicina_uporabljenega_produkta
  })),
  cena_dela: n.cena_dela,
  cena_materiala: n.cena_materiala,
  datum: n.datum
});

const mapAvtiRecord = (n) => ({
  id: n.id,
  status: n.status,
  opravljena_storitev: n.opravljena_storitev,
  opis: n.opis,
  opomba: n.opomba,
  stevilka_delovnega_naloga: n.stevilka_delovnega_naloga,
  stevilka_racuna: n.stevilka_racuna,
  enota_materiala: n.enota_materiala,
  vozilo: n.vozilo ? {
    registrska_stevilka: n.vozilo.registrska_stevilka,
    stevilka_sasije: n.vozilo.stevilka_sasije,
    znamka_vozila: n.vozilo.znamka_vozila
  } : null,
  lastnik_vozila: n.lastnik_vozila ? {
    ime_lastnika: n.lastnik_vozila.ime_lastnika,
    email_lastnika: n.lastnik_vozila.email_lastnika
  } : null,
  slike: (n.slike || []).map(s => s.url),
  materiali: (n.materiali || []).map(m => ({
    lot_produkt_id: m.lot_produkt_id,
    kolicina_uporabljenega_produkta: m.kolicina_uporabljenega_produkta
  })),
  poskodba_vozila: (n.poskodbe || []).map(p => p.opis),
  cena_dela: n.cena_dela,
  cena_materiala: n.cena_materiala,
  datum: n.datum
});

const parseNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

// ==========================================
// ZALOGA & PRODUKTI (za ZalogaView in ostalo)
// ==========================================

app.get('/api/zaloga', async (req, res) => {
  try {
    const produkti = await prisma.produkt.findMany({
      include: {
        lotProdukti: {
          where: { kolicina_tm: { gt: 0 } }
        }
      },
      orderBy: { id: 'desc' }
    });

    const enrichedProdukti = produkti.map(p => {
      let totals = { kolicina_tm: 0, kolicina_m2: 0, vrednost: 0 };
      p.lotProdukti.forEach(lot => {
        const kolicinaTm = Number(lot.kolicina_tm || 0);
        const kolicinaM2 = lot.kolicina_m2 !== null && lot.kolicina_m2 !== undefined
          ? Number(lot.kolicina_m2)
          : (p.sirina ? kolicinaTm * Number(p.sirina) : 0);
        totals.kolicina_tm += kolicinaTm;
        totals.kolicina_m2 += kolicinaM2;
        const unitQty = kolicinaM2 > 0 ? kolicinaM2 : kolicinaTm;
        totals.vrednost += unitQty * (lot.nabavna_cena || p.nabavna_cena);
      });
      return { ...p, totals };
    });

    res.json(enrichedProdukti);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/produkti', async (req, res) => {
  const produkti = await prisma.produkt.findMany({ orderBy: { id: 'desc' } });
  res.json(produkti);
});

app.get('/api/lot_produkti', async (req, res) => {
  const lots = await prisma.lotProdukt.findMany({ 
    where: { kolicina_tm: { gt: 0 } },
    orderBy: { id: 'desc' } 
  });
  res.json(lots);
});

app.post('/api/produkti', async (req, res) => {
  try {
    const p = await prisma.produkt.create({
      data: {
        koda: req.body.koda,
        naziv_produkta: req.body.naziv_produkta,
        tip: req.body.tip,
        nabavna_cena: Number(req.body.nabavna_cena),
        prodajna_cena: Number(req.body.prodajna_cena),
        sirina: req.body.sirina === null || req.body.sirina === undefined || req.body.sirina === "" ? null : Number(req.body.sirina),
        dobavitelj: req.body.dobavitelj || null
      }
    });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/lot_produkti', async (req, res) => {
  try {
    const { produkt_id, lot_stevilka, kolicina_tm, kolicina_m2, nabavna_cena, prodajna_cena, datum_prevzema } = req.body;
    
    const produkt = await prisma.produkt.findUnique({ where: { id: Number(produkt_id) } });
    if (!produkt) return res.status(400).json({ message: "Produkt ne obstaja." });

    const finalNabavna = nabavna_cena !== undefined && nabavna_cena !== "" ? Number(nabavna_cena) : produkt.nabavna_cena;
    const finalProdajna = prodajna_cena !== undefined && prodajna_cena !== "" ? Number(prodajna_cena) : produkt.prodajna_cena;

    const tmInput = parseNumber(kolicina_tm);
    const m2Input = parseNumber(kolicina_m2);
    if (tmInput === null && m2Input === null) {
      return res.status(400).json({ message: "Vnesi kolicino v tm ali m2." });
    }
    if (m2Input !== null && !produkt.sirina) {
      return res.status(400).json({ message: "Produkt nima nastavljene sirine za izracun m2." });
    }

    const computedTm = tmInput !== null ? tmInput : (m2Input !== null ? m2Input / Number(produkt.sirina) : null);
    const computedM2 = m2Input !== null ? m2Input : (tmInput !== null && produkt.sirina ? tmInput * Number(produkt.sirina) : null);

    await prisma.produkt.update({
      where: { id: Number(produkt_id) },
      data: { nabavna_cena: finalNabavna, prodajna_cena: finalProdajna }
    });

    const newLotId = BigInt(Date.now());
    const finalDatum = datum_prevzema ? new Date(datum_prevzema) : new Date();

    const lot = await prisma.lotProdukt.create({
      data: {
        id: newLotId,
        produkt_id: Number(produkt_id),
        lot_stevilka,
        kolicina_tm: Number(computedTm),
        kolicina_m2: computedM2 !== null ? Number(computedM2) : null,
        nabavna_cena: finalNabavna,
        prodajna_cena: finalProdajna,
        datum_prevzema: finalDatum,
        potrjeno: false
      }
    });

    await prisma.evidencaZaloge.create({
      data: {
        id: newLotId.toString() + "." + Math.floor(Math.random()*10000),
        datum: finalDatum,
        lot_produkt_id: newLotId,
        naziv_produkta: produkt.naziv_produkta,
        tip: "prevzem",
        stevilka_racuna: null,
        nabavna_cena: finalNabavna,
        prodajna_cena: null,
        kolicina_tm: Number(computedTm),
        znesek: Number(computedTm) * finalNabavna,
        ddv_stopnja: null,
        znesek_z_ddv: null
      }
    });

    res.json(lot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// EVIDENCA ZALOGE
// ==========================================

app.get('/api/evidenca', async (req, res) => {
  try {
    const evidenca = await prisma.evidencaZaloge.findMany({ orderBy: { datum: 'desc' } });
    const lots = await prisma.lotProdukt.findMany({ include: { produkt: true } });
    
    const enriched = evidenca.map(log => {
      const lot = lots.find(l => l.id === log.lot_produkt_id);
      return {
        ...log,
        tip_produkta: lot && lot.produkt ? lot.produkt.tip : "folija",
        lot_stevilka: lot ? lot.lot_stevilka : log.lot_produkt_id.toString()
      };
    });
    
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PROFIT (Za ProfitEvidencaView)
// ==========================================

app.get('/api/profit', async (req, res) => {
  try {
    const { dobavitelj, kategorija, datum_od, datum_do, znesek_od, znesek_do } = req.query;
    const filterDobavitelj = (dobavitelj || "").toString().trim().toLowerCase();
    const kategorije = typeof kategorija === "string"
      ? kategorija.split(",").map(k => k.trim().toLowerCase()).filter(Boolean)
      : [];
    const dateFrom = datum_od ? new Date(datum_od) : null;
    const dateTo = datum_do ? new Date(datum_do) : null;
    const amountFrom = parseNumber(znesek_od);
    const amountTo = parseNumber(znesek_do);

    const plakatiRaw = await prisma.delovnaNalogaPlakati.findMany({
      include: { narocnik: true, materiali: true, slike: true }
    });
    const avtiRaw = await prisma.delovnaNalogaAvti.findMany({
      include: { vozilo: true, lastnik_vozila: true, materiali: true, slike: true, poskodbe: true }
    });
    const plakati = plakatiRaw.map(mapPlakatiRecord);
    const avti = avtiRaw.map(mapAvtiRecord);
    const prihodki = await prisma.prihodekManual.findMany();
    const evidenca = await prisma.evidencaZaloge.findMany({ where: { tip: "prevzem" } });
    const lots = await prisma.lotProdukt.findMany();
    const ostaliNakupi = await prisma.ostaliNakup.findMany();
    const nakupiRaw = await prisma.nakup.findMany({
      include: { postavke: { include: { produkt: true } } },
      orderBy: { datum: "desc" }
    });

    // Naloga gre v analizo samo, ko je potrjena in ima ceno dela.
    const potrjenePlakati = plakati.filter(n => n.status === "potrjena" && n.cena_dela !== null);
    const potrjeneAvti = avti.filter(n => n.status === "potrjena" && n.cena_dela !== null);

    const salesEvents = [
      ...potrjenePlakati.map(n => ({
        id: n.id.toString(),
        datum: n.datum,
        datum_placila: null,
        opis: n.naziv_projekta,
        naziv_projekta: n.naziv_projekta,
        cena_dela: n.cena_dela,
        cena_materiala: n.cena_materiala,
        materiali: n.materiali,
        enota_materiala: n.enota_materiala,
        narocnik: n.narocnik?.ime_narocnika,
        podrobnosti: n.opis || "",
        znesek: n.cena_dela + n.cena_materiala,
        znesek_z_ddv: null,
        ddv_stopnja: null,
        stevilka_racuna: n.stevilka_racuna || null,
        stevilka_delovnega_naloga: n.stevilka_delovnega_naloga || null
      })),
      ...potrjeneAvti.map(n => ({
        id: n.id.toString(),
        datum: n.datum,
        datum_placila: null,
        opis: `${n.opravljena_storitev || n.vozilo?.znamka_vozila}`,
        opravljena_storitev: n.opravljena_storitev,
        cena_dela: n.cena_dela,
        cena_materiala: n.cena_materiala,
        materiali: n.materiali,
        enota_materiala: n.enota_materiala,
        narocnik: n.lastnik_vozila?.ime_lastnika,
        podrobnosti: n.opis || "",
        znesek: n.cena_dela + n.cena_materiala,
        znesek_z_ddv: null,
        ddv_stopnja: null,
        stevilka_racuna: n.stevilka_racuna || null,
        stevilka_delovnega_naloga: n.stevilka_delovnega_naloga || null
      })),
      ...prihodki.map(p => ({
        id: `prihodek_${p.id}`,
        datum: p.datum,
        datum_placila: p.datum_placila,
        opis: p.opis,
        narocnik: p.narocnik || "",
        podrobnosti: p.stevilka_racuna ? `Račun: ${p.stevilka_racuna}` : "Ročni prihodek",
        znesek: p.znesek,
        znesek_z_ddv: p.znesek_z_ddv,
        ddv_stopnja: p.ddv_stopnja,
        stevilka_racuna: p.stevilka_racuna,
        stevilka_delovnega_naloga: null
      }))
    ].sort((a, b) => b.datum.getTime() - a.datum.getTime());

    const purchaseEvents = [
      ...evidenca.map(log => {
        const lot = lots.find(l => l.id === log.lot_produkt_id);
        return {
          id: log.id,
          lot_id: log.lot_produkt_id.toString(),
          isLot: true,
          potrjeno: lot ? lot.potrjeno : true,
          datum: log.datum,
          datum_placila: log.datum_placila,
          opis: log.naziv_produkta,
          dobavitelj: lot?.dobavitelj || log.dobavitelj || "",
          stevilka_racuna: lot?.stevilka_racuna || log.stevilka_racuna || "",
          podrobnosti: "material",
          kategorija: "material",
          znesek: log.znesek !== null ? log.znesek : (log.kolicina_tm * log.nabavna_cena),
          ddv_stopnja: log.ddv_stopnja ?? null,
          znesek_z_ddv: log.znesek_z_ddv ?? null,
          lot_stevilka: lot ? lot.lot_stevilka : ""
        };
      }),
      ...ostaliNakupi.map(n => ({
        id: "nakup_" + n.id,
        isLot: false,
        potrjeno: true,
        datum: n.datum,
        datum_placila: n.datum_placila,
        opis: n.opis,
        dobavitelj: n.dobavitelj,
        stevilka_racuna: n.stevilka_racuna || "",
        podrobnosti: n.podrobnosti,
        kategorija: (n.podrobnosti || "drugo").toString().toLowerCase(),
        znesek: n.znesek,
        ddv_stopnja: n.ddv_stopnja,
        znesek_z_ddv: n.znesek_z_ddv
      })),
      ...nakupiRaw.map(n => ({
        id: "nakup_new_" + n.id,
        isNakup: true,
        datum: n.datum,
        dobavitelj: n.dobavitelj,
        stevilka_racuna: n.stevilka_racuna,
        neto_znesek: n.neto_znesek,
        bruto_znesek: n.bruto_znesek,
        postavke: n.postavke,
        kategorija: n.postavke?.map(p => p.kategorija.toLowerCase()) || []
      }))
    ].sort((a, b) => b.datum.getTime() - a.datum.getTime());

    const filterByDate = (event) => {
      if (!event.datum) return false;
      const date = new Date(event.datum);
      if (dateFrom && date < dateFrom) return false;
      if (dateTo && date > dateTo) return false;
      return true;
    };

    const filterByAmount = (event) => {
      const amount = event.isNakup
        ? Number(event.neto_znesek || 0)
        : Number(event.znesek ?? event.znesek_z_ddv ?? 0);
      if (amountFrom !== null && amount < amountFrom) return false;
      if (amountTo !== null && amount > amountTo) return false;
      return true;
    };

    const filterByDobavitelj = (event) => {
      if (!filterDobavitelj) return true;
      return (event.dobavitelj || "").toString().toLowerCase().includes(filterDobavitelj);
    };

    const filterByKategorija = (event) => {
      if (!kategorije.length) return true;
      if (event.isNakup) {
        const cats = Array.isArray(event.kategorija) ? event.kategorija : [event.kategorija];
        return cats.some(c => kategorije.includes((c || "").toString().toLowerCase()));
      }
      return kategorije.includes((event.kategorija || event.podrobnosti || "").toString().toLowerCase());
    };

    const filteredPurchases = purchaseEvents.filter(e => (
      filterByDate(e) && filterByAmount(e) && filterByDobavitelj(e) && filterByKategorija(e)
    ));

    const filteredSales = salesEvents.filter(e => (
      filterByDate(e) && filterByAmount(e)
    ));

    const allDates = [...filteredSales, ...filteredPurchases].map(e => e.datum);
    const availableMonths = Array.from(new Set(allDates.map(d => d.toISOString().substring(0, 7)))).sort((a,b)=>b.localeCompare(a));

    res.json({ salesEvents: filteredSales, purchaseEvents: filteredPurchases, availableMonths });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/nakupi', async (req, res) => {
  try {
    const nakupi = await prisma.nakup.findMany({
      include: { postavke: { include: { produkt: true } } },
      orderBy: { datum: "desc" }
    });
    res.json(nakupi);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/nakupi', async (req, res) => {
  try {
    const { datum, dobavitelj, stevilka_racuna, postavke } = req.body;
    if (!Array.isArray(postavke) || postavke.length === 0) {
      return res.status(400).json({ error: "Vnesi vsaj eno postavko." });
    }

    const preparedPostavke = postavke.map(p => {
      const neto = Number(p.neto_cena || 0);
      const ddvRate = Number(p.ddv || 0);
      const bruto = neto * (1 + ddvRate / 100);
      return {
        kategorija: p.kategorija,
        opis: p.opis,
        neto_cena: neto,
        ddv: ddvRate,
        bruto_cena: bruto,
        produkt_id: p.produkt_id ? Number(p.produkt_id) : null
      };
    });

    const neto_znesek = preparedPostavke.reduce((sum, p) => sum + p.neto_cena, 0);
    const bruto_znesek = preparedPostavke.reduce((sum, p) => sum + p.bruto_cena, 0);

    const created = await prisma.nakup.create({
      data: {
        datum: datum ? new Date(datum) : new Date(),
        dobavitelj,
        stevilka_racuna,
        neto_znesek,
        bruto_znesek,
        postavke: { create: preparedPostavke }
      },
      include: { postavke: { include: { produkt: true } } }
    });

    res.json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ostali_nakupi', async (req, res) => {
  try {
    const ddvRate = req.body.ddv_stopnja === null || req.body.ddv_stopnja === undefined || req.body.ddv_stopnja === ""
      ? null
      : Number(req.body.ddv_stopnja);

    if (ddvRate !== null && ![0, 9.5, 22].includes(ddvRate)) {
      return res.status(400).json({ error: "DDV mora biti 0, 9.5 ali 22." });
    }

    const znesekNet = Number(req.body.znesek);
    const znesekZDDV = ddvRate !== null ? znesekNet * (1 + ddvRate / 100) : null;

    const n = await prisma.ostaliNakup.create({
      data: {
        datum: req.body.datum ? new Date(req.body.datum) : new Date(),
        datum_placila: req.body.datum_placila ? new Date(req.body.datum_placila) : null,
        opis: req.body.opis,
        dobavitelj: req.body.dobavitelj || "",
        podrobnosti: req.body.podrobnosti || "Material",
        znesek: znesekNet,
        ddv_stopnja: ddvRate,
        znesek_z_ddv: znesekZDDV,
        stevilka_racuna: req.body.stevilka_racuna || null
      }
    });
    res.json(n);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/prihodki', async (req, res) => {
  try {
    const ddvRate = req.body.ddv_stopnja === null || req.body.ddv_stopnja === undefined || req.body.ddv_stopnja === ""
      ? null
      : Number(req.body.ddv_stopnja);

    if (ddvRate !== null && ![0, 9.5, 22].includes(ddvRate)) {
      return res.status(400).json({ error: "DDV mora biti 0, 9.5 ali 22." });
    }

    const znesekNet = Number(req.body.znesek);
    const znesekZDDV = ddvRate !== null ? znesekNet * (1 + ddvRate / 100) : null;

    const n = await prisma.prihodekManual.create({
      data: {
        datum: req.body.datum ? new Date(req.body.datum) : new Date(),
        datum_placila: req.body.datum_placila ? new Date(req.body.datum_placila) : null,
        opis: req.body.opis,
        narocnik: req.body.narocnik || null,
        znesek: znesekNet,
        ddv_stopnja: ddvRate,
        znesek_z_ddv: znesekZDDV,
        stevilka_racuna: req.body.stevilka_racuna || null
      }
    });
    res.json(n);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/lot_produkti/:id/potrdi', async (req, res) => {
  try {
    const lotId = BigInt(req.params.id);
    const { dobavitelj, stevilka_racuna, znesek, ddv_stopnja, datum_placila } = req.body;

    const ddvRate = ddv_stopnja === null || ddv_stopnja === undefined || ddv_stopnja === ""
      ? null
      : Number(ddv_stopnja);

    if (ddvRate !== null && ![0, 9.5, 22].includes(ddvRate)) {
      return res.status(400).json({ message: "DDV mora biti 0, 9.5 ali 22." });
    }

    const lot = await prisma.lotProdukt.findUnique({ where: { id: lotId } });
    if (!lot) return res.status(404).json({ message: "LOT ne obstaja." });

    const znesekNum = znesek === null || znesek === undefined || znesek === "" ? null : Number(znesek);
    const ddvMultiplier = ddvRate === null ? null : 1 + (ddvRate / 100);
    const znesekZDDV = znesekNum !== null && ddvMultiplier !== null ? znesekNum * ddvMultiplier : null;

    let nabavnaCenaNaEnoto = null;
    if (znesekNum !== null && lot.kolicina_tm > 0) {
      nabavnaCenaNaEnoto = znesekNum / Number(lot.kolicina_tm);
    }

    await prisma.lotProdukt.update({
      where: { id: lotId },
      data: {
        potrjeno: true,
        dobavitelj,
        stevilka_racuna,
        nabavna_cena: nabavnaCenaNaEnoto !== null ? nabavnaCenaNaEnoto : lot.nabavna_cena
      }
    });

    const evidencaList = await prisma.evidencaZaloge.findMany({
      where: { lot_produkt_id: lotId, tip: "prevzem" }
    });

    for (const ev of evidencaList) {
      await prisma.evidencaZaloge.update({
        where: { id: ev.id },
        data: {
          dobavitelj,
          stevilka_racuna,
          znesek: znesekNum !== null ? znesekNum : ev.znesek,
          nabavna_cena: nabavnaCenaNaEnoto !== null ? nabavnaCenaNaEnoto : ev.nabavna_cena,
          ddv_stopnja: ddvRate,
          znesek_z_ddv: znesekZDDV,
          datum_placila: datum_placila ? new Date(datum_placila) : ev.datum_placila
        }
      });
    }

    res.json({ message: "LOT uspešno potrjen." });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// DELOVNE NALOGE (Helpers for depleting/reverting stock)
// ==========================================

async function depleteMaterials(materiali, reqId, isStorno = false) {
  if (!Array.isArray(materiali) || materiali.length === 0) return true;
  
  for (const item of materiali) {
    const lotId = BigInt(item.lot_produkt_id);
    const lot = await prisma.lotProdukt.findUnique({ where: { id: lotId }, include: { produkt: true } });
    if (!lot) throw new Error(`LOT produkt z ID ${item.lot_produkt_id} ne obstaja.`);
    
    const qtyUsed = Number(item.kolicina_uporabljenega_produkta);
    if (!isStorno && lot.kolicina_tm < qtyUsed) {
      throw new Error(`Premalo na zalogi za LOT ${lot.lot_stevilka} (na voljo: ${lot.kolicina_tm}, željeno: ${qtyUsed}).`);
    }
  }

  const now = new Date();
  for (const item of materiali) {
    const lotId = BigInt(item.lot_produkt_id);
    const lot = await prisma.lotProdukt.findUnique({ where: { id: lotId }, include: { produkt: true } });
    const qtyUsed = Number(item.kolicina_uporabljenega_produkta);
    
    if (isStorno) {
      await prisma.lotProdukt.update({
        where: { id: lotId },
        data: { kolicina_tm: lot.kolicina_tm + qtyUsed }
      });
    } else {
      const newQty = lot.kolicina_tm - qtyUsed;
      if (newQty <= 0) {
        await prisma.lotProdukt.delete({ where: { id: lotId } });
      } else {
        await prisma.lotProdukt.update({
          where: { id: lotId },
          data: { kolicina_tm: newQty }
        });
      }
    }

    const prodPrice = lot.prodajna_cena || lot.produkt.prodajna_cena;
    await prisma.evidencaZaloge.create({
      data: {
        id: Date.now().toString() + Math.random().toString().slice(2, 6),
        datum: now,
        lot_produkt_id: lotId,
        naziv_produkta: lot.produkt.naziv_produkta,
        tip: isStorno ? "storno" : "prodaja",
        stevilka_racuna: reqId ? `DN-${reqId}` : "",
        nabavna_cena: lot.nabavna_cena || lot.produkt.nabavna_cena,
        prodajna_cena: prodPrice,
        dobavitelj: isStorno ? "Popravek/Storno Delovne Naloge" : "Lastna poraba (Delovna Naloga)",
        kolicina_tm: qtyUsed,
        znesek: qtyUsed * prodPrice
      }
    });
  }
  return true;
}

// ==========================================
// DELOVNE NALOGE ROUTES
// ==========================================

app.get('/api/delovne_naloge_plakati', async (req, res) => {
  const naloge = await prisma.delovnaNalogaPlakati.findMany({
    include: { narocnik: true, materiali: true, slike: true },
    orderBy: { datum: 'desc' }
  });
  res.json(naloge.map(mapPlakatiRecord));
});

app.get('/api/delovne_naloge_avti', async (req, res) => {
  const naloge = await prisma.delovnaNalogaAvti.findMany({
    include: { vozilo: true, lastnik_vozila: true, materiali: true, slike: true, poskodbe: true },
    orderBy: { datum: 'desc' }
  });
  res.json(naloge.map(mapAvtiRecord));
});

app.post('/api/delovne_naloge_plakati', async (req, res) => {
  try {
    const id = BigInt(Date.now());
    await depleteMaterials(req.body.materiali, id);
    const cenaDelaRaw = req.body.cena_dela;
    const cenaDela = cenaDelaRaw === null || cenaDelaRaw === undefined || cenaDelaRaw === "" ? null : Number(cenaDelaRaw);
    const status = req.body.status || "v izdelavi";
    if (status === "potrjena" && (cenaDela === null || Number.isNaN(cenaDela))) {
      return res.status(400).json({ error: "Za potrjeno nalogo je potrebna cena." });
    }

    const narocnik = await prisma.narocnik.create({
      data: {
        ime_narocnika: req.body.narocnik?.ime_narocnika || "",
        gsm_stevilka: req.body.narocnik?.gsm_stevilka || null,
        email_narocnika: req.body.narocnik?.email_narocnika || null
      }
    });

    await prisma.delovnaNalogaPlakati.create({
      data: {
        id,
        status,
        naziv_projekta: req.body.naziv_projekta,
        opis: req.body.opis,
        opomba: req.body.opomba,
        stevilka_delovnega_naloga: req.body.stevilka_delovnega_naloga || null,
        stevilka_racuna: req.body.stevilka_racuna || null,
        enota_materiala: req.body.enota_materiala || "tm",
        narocnik_id: narocnik.id,
        cena_dela: cenaDela,
        cena_materiala: Number(req.body.cena_materiala),
        datum: req.body.datum ? new Date(req.body.datum) : new Date()
      }
    });

    for (const url of req.body.slike || []) {
      await prisma.delovnaNalogaPlakatiSlika.create({
        data: { delovna_naloga_plakati_id: id, url: String(url) }
      });
    }

    for (const m of req.body.materiali || []) {
      await prisma.delovnaNalogaPlakatiMaterial.create({
        data: {
          delovna_naloga_plakati_id: id,
          lot_produkt_id: BigInt(m.lot_produkt_id),
          kolicina_uporabljenega_produkta: Number(m.kolicina_uporabljenega_produkta)
        }
      });
    }

    const created = await prisma.delovnaNalogaPlakati.findUnique({
      where: { id },
      include: { narocnik: true, materiali: true, slike: true }
    });
    res.json(mapPlakatiRecord(created));
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/delovne_naloge_avti', async (req, res) => {
  try {
    const id = BigInt(Date.now());
    await depleteMaterials(req.body.materiali, id);
    const cenaDelaRaw = req.body.cena_dela;
    const cenaDela = cenaDelaRaw === null || cenaDelaRaw === undefined || cenaDelaRaw === "" ? null : Number(cenaDelaRaw);
    const status = req.body.status || "v izdelavi";
    if (status === "potrjena" && (cenaDela === null || Number.isNaN(cenaDela))) {
      return res.status(400).json({ error: "Za potrjeno nalogo je potrebna cena." });
    }

    const vozilo = await prisma.vozilo.create({
      data: {
        registrska_stevilka: req.body.vozilo?.registrska_stevilka || null,
        stevilka_sasije: req.body.vozilo?.stevilka_sasije || "",
        znamka_vozila: req.body.vozilo?.znamka_vozila || ""
      }
    });

    const lastnik = await prisma.lastnikVozila.create({
      data: {
        ime_lastnika: req.body.lastnik_vozila?.ime_lastnika || "",
        email_lastnika: req.body.lastnik_vozila?.email_lastnika || null
      }
    });

    await prisma.delovnaNalogaAvti.create({
      data: {
        id,
        status,
        opravljena_storitev: req.body.opravljena_storitev,
        opis: req.body.opis,
        opomba: req.body.opomba,
        stevilka_delovnega_naloga: req.body.stevilka_delovnega_naloga || null,
        stevilka_racuna: req.body.stevilka_racuna || null,
        enota_materiala: req.body.enota_materiala || "tm",
        vozilo_id: vozilo.id,
        lastnik_vozila_id: lastnik.id,
        cena_dela: cenaDela,
        cena_materiala: Number(req.body.cena_materiala),
        datum: req.body.datum ? new Date(req.body.datum) : new Date()
      }
    });

    for (const url of req.body.slike || []) {
      await prisma.delovnaNalogaAvtiSlika.create({
        data: { delovna_naloga_avti_id: id, url: String(url) }
      });
    }

    for (const m of req.body.materiali || []) {
      await prisma.delovnaNalogaAvtiMaterial.create({
        data: {
          delovna_naloga_avti_id: id,
          lot_produkt_id: BigInt(m.lot_produkt_id),
          kolicina_uporabljenega_produkta: Number(m.kolicina_uporabljenega_produkta)
        }
      });
    }

    for (const p of req.body.poskodba_vozila || []) {
      await prisma.delovnaNalogaAvtiPoskodba.create({
        data: { delovna_naloga_avti_id: id, opis: String(p) }
      });
    }

    const created = await prisma.delovnaNalogaAvti.findUnique({
      where: { id },
      include: { vozilo: true, lastnik_vozila: true, materiali: true, slike: true, poskodbe: true }
    });
    res.json(mapAvtiRecord(created));
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/api/delovne_naloge_plakati/:id', async (req, res) => {
  try {
    const id = BigInt(req.params.id);
    const oldNaloga = await prisma.delovnaNalogaPlakati.findUnique({
      where: { id },
      include: { materiali: true, narocnik: true }
    });
    if (oldNaloga) {
      const revertMats = oldNaloga.materiali.map(m => ({
        lot_produkt_id: m.lot_produkt_id,
        kolicina_uporabljenega_produkta: m.kolicina_uporabljenega_produkta
      }));
      await depleteMaterials(revertMats, id, true);
    }
    
    await depleteMaterials(req.body.materiali, id); // Deplete new

    if (oldNaloga?.narocnik_id) {
      await prisma.narocnik.update({
        where: { id: oldNaloga.narocnik_id },
        data: {
          ime_narocnika: req.body.narocnik?.ime_narocnika || "",
          gsm_stevilka: req.body.narocnik?.gsm_stevilka || null,
          email_narocnika: req.body.narocnik?.email_narocnika || null
        }
      });
    }

    const cenaDelaRaw = req.body.cena_dela;
    const cenaDela = cenaDelaRaw === null || cenaDelaRaw === undefined || cenaDelaRaw === "" ? null : Number(cenaDelaRaw);
    const status = req.body.status;
    if (status === "potrjena" && (cenaDela === null || Number.isNaN(cenaDela))) {
      return res.status(400).json({ error: "Za potrjeno nalogo je potrebna cena." });
    }

    await prisma.delovnaNalogaPlakati.update({
      where: { id },
      data: {
        status,
        naziv_projekta: req.body.naziv_projekta,
        opis: req.body.opis,
        opomba: req.body.opomba,
        stevilka_delovnega_naloga: req.body.stevilka_delovnega_naloga || null,
        stevilka_racuna: req.body.stevilka_racuna || null,
        enota_materiala: req.body.enota_materiala || "tm",
        cena_dela: cenaDela,
        cena_materiala: Number(req.body.cena_materiala)
      }
    });

    await prisma.delovnaNalogaPlakatiMaterial.deleteMany({ where: { delovna_naloga_plakati_id: id } });
    await prisma.delovnaNalogaPlakatiSlika.deleteMany({ where: { delovna_naloga_plakati_id: id } });

    for (const url of req.body.slike || []) {
      await prisma.delovnaNalogaPlakatiSlika.create({
        data: { delovna_naloga_plakati_id: id, url: String(url) }
      });
    }

    for (const m of req.body.materiali || []) {
      await prisma.delovnaNalogaPlakatiMaterial.create({
        data: {
          delovna_naloga_plakati_id: id,
          lot_produkt_id: BigInt(m.lot_produkt_id),
          kolicina_uporabljenega_produkta: Number(m.kolicina_uporabljenega_produkta)
        }
      });
    }

    const updated = await prisma.delovnaNalogaPlakati.findUnique({
      where: { id },
      include: { narocnik: true, materiali: true, slike: true }
    });
    res.json(mapPlakatiRecord(updated));
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put('/api/delovne_naloge_avti/:id', async (req, res) => {
  try {
    const id = BigInt(req.params.id);
    const oldNaloga = await prisma.delovnaNalogaAvti.findUnique({
      where: { id },
      include: { materiali: true, vozilo: true, lastnik_vozila: true }
    });
    if (oldNaloga) {
      const revertMats = oldNaloga.materiali.map(m => ({
        lot_produkt_id: m.lot_produkt_id,
        kolicina_uporabljenega_produkta: m.kolicina_uporabljenega_produkta
      }));
      await depleteMaterials(revertMats, id, true);
    }
    
    await depleteMaterials(req.body.materiali, id); // Deplete new

    if (oldNaloga?.vozilo_id) {
      await prisma.vozilo.update({
        where: { id: oldNaloga.vozilo_id },
        data: {
          registrska_stevilka: req.body.vozilo?.registrska_stevilka || null,
          stevilka_sasije: req.body.vozilo?.stevilka_sasije || "",
          znamka_vozila: req.body.vozilo?.znamka_vozila || ""
        }
      });
    }

    if (oldNaloga?.lastnik_vozila_id) {
      await prisma.lastnikVozila.update({
        where: { id: oldNaloga.lastnik_vozila_id },
        data: {
          ime_lastnika: req.body.lastnik_vozila?.ime_lastnika || "",
          email_lastnika: req.body.lastnik_vozila?.email_lastnika || null
        }
      });
    }

    const cenaDelaRaw = req.body.cena_dela;
    const cenaDela = cenaDelaRaw === null || cenaDelaRaw === undefined || cenaDelaRaw === "" ? null : Number(cenaDelaRaw);
    const status = req.body.status;
    if (status === "potrjena" && (cenaDela === null || Number.isNaN(cenaDela))) {
      return res.status(400).json({ error: "Za potrjeno nalogo je potrebna cena." });
    }

    await prisma.delovnaNalogaAvti.update({
      where: { id },
      data: {
        status,
        opravljena_storitev: req.body.opravljena_storitev,
        opis: req.body.opis,
        opomba: req.body.opomba,
        stevilka_delovnega_naloga: req.body.stevilka_delovnega_naloga || null,
        stevilka_racuna: req.body.stevilka_racuna || null,
        enota_materiala: req.body.enota_materiala || "tm",
        cena_dela: cenaDela,
        cena_materiala: Number(req.body.cena_materiala)
      }
    });

    await prisma.delovnaNalogaAvtiMaterial.deleteMany({ where: { delovna_naloga_avti_id: id } });
    await prisma.delovnaNalogaAvtiSlika.deleteMany({ where: { delovna_naloga_avti_id: id } });
    await prisma.delovnaNalogaAvtiPoskodba.deleteMany({ where: { delovna_naloga_avti_id: id } });

    for (const url of req.body.slike || []) {
      await prisma.delovnaNalogaAvtiSlika.create({
        data: { delovna_naloga_avti_id: id, url: String(url) }
      });
    }

    for (const m of req.body.materiali || []) {
      await prisma.delovnaNalogaAvtiMaterial.create({
        data: {
          delovna_naloga_avti_id: id,
          lot_produkt_id: BigInt(m.lot_produkt_id),
          kolicina_uporabljenega_produkta: Number(m.kolicina_uporabljenega_produkta)
        }
      });
    }

    for (const p of req.body.poskodba_vozila || []) {
      await prisma.delovnaNalogaAvtiPoskodba.create({
        data: { delovna_naloga_avti_id: id, opis: String(p) }
      });
    }

    const updated = await prisma.delovnaNalogaAvti.findUnique({
      where: { id },
      include: { vozilo: true, lastnik_vozila: true, materiali: true, slike: true, poskodbe: true }
    });
    res.json(mapAvtiRecord(updated));
  } catch (err) { res.status(400).json({ error: err.message }); }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Venta Design API strežnik teče na http://localhost:${PORT}`);
});
