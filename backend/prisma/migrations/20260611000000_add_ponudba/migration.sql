CREATE TABLE "Ponudba" (
  "id" SERIAL NOT NULL,
  "naziv" TEXT NOT NULL,
  "tip" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Ponudba_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PonudbaMaterial" (
  "id" SERIAL NOT NULL,
  "ponudba_id" INTEGER NOT NULL,
  "produkt_id" INTEGER NOT NULL,
  "kolicina" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "PonudbaMaterial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PonudbaStoritev" (
  "id" SERIAL NOT NULL,
  "ponudba_id" INTEGER NOT NULL,
  "storitev_id" INTEGER NOT NULL,
  "stevilo_ur" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "PonudbaStoritev_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PonudbaDnevniStrosek" (
  "id" SERIAL NOT NULL,
  "ponudba_id" INTEGER NOT NULL,
  "dnevni_strosek" DECIMAL(12, 2) NOT NULL,
  "stevilo_dni" INTEGER NOT NULL,
  CONSTRAINT "PonudbaDnevniStrosek_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PonudbaDnevniStrosek_ponudba_id_key" ON "PonudbaDnevniStrosek"("ponudba_id");
CREATE INDEX "PonudbaMaterial_ponudba_id_idx" ON "PonudbaMaterial"("ponudba_id");
CREATE INDEX "PonudbaMaterial_produkt_id_idx" ON "PonudbaMaterial"("produkt_id");
CREATE INDEX "PonudbaStoritev_ponudba_id_idx" ON "PonudbaStoritev"("ponudba_id");
CREATE INDEX "PonudbaStoritev_storitev_id_idx" ON "PonudbaStoritev"("storitev_id");

ALTER TABLE "PonudbaMaterial" ADD CONSTRAINT "PonudbaMaterial_ponudba_id_fkey" FOREIGN KEY ("ponudba_id") REFERENCES "Ponudba"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PonudbaMaterial" ADD CONSTRAINT "PonudbaMaterial_produkt_id_fkey" FOREIGN KEY ("produkt_id") REFERENCES "Produkt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PonudbaStoritev" ADD CONSTRAINT "PonudbaStoritev_ponudba_id_fkey" FOREIGN KEY ("ponudba_id") REFERENCES "Ponudba"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PonudbaStoritev" ADD CONSTRAINT "PonudbaStoritev_storitev_id_fkey" FOREIGN KEY ("storitev_id") REFERENCES "Storitev"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PonudbaDnevniStrosek" ADD CONSTRAINT "PonudbaDnevniStrosek_ponudba_id_fkey" FOREIGN KEY ("ponudba_id") REFERENCES "Ponudba"("id") ON DELETE CASCADE ON UPDATE CASCADE;
