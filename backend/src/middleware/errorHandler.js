function statusCodeFor(error) {
  if (error.statusCode) return error.statusCode;
  if (error.message && error.message.includes("CORS origin ni dovoljen")) return 403;
  return 500;
}

function codeFor(error, statusCode) {
  if (error.code) return error.code;
  if (statusCode === 400) return "VALIDATION_ERROR";
  if (statusCode === 401) return "UNAUTHORIZED";
  if (statusCode === 403) return "FORBIDDEN";
  if (statusCode === 404) return "NOT_FOUND";
  if (statusCode === 409) return "CONFLICT";
  return "INTERNAL_ERROR";
}

function safeMessage(error, statusCode) {
  if (statusCode >= 500 && process.env.NODE_ENV === "production") {
    return "Napaka na strezniku. Poskusi ponovno ali javi administratorju.";
  }
  return error.message || "Prislo je do napake.";
}

function errorHandler(error, req, res, next) {
  const statusCode = statusCodeFor(error);
  const code = codeFor(error, statusCode);

  console.error({
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl || req.path,
    userId: req.user?.id,
    role: req.user?.role,
    code,
    message: error.message
  });

  res.status(statusCode).json({
    message: safeMessage(error, statusCode),
    code,
    details: error.details || null,
    requestId: req.requestId
  });
}

module.exports = errorHandler;
