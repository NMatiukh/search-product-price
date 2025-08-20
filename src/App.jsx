import {useEffect, useMemo, useState} from "react";
import {
    Flex, Input, Select, Table, message, Typography, Divider, Grid,
    InputNumber, Modal, Descriptions, Tag
} from "antd";
import "./App.css";

const { Search } = Input;
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
function decodeXmlBytes(bytes) {
    const tryDecode = (enc) => {
        try { return new TextDecoder(enc).decode(bytes); } catch { return null; }
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
    useEffect(() => { localStorage.setItem("usdRate", String(usdRate)); }, [usdRate]);
    useEffect(() => { localStorage.setItem("eurRate", String(eurRate)); }, [eurRate]);

    const toUAH = (price, currency) => {
        if (!price && price !== 0) return null;
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

    // === ЗАВАНТАЖЕННЯ XML З ПРОЄКТУ ===
    useEffect(() => {
        (async () => {
            try {
                // Файл лежить у src/data; генеруємо URL, щоб забрати його як байти
                const fileUrl = new URL("./data/Price_2025-07-11_N1.xml", import.meta.url);
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
    const columns = useMemo(() => ([
        { title: "Артикул", dataIndex: "BarCode", key: "BarCode", ellipsis: true },
        { title: "Назва", dataIndex: "Name", key: "Name", ellipsis: true },
    ]), []);

    const filteredRows = useMemo(() => {
        if (!searchValue) return rows;
        const q = String(searchValue).toLowerCase();
        return rows.filter((r) =>
            Object.values(r).some((v) => (v != null ? String(v).toLowerCase().includes(q) : false))
        );
    }, [rows, searchValue]);

    const discounted = (p) => (activeDiscount ? p * (1 - activeDiscount / 100) : p);

    const modalContent = selected && (
        <Descriptions
            size="middle"
            column={isMobile ? 1 : 2}
            bordered
            labelStyle={{ width: 180 }}
            style={{ wordBreak: "break-word" }}
        >
            <Descriptions.Item label="Код 1С">{selected.Code || "—"}</Descriptions.Item>
            <Descriptions.Item label="Артикул">{selected.BarCode || "—"}</Descriptions.Item>
            <Descriptions.Item label="Назва">{selected.Name || "—"}</Descriptions.Item>
            <Descriptions.Item label="Виробник">{selected.ManufacturerName || "—"}</Descriptions.Item>
            <Descriptions.Item label="Кількість">{selected.Amount}</Descriptions.Item>
            <Descriptions.Item label="Застарілий">
                {selected.Obsolete ? <Tag color="red">Так</Tag> : <Tag>Ні</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Black Friday">
                {selected.BlackFriday ? <Tag color="green">Так</Tag> : <Tag>Ні</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Валюта">{selected.PriceCurrency || "—"}</Descriptions.Item>

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
        </Descriptions>
    );

    return (
        <Flex vertical gap={isMobile ? 8 : 12} style={{ padding: isMobile ? 8 : 16, maxWidth: 1200, margin: "0 auto" }}>
            <Divider style={{ margin: isMobile ? "8px 0" : "12px 0" }} />

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
                    {rows.length ? `Знайдено: ${filteredRows.length} (у масиві: ${rows.length})` : "Завантаження XML..."}
                </Text>
            </Flex>

            <Table
                size="small"
                columns={columns}
                dataSource={filteredRows}
                rowKey="key"
                onRow={(record) => ({
                    onClick: () => { setSelected(record); setOpenModal(true); },
                    style: { cursor: "pointer" }
                })}
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
