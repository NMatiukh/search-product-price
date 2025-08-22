import { asText } from "./safeGetText";

/* ---------- Мапер потрібних полів ---------- */
export function mapProduct(item, idx) {
    const toBool = (v) => v === "1" || v === 1 || v === true || String(v).trim() === "1";
    const toNum = (v) => {
        const s = String(v ?? "").replace(",", ".").replace(/\s+/g, "");
        const n = Number(s);
        return Number.isFinite(n) ? n : 0;
    };

    const manufacturer = asText(item.ManufacturerName) || "Виробника немає";

    return {
        key: idx,
        Amount: toNum(item.Amount),
        BarCode: asText(item.BarCode) || "",
        BlackFriday: toBool(item.BlackFriday),
        Code: asText(item.Code) || "",
        Name: asText(item.Name) || "",
        Obsolete: toBool(item.Obsolete),
        Price: toNum(item.Price),
        PriceCurrency: asText(item.PriceCurrency) || "",
        ManufacturerName: manufacturer,           // <-- завжди рядок, з плейсхолдером
        WhPrice: toNum(item.WhPrice),
    };
}
