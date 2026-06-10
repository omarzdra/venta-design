UPDATE "DelovnaNaloga"
SET "stevilka_delovnega_naloga" =
  CASE
    WHEN "tip" = 'vozila' THEN 'V'
    WHEN "tip" = 'vb_tisk' THEN 'VB'
    ELSE 'S'
  END || '-' || "id"::text || '-' || EXTRACT(YEAR FROM "datum")::int::text;
