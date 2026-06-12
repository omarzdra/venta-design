const AppError = require("../errors/AppError");

function permit(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new AppError("Za to akcijo nimas dovoljenja.", 403, "FORBIDDEN"));
    }
    next();
  };
}

module.exports = permit;
