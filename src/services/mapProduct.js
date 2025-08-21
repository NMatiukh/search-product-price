export function mapProduct(item, idx) {
  const toBool = (v) =>
    v === "1" || v === 1 || v === true || String(v).trim() === "1";
  const toNum = (v) => {
    const s = String(v ?? "")
      .replace(",", ".")
      .replace(/\s+/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  return {
    key: idx,
    Amount: toNum(item.Amount),
    BarCode: item.BarCode ?? "",
    BlackFriday: toBool(item.BlackFriday),
    Code: item.Code ?? "",
    Name: item.Name ?? "",
    Obsolete: toBool(item.Obsolete),
    Price: toNum(item.Price),
    PriceCurrency: item.PriceCurrency ?? "",
    ManufacturerName: item.ManufacturerName ?? "",
    WhPrice: toNum(item.WhPrice),
  };
}
