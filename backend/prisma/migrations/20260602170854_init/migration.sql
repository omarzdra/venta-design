-- CreateTable
CREATE TABLE "Produkt" (
    "id" SERIAL NOT NULL,
    "koda" TEXT NOT NULL,
    "naziv_produkta" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "sirina" DOUBLE PRECISION,
    "nabavna_cena" DOUBLE PRECISION NOT NULL,
    "prodajna_cena" DOUBLE PRECISION NOT NULL,
    "dobavitelj" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Produkt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LotProdukt" (
    "id" SERIAL NOT NULL,
    "produkt_id" INTEGER NOT NULL,
    "lot_stevilka" TEXT,
    "kolicina_tm" DOUBLE PRECISION NOT NULL,
    "nabavna_cena" DOUBLE PRECISION NOT NULL,
    "prodajna_cena" DOUBLE PRECISION NOT NULL,
    "datum_prevzema" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LotProdukt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nakup" (
    "id" SERIAL NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "dobavitelj" TEXT NOT NULL,
    "stevilka_racuna" TEXT NOT NULL,
    "neto_znesek" DOUBLE PRECISION NOT NULL,
    "bruto_znesek" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nakup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NakupPostavka" (
    "id" SERIAL NOT NULL,
    "nakup_id" INTEGER NOT NULL,
    "kategorija" TEXT NOT NULL,
    "opis" TEXT NOT NULL,
    "neto_cena" DOUBLE PRECISION NOT NULL,
    "ddv" DOUBLE PRECISION NOT NULL,
    "bruto_cena" DOUBLE PRECISION NOT NULL,
    "produkt_id" INTEGER,
    "lot_stevilka" TEXT,
    "kolicina_tm" DOUBLE PRECISION,
    "kolicina_m2" DOUBLE PRECISION,
    "lot_produkt_id" INTEGER,

    CONSTRAINT "NakupPostavka_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelovnaNaloga" (
    "id" SERIAL NOT NULL,
    "tip" TEXT NOT NULL,
    "stevilka_delovnega_naloga" TEXT NOT NULL,
    "naziv_projekta" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'v_izdelavi',
    "stevilka_racuna" TEXT,
    "opis" TEXT,
    "opomba" TEXT,
    "kontakt_ime" TEXT NOT NULL,
    "kontakt_gsm" TEXT,
    "kontakt_email" TEXT,
    "cena_dela_neto" DOUBLE PRECISION,
    "ddv_stopnja" DOUBLE PRECISION DEFAULT 22,
    "cena_dela_bruto" DOUBLE PRECISION,
    "cena_materiala" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "datum" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DelovnaNaloga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vozilo" (
    "id" SERIAL NOT NULL,
    "delovna_naloga_id" INTEGER NOT NULL,
    "registrska_stevilka" TEXT,
    "stevilka_sasije" TEXT NOT NULL,
    "znamka_vozila" TEXT NOT NULL,

    CONSTRAINT "Vozilo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelovnaNalogaPoskodba" (
    "id" SERIAL NOT NULL,
    "delovna_naloga_id" INTEGER NOT NULL,
    "opis" TEXT NOT NULL,

    CONSTRAINT "DelovnaNalogaPoskodba_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelovnaNalogaMaterial" (
    "id" SERIAL NOT NULL,
    "delovna_naloga_id" INTEGER NOT NULL,
    "lot_produkt_id" INTEGER NOT NULL,
    "kolicina_tm" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "DelovnaNalogaMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelovnaNalogaSlika" (
    "id" SERIAL NOT NULL,
    "delovna_naloga_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "DelovnaNalogaSlika_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrihodekManual" (
    "id" SERIAL NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "opis" TEXT NOT NULL,
    "narocnik" TEXT,
    "stevilka_racuna" TEXT,
    "neto_znesek" DOUBLE PRECISION NOT NULL,
    "ddv" DOUBLE PRECISION NOT NULL,
    "bruto_znesek" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrihodekManual_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Produkt_koda_key" ON "Produkt"("koda");

-- CreateIndex
CREATE UNIQUE INDEX "NakupPostavka_lot_produkt_id_key" ON "NakupPostavka"("lot_produkt_id");

-- CreateIndex
CREATE UNIQUE INDEX "Vozilo_delovna_naloga_id_key" ON "Vozilo"("delovna_naloga_id");

-- AddForeignKey
ALTER TABLE "LotProdukt" ADD CONSTRAINT "LotProdukt_produkt_id_fkey" FOREIGN KEY ("produkt_id") REFERENCES "Produkt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NakupPostavka" ADD CONSTRAINT "NakupPostavka_nakup_id_fkey" FOREIGN KEY ("nakup_id") REFERENCES "Nakup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NakupPostavka" ADD CONSTRAINT "NakupPostavka_produkt_id_fkey" FOREIGN KEY ("produkt_id") REFERENCES "Produkt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NakupPostavka" ADD CONSTRAINT "NakupPostavka_lot_produkt_id_fkey" FOREIGN KEY ("lot_produkt_id") REFERENCES "LotProdukt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vozilo" ADD CONSTRAINT "Vozilo_delovna_naloga_id_fkey" FOREIGN KEY ("delovna_naloga_id") REFERENCES "DelovnaNaloga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelovnaNalogaPoskodba" ADD CONSTRAINT "DelovnaNalogaPoskodba_delovna_naloga_id_fkey" FOREIGN KEY ("delovna_naloga_id") REFERENCES "DelovnaNaloga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelovnaNalogaMaterial" ADD CONSTRAINT "DelovnaNalogaMaterial_delovna_naloga_id_fkey" FOREIGN KEY ("delovna_naloga_id") REFERENCES "DelovnaNaloga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelovnaNalogaMaterial" ADD CONSTRAINT "DelovnaNalogaMaterial_lot_produkt_id_fkey" FOREIGN KEY ("lot_produkt_id") REFERENCES "LotProdukt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelovnaNalogaSlika" ADD CONSTRAINT "DelovnaNalogaSlika_delovna_naloga_id_fkey" FOREIGN KEY ("delovna_naloga_id") REFERENCES "DelovnaNaloga"("id") ON DELETE CASCADE ON UPDATE CASCADE;
