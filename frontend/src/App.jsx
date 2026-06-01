import React, { useEffect, useMemo, useState } from "react";
import {
    getZaloga,
    getProfit,
    getProdukti,
    getLotProdukti,
    getNalogePlakati,
    getNalogeAvti
} from "./api";
import ZalogaView from "./components/zaloga/ZalogaView";
import NalogeKreiranjeView from "./components/naloge/NalogeKreiranjeView";
import NalogeEvidencaView from "./components/naloge/NalogeEvidencaView";
import ProfitEvidencaView from "./components/profit/ProfitEvidencaView";
import { RoleContext, USERS } from "./RoleContext";
import logoSvg from "./assets/logo.svg";

import "./styles.css";

function App() {
  const [activeTab, setActiveTab] = useState("zaloga");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [username, setUsername] = useState("");
  const [role, setRole] = useState(null);

  const [produkti, setProdukti] = useState([]);
  const [lots, setLots] = useState([]);
  const [plakati, setPlakati] = useState([]);
  const [avti, setAvti] = useState([]);
  
  const [zalogaData, setZalogaData] = useState([]);
  const [profitData, setProfitData] = useState(null);

  async function loadData() {
    try {
      setLoading(true);
      const [zd, profd, pd, ld, ndp, nda] = await Promise.all([
        getZaloga(),
        getProfit(),
        getProdukti(),
        getLotProdukti(),
        getNalogePlakati(),
        getNalogeAvti()
      ]);
      setZalogaData(zd);
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
    const storedRole = sessionStorage.getItem("vd_role");
    const storedUser = sessionStorage.getItem("vd_username");
    if (storedRole) {
      setRole(storedRole);
      setUsername(storedUser || "");
    }
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

  const roleTabs = useMemo(() => {
    if (role === "racunovodkinja") return ["zaloga"];
    if (role === "grega") return ["zaloga", "naloge", "evid_nalog"];
    return ["zaloga", "naloge", "evid_nalog", "evid_profit"];
  }, [role]);

  useEffect(() => {
    if (!role) return;
    if (!roleTabs.includes(activeTab)) {
      setActiveTab(roleTabs[0]);
    }
  }, [role, roleTabs, activeTab]);

  const handleLogin = (e) => {
    e.preventDefault();
    const match = USERS.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!match) {
      setError("Neveljavno uporabniško ime.");
      return;
    }
    sessionStorage.setItem("vd_username", match.username);
    sessionStorage.setItem("vd_role", match.role);
    setRole(match.role);
    setError("");
  };

  const handleLogout = () => {
    sessionStorage.removeItem("vd_username");
    sessionStorage.removeItem("vd_role");
    setRole(null);
    setUsername("");
  };

  return (
    <RoleContext.Provider value={role || "admin"}>
      <div className="app-container">
        <header className="app-header animated">
          <img src={logoSvg} alt="Venta Design" className="app-logo" />
          <p style={{ color: "var(--color-text-muted)", marginBottom: "1rem" }}>
            Sistem za vodenje zaloge in delovnih nalog
          </p>

          {role && (
            <div className="tabs">
              {roleTabs.includes("zaloga") && (
                <button className={`tab-btn ${activeTab === "zaloga" ? "active" : ""}`} onClick={() => setActiveTab("zaloga")}>
                  Zaloga Materiala
                </button>
              )}
              {roleTabs.includes("naloge") && (
                <button className={`tab-btn ${activeTab === "naloge" ? "active" : ""}`} onClick={() => setActiveTab("naloge")}>
                  Ustvari Delovni Nalog
                </button>
              )}
              {roleTabs.includes("evid_nalog") && (
                <button className={`tab-btn ${activeTab === "evid_nalog" ? "active" : ""}`} onClick={() => setActiveTab("evid_nalog")}>
                  Evidenca Delovnih Nalogov
                </button>
              )}
              {roleTabs.includes("evid_profit") && (
                <button className={`tab-btn ${activeTab === "evid_profit" ? "active" : ""}`} onClick={() => setActiveTab("evid_profit")}>
                  Analiza
                </button>
              )}
            </div>
          )}
        </header>

      {error && <div className="alert error animated">{error}</div>}
      {success && <div className="alert success animated">{success}</div>}

      {!role ? (
        <div className="card" style={{ maxWidth: "420px", margin: "0 auto" }}>
          <h2 style={{ marginBottom: "1rem" }}>Prijava</h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Uporabniško ime</label>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Vnesi uporabniško ime" />
            </div>
            <button type="submit" className="btn-primary">Vstopi</button>
          </form>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
            <button className="btn-primary" style={{ width: "auto" }} onClick={handleLogout}>Odjava</button>
          </div>
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
              {activeTab === "evid_profit" && (
                <ProfitEvidencaView profitData={profitData} produkti={produkti} reload={loadData} onMsg={displayMessage} />
              )}
            </main>
          )}
        </>
      )}
    </div>
  </RoleContext.Provider>
  );
}

export default App;