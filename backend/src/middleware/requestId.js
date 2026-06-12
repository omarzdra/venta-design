const crypto = require("crypto");

function requestId(req, res, next) {
  const incoming = req.get("X-Request-Id");
  req.requestId = incoming || crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
}

module.exports = requestId;
