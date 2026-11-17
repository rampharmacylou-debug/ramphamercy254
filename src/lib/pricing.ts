// Price = Pack Size × Unit Price — and the reverse: Unit Price = Price ÷ Pack Size.
// The CALCULATED value is always rounded to a whole number (e.g. 3500 ÷ 35 = 100, 100 ÷ 35 = 2.857 → 3).
// A value you type yourself is never changed.
// Only works when the pack size is a plain number (e.g. "35"). Pack sizes like
// "24x2" can't be calculated, so those fields are left for you to type.

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}


/** Price from pack size and unit price, as a whole number, or null if not calculable. */
export function calcPrice(packsize: unknown, unitPrice: unknown): number | null {
  const pack = toNum(packsize);
  const unit = toNum(unitPrice);
  if (pack === null || unit === null || pack <= 0 || unit < 0) return null;
  return Math.round(pack * unit);
}

/** Unit price from pack size and price, as a whole number, or null if not calculable. */
export function calcUnitPrice(packsize: unknown, price: unknown): number | null {
  const pack = toNum(packsize);
  const total = toNum(price);
  if (pack === null || total === null || pack <= 0 || total < 0) return null;
  return Math.round(total / pack);
}

/**
 * Fill in whichever of unitPrice / price is missing, using pack size.
 * Never overwrites a value that is already there.
 */
export function fillMissingPrice<T extends { packsize?: unknown; unitPrice?: unknown; price?: unknown }>(
  row: T,
): { unitPrice: number | null; price: number | null } {
  const unit = toNum(row.unitPrice);
  const price = toNum(row.price);
  if (unit === null && price !== null) return { unitPrice: calcUnitPrice(row.packsize, price), price };
  if (price === null && unit !== null) return { unitPrice: unit, price: calcPrice(row.packsize, unit) };
  return { unitPrice: unit, price };
}
