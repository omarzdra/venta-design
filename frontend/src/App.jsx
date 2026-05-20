import React, { useEffect, useState } from "react";
import {
    getZaloga,
    getEvidenca,
    getProfit,
    getProdukti,
    getLotProdukti,
    getNalogePlakati,
    getNalogeAvti
} from "./api";
import ZalogaView from "./components/zaloga/ZalogaView";
import NalogeKreiranjeView from "./components/naloge/NalogeKreiranjeView";
import NalogeEvidencaView from "./components/naloge/NalogeEvidencaView";
import EvidencaView from "./components/evidenca/EvidencaView";
import ProfitEvidencaView from "./components/profit/ProfitEvidencaView";

import "./styles.css";

function App() {
  const [activeTab, setActiveTab] = useState("zaloga");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [produkti, setProdukti] = useState([]);
  const [lots, setLots] = useState([]);
  const [evidenca, setEvidenca] = useState([]);
  const [plakati, setPlakati] = useState([]);
  const [avti, setAvti] = useState([]);
  
  const [zalogaData, setZalogaData] = useState([]);
  const [profitData, setProfitData] = useState(null);

  async function loadData() {
    try {
      setLoading(true);
      const [zd, ed, profd, pd, ld, ndp, nda] = await Promise.all([
        getZaloga(),
        getEvidenca(),
        getProfit(),
        getProdukti(),
        getLotProdukti(),
        getNalogePlakati(),
        getNalogeAvti()
      ]);
      setZalogaData(zd);
      setEvidenca(ed);
      setProfitData(profd);
      setProdukti(pd);
      setLots(ld);
      setPlakati(ndp);
      setAvti(nda);
    } catch (err) {
      setError(err.message || "Napaka pri nalaganju podatkov.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const displayMessage = (msg, isError = false) => {
      if (isError) {
          setError(msg); setSuccess("");
      } else {
          setSuccess(msg); setError("");
      }
      setTimeout(() => { setError(""); setSuccess(""); }, 5000);
  };

  return (
    <div className="app-container">
      <header className="app-header animated">
        <h1>Venta Design Demo</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>
          Sistem za vodenje zaloge in delovnih nalog
        </p>

        <div className="tabs">
          <button className={`tab-btn ${activeTab === "zaloga" ? "active" : ""}`} onClick={() => setActiveTab("zaloga")}>
            Zaloga in Produkati
          </button>
          <button className={`tab-btn ${activeTab === "naloge" ? "active" : ""}`} onClick={() => setActiveTab("naloge")}>
            Kreiranje Nalog
          </button>
          <button className={`tab-btn ${activeTab === "evid_nalog" ? "active" : ""}`} onClick={() => setActiveTab("evid_nalog")}>
            Evidenca Nalog
          </button>
          <button className={`tab-btn ${activeTab === "evidenca" ? "active" : ""}`} onClick={() => setActiveTab("evidenca")}>
            Evidenca Zaloge
          </button>
          <button className={`tab-btn ${activeTab === "evid_profit" ? "active" : ""}`} onClick={() => setActiveTab("evid_profit")}>
            💰 Evidenca Dobička
          </button>
        </div>
      </header>

      {error && <div className="alert error animated">{error}</div>}
      {success && <div className="alert success animated">{success}</div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>Nalagam podatke iz Postgres Baze...</div>
      ) : (
        <main>
          {activeTab === "zaloga" && (
            <ZalogaView zalogaData={zalogaData} produkti={produkti} reload={loadData} onMsg={displayMessage} />
          )}
          {activeTab === "naloge" && (
            <NalogeKreiranjeView lots={lots} produkti={produkti} reload={loadData} onMsg={displayMessage} />
          )}
          {activeTab === "evid_nalog" && (
            <NalogeEvidencaView lots={lots} produkti={produkti} plakati={plakati} avti={avti} reload={loadData} onMsg={displayMessage} />
          )}
          {activeTab === "evidenca" && (
            <EvidencaView evidenca={evidenca} />
          )}
          {activeTab === "evid_profit" && (
            <ProfitEvidencaView profitData={profitData} reload={loadData} onMsg={displayMessage} />
          )}
        </main>
      )}
    </div>
  );
}

export default App;