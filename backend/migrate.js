const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const dbPath = path.join(__dirname, '../db.json');
  const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  console.log("Migrating Produkti...");
  for (const prod of data.produkti || []) {
    await prisma.produkt.create({
      data: {
        id: Number(prod.id),
        koda: prod.koda,
        naziv_produkta: prod.naziv_produkta,
        prodajna_cena: Number(prod.prodajna_cena),
        nabavna_cena: Number(prod.nabavna_cena),
        tip: prod.tip
      }
    });
  }

  console.log("Migrating LotProdukti...");
  for (const lot of data.lot_produkti || []) {
    await prisma.lotProdukt.create({
      data: {
        id: BigInt(lot.id),
        produkt_id: Number(lot.produkt_id),
        lot_stevilka: lot.lot_stevilka,
        kolicina_tm: Number(lot.kolicina_tm),
        nabavna_cena: Number(lot.nabavna_cena),
        prodajna_cena: Number(lot.prodajna_cena),
        datum_prevzema: new Date(lot.datum_prevzema),
        potrjeno: Boolean(lot.potrjeno),
        dobavitelj: lot.dobavitelj || null,
        stevilka_racuna: lot.stevilka_racuna || null
      }
    });
  }

  console.log("Migrating EvidencaZaloge...");
  for (const ev of data.evidencija_zaloge || []) {
    await prisma.evidencaZaloge.create({
      data: {
        id: String(ev.id),
        datum: new Date(ev.datum),
        lot_produkt_id: BigInt(ev.lot_produkt_id),
        naziv_produkta: ev.naziv_produkta,
        tip: ev.tip,
        stevilka_racuna: ev.stevilka_racuna || null,
        nabavna_cena: Number(ev.nabavna_cena),
        prodajna_cena: ev.prodajna_cena ? Number(ev.prodajna_cena) : null,
        popust: Number(ev.popust || 0),
        dobavitelj: ev.dobavitelj || null,
        kolicina_tm: Number(ev.kolicina_tm),
        znesek: Number(ev.znesek)
      }
    });
  }

  console.log("Migrating Delovne Naloge Plakati...");
  for (const n of data.delovne_naloge_plakati || []) {
    const narocnik = await prisma.narocnik.create({
      data: {
        ime_narocnika: n.narocnik?.ime_narocnika || "",
        gsm_stevilka: n.narocnik?.gsm_stevilka || null,
        email_narocnika: n.narocnik?.email_narocnika || null
      }
    });

    await prisma.delovnaNalogaPlakati.create({
      data: {
        id: BigInt(n.id),
        status: n.status,
        naziv_projekta: n.naziv_projekta,
        opis: n.opis || null,
        opomba: n.opomba || null,
        narocnik_id: narocnik.id,
        cena_dela: Number(n.cena_dela),
        cena_materiala: Number(n.cena_materiala),
        datum: new Date(n.datum)
      }
    });

    for (const url of n.slike || []) {
      await prisma.delovnaNalogaPlakatiSlika.create({
        data: {
          delovna_naloga_plakati_id: BigInt(n.id),
          url: String(url)
        }
      });
    }

    for (const m of n.materiali || []) {
      await prisma.delovnaNalogaPlakatiMaterial.create({
        data: {
          delovna_naloga_plakati_id: BigInt(n.id),
          lot_produkt_id: BigInt(m.lot_produkt_id),
          kolicina_uporabljenega_produkta: Number(m.kolicina_uporabljenega_produkta)
        }
      });
    }
  }

  console.log("Migrating Delovne Naloge Avti...");
  for (const n of data.delovne_naloge_avti || []) {
    const vozilo = await prisma.vozilo.create({
      data: {
        registrska_stevilka: n.vozilo?.registrska_stevilka || null,
        stevilka_sasije: n.vozilo?.stevilka_sasije || "",
        znamka_vozila: n.vozilo?.znamka_vozila || ""
      }
    });

    const lastnik = await prisma.lastnikVozila.create({
      data: {
        ime_lastnika: n.lastnik_vozila?.ime_lastnika || "",
        email_lastnika: n.lastnik_vozila?.email_lastnika || null
      }
    });

    await prisma.delovnaNalogaAvti.create({
      data: {
        id: BigInt(n.id),
        status: n.status,
        opravljena_storitev: n.opravljena_storitev,
        opis: n.opis || null,
        opomba: n.opomba || null,
        vozilo_id: vozilo.id,
        lastnik_vozila_id: lastnik.id,
        cena_dela: Number(n.cena_dela),
        cena_materiala: Number(n.cena_materiala),
        datum: new Date(n.datum)
      }
    });

    for (const url of n.slike || []) {
      await prisma.delovnaNalogaAvtiSlika.create({
        data: {
          delovna_naloga_avti_id: BigInt(n.id),
          url: String(url)
        }
      });
    }

    for (const m of n.materiali || []) {
      await prisma.delovnaNalogaAvtiMaterial.create({
        data: {
          delovna_naloga_avti_id: BigInt(n.id),
          lot_produkt_id: BigInt(m.lot_produkt_id),
          kolicina_uporabljenega_produkta: Number(m.kolicina_uporabljenega_produkta)
        }
      });
    }

    for (const p of n.poskodba_vozila || []) {
      await prisma.delovnaNalogaAvtiPoskodba.create({
        data: {
          delovna_naloga_avti_id: BigInt(n.id),
          opis: String(p)
        }
      });
    }
  }

  console.log("Migrating Ostali Nakupi...");
  for (const nak of data.ostali_nakupi || []) {
    await prisma.ostaliNakup.create({
      data: {
        id: Number(nak.id),
        datum: new Date(nak.datum),
        opis: nak.opis,
        dobavitelj: nak.dobavitelj,
        podrobnosti: nak.podrobnosti,
        znesek: Number(nak.znesek),
        stevilka_racuna: nak.stevilka_racuna || null
      }
    });
  }

  // Adjust auto-increment sequences for tables with manual IDs
  console.log("Adjusting sequences...");
  await prisma.$executeRaw`SELECT setval('"Produkt_id_seq"', (SELECT MAX(id) FROM "Produkt"));`;
  await prisma.$executeRaw`SELECT setval('"OstaliNakup_id_seq"', (SELECT MAX(id) FROM "OstaliNakup"));`;

  console.log("Migration completed!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
