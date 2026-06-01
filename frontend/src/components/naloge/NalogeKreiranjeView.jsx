import React, { useState } from "react";
import FormPlakati from "./FormPlakati";
import FormAvti from "./FormAvti";

function NalogeKreiranjeView({ lots, produkti, reload, onMsg }) {
  const [nalogaType, setNalogaType] = useState("plakati");

  return (
    <div className="animated">
      <div className="big-toggle">
        <button className={`big-btn ${nalogaType === "plakati" ? "active" : ""}`} onClick={() => setNalogaType("plakati")}>
          🖼️ Splošno
        </button>
        <button className={`big-btn ${nalogaType === "avti" ? "active" : ""}`} onClick={() => setNalogaType("avti")}>
          🚗 Vozila
        </button>
      </div>

      <div>
        {nalogaType === "plakati" ? (
          <FormPlakati lots={lots} produkti={produkti} reload={reload} onMsg={onMsg} editOrder={null} />
        ) : (
          <FormAvti lots={lots} produkti={produkti} reload={reload} onMsg={onMsg} editOrder={null} />
        )}
      </div>
    </div>
  );
}

export default NalogeKreiranjeView;
