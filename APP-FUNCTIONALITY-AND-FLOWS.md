# Venta Design - funkcionalnosti in user flow

Datum: 2026-05-26

## Povzetek aplikacije

Aplikacija je sistem za vodenje zaloge, delovnih nalog in financ (prihodki/stroski). Ima 5 glavnih zavihkov in centralno logiko: material se prevzame v zalogo, porabi na nalogah, naloge se potrdijo s ceno, prihodki in stroski se vodijo v evidenci dobicka.

## Globalni elementi

- Glava z naslovom, opisom in 5 zavihki. Klik na zavihek preklopi vsebino.
- Stanje nalaganja: prikaz "Nalagam podatke iz Postgres Baze...".
- Obvestila: zelena (uspeh) ali rdeca (napaka), izginejo po 5 sekundah.

## Funkcionalnosti po zavihkih

### 1) Zaloga in Produkati

**Katalog produktov**

- Klik na produkt v seznamu: razsiri/strni LOT-e in prikaze kolicino ter vrednost zaloge.
- Namen: hiter pregled zaloge po produktih in LOT-ih.

**Dodaj nov produkt**

- Gumb "Ustvari produkt": shrani nov produkt (koda, tip, naziv, nabavna/prodajna cena).
- Namen: razsiritev kataloga materiala.

**LOT prevzem (vnos materiala)**

- Iskanje po nazivu ali kodi produkta.
- Izbira produkta: avtomatsko napolni nabavno/prodajno ceno v obrazcu.
- Gumb "Sprejmi in kreiraj prevzem": shrani LOT in ustvari evidenco prevzema.
- Namen: vnos prejetega materiala in sledenje po LOT-ih.

### 2) Kreiranje Nalog

**Izbira tipa naloge**

- "Nova Naloga: PLAKATI / NALEPKE" ali "Nova Naloga: AVTI / WRAP".
- Klik preklopi obrazec.

**Plakati (obrazec)**

- Polja: status, naziv projekta, opis, narocnik, opomba, URL slike.
- Poraba materiala: dodaj/odstrani vrstice, izberi LOT, kolicina porabe.
- Gumb "Ustvari Nalogo": kreira novo nalogo.
- Namen: evidenca naloge in materiala za tiskane izdelke.

**Avti (obrazec)**

- Polja: status, storitev, znamka, registrska, VIN, lastnik, kontakt, opomba, URL slike.
- Checklist poskodb vozila.
- Poraba materiala enako kot pri plakatih.
- Gumb "Ustvari Nalogo": kreira novo nalogo.
- Namen: evidenca naloge za vozila in wrap projekte.

### 3) Evidenca Nalog

**Preklop: PLAKATI / AVTI**

- Klik preklopi seznam nalog in podrobnosti.

**Iskanje**

- Isce po: naziv, status, tablica, sasija.

**Seznam nalog**

- Klik na nalogo: odpre modal z detajli.
- Status prikazan kot oznaka na kartici.

**Modal naloge**

- Detajli: ID, datum, opis, narocnik, vozilo/lastnik, poskodbe, poraba materiala.
- Gumb "Oznaci dokončano": nastavi status na dokoncan.
- Gumb "Potrdi s ceno": zahteva vnos cene dela in nastavi status na potrjen.
- Gumb "Uredi to Nalogo v Sidebar-u": odpre urejanje v desnem panelu.

**Urejanje naloge (sidebar)**

- Enak obrazec kot pri kreiranju.
- Gumb "Posodobi Nalogo": shrani spremembe.
- Gumb "Preklici": zapre urejanje.

### 4) Evidenca Zaloge

**Filtri**

- Tip transakcije: vse / stroski (prevzem) / dobicek (prodaja).
- Tip produkta: vse / folije / ADR oprema.
- Iskanje po nazivu ali LOT.

**Tabela evidenc**

- Datum, tip, produkt+LOT, kolicina (tm ali kos).
- Namen: pregled vseh premikov zaloge.

### 5) Evidenca Dobicka

**KPI kartice**

- Razlika (prihodki - stroski), skupni prihodki, skupni stroski.

**Preklop: NAKUPI / PRODAJA**

- Klik preklopi tabelo in obrazce.

**Filtri**

- Mesec (dropdown) in iskanje po opisu/narocniku/dobavitelju.

**Nakupi (stroski)**

- Gumb "+ Dodaj Nakup": odpre obrazec.
- Obrazec: datum, znesek, datum placila, DDV, opis, dobavitelj, racun, kategorija.
- Klik na vrstico: odpre modal "Podrobnosti stroska".
- Gumb "POTRDI" (za LOT prevzeme): potrdi prevzem z racunom in placilom.

