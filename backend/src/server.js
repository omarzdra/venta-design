const app = require("./app");
const env = require("./config/env");

const PORT = env.port;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Venta Design API tece na http://localhost:${PORT}`);
});
