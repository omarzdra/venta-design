const jsonServer = require("json-server");
const path = require("path");

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, "db.json"));
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

server.post("/work-orders", (req, res) => {
    const { title, customer, notes, items } = req.body;

    if (!title || !title.trim()) {
        return res.status(400).json({ message: "Naziv delovnega naloga je obvezen." });
    }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Delovni nalog mora imeti vsaj en material." });
    }

    const db = router.db;
    const materials = db.get("materials").value();

    for (const item of items) {
        const material = materials.find((m) => m.id === Number(item.materialId));
        const qty = Number(item.quantity);

        if (!material) {
            return res.status(400).json({ message: `Material z ID ${item.materialId} ne obstaja.` });
        }

        if (!Number.isFinite(qty) || qty <= 0) {
            return res.status(400).json({ message: `Količina za material ${material.name} ni veljavna.` });
        }

        if (material.quantity < qty) {
            return res.status(400).json({
                message: `Ni dovolj zaloge za ${material.name}. Na voljo: ${material.quantity} ${material.unit}.`
            });
        }
    }

    const workOrderId = Date.now();
    const now = new Date().toISOString();

    const normalizedItems = items.map((item) => {
        const material = db.get("materials").find({ id: Number(item.materialId) }).value();
        const qty = Number(item.quantity);

        db.get("materials")
            .find({ id: Number(item.materialId) })
            .assign({
                quantity: material.quantity - qty,
                updatedAt: now
            })
            .write();

        db.get("movementLog")
            .unshift({
                id: Date.now() + Math.random(),
                type: "work_order_consumption",
                workOrderId,
                materialId: material.id,
                materialName: material.name,
                quantity: qty,
                unit: material.unit,
                createdAt: now
            })
            .write();

        return {
            materialId: material.id,
            materialName: material.name,
            quantity: qty,
            unit: material.unit
        };
    });

    const workOrder = {
        id: workOrderId,
        title: title.trim(),
        customer: customer?.trim() || "",
        notes: notes?.trim() || "",
        items: normalizedItems,
        createdAt: now
    };

    db.get("workOrders").unshift(workOrder).write();

    return res.status(201).json({
        message: "Delovni nalog shranjen in zaloga posodobljena.",
        workOrder
    });
});

server.use(router);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`JSON server teče na http://localhost:${PORT}`);
});