// Безпечно дістає текст (підтримка об'єктів виду {_text: "..."})
export function asText(v) {
  if (v == null) return "";
  if (typeof v === "object" && "_text" in v && v._text != null)
    return String(v._text).trim();
  return String(v).trim();
}
