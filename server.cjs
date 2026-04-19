const jsonServer = require("json-server");
const path = require("path");

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, "db.json"));
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

// Custom response formatting to dynamically inject aggregated values
router.render = (req, res) => {
    let data = res.locals.data;
    const db = router.db;
    
    // Global filter for non-zero lots to ensure we don't return "empty" records to UI
    const allLots = db.get("lot_produkti").value() || [];
    const activeLots = allLots.filter(l => Number(l.kolicina_tm) > 0);
    
    if (req.originalUrl.startsWith("/produkti") && req.method === "GET") {
        const attachAggregates = (produkt) => {
            const produktLots = activeLots.filter(l => Number(l.produkt_id) === Number(produkt.id));
            const kolicina_tm = produktLots.reduce((sum, lot) => sum + Number(lot.kolicina_tm), 0);
            const vrednost_zaloge = produktLots.reduce((sum, lot) => sum + (Number(lot.kolicina_tm) * Number(lot.nabavna_cena)), 0);
            return {
                ...produkt,
                kolicina_tm,
                vrednost_zaloge
            };
        };

        if (Array.isArray(data)) {
            data = data.map(attachAggregates);
        } else if (data && typeof data === "object") {
            data = attachAggregates(data);
        }
    }

    // Also filter result if direct LOT access
    if (req.originalUrl.startsWith("/lot_produkti") && req.method === "GET") {
        if (Array.isArray(data)) {
            data = data.filter(l => Number(l.kolicina_tm) > 0);
        }
    }

    res.jsonp(data);
};

// Handlers for automatic logging
const addEvidenca = (db, logData) => {
    const id = Date.now() + Math.random();
    db.get("evidencija_zaloge").push({ id, ...logData }).write();
};

const depleteMaterials = (db, materiali, reqBody, res) => {
    if (!Array.isArray(materiali) || materiali.length === 0) {
        return true; 
    }
    
    const now = new Date().toISOString();
    
    for (const item of materiali) {
        const lot = db.get("lot_produkti").find({ id: Number(item.lot_produkt_id) }).value();
        if (!lot) {
            res.status(400).json({ message: `LOT produkt z ID ${item.lot_produkt_id} ne obstaja.` });
            return false;
        }
        if (lot.kolicina_tm < Number(item.kolicina_uporabljenega_produkta)) {
            res.status(400).json({ 
                message: `Premalo na zalogi za LOT ${lot.lot_stevilka} (na voljo: ${lot.kolicina_tm}, željeno: ${item.kolicina_uporabljenega_produkta}).` 
            });
            return false;
        }
    }

    for (const item of materiali) {
        const lot = db.get("lot_produkti").find({ id: Number(item.lot_produkt_id) }).value();
        const produkt = db.get("produkti").find({ id: Number(lot.produkt_id) }).value();
        const qtyUsed = Number(item.kolicina_uporabljenega_produkta);
        const newQty = lot.kolicina_tm - qtyUsed;

        if (newQty <= 0) {
            db.get("lot_produkti").remove({ id: lot.id }).write();
        } else {
            db.get("lot_produkti")
                .find({ id: lot.id })
                .assign({ kolicina_tm: newQty })
                .write();
        }

        addEvidenca(db, {
            datum: now,
            lot_produkt_id: lot.id,
            naziv_produkta: produkt ? produkt.naziv_produkta : "Neznan",
            tip: "prodaja",
            stevilka_racuna: reqBody.id ? `DN-${reqBody.id}` : "", 
            nabavna_cena: lot.nabavna_cena || (produkt ? produkt.nabavna_cena : 0),
            popust: 0,
            dobavitelj: "Lastna poraba (Delovna Naloga)",
            kolicina_tm: qtyUsed
        });
    }

    return true;
};

