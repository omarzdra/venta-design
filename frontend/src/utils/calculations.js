export const materialQtyM2 = (qty, produkt) =>
  produkt?.tip === "tabla"
    ? Number(qty || 0)
    : produkt?.sirina
      ? Number(qty || 0) * Number(produkt.sirina)
      : Number(qty || 0);

export const calcMaterialTotal = (rows, lots) => (rows || []).reduce((sum, row) => {
  const lot = lots.find((item) => Number(item.id) === Number(row.lot_produkt_id));
  if (!lot) return sum;
  return sum + materialQtyM2(row.kolicina_tm, lot.produkt) * Number(lot.prodajna_cena || 0);
}, 0);

export const calcMaterialCost = (rows, lots) => (rows || []).reduce((sum, row) => {
  const lot = lots.find((item) => Number(item.id) === Number(row.lot_produkt_id));
  if (!lot) return sum;
  return sum + materialQtyM2(row.kolicina_tm, lot.produkt) * Number(lot.nabavna_cena || 0);
}, 0);

export const calcStoritveTotal = (rows, storitve) => (rows || []).reduce((sum, row) => {
  const storitev = storitve.find((item) => Number(item.id) === Number(row.storitev_id));
  return sum + Number(row.stevilo_ur || 0) * Number(storitev?.prodajna_cena ?? storitev?.eur_ura ?? 0);
}, 0);

export const calcStoritveCost = (rows, storitve) => (rows || []).reduce((sum, row) => {
  const storitev = storitve.find((item) => Number(item.id) === Number(row.storitev_id));
  return sum + Number(row.stevilo_ur || 0) * Number(storitev?.nabavna_cena || 0);
}, 0);

export const calcDnevniTotal = (row) => Number(row?.dnevni_strosek || 0) * Number(row?.stevilo_dni || 0);
