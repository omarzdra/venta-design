UPDATE "DelovnaNaloga"
SET "stevilka_delovnega_naloga" =
  CASE
    WHEN "tip" = 'vozila' THEN 'v'
    WHEN "tip" = 'vb_tisk' THEN 'vb'
    ELSE 's'
  END || '-' || "id"::text || '-' || EXTRACT(YEAR FROM "datum")::int::text;
