import { useEffect, useMemo, useState } from "react";
import {
  createWorkOrder,
  getMaterials,
  getMovementLog,
  getWorkOrders
} from "./api";

const emptyLine = { materialId: "", quantity: "" };

export default function App() {
  const [materials, setMaterials] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [movementLog, setMovementLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    title: "",
    customer: "",
    notes: "",
    line: emptyLine
  });

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [materialsData, workOrdersData, movementLogData] = await Promise.all([
        getMaterials(),
        getWorkOrders(),
        getMovementLog()
      ]);

      setMaterials(materialsData);
      setWorkOrders(workOrdersData);
      setMovementLog(movementLogData);
    } catch (err) {
      setError(err.message || "Napaka pri nalaganju podatkov.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const lowStockItems = useMemo(
    () => materials.filter((m) => m.quantity <= m.minQuantity),
    [materials]
  );

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateLine(field, value) {
    setForm((prev) => ({
      ...prev,
      line: { ...prev.line, [field]: value }
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        title: form.title,
        customer: form.customer,
        notes: form.notes,
        items: [
          {
            materialId: Number(form.line.materialId),
            quantity: Number(form.line.quantity)
          }
        ]
      };

      await createWorkOrder(payload);

      setSuccess("Delovni nalog je bil shranjen in zaloga je bila posodobljena.");
      setForm({
        title: "",
        customer: "",
        notes: "",
        line: emptyLine
      });

      await loadData();
    } catch (err) {
      setError(err.message || "Shranjevanje ni uspelo.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="page"><div className="card">Nalagam demo podatke...</div></div>;
  }

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Demo za firmo</p>
          <h1>Inventar + delovni nalogi</h1>
          <p className="subtitle">
            Preprost prikaz, kako se zaloga samodejno zmanjša ob izvedbi delovnega naloga.
          </p>
        </div>

        <div className="stats">
          <div className="stat">
            <span>Materiali</span>
            <strong>{materials.length}</strong>
          </div>
          <div className="stat">
            <span>Delovni nalogi</span>
            <strong>{workOrders.length}</strong>
          </div>
          <div className="stat warning">
            <span>Pod minimumom</span>
            <strong>{lowStockItems.length}</strong>
          </div>
        </div>
      </header>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <main className="grid">
        <section className="card">
          <h2>Aktualna zaloga</h2>
          <table>
            <thead>
              <tr>
                <th>Koda</th>
                <th>Material</th>
                <th>Kategorija</th>
                <th>Zaloga</th>
                <th>Min</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => {
                const low = m.quantity <= m.minQuantity;
                return (
                  <tr key={m.id} className={low ? "low" : ""}>
                    <td>{m.code}</td>
                    <td>{m.name}</td>
                    <td>{m.category}</td>
                    <td>
                      {m.quantity} {m.unit}
                    </td>
                    <td>
                      {m.minQuantity} {m.unit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2>Nov delovni nalog</h2>

          <form onSubmit={handleSubmit} className="form">
            <label>
              Naziv naloga
              <input
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Npr. Car wrapping Audi A3"
                required
              />
            </label>

            <label>
              Stranka
              <input
                value={form.customer}
                onChange={(e) => updateField("customer", e.target.value)}
                placeholder="Npr. Avto Center d.o.o."
              />
            </label>

            <label>
              Opomba
              <textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Dodatne informacije o projektu..."
                rows="4"
              />
            </label>

            <div className="line-box">
              <h3>Poraba materiala</h3>

              <label>
                Material
                <select
                  value={form.line.materialId}
                  onChange={(e) => updateLine("materialId", e.target.value)}
                  required
                >
                  <option value="">Izberi material</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code} — {m.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Količina
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={form.line.quantity}
                  onChange={(e) => updateLine("quantity", e.target.value)}
                  placeholder="Npr. 3"
                  required
                />
              </label>
            </div>

            <button type="submit" disabled={saving}>
              {saving ? "Shranjujem..." : "Shrani delovni nalog"}
            </button>
          </form>
        </section>

        <section className="card">
          <h2>Delovni nalogi</h2>
          {workOrders.length === 0 ? (
            <p>Trenutno še ni vnosov.</p>
          ) : (
            <div className="list">
              {workOrders.map((wo) => (
                <div key={wo.id} className="list-item">
                  <strong>{wo.title}</strong>
                  <span>{wo.customer || "Brez stranke"}</span>
                  <small>{new Date(wo.createdAt).toLocaleString()}</small>
                  <ul>
                    {wo.items.map((item, index) => (
                      <li key={index}>
                        {item.materialName}: {item.quantity} {item.unit}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h2>Zgodovina sprememb</h2>
          {movementLog.length === 0 ? (
            <p>Ni še sprememb.</p>
          ) : (
            <div className="list">
              {movementLog.map((entry) => (
                <div key={entry.id} className="list-item">
                  <strong>{entry.materialName}</strong>
                  <span>
                    -{entry.quantity} {entry.unit}
                  </span>
                  <small>{new Date(entry.createdAt).toLocaleString()}</small>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}