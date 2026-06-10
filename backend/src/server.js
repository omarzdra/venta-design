const app = require("./app");

const PORT = process.env.PORT || 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Venta Design API tece na http://localhost:${PORT}`);
});
