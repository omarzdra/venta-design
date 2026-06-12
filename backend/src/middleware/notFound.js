const AppError = require("../errors/AppError");

function notFound(req, res, next) {
  next(new AppError("Endpoint ne obstaja.", 404, "NOT_FOUND"));
}

module.exports = notFound;
