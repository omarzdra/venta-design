const { createClient } = require("@supabase/supabase-js");
const env = require("./env");

const supabase = env.supabaseUrl && env.supabaseServiceRoleKey
  ? createClient(env.supabaseUrl, env.supabaseServiceRoleKey, { auth: { persistSession: false } })
  : null;

module.exports = supabase;