server.post("/lot_produkti", (req, res, next) => {
    const db = router.db;
    const { produkt_id, lot_stevilka, kolicina_tm, nabavna_cena, prodajna_cena, datum_prevzema } = req.body;
    
    const produkt = db.get("produkti").find({ id: Number(produkt_id) }).value();
    if (!produkt) {
        return res.status(400).json({ message: `Produkt z ID ${produkt_id} ne obstaja.` });
    }

    const finalNabavna = nabavna_cena !== undefined && nabavna_cena !== "" ? Number(nabavna_cena) : Number(produkt.nabavna_cena);
    const finalProdajna = prodajna_cena !== undefined && prodajna_cena !== "" ? Number(prodajna_cena) : Number(produkt.prodajna_cena);

    db.get("produkti")
        .find({ id: Number(produkt_id) })
        .assign({ 
            nabavna_cena: finalNabavna,
            prodajna_cena: finalProdajna
        })
        .write();

    const newLotId = Date.now();
    req.body.id = newLotId;
    req.body.produkt_id = Number(produkt_id);
    req.body.kolicina_tm = Number(kolicina_tm);
    req.body.nabavna_cena = finalNabavna;
    req.body.prodajna_cena = finalProdajna;
    req.body.datum_prevzema = datum_prevzema || new Date().toISOString();

    addEvidenca(db, {
        datum: req.body.datum_prevzema,
        lot_produkt_id: newLotId,
        naziv_produkta: produkt.naziv_produkta,
        tip: "prevzem",
        stevilka_racuna: req.body.stevilka_racuna || "N/A", 
        nabavna_cena: finalNabavna,
        popust: req.body.popust || 0,
        dobavitelj: req.body.dobavitelj || "Splošni Dobavitelj",
        kolicina_tm: Number(kolicina_tm)
    });

    next();
});

// Route: Add Delovna Naloga Plakati
server.post("/delovne_naloge_plakati", (req, res, next) => {
    const db = router.db;
    const { materiali } = req.body;
    
    req.body.id = Date.now();
    req.body.datum = req.body.datum || new Date().toISOString();

    if (!depleteMaterials(db, materiali, req.body, res)) return;

    next();
});

// Route: Add Delovna Naloga Avti
server.post("/delovne_naloge_avti", (req, res, next) => {
    const db = router.db;
    const { materiali } = req.body;
    
    req.body.id = Date.now();
    req.body.datum = req.body.datum || new Date().toISOString();

    if (!depleteMaterials(db, materiali, req.body, res)) return;

    next();
});
const revertMaterials = (db, collectionName, reqId, reqBody) => {
    const oldOrder = db.get(collectionName).find({ id: Number(reqId) }).value();
    if (!oldOrder) return;
    
    const oldMats = oldOrder.materiali || [];
    const now = new Date().toISOString();
    
    for (const item of oldMats) {
        const lot = db.get("lot_produkti").find({ id: Number(item.lot_produkt_id) }).value();
        if (!lot) continue;
        const produkt = db.get("produkti").find({ id: Number(lot.produkt_id) }).value();
        const qtyUsed = Number(item.kolicina_uporabljenega_produkta);

        // Revert quantity
        db.get("lot_produkti")
            .find({ id: lot.id })
            .assign({ kolicina_tm: lot.kolicina_tm + qtyUsed })
            .write();

        // Storno record
        addEvidenca(db, {
            datum: now,
            lot_produkt_id: lot.id,
            naziv_produkta: produkt ? produkt.naziv_produkta : "Neznan",
            tip: "storno",
            stevilka_racuna: oldOrder.id ? `DN-${oldOrder.id}` : "",
            nabavna_cena: produkt ? produkt.nabavna_cena : 0,
            popust: 0,
            dobavitelj: "Popravek/Storno Delovne Naloge",
            kolicina_tm: qtyUsed
        });
    }
};

server.put("/delovne_naloge_plakati/:id", (req, res, next) => {
    const db = router.db;
    const { materiali } = req.body;
    
    revertMaterials(db, "delovne_naloge_plakati", req.params.id, req.body);

    if (!depleteMaterials(db, materiali, req.body, res)) return;
    
    next();
});

server.put("/delovne_naloge_avti/:id", (req, res, next) => {
    const db = router.db;
    const { materiali } = req.body;
    
    revertMaterials(db, "delovne_naloge_avti", req.params.id, req.body);

    if (!depleteMaterials(db, materiali, req.body, res)) return;
    
    next();
});

server.use(router);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`JSON server teče na http://localhost:${PORT}`);
});