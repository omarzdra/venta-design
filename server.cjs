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
    // Calculate znesek if not provided
    const znesek = logData.znesek !== undefined ? logData.znesek : (Number(logData.kolicina_tm || 0) * Number(logData.nabavna_cena || 0));
    db.get("evidencija_zaloge").push({ id, ...logData, znesek }).write();
};

const depleteMaterials = (db, materiali, reqBody, res) => {
    if (!Array.isArray(materiali) || materiali.length === 0) {
        return true; 
    }
    
    const now = new Date().toISOString();
    
    // First pass: Validation
    for (const item of materiali) {
        const lotId = Number(item.lot_produkt_id);
        const lot = db.get("lot_produkti").find(l => Number(l.id) === lotId).value();
        
        if (!lot) {
            res.status(400).json({ message: `LOT produkt z ID ${item.lot_produkt_id} ne obstaja.` });
            return false;
        }
        
        const qtyToUse = Number(item.kolicina_uporabljenega_produkta);
        const currentQty = Number(lot.kolicina_tm || 0);
        
        if (currentQty < qtyToUse) {
            res.status(400).json({ 
                message: `Premalo na zalogi za LOT ${lot.lot_stevilka} (na voljo: ${currentQty}, željeno: ${qtyToUse}).` 
            });
            return false;
        }
    }

    // Second pass: Update
    for (const item of materiali) {
        const lotId = Number(item.lot_produkt_id);
        const lot = db.get("lot_produkti").find(l => Number(l.id) === lotId).value();
        const produkt = db.get("produkti").find(p => Number(p.id) === Number(lot.produkt_id)).value();
        
        const qtyUsed = Number(item.kolicina_uporabljenega_produkta);
        const currentQty = Number(lot.kolicina_tm || 0);
        const newQty = currentQty - qtyUsed;

        if (newQty <= 0) {
            db.get("lot_produkti").remove(l => Number(l.id) === lotId).write();
        } else {
            db.get("lot_produkti")
                .find(l => Number(l.id) === lotId)
                .assign({ kolicina_tm: newQty })
                .write();
        }

        const prodPrice = Number(lot.prodajna_cena || (produkt ? produkt.prodajna_cena : 0));
        addEvidenca(db, {
            datum: now,
            lot_produkt_id: lotId,
            naziv_produkta: produkt ? produkt.naziv_produkta : "Neznan",
            tip: "prodaja",
            stevilka_racuna: reqBody.id ? `DN-${reqBody.id}` : "", 
            nabavna_cena: Number(lot.nabavna_cena || (produkt ? produkt.nabavna_cena : 0)),
            prodajna_cena: prodPrice,
            popust: 0,
            dobavitelj: "Lastna poraba (Delovna Naloga)",
            kolicina_tm: qtyUsed,
            znesek: qtyUsed * prodPrice
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
    req.body.potrjeno = false;

    // For prevzem, we use NABAVNA cena for the znesek (Expense)
    addEvidenca(db, {
        datum: req.body.datum_prevzema,
        lot_produkt_id: newLotId,
        naziv_produkta: produkt.naziv_produkta,
        tip: "prevzem",
        stevilka_racuna: "", 
        nabavna_cena: finalNabavna,
        popust: req.body.popust || 0,
        dobavitelj: "",
        kolicina_tm: Number(kolicina_tm),
        znesek: Number(kolicina_tm) * finalNabavna
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
    const oldOrder = db.get(collectionName).find(o => Number(o.id) === Number(reqId)).value();
    if (!oldOrder) return;
    
    const oldMats = oldOrder.materiali || [];
    const now = new Date().toISOString();
    
    for (const item of oldMats) {
        const lotId = Number(item.lot_produkt_id);
        const lot = db.get("lot_produkti").find(l => Number(l.id) === lotId).value();
        if (!lot) continue;
        const produkt = db.get("produkti").find(p => Number(p.id) === Number(lot.produkt_id)).value();
        const qtyUsed = Number(item.kolicina_uporabljenega_produkta);

        // Revert quantity
        const currentQty = Number(lot.kolicina_tm || 0);
        db.get("lot_produkti")
            .find(l => Number(l.id) === lotId)
            .assign({ kolicina_tm: currentQty + qtyUsed })
            .write();

        // Storno record - use selling price as it reverts a sale
        const prodPrice = Number(lot.prodajna_cena || (produkt ? produkt.prodajna_cena : 0));
        addEvidenca(db, {
            datum: now,
            lot_produkt_id: lotId,
            naziv_produkta: produkt ? produkt.naziv_produkta : "Neznan",
            tip: "storno",
            stevilka_racuna: oldOrder.id ? `DN-${oldOrder.id}` : "",
            nabavna_cena: Number(produkt ? produkt.nabavna_cena : 0),
            prodajna_cena: prodPrice,
            popust: 0,
            dobavitelj: "Popravek/Storno Delovne Naloge",
            kolicina_tm: qtyUsed,
            znesek: qtyUsed * prodPrice
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

server.put("/lot_produkti/:id/potrdi", (req, res) => {
    const db = router.db;
    const lotId = Number(req.params.id);
    const { dobavitelj, stevilka_racuna } = req.body;

    const lot = db.get("lot_produkti").find({ id: lotId }).value();
    if (!lot) {
        return res.status(404).json({ message: "LOT ne obstaja." });
    }

    // Update LOT
    db.get("lot_produkti")
        .find({ id: lotId })
        .assign({ potrjeno: true, dobavitelj, stevilka_racuna })
        .write();

    // Update corresponding evidenca
    const evidenca = db.get("evidencija_zaloge")
        .find(e => Number(e.lot_produkt_id) === lotId && e.tip === "prevzem")
        .value();

    if (evidenca) {
        db.get("evidencija_zaloge")
            .find({ id: evidenca.id })
            .assign({ dobavitelj, stevilka_racuna })
            .write();
    }

    res.json({ message: "LOT uspešno potrjen.", potrjeno: true });
});

server.use(router);

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Venta Design CUSTOM Server is running on http://localhost:${PORT}`);
    console.log(`Make sure your frontend API_URL is also set to port ${PORT}`);
});