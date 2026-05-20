-- PostgreSQL schema normalized to match db.json

CREATE TABLE produkt (
  id SERIAL PRIMARY KEY,
  koda TEXT NOT NULL,
  naziv_produkta TEXT NOT NULL,
  prodajna_cena NUMERIC(12,2) NOT NULL,
  nabavna_cena NUMERIC(12,2) NOT NULL,
  tip TEXT NOT NULL
);

CREATE TABLE lot_produkt (
  id BIGINT PRIMARY KEY,
  produkt_id INTEGER NOT NULL REFERENCES produkt(id) ON DELETE RESTRICT,
  lot_stevilka TEXT NOT NULL,
  kolicina_tm NUMERIC(12,2) NOT NULL,
  nabavna_cena NUMERIC(12,2) NOT NULL,
  prodajna_cena NUMERIC(12,2) NOT NULL,
  datum_prevzema TIMESTAMPTZ NOT NULL,
  potrjeno BOOLEAN NOT NULL DEFAULT FALSE,
  dobavitelj TEXT,
  stevilka_racuna TEXT
);

CREATE INDEX lot_produkt_produkt_id_idx ON lot_produkt(produkt_id);

CREATE TABLE evidenca_zaloge (
  id TEXT PRIMARY KEY,
  datum TIMESTAMPTZ NOT NULL,
  lot_produkt_id BIGINT NOT NULL REFERENCES lot_produkt(id) ON DELETE RESTRICT,
  naziv_produkta TEXT NOT NULL,
  tip TEXT NOT NULL,
  stevilka_racuna TEXT,
  nabavna_cena NUMERIC(12,2) NOT NULL,
  prodajna_cena NUMERIC(12,2),
  popust NUMERIC(12,2) NOT NULL DEFAULT 0,
  dobavitelj TEXT,
  kolicina_tm NUMERIC(12,2) NOT NULL,
  znesek NUMERIC(12,2) NOT NULL
);

CREATE INDEX evidenca_zaloge_lot_id_idx ON evidenca_zaloge(lot_produkt_id);

CREATE TABLE narocnik (
  id BIGSERIAL PRIMARY KEY,
  ime_narocnika TEXT NOT NULL,
  gsm_stevilka TEXT,
  email_narocnika TEXT
);

CREATE TABLE delovna_naloga_plakati (
  id BIGINT PRIMARY KEY,
  status TEXT NOT NULL,
  naziv_projekta TEXT NOT NULL,
  opis TEXT,
  opomba TEXT,
  narocnik_id BIGINT NOT NULL REFERENCES narocnik(id) ON DELETE RESTRICT,
  cena_dela NUMERIC(12,2) NOT NULL,
  cena_materiala NUMERIC(12,2) NOT NULL,
  datum TIMESTAMPTZ NOT NULL
);

CREATE TABLE delovna_naloga_plakati_slika (
  id BIGSERIAL PRIMARY KEY,
  delovna_naloga_plakati_id BIGINT NOT NULL REFERENCES delovna_naloga_plakati(id) ON DELETE CASCADE,
  url TEXT NOT NULL
);

CREATE TABLE delovna_naloga_plakati_material (
  id BIGSERIAL PRIMARY KEY,
  delovna_naloga_plakati_id BIGINT NOT NULL REFERENCES delovna_naloga_plakati(id) ON DELETE CASCADE,
  lot_produkt_id BIGINT NOT NULL REFERENCES lot_produkt(id) ON DELETE RESTRICT,
  kolicina_uporabljenega_produkta NUMERIC(12,2) NOT NULL
);

CREATE INDEX delovna_plakati_material_lot_idx ON delovna_naloga_plakati_material(lot_produkt_id);

CREATE TABLE vozilo (
  id BIGSERIAL PRIMARY KEY,
  registrska_stevilka TEXT,
  stevilka_sasije TEXT NOT NULL,
  znamka_vozila TEXT NOT NULL
);

CREATE TABLE lastnik_vozila (
  id BIGSERIAL PRIMARY KEY,
  ime_lastnika TEXT NOT NULL,
  email_lastnika TEXT
);

CREATE TABLE delovna_naloga_avti (
  id BIGINT PRIMARY KEY,
  status TEXT NOT NULL,
  opravljena_storitev TEXT NOT NULL,
  opis TEXT,
  opomba TEXT,
  vozilo_id BIGINT NOT NULL REFERENCES vozilo(id) ON DELETE RESTRICT,
  lastnik_vozila_id BIGINT NOT NULL REFERENCES lastnik_vozila(id) ON DELETE RESTRICT,
  cena_dela NUMERIC(12,2) NOT NULL,
  cena_materiala NUMERIC(12,2) NOT NULL,
  datum TIMESTAMPTZ NOT NULL
);

CREATE TABLE delovna_naloga_avti_slika (
  id BIGSERIAL PRIMARY KEY,
  delovna_naloga_avti_id BIGINT NOT NULL REFERENCES delovna_naloga_avti(id) ON DELETE CASCADE,
  url TEXT NOT NULL
);

CREATE TABLE delovna_naloga_avti_material (
  id BIGSERIAL PRIMARY KEY,
  delovna_naloga_avti_id BIGINT NOT NULL REFERENCES delovna_naloga_avti(id) ON DELETE CASCADE,
  lot_produkt_id BIGINT NOT NULL REFERENCES lot_produkt(id) ON DELETE RESTRICT,
  kolicina_uporabljenega_produkta NUMERIC(12,2) NOT NULL
);

CREATE INDEX delovna_avti_material_lot_idx ON delovna_naloga_avti_material(lot_produkt_id);

CREATE TABLE delovna_naloga_avti_poskodba (
  id BIGSERIAL PRIMARY KEY,
  delovna_naloga_avti_id BIGINT NOT NULL REFERENCES delovna_naloga_avti(id) ON DELETE CASCADE,
  opis TEXT NOT NULL
);

CREATE TABLE ostali_nakup (
  id SERIAL PRIMARY KEY,
  datum TIMESTAMPTZ NOT NULL,
  opis TEXT NOT NULL,
  dobavitelj TEXT NOT NULL,
  podrobnosti TEXT NOT NULL,
  znesek NUMERIC(12,2) NOT NULL,
  stevilka_racuna TEXT
);
