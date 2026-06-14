ALTER TABLE "NakupPostavka"
ADD COLUMN "kolicina" DOUBLE PRECISION,
ADD COLUMN "cena_postavke" DECIMAL(12,2);

UPDATE "NakupPostavka"
SET "kolicina" = 1,
    "cena_postavke" = "neto_cena"
WHERE "kolicina" IS NULL;
