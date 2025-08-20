import {useEffect, useMemo, useState} from "react";
import { Flex, Input, Select, Table, Upload, message, Typography, Divider, Grid, InputNumber } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import "./App.css";

const { Search } = Input;
const { Dragger } = Upload;
const { Text } = Typography;
const { useBreakpoint } = Grid;

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
async function readXmlTextWithEncoding(file) {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let enc = sniffXmlEncoding(bytes);
    const tryDecode = (encoding) => {
        try { return new TextDecoder(encoding).decode(bytes); } catch { return null; }
    };
    let text = tryDecode(enc) || tryDecode("utf-8") || tryDecode("windows-1251") || tryDecode("utf-16le") || tryDecode("utf-16be") || tryDecode("iso-8859-1");
    if (!text) throw new Error("Не вдалось декодувати XML. Перевірте кодування файлу.");
    return text;
}

/* ---------- XML -> JSON ---------- */
function parseXmlToJson(xmlString) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlString, "text/xml");
    if (xml.getElementsByTagName("parsererror").length) throw new Error("Невірний XML. Перевірте синтаксис файлу.");

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

    return { [xml.documentElement.nodeName]: xmlToObj(xml.documentElement) };
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
    const toNum  = (v) => {
        const n = Number(v);
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
    };
}

/* ---------- Компонент ---------- */
export default function App() {
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    const [activeDiscount, setActiveDiscount] = useState(0);
    const [searchValue, setSearchValue] = useState();
    const [rows, setRows] = useState([]);
    const [fileName, setFileName] = useState("");

    // *** КУРСИ ВАЛЮТ з localStorage ***
    const [usdRate, setUsdRate] = useState(() => {
        const v = localStorage.getItem("usdRate");
        return v ? Number(v) : 0;
    });
    const [eurRate, setEurRate] = useState(() => {
        const v = localStorage.getItem("eurRate");
        return v ? Number(v) : 0;
    });

    // при зміні курсів оновлюємо localStorage
    useEffect(() => {
        localStorage.setItem("usdRate", String(usdRate));
    }, [usdRate]);
    useEffect(() => {
        localStorage.setItem("eurRate", String(eurRate));
    }, [eurRate]);

    // конвертація у гривні
    const toUAH = (price, currency) => {
        if (!price) return null;
        const c = (currency || "").toUpperCase().trim();
        if (c === "UAH" || c === "ГРН" || c === "₴" || c === "") return price;
        if (c === "USD") return usdRate ? price * usdRate : null;
        if (c === "EUR") return eurRate ? price * eurRate : null;
        return null;
    };

    const discountOption = [
        { value: 5, label: "5%" },
        { value: 10, label: "10%" },
        { value: 15, label: "15%" },
        { value: 20, label: "20%" },
    ];

    const handleFile = async (file) => {
        if (!file) return false;
        if (!file.name.toLowerCase().endsWith(".xml")) {
            message.error("Оберіть .xml файл");
            return false;
        }
        try {
            setFileName(file.name);
            const xmlText = await readXmlTextWithEncoding(file);
            const json = parseXmlToJson(xmlText);
            const arr = findArrayOfObjects(json) || [];
            const mapped = arr.map((x, i) => mapProduct(x, i));
            setRows(mapped);
            message.success(`XML розпарсено: ${file.name}`);
        } catch (e) {
            console.error(e);
            message.error(e?.message || "Помилка парсингу/декодування XML");
        }
        return false;
    };

    useEffect(() => { console.log(rows); }, [rows]);

    // *** КОЛОНКИ (додані UAH) ***
    const columns = useMemo(() => {
        return [
            { title: "Код 1С", dataIndex: "Code", key: "Code", ellipsis: true },
            { title: "Артикул", dataIndex: "BarCode", key: "BarCode", ellipsis: true },
            { title: "Назва", dataIndex: "Name", key: "Name", ellipsis: true },
            { title: "Виробник", dataIndex: "ManufacturerName", key: "ManufacturerName", ellipsis: true, responsive: ["sm"] },
            { title: "Кількість", dataIndex: "Amount", key: "Amount", width: 110 },
            {
                title: "Ціна",
                dataIndex: "Price",
                key: "Price",
                width: 140,
                render: (val, r) => `${val.toFixed(2)} ${r.PriceCurrency || ""}`.trim(),
            },
            {
                title: "Ціна (грн)",
                key: "PriceUAH",
                width: 140,
                render: (_, r) => {
                    const uah = toUAH(r.Price, r.PriceCurrency);
                    return uah != null ? `${uah.toFixed(2)} грн` : "—";
                },
            },
            {
                title: `Ціна зі знижкою (${activeDiscount || 0}%)`,
                key: "discounted_price",
                width: 170,
                render: (_, r) => {
                    if (!r.Price) return "-";
                    const p = activeDiscount ? r.Price * (1 - activeDiscount / 100) : r.Price;
                    return `${p.toFixed(2)} ${r.PriceCurrency || ""}`.trim();
                },
            },
            {
                title: `Ціна зі знижкою (грн)`,
                key: "discounted_price_uah",
                width: 190,
                render: (_, r) => {
                    if (!r.Price) return "—";
                    const discounted = activeDiscount ? r.Price * (1 - activeDiscount / 100) : r.Price;
                    const uah = toUAH(discounted, r.PriceCurrency);
                    return uah != null ? `${uah.toFixed(2)} грн` : "—";
                },
            },
            { title: "Black Friday", dataIndex: "BlackFriday", key: "BlackFriday", width: 120, render: (v) => (v ? "✅" : "—") },
            { title: "Застарілий", dataIndex: "Obsolete", key: "Obsolete", width: 110, render: (v) => (v ? "❌" : "—") },
        ];
    }, [activeDiscount, usdRate, eurRate, rows]); // важливо: якщо зміниться курс або знижка — перерахувати

    const filteredRows = useMemo(() => {
        if (!searchValue) return rows;
        const q = String(searchValue).toLowerCase();
        return rows.filter((r) =>
            Object.values(r).some((v) => (v != null ? String(v).toLowerCase().includes(q) : false))
        );
    }, [rows, searchValue]);

    return (
        <Flex vertical gap={isMobile ? 8 : 12} style={{ padding: isMobile ? 8 : 16, maxWidth: 1200, margin: "0 auto" }}>
            <Dragger
                accept=".xml"
                multiple={false}
                maxCount={1}
                beforeUpload={handleFile}
                showUploadList={{ showRemoveIcon: false, showPreviewIcon: false }}
                style={{ borderRadius: 12 }}
            >
                <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                <p className="ant-upload-text">Перетягніть XML-файл сюди або натисніть, щоб обрати</p>
                <p className="ant-upload-hint">Файл читається локально, без відправки на сервер.</p>
            </Dragger>

            {fileName && <Text type="secondary">Файл: {fileName}</Text>}

            <Divider style={{ margin: isMobile ? "8px 0" : "12px 0" }} />

            {/* *** НОВИЙ БЛОК: КУРСИ ВАЛЮТ *** */}
            <Flex gap={8} align="center" wrap style={{ rowGap: 8 }}>
                <Search
                    placeholder="Введіть артикул або назву"
                    allowClear
                    onSearch={setSearchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    style={{ flex: isMobile ? "1 1 100%" : "0 1 420px", minWidth: 200 }}
                    size={isMobile ? "middle" : "large"}
                />

                <Select
                    allowClear
                    placeholder="Виберіть знижку"
                    options={discountOption}
                    onChange={(v) => setActiveDiscount(v || 0)}
                    style={{ width: isMobile ? 140 : 200 }}
                    size={isMobile ? "middle" : "large"}
                    value={activeDiscount || undefined}
                />

                <Flex align="center" gap={6} style={{ flexWrap: "wrap" }}>
                    <Text type="secondary">Курс:</Text>
                    <Flex align="center" gap={4}>
                        <Text>USD</Text>
                        <InputNumber
                            min={0}
                            value={usdRate}
                            onChange={(v) => setUsdRate(Number(v) || 0)}
                            placeholder="грн"
                            size={isMobile ? "middle" : "large"}
                            style={{ width: 110 }}
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
                            style={{ width: 110 }}
                        />
                    </Flex>
                </Flex>

                <Text type="secondary" style={{ marginLeft: "auto" }}>
                    {rows.length ? `Знайдено: ${filteredRows.length} (у масиві: ${rows.length})` : "Завантажте XML, щоб побачити таблицю"}
                </Text>
            </Flex>

            <Table
                size="small"
                columns={columns}
                dataSource={filteredRows}
                scroll={{ x: "max-content" }}
                tableLayout="auto"
                sticky
                pagination={{
                    size: isMobile ? "small" : "default",
                    pageSize: isMobile ? 10 : 20,
                    showSizeChanger: !isMobile,
                }}
                style={{ width: "100%" }}
            />
        </Flex>
    );
}
