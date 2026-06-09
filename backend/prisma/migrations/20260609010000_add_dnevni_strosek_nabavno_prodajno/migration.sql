ALTER TABLE "DelovnaNalogaDnevniStrosek"
  ADD COLUMN "nabavni_dnevni_strosek" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "prodajni_dnevni_strosek" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "nabavni_skupaj" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "prodajni_skupaj" DECIMAL(12, 2) NOT NULL DEFAULT 0;

UPDATE "DelovnaNalogaDnevniStrosek"
SET
  "prodajni_dnevni_strosek" = "dnevni_strosek",
  "prodajni_skupaj" = "skupaj"
WHERE "prodajni_dnevni_strosek" = 0
  AND "prodajni_skupaj" = 0;
