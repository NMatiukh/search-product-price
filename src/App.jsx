import {useEffect, useMemo, useState} from "react";
import {
    Flex, Input, Select, Table, message, Typography, Divider, Grid,
    InputNumber, Modal, Descriptions, Tag
} from "antd";
import "./App.css";

const {Search} = Input;
const {Text} = Typography;
const {useBreakpoint} = Grid;

/* ---------- ДЕКОДУВАННЯ XML З ПІДТРИМКОЮ encoding ---------- */
function sniffXmlEncoding(bytes) {
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) return "utf-8";
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) return "utf-16be";
    if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) return "utf-16le";
    const head = new TextDecoder("ascii").decode(bytes.slice(0, 1024));
    const m = head.match(/encoding\s*=\s*["']([^"']+)["']/i);
    if (m && m[1]) return m[1].toLowerCase();
    return "utf-8";
}

function decodeXmlBytes(bytes) {
    const tryDecode = (enc) => {
        try {
            return new TextDecoder(enc).decode(bytes);
        } catch {
            return null;
        }
    };
    const enc = sniffXmlEncoding(bytes);
    return (
        tryDecode(enc) ||
        tryDecode("utf-8") ||
        tryDecode("windows-1251") ||
        tryDecode("utf-16le") ||
        tryDecode("utf-16be") ||
        tryDecode("iso-8859-1")
    );
}

/* ---------- XML -> JSON ---------- */
function parseXmlToJson(xmlString) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlString, "text/xml");
    if (xml.getElementsByTagName("parsererror").length) {
        throw new Error("Невірний XML. Перевірте синтаксис файлу.");
    }
    const xmlToObj = (node) => {
        if (node.nodeType === 3 || node.nodeType === 4) {
            const t = node.nodeValue?.trim();
            return t?.length ? t : null;
        }
        if (node.nodeType !== 1) return null;

        const obj = {};
        if (node.attributes?.length) {
            obj._attrs = {};
            for (const a of node.attributes) obj._attrs[a.name] = a.value;
        }

        let textContent = "";
        let hasChildren = false;

        for (const child of node.childNodes) {
            if (child.nodeType === 1) {
                hasChildren = true;
                const childObj = xmlToObj(child);
                if (childObj === null) continue;
                const key = child.nodeName;
                if (obj[key] !== undefined) {
                    if (!Array.isArray(obj[key])) obj[key] = [obj[key]];
                    obj[key].push(childObj);
                } else {
                    obj[key] = childObj;
                }
            } else if (child.nodeType === 3 || child.nodeType === 4) {
                const t = child.nodeValue?.trim();
                if (t) textContent += (textContent ? " " : "") + t;
            }
        }

        if (!hasChildren && textContent) return textContent;
        if (hasChildren && textContent) obj._text = textContent;
        return obj;
    };

    return {[xml.documentElement.nodeName]: xmlToObj(xml.documentElement)};
}

/* ---------- Пошук першого масиву обʼєктів ---------- */
function findArrayOfObjects(anyJson) {
    if (Array.isArray(anyJson)) {
        const objs = anyJson.filter((x) => x && typeof x === "object" && !Array.isArray(x));
        if (objs.length) return objs;
    }
    if (anyJson && typeof anyJson === "object") {
        for (const k of Object.keys(anyJson)) {
            const found = findArrayOfObjects(anyJson[k]);
            if (found) return found;
        }
    }
    return null;
}

