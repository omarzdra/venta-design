const AppError = require("../errors/AppError");

function createAuth({ supabase, maintenanceSecret, allowDevAuth }) {
  return async function auth(req, res, next) {
    try {
      if (req.path === "/maintenance/cleanup-naloga-slike" && maintenanceSecret && req.headers["x-maintenance-secret"] === maintenanceSecret) {
        req.user = { id: "maintenance", username: "maintenance", role: "admin" };
        return next();
      }

      if (allowDevAuth && !req.headers.authorization) {
        req.user = { id: "dev", username: "filip", role: "admin" };
        return next();
      }

      const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      if (!token) throw new AppError("Manjka avtentikacijski token.", 401, "UNAUTHORIZED");
      if (!supabase) throw new AppError("Supabase auth ni nastavljen na strezniku.", 500, "SUPABASE_NOT_CONFIGURED");

      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (userError || !userData?.user) throw new AppError("Neveljavna seja.", 401, "UNAUTHORIZED");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, role")
        .eq("id", userData.user.id)
        .single();

      if (profileError || !profile) throw new AppError("Profil uporabnika ne obstaja.", 401, "PROFILE_NOT_FOUND");
      req.user = profile;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = createAuth;
