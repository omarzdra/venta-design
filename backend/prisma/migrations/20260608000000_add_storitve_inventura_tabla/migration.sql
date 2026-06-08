CREATE TABLE "Storitev" (
  "id" SERIAL NOT NULL,
  "naziv" TEXT NOT NULL,
  "eur_ura" DECIMAL(12, 2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Storitev_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DelovnaNalogaStoritev" (
  "id" SERIAL NOT NULL,
  "delovna_naloga_id" INTEGER NOT NULL,
  "storitev_id" INTEGER NOT NULL,
  "stevilo_ur" DOUBLE PRECISION NOT NULL,
  "cena_skupaj" DECIMAL(12, 2) NOT NULL,
  CONSTRAINT "DelovnaNalogaStoritev_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DelovnaNalogaDnevniStrosek" (
  "id" SERIAL NOT NULL,
  "delovna_naloga_id" INTEGER NOT NULL,
  "dnevni_strosek" DECIMAL(12, 2) NOT NULL,
  "stevilo_dni" INTEGER NOT NULL,
  "skupaj" DECIMAL(12, 2) NOT NULL,
  CONSTRAINT "DelovnaNalogaDnevniStrosek_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Inventura" (
  "id" SERIAL NOT NULL,
  "datum" TIMESTAMP(3) NOT NULL,
  "zakljucena" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Inventura_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventuraLot" (
  "id" SERIAL NOT NULL,
  "inventura_id" INTEGER NOT NULL,
  "lot_produkt_id" INTEGER NOT NULL,
  "oznacen" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "InventuraLot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DelovnaNalogaDnevniStrosek_delovna_naloga_id_key"
  ON "DelovnaNalogaDnevniStrosek"("delovna_naloga_id");

ALTER TABLE "DelovnaNalogaStoritev"
  ADD CONSTRAINT "DelovnaNalogaStoritev_delovna_naloga_id_fkey"
  FOREIGN KEY ("delovna_naloga_id") REFERENCES "DelovnaNaloga"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DelovnaNalogaStoritev"
  ADD CONSTRAINT "DelovnaNalogaStoritev_storitev_id_fkey"
  FOREIGN KEY ("storitev_id") REFERENCES "Storitev"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DelovnaNalogaDnevniStrosek"
  ADD CONSTRAINT "DelovnaNalogaDnevniStrosek_delovna_naloga_id_fkey"
  FOREIGN KEY ("delovna_naloga_id") REFERENCES "DelovnaNaloga"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventuraLot"
  ADD CONSTRAINT "InventuraLot_inventura_id_fkey"
  FOREIGN KEY ("inventura_id") REFERENCES "Inventura"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventuraLot"
  ADD CONSTRAINT "InventuraLot_lot_produkt_id_fkey"
  FOREIGN KEY ("lot_produkt_id") REFERENCES "LotProdukt"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
