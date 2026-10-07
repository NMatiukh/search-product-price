import { asText } from "./safeGetText";

/* ---------- Мапер потрібних полів ---------- */
export function mapProduct(item, idx) {
    const toBool = (v) => v === "1" || v === 1 || v === true || String(v).trim() === "1";
    const toNum = (v) => {
        const s = String(v ?? "").replace(",", ".").replace(/\s+/g, "");
        const n = Number(s);
        return Number.isFinite(n) ? n : 0;
    };
    const toOptionalNum = (v) => {
        const text = asText(v);
        return text === "" ? null : toNum(text);
    };

    // У частині прайсів перша літера в назві XML-тега кирилична:
    // <МanufacturerName> замість <ManufacturerName>. Підтримуємо обидва варіанти.
    const manufacturer =
        asText(item.ManufacturerName) ||
        asText(item["МanufacturerName"]) ||
        "Виробника немає";

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
        // У новіших XML поле гуртової ціни може бути повністю відсутнім.
        WhPrice: toOptionalNum(item.WhPrice),
        ActPrice: toNum(item.ActPrice),
    };
}