**Prodaja (prihodki)**

- Gumb "+ Dodaj Prihodek": odpre obrazec.
- Obrazec: datum, znesek, datum placila, DDV, opis, narocnik, racun.
- Klik na vrstico: odpre modal "Podrobnosti prihodka".

## User flow (glavni scenariji)

### Flow A: Vnos novega materiala v zalogo

1. Uporabnik odpre zavihek "Zaloga in Produkati".
2. V katalogu preveri obstojece produkte.
3. Po potrebi doda nov produkt (koda, tip, nazivi, cene).
4. V "LOT prevzem" izbere produkt, vnese LOT stevilko in kolicino.
5. Potrdi z "Sprejmi in kreiraj prevzem".
6. Sistem ustvari evidenco prevzema in LOT je na voljo za uporabo.

### Flow B: Kreiranje naloge (Plakati)

1. Uporabnik odpre "Kreiranje Nalog".
2. Izbere "Plakati".
3. Vnese podatke o projektu in narocniku.
4. Doda porabo materiala z izbiro LOT-ov in kolicine.
5. Po zelji doda URL slike.
6. Klik "Ustvari Nalogo".
7. Naloga se pojavi v evidenci nalog s statusom "v izdelavi".

### Flow C: Kreiranje naloge (Avti)

1. Uporabnik odpre "Kreiranje Nalog".
2. Izbere "Avti".
3. Vnese podatke o vozilu in lastniku.
4. Oznaci poskodbe (checklist).
5. Doda porabo materiala z izbiro LOT-ov in kolicine.
6. Klik "Ustvari Nalogo".
7. Naloga se pojavi v evidenci nalog s statusom "v izdelavi".

### Flow D: Dokoncaj in potrdi nalogo s ceno

1. Uporabnik odpre "Evidenca Nalog".
2. V seznamu klikne nalogo.
3. V modalu pregleda podrobnosti.
4. Klik "Oznaci dokončano" (status postane dokoncan).
5. Vnese ceno dela in klik "Potrdi s ceno".
6. Status postane "potrjena".
7. Cena dela + cena materiala se uporabita za financno evidenco.

### Flow E: Evidenca stroskov (nakup)

1. Uporabnik odpre "Evidenca Dobicka".
2. Izbere "NAKUPI".
3. Klikne "+ Dodaj Nakup".
4. Vnese podatke o nakupu in shrani.
5. Nakup se pojavi v tabeli stroskov.

### Flow F: Potrditev LOT prevzema (racun in placilo)

1. V "Evidenca Dobicka > NAKUPI" uporabnik najde LOT prevzem v tabeli.
2. Klik "POTRDI".
3. Vnese znesek, DDV, datum placila, dobavitelja in racun.
4. Klik "Shrani in Potrdi".
5. LOT prevzem je potrjen.

### Flow G: Evidenca prihodkov

1. Uporabnik odpre "Evidenca Dobicka".
2. Izbere "PRODAJA".
3. Klikne "+ Dodaj Prihodek".
4. Vnese podatke o prihodku in shrani.
5. Prihodek se pojavi v tabeli.

## Seznam tipicnih klikov in namenov

- Klik na zavihek: preklop modula.
- Klik na produkt: razsiri/strni LOT-e.
- Klik "Ustvari produkt": dodaj produkt v katalog.
- Klik "Sprejmi in kreiraj prevzem": zabelezi LOT prevzem.
- Klik "Ustvari Nalogo": kreira nalogo.
- Klik naloge v evidenci: odpre modal podrobnosti.
- Klik "Oznaci dokončano": spremeni status naloge.
- Klik "Potrdi s ceno": zakljucek naloge s ceno.
- Klik "Uredi to Nalogo v Sidebar-u": urejanje naloge.
- Klik "+ Dodaj Nakup" ali "+ Dodaj Prihodek": odpre obrazec.
- Klik vrstice v tabelah: odpre podrobnosti (modal).
- Klik "POTRDI" v nakupih: potrdi LOT prevzem z racunom in placilom.

## Opombe za design agenta

- Aplikacija je podatkovno intenzivna (tabele, seznami, modali, obrazci).
- Velik poudarek na stanjih: status naloge, potrjen LOT, uspeh/napaka.
- Vizualno je kljucno razlikovanje: prihodki vs stroski, statusi nalog, tipi produktov.
