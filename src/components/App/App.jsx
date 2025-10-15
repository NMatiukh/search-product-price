import {useCallback, useEffect, useMemo, useState} from "react";
import {Divider, Flex, Grid, message,} from "antd";
import "./App.css";

// імпорти з сервісів
import {decodeXmlBytes} from "../../services/decodingXML";
import {findArrayOfObjects} from "../../services/findArrayOfObjects";
import {asText} from "../../services/safeGetText";
import {mapProduct} from "../../services/mapProduct";
import {parseXmlToJson} from "../../services/parseXmlToJson";
import {FIELD_WEIGHTS, normalize, parseQuery, scoreField,} from "../../services/searchUtils";
import SearchBar from "../SearchBar";
import SelectOptions from "../SelectOptions";
import CurrencyBlock from "../CurrencyBlock";
import ProductInfo from "../ProductInfo";
import ModalWindow from "../ModalWindow";
import TableColumns from "../TableColumns";
import {cleanAndDecodeXml} from "../../services/cleanAndDecodeXml.js";

const {useBreakpoint} = Grid;

/* ---------- Компонент ---------- */
export default function App() {
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    const [activeDiscount, setActiveDiscount] = useState(0);
    const [searchValue, setSearchValue] = useState();
    const [rows, setRows] = useState([]);
    const [makerFilter, setMakerFilter] = useState();
    // for loading
    const [visibleCount, setVisibleCount] = useState(20);

    const manufacturers = useMemo(
        () =>
            Array.from(
                new Set(
                    rows
                        .map((r) => asText(r.ManufacturerName) || "Виробника немає")
                        .filter(Boolean)
                )
            ).sort((a, b) => a.localeCompare(b, "uk")),
        [rows]
    );

    const makerOptions = useMemo(
        () => manufacturers.map((m) => ({value: m, label: m})),
        [manufacturers]
    );

    const discountOption = [
        {value: 0, label: "0%"},
        {value: 5, label: "5%"},
        {value: 7, label: "7%"},
        {value: 10, label: "10%"},
        {value: 15, label: "15%"},
        {value: 20, label: "20%"},
    ];

    // індекс для швидкого пошуку (нормалізовані поля)
    const index = useMemo(
        () =>
            rows.map((r) => {
                const makerTxt = asText(r.ManufacturerName) || "Виробника немає";
                return {
                    r,
                    name: normalize(asText(r.Name)),
                    barcode: normalize(asText(r.BarCode)),
                    code: normalize(asText(r.Code)),
                    maker: normalize(makerTxt),
                    haystack: normalize(
                        `${asText(r.Name)} ${asText(r.BarCode)} ${asText(
                            r.Code
                        )} ${makerTxt}`
                    ),
                };
            }),
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
                    best =
                        scoreField(row[tok.field], tok) * (FIELD_WEIGHTS[tok.field] || 1);
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
    }, [index, rows, searchValue]);
    const displayRows = useMemo(
        () =>
            makerFilter
                ? results.filter(
                    (r) =>
                        normalize(asText(r.ManufacturerName) || "Виробника немає") ===
                        normalize(makerFilter)
                )
                : results,
        [results, makerFilter]
    );

    // Modal
    const [openModal, setOpenModal] = useState(false);
    const [selected, setSelected] = useState(null);

    // *** КУРСИ ВАЛЮТ з localStorage ***
    const [usdRate, setUsdRate] = useState(() => {
        const v = localStorage.getItem("usdRate");
        return v ? Number(v) : 42;
    });
    const [eurRate, setEurRate] = useState(() => {
        const v = localStorage.getItem("eurRate");
        return v ? Number(v) : 48.9;
    });
    useEffect(() => {
        localStorage.setItem("usdRate", String(usdRate));
    }, [usdRate]);
    useEffect(() => {
        localStorage.setItem("eurRate", String(eurRate));
    }, [eurRate]);

    // === ЗАВАНТАЖЕННЯ XML З ПРОЄКТУ ===
    useEffect(() => {
        (async () => {
            try {
                // Файл лежить у src/data; генеруємо URL, щоб забрати його як байти
                const fileUrl = new URL(
                    "../../data/PriceApp.xml",
                    import.meta.url
                );
                const res = await fetch(fileUrl);
                const buf = await res.arrayBuffer();
                const text = decodeXmlBytes(new Uint8Array(buf));
                if (!text)
                    throw new Error(
                        "Не вдалось декодувати XML. Перевірте кодування файлу."
                    );
                const json = parseXmlToJson(text);
                const arr = findArrayOfObjects(json) || [];
                const mapped = arr.map((x, i) => mapProduct(x, i));
                setRows(mapped.map(value => ({...value, Name: cleanAndDecodeXml(value.Name)})));
                // setRows(mapped);
            } catch (e) {
                console.error(e);
                message.error(e?.message || "Помилка зчитування XML з проєкту");
            }
        })();
    }, []);
    const parseAmount = (v) => {
        if (v == null) return NaN;
        if (typeof v === "number") return v;
        // підчищаємо можливі пробіли/коми
        const s = String(v).replace(/\s/g, "").replace(",", ".");
        const n = Number(s);
        return Number.isFinite(n) ? n : NaN;
    };

    const normalizeCurrency = (cur = "UAH") => {
        const s = String(cur || "UAH").trim().toUpperCase();
        if (["USD", "$", "DOLLAR", "ДОЛАР", "ДОЛЛАР"].includes(s)) return "USD";
        if (["EUR", "€", "EURO", "ЄВРО"].includes(s)) return "EUR";
        if (["UAH", "₴", "ГРН", "ГРИВНЯ"].includes(s)) return "UAH";
        return "UAH";
    };

    const toUAH = useCallback(
        (val, cur) => {
            const amount = parseAmount(val);
            if (!Number.isFinite(amount)) return null;
            const code = normalizeCurrency(cur);
            switch (code) {
                case "USD":
                    return usdRate ? amount * usdRate : null;
                case "EUR":
                    return eurRate ? amount * eurRate : null;
                case "UAH":
                default:
                    return amount;
            }
        },
        [usdRate, eurRate]
    );

    // infinite scroll
    const loadMore = () => setVisibleCount((prev) => prev + 20);
    const visibleRows = displayRows.slice(0, visibleCount);

    const handleScroll = (e) => {
        const {scrollTop, scrollHeight, clientHeight} = e.target;
        if (scrollTop + clientHeight >= scrollHeight - 10) {
            loadMore();
        }
    };

    useEffect(() => {
        setVisibleCount(20);
    }, [searchValue, makerFilter]);

    return (
        <Flex
            vertical
            gap={isMobile ? 8 : 12}
            style={{padding: isMobile ? 8 : 16, maxWidth: 1200, margin: "0 auto"}}
        >
            <Divider style={{margin: isMobile ? "8px 0" : "12px 0"}}/>

            <Flex gap={8} align="center" wrap style={{rowGap: 8}}>
                <SearchBar onSearch={setSearchValue} isMobile={isMobile}/>

                <SelectOptions
                    placeholder="Виберіть знижку"
                    isOptions={discountOption}
                    onChangeSetter={(v) => setActiveDiscount(v || 0)}
                    isMobile={isMobile}
                    value={activeDiscount || undefined}
                />
                <SelectOptions
                    placeholder="Фільтр: виробник"
                    isOptions={makerOptions}
                    value={makerFilter}
                    onChangeSetter={(v) => setMakerFilter(v || undefined)}
                    style={{width: !isMobile && 240}}
                    isMobile={isMobile}
                    showSearch
                    optionFilterProp="label"
                />

                <CurrencyBlock
                    valueRate={{usdRate, eurRate}}
                    onChangeSetter={{setEurRate, setUsdRate}}
                    isMobile={isMobile}
                />

                <ProductInfo rows={rows} displayRows={displayRows}/>
            </Flex>

            <div style={{height: isMobile ? 400 : 600, overflowY: "auto"}} onScroll={handleScroll}>
                <TableColumns
                    highlightTokens={highlightTokens}
                    displayRows={visibleRows}
                    setSelected={setSelected}
                    setOpenModal={setOpenModal}
                    isMobile={isMobile}
                    toUAH={toUAH}
                />
                {visibleCount < displayRows.length && (
                    <div style={{textAlign: "center", padding: 16}}>Завантаження...</div>
                )}
            </div>

            <ModalWindow
                selected={selected}
                isMobile={isMobile}
                openModal={openModal}
                setOpenModal={setOpenModal}
                activeDiscount={activeDiscount}
                valueRate={{usdRate, eurRate}}
            />
        </Flex>
    );
}