/* ---------- Мапер потрібних полів ---------- */
function mapProduct(item, idx) {
    const toBool = (v) => v === "1" || v === 1 || v === true || String(v).trim() === "1";
    const toNum = (v) => {
        const s = String(v ?? "").replace(",", ".").replace(/\s+/g, "");
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

// ======== SEARCH UTILS ========
const FIELD_WEIGHTS = {name: 3, barcode: 4, code: 2, maker: 1};

const normalize = (s) =>
    String(s ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // без діакритики

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// простий Levenshtein (вистачає для 7к рядків)
function dist(a, b) {
    a = normalize(a);
    b = normalize(b);
    const m = a.length, n = b.length;
    if (!m || !n) return m || n;
    const dp = Array.from({length: n + 1}, (_, j) => j);
    for (let i = 1; i <= m; i++) {
        let prev = dp[0];
        dp[0] = i;
        for (let j = 1; j <= n; j++) {
            const tmp = dp[j];
            dp[j] = a[i - 1] === b[j - 1]
                ? prev
                : 1 + Math.min(prev, dp[j - 1], dp[j]);
            prev = tmp;
        }
    }
    return dp[n];
}

// парсер запиту: лапки, +, -, field:
function parseQuery(q) {
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
function scoreField(fieldValue, token) {
    const v = normalize(fieldValue);
    const t = token.norm;

    if (!v || !t) return 0;

    if (v === t) return 100;                  // повний збіг
    if (v.startsWith(t)) return 70;           // початок
    if (v.includes(t)) return 50;             // підрядок

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

// підсвітка збігів у тексті
function highlightText(text, highlightTokens) {
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

/* ---------- Компонент ---------- */
export default function App() {
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    const [activeDiscount, setActiveDiscount] = useState(0);
    const [searchValue, setSearchValue] = useState();
    const [rows, setRows] = useState([]);
// індекс для швидкого пошуку (нормалізовані поля)
    const index = useMemo(
        () =>
            rows.map((r) => ({
                r,
                name: normalize(r.Name),
                barcode: normalize(r.BarCode),
                code: normalize(r.Code),
                maker: normalize(r.ManufacturerName),
                haystack: normalize(`${r.Name} ${r.BarCode} ${r.Code} ${r.ManufacturerName}`),
            })),
        [rows]
    );

// основний пошук + сортування
    const {results, highlightTokens} = useMemo(() => {
        const q = String(searchValue || "").trim();
        if (!q) return {results: rows, highlightTokens: []};

        const toks = parseQuery(q);
        const include = toks.filter((t) => !t.exclude);
        const exclude = toks.filter((t) => t.exclude);
        const required = include.filter((t) => t.required);

        const res = [];

        loop: for (const row of index) {
            // - виключення
            for (const t of exclude) {
                const fieldVal = t.field ? row[t.field] : row.haystack;
                if (fieldVal && fieldVal.includes(t.norm)) continue loop;
            }

            // + обовʼязкові
            for (const t of required) {
                const fieldVal = t.field ? row[t.field] : row.haystack;
                if (!fieldVal || !fieldVal.includes(t.norm)) continue loop;
            }

            // набір полів для оцінки
            const fields = [
                ["name", FIELD_WEIGHTS.name],
                ["barcode", FIELD_WEIGHTS.barcode],
                ["code", FIELD_WEIGHTS.code],
                ["maker", FIELD_WEIGHTS.maker],
            ];

            let score = 0;
            for (const tok of include) {
                let best = 0;
                if (tok.field) {
                    best = scoreField(row[tok.field], tok) * (FIELD_WEIGHTS[tok.field] || 1);
                } else {
                    for (const [f, w] of fields) {
                        best = Math.max(best, scoreField(row[f], tok) * w);
                    }
                }
                score += best;
            }

            // легкий буст за короткі/повні артикул-коди
            if (include.some((t) => t.norm === row.barcode || t.norm === row.code)) {
                score += 30;
            }

            if (score > 0 || include.length === 0) {
                res.push({score, r: row.r});
            }
        }

        // сортуємо: кращий скор — вище
        res.sort((a, b) => b.score - a.score);

        return {
            results: res.map((x) => x.r),
            highlightTokens: include.filter((t) => !t.exclude).map((t) => t.text),
        };
    }, [index, searchValue]);

    // Modal
    const [openModal, setOpenModal] = useState(false);
    const [selected, setSelected] = useState(null);

    // *** КУРСИ ВАЛЮТ з localStorage ***
    const [usdRate, setUsdRate] = useState(() => {
        const v = localStorage.getItem("usdRate");
        return v ? Number(v) : 0;
    });
    const [eurRate, setEurRate] = useState(() => {
        const v = localStorage.getItem("eurRate");
        return v ? Number(v) : 0;
    });
    useEffect(() => {
        localStorage.setItem("usdRate", String(usdRate));
    }, [usdRate]);
    useEffect(() => {
        localStorage.setItem("eurRate", String(eurRate));
    }, [eurRate]);

    const toUAH = (price, currency) => {
        if (!price && price !== 0) return null;
        const c = (currency || "").toUpperCase().trim();
        if (c === "UAH" || c === "ГРН" || c === "₴" || c === "") return price;
        if (c === "USD") return usdRate ? price * usdRate : null;
        if (c === "EUR") return eurRate ? price * eurRate : null;
        return null;
    };

    const discountOption = [
        {value: 0, label: "0%"},
        {value: 5, label: "5%"},
        {value: 10, label: "10%"},
        {value: 15, label: "15%"},
        {value: 20, label: "20%"},
    ];

    // === ЗАВАНТАЖЕННЯ XML З ПРОЄКТУ ===
    useEffect(() => {
        (async () => {
            try {
                // Файл лежить у src/data; генеруємо URL, щоб забрати його як байти
                const fileUrl = new URL("./data/PriceApp_2025-08-20_N2.xml", import.meta.url);
                const res = await fetch(fileUrl);
                const buf = await res.arrayBuffer();
                const text = decodeXmlBytes(new Uint8Array(buf));
                if (!text) throw new Error("Не вдалось декодувати XML. Перевірте кодування файлу.");
                const json = parseXmlToJson(text);
                const arr = findArrayOfObjects(json) || [];
                const mapped = arr.map((x, i) => mapProduct(x, i));
                setRows(mapped);
            } catch (e) {
                console.error(e);
                message.error(e?.message || "Помилка зчитування XML з проєкту");
            }
        })();
    }, []);

    // Тільки 2 колонки в таблиці
    const columns = useMemo(
        () => [
            {
                title: "Назва",
                dataIndex: "Name",
                key: "Name",
                ellipsis: true,
                render: (val) => highlightText(val, highlightTokens),
            },
            {
                title: "Артикул",
                dataIndex: "BarCode",
                key: "BarCode",
                ellipsis: true,
                render: (val) => highlightText(val, highlightTokens),
                width: 160,
            },
        ],
        [highlightTokens]
    );


    const discounted = (p) => (activeDiscount ? p * (1 - activeDiscount / 100) : p);

    const modalContent = selected && (
        <Descriptions
            size="middle"
            column={isMobile ? 1 : 2}
            bordered
            labelStyle={{width: 180}}
            style={{wordBreak: "break-word"}}
        >
            <Descriptions.Item label="Код 1С">{selected.Code || "—"}</Descriptions.Item>
            <Descriptions.Item label="Артикул">{selected.BarCode || "—"}</Descriptions.Item>
            <Descriptions.Item label="Ціна (оригінал)">
                {selected.Price ? `${selected.Price.toFixed(2)} ${selected.PriceCurrency || ""}`.trim() : "—"}
            </Descriptions.Item>
            <Descriptions.Item label={`Ціна зі знижкою (${activeDiscount || 0}%)`}>
                {selected.Price
                    ? `${discounted(selected.Price).toFixed(2)} ${selected.PriceCurrency || ""}`.trim()
                    : "—"}
            </Descriptions.Item>

            <Descriptions.Item label="Ціна (грн)">
                {toUAH(selected.Price, selected.PriceCurrency) != null
                    ? `${toUAH(selected.Price, selected.PriceCurrency).toFixed(2)} грн`
                    : "—"}
            </Descriptions.Item>
            <Descriptions.Item label={`Ціна зі знижкою (грн)`}>
                {toUAH(discounted(selected.Price), selected.PriceCurrency) != null
                    ? `${toUAH(discounted(selected.Price), selected.PriceCurrency).toFixed(2)} грн`
                    : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Ціна гурт (оригінал)">
                {typeof selected.WhPrice === "number"
                    ? `${selected.WhPrice.toFixed(2)} ${selected.PriceCurrency || ""}`.trim()
                    : "—"}
            </Descriptions.Item>

            <Descriptions.Item label="Ціна гурт (грн)">
                {toUAH(selected.WhPrice, selected.PriceCurrency) != null
                    ? `${toUAH(selected.WhPrice, selected.PriceCurrency).toFixed(2)} грн`
                    : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Валюта">{selected.PriceCurrency || "—"}</Descriptions.Item>
            <Descriptions.Item label="Виробник">{selected.ManufacturerName || "—"}</Descriptions.Item>
            <Descriptions.Item label="Кількість">{selected.Amount}</Descriptions.Item>
            <Descriptions.Item label="Застарілий">
                {selected.Obsolete ? <Tag color="red">Так</Tag> : <Tag>Ні</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Black Friday">
                {selected.BlackFriday ? <Tag color="green">Так</Tag> : <Tag>Ні</Tag>}
            </Descriptions.Item>


        </Descriptions>
    );

    return (
        <Flex vertical gap={isMobile ? 8 : 12} style={{padding: isMobile ? 8 : 16, maxWidth: 1200, margin: "0 auto"}}>
            <Divider style={{margin: isMobile ? "8px 0" : "12px 0"}}/>

            <Flex gap={8} align="center" wrap style={{rowGap: 8}}>
                <Search
                    placeholder="Введіть артикул або назву"
                    allowClear
                    onSearch={setSearchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    style={{flex: isMobile ? "1 1 100%" : "0 1 420px", minWidth: 200}}
                    size={isMobile ? "middle" : "large"}
                />

                <Select
                    allowClear
                    placeholder="Виберіть знижку"
                    options={discountOption}
                    onChange={(v) => setActiveDiscount(v || 0)}
                    style={{width: "100%"}}
                    size={isMobile ? "middle" : "large"}
                    value={activeDiscount || undefined}
                />

                <Flex align="center" gap={6} style={{flexWrap: "wrap"}}>
                    <Flex align="center" gap={4}>
                        <Text>USD</Text>
                        <InputNumber
                            min={0}
                            value={usdRate}
                            onChange={(v) => setUsdRate(Number(v) || 0)}
                            placeholder="грн"
                            size={isMobile ? "middle" : "large"}
                            style={{width: 110}}
                        />
                    </Flex>
                    <Flex align="center" gap={4}>
                        <Text>EUR</Text>
                        <InputNumber
                            min={0}
                            value={eurRate}
                            onChange={(v) => setEurRate(Number(v) || 0)}
                            placeholder="грн"
                            size={isMobile ? "middle" : "large"}
                            style={{width: 110}}
                        />
                    </Flex>
                </Flex>

                <Text type="secondary" style={{marginLeft: "auto"}}>
                    {rows.length ? `Знайдено: ${results.length} (у масиві: ${rows.length})` : "Завантаження XML..."}
                </Text>

            </Flex>

            <Table
                size="small"
                columns={columns}
                dataSource={results}
                rowKey="key"
                onRow={(record) => ({
                    onClick: () => {
                        setSelected(record);
                        setOpenModal(true);
                    },
                    style: {cursor: "pointer"}
                })}
                scroll={{x: "max-content"}}
                tableLayout="auto"
                sticky
                pagination={{
                    size: isMobile ? "small" : "default",
                    pageSize: isMobile ? 10 : 20,
                    // pageSize: 10000,
                    showSizeChanger: !isMobile,
                }}
                style={{width: "100%", fontSize: 12}}
            />

            <Modal
                title={selected ? selected.Name || selected.BarCode || "Деталі товару" : "Деталі товару"}
                open={openModal}
                onCancel={() => setOpenModal(false)}
                onOk={() => setOpenModal(false)}
                okText="Готово"
                cancelText="Закрити"
                width={isMobile ? "100%" : 720}
            >
                {modalContent}
            </Modal>
        </Flex>
    );
}
