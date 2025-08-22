// ======== SEARCH UTILS ========
export const FIELD_WEIGHTS = { name: 3, barcode: 4, code: 2, maker: 1 };

export const normalize = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // без діакритики

// простий Levenshtein (вистачає для 7к рядків)
function dist(a, b) {
  a = normalize(a);
  b = normalize(b);
  const m = a.length,
    n = b.length;
  if (!m || !n) return m || n;
  const dp = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] =
        a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j - 1], dp[j]);
      prev = tmp;
    }
  }
  return dp[n];
}

// парсер запиту: лапки, +, -, field:
export function parseQuery(q) {
  const tokens = [];
  const re = /(-|\+)?(?:(name|barcode|code|maker):)?(?:"([^"]+)"|(\S+))/gi;
  let m;
  while ((m = re.exec(q))) {
    const op = m[1] || "";
    const field = (m[2] || "").toLowerCase();
    const text = m[3] || m[4] || "";
    if (!text) continue;
    tokens.push({
      text,
      norm: normalize(text),
      field: field || null,
      required: op === "+",
      exclude: op === "-",
      phrase: Boolean(m[3]),
    });
  }
  return tokens;
}

// оцінка збігу одного токена по одному полі
export function scoreField(fieldValue, token) {
  const v = normalize(fieldValue);
  const t = token.norm;

  if (!v || !t) return 0;

  if (v === t) return 100; // повний збіг
  if (v.startsWith(t)) return 70; // початок
  if (v.includes(t)) return 50; // підрядок

  // fuzzy: порівнюємо з окремими словами поля
  if (t.length >= 3) {
    let best = Infinity;
    for (const w of v.split(/[\s\-_/.,]+/)) {
      if (!w) continue;
      const d = dist(w, t);
      if (d < best) best = d;
      if (best === 0) break;
    }
    if (best === 1) return 35;
    if (best === 2) return 18;
  }
  return 0;
}
