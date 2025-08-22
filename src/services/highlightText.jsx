const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// підсвітка збігів у тексті
export function highlightText(text, highlightTokens) {
    const str = String(text ?? "");
    if (!str || !highlightTokens.length) return str;

    const pattern = new RegExp(
        "(" + highlightTokens.map((t) => esc(t)).join("|") + ")",
        "gi"
    );
    const parts = str.split(pattern);
    return parts.map((p, i) =>
        pattern.test(p) ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>
    );
}
