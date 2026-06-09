ALTER TABLE "Storitev"
  ADD COLUMN "nabavna_cena" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "prodajna_cena" DECIMAL(12, 2) NOT NULL DEFAULT 0;

UPDATE "Storitev"
SET "prodajna_cena" = "eur_ura"
WHERE "prodajna_cena" = 0;
