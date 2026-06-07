ALTER TABLE "Produkt"
  ALTER COLUMN "nabavna_cena" TYPE DECIMAL(12, 2) USING ROUND("nabavna_cena"::numeric, 2),
  ALTER COLUMN "prodajna_cena" TYPE DECIMAL(12, 2) USING ROUND("prodajna_cena"::numeric, 2);

ALTER TABLE "LotProdukt"
  ALTER COLUMN "nabavna_cena" TYPE DECIMAL(12, 2) USING ROUND("nabavna_cena"::numeric, 2),
  ALTER COLUMN "prodajna_cena" TYPE DECIMAL(12, 2) USING ROUND("prodajna_cena"::numeric, 2);

ALTER TABLE "Nakup"
  ALTER COLUMN "neto_znesek" TYPE DECIMAL(12, 2) USING ROUND("neto_znesek"::numeric, 2),
  ALTER COLUMN "bruto_znesek" TYPE DECIMAL(12, 2) USING ROUND("bruto_znesek"::numeric, 2);

ALTER TABLE "NakupPostavka"
  ALTER COLUMN "neto_cena" TYPE DECIMAL(12, 2) USING ROUND("neto_cena"::numeric, 2),
  ALTER COLUMN "bruto_cena" TYPE DECIMAL(12, 2) USING ROUND("bruto_cena"::numeric, 2);

ALTER TABLE "DelovnaNaloga"
  ALTER COLUMN "cena_dela_neto" TYPE DECIMAL(12, 2) USING ROUND("cena_dela_neto"::numeric, 2),
  ALTER COLUMN "cena_dela_bruto" TYPE DECIMAL(12, 2) USING ROUND("cena_dela_bruto"::numeric, 2),
  ALTER COLUMN "cena_materiala" TYPE DECIMAL(12, 2) USING ROUND("cena_materiala"::numeric, 2);

ALTER TABLE "PrihodekManual"
  ALTER COLUMN "neto_znesek" TYPE DECIMAL(12, 2) USING ROUND("neto_znesek"::numeric, 2),
  ALTER COLUMN "bruto_znesek" TYPE DECIMAL(12, 2) USING ROUND("bruto_znesek"::numeric, 2);
