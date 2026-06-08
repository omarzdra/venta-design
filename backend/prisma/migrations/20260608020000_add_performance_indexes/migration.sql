CREATE INDEX "Produkt_naziv_produkta_idx" ON "Produkt"("naziv_produkta");

CREATE INDEX "LotProdukt_produkt_id_idx" ON "LotProdukt"("produkt_id");
CREATE INDEX "LotProdukt_datum_prevzema_idx" ON "LotProdukt"("datum_prevzema");
CREATE INDEX "LotProdukt_kolicina_tm_idx" ON "LotProdukt"("kolicina_tm");

CREATE INDEX "Nakup_datum_idx" ON "Nakup"("datum");
CREATE INDEX "Nakup_stevilka_racuna_idx" ON "Nakup"("stevilka_racuna");

CREATE INDEX "NakupPostavka_nakup_id_idx" ON "NakupPostavka"("nakup_id");
CREATE INDEX "NakupPostavka_produkt_id_idx" ON "NakupPostavka"("produkt_id");

CREATE INDEX "DelovnaNaloga_tip_status_datum_idx" ON "DelovnaNaloga"("tip", "status", "datum");
CREATE INDEX "DelovnaNaloga_datum_idx" ON "DelovnaNaloga"("datum");
CREATE INDEX "DelovnaNaloga_stevilka_delovnega_naloga_idx" ON "DelovnaNaloga"("stevilka_delovnega_naloga");
CREATE INDEX "DelovnaNaloga_potrjena_at_idx" ON "DelovnaNaloga"("potrjena_at");

CREATE INDEX "Storitev_naziv_idx" ON "Storitev"("naziv");

CREATE INDEX "DelovnaNalogaStoritev_delovna_naloga_id_idx" ON "DelovnaNalogaStoritev"("delovna_naloga_id");
CREATE INDEX "DelovnaNalogaStoritev_storitev_id_idx" ON "DelovnaNalogaStoritev"("storitev_id");

CREATE INDEX "DelovnaNalogaPoskodba_delovna_naloga_id_idx" ON "DelovnaNalogaPoskodba"("delovna_naloga_id");

CREATE INDEX "DelovnaNalogaMaterial_delovna_naloga_id_idx" ON "DelovnaNalogaMaterial"("delovna_naloga_id");
CREATE INDEX "DelovnaNalogaMaterial_lot_produkt_id_idx" ON "DelovnaNalogaMaterial"("lot_produkt_id");

CREATE INDEX "DelovnaNalogaSlika_delovna_naloga_id_idx" ON "DelovnaNalogaSlika"("delovna_naloga_id");

CREATE INDEX "PrihodekManual_datum_idx" ON "PrihodekManual"("datum");
CREATE INDEX "PrihodekManual_stevilka_racuna_idx" ON "PrihodekManual"("stevilka_racuna");

CREATE INDEX "Inventura_datum_idx" ON "Inventura"("datum");

CREATE INDEX "InventuraLot_inventura_id_idx" ON "InventuraLot"("inventura_id");
CREATE INDEX "InventuraLot_lot_produkt_id_idx" ON "InventuraLot"("lot_produkt_id");
