const dotenv = require("dotenv");

dotenv.config();

const required = ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
if (process.env.NODE_ENV === "production") required.push("CORS_ORIGINS");

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Manjkajo obvezne env spremenljivke: ${missing.join(", ")}.`);
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || 3001,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  corsOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  nalogaSlikeBucket: process.env.NALOGA_SLIKE_BUCKET || "naloga-slike",
  maintenanceSecret: process.env.MAINTENANCE_SECRET,
  allowDevAuth: process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS === "true"
};

module.exports = env;
