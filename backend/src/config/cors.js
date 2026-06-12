const cors = require("cors");
const AppError = require("../errors/AppError");
const env = require("./env");

function corsMiddleware() {
  return cors({
    origin: (origin, callback) => {
      if (!origin || !env.corsOrigins.length || env.corsOrigins.includes(origin)) return callback(null, true);
      console.error({ origin, message: "CORS origin ni dovoljen." });
      return callback(new AppError("CORS origin ni dovoljen.", 403, "CORS_ORIGIN_FORBIDDEN", { origin }));
    },
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"]
  });
}

module.exports = corsMiddleware;
