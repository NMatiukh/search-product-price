import { useEffect, useMemo, useState } from "react";
import {
  Flex,
  Input,
  Select,
  Table,
  message,
  Typography,
  Divider,
  Grid,
  InputNumber,
  Modal,
  Descriptions,
  Tag,
} from "antd";
import "./App.css";

// імпорти з сервісів
import { decodeXmlBytes } from "../../services/decodingXML";
import { findArrayOfObjects } from "../../services/findArrayOfObjects";
import { highlightText } from "../../services/highlightText";
import { mapProduct } from "../../services/mapProduct";
import { parseXmlToJson } from "../../services/parseXmlToJson";
import {
  FIELD_WEIGHTS,
  normalize,
  parseQuery,
  scoreField,
} from "../../services/searchUtils";

const { Search } = Input;
const { Text } = Typography;
const { useBreakpoint } = Grid;

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
        haystack: normalize(
          `${r.Name} ${r.BarCode} ${r.Code} ${r.ManufacturerName}`
        ),
      })),
    [rows]
  );

  // основний пошук + сортування
  const { results, highlightTokens } = useMemo(() => {
    const q = String(searchValue || "").trim();
    if (!q) return { results: rows, highlightTokens: [] };

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
        res.push({ score, r: row.r });
      }
    }

    // сортуємо: кращий скор — вище
    res.sort((a, b) => b.score - a.score);

    return {
      results: res.map((x) => x.r),
      highlightTokens: include.filter((t) => !t.exclude).map((t) => t.text),
    };
  }, [index, rows, searchValue]);

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
    { value: 0, label: "0%" },
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
        const fileUrl = new URL(
          "./data/PriceApp_2025-08-20_N2.xml",
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
        render: (val) =>
          highlightText(typeof val === "string" ? val : "", highlightTokens),
        width: 160,
      },
    ],
    [highlightTokens]
  );

  const discounted = (p) =>
    activeDiscount ? p * (1 - activeDiscount / 100) : p;

  const modalContent = selected && (
    <Descriptions
      size="middle"
      column={isMobile ? 1 : 2}
      bordered
      labelStyle={{ width: 180 }}
      style={{ wordBreak: "break-word" }}
    >
      <Descriptions.Item label="Код 1С">
        {selected.Code || "—"}
      </Descriptions.Item>
      <Descriptions.Item label="Артикул">
        {selected.BarCode || "—"}
      </Descriptions.Item>
      <Descriptions.Item label="Ціна (оригінал)">
        {selected.Price
          ? `${selected.Price.toFixed(2)} ${
              selected.PriceCurrency || ""
            }`.trim()
          : "—"}
      </Descriptions.Item>
      <Descriptions.Item label={`Ціна зі знижкою (${activeDiscount || 0}%)`}>
        {selected.Price
          ? `${discounted(selected.Price).toFixed(2)} ${
              selected.PriceCurrency || ""
            }`.trim()
          : "—"}
      </Descriptions.Item>

      <Descriptions.Item label="Ціна (грн)">
        {toUAH(selected.Price, selected.PriceCurrency) != null
          ? `${toUAH(selected.Price, selected.PriceCurrency).toFixed(2)} грн`
          : "—"}
      </Descriptions.Item>
      <Descriptions.Item label={`Ціна зі знижкою (грн)`}>
        {toUAH(discounted(selected.Price), selected.PriceCurrency) != null
          ? `${toUAH(
              discounted(selected.Price),
              selected.PriceCurrency
            ).toFixed(2)} грн`
          : "—"}
      </Descriptions.Item>
      <Descriptions.Item label="Ціна гурт (оригінал)">
        {typeof selected.WhPrice === "number"
          ? `${selected.WhPrice.toFixed(2)} ${
              selected.PriceCurrency || ""
            }`.trim()
          : "—"}
      </Descriptions.Item>

      <Descriptions.Item label="Ціна гурт (грн)">
        {toUAH(selected.WhPrice, selected.PriceCurrency) != null
          ? `${toUAH(selected.WhPrice, selected.PriceCurrency).toFixed(2)} грн`
          : "—"}
      </Descriptions.Item>
      <Descriptions.Item label="Валюта">
        {selected.PriceCurrency || "—"}
      </Descriptions.Item>
      <Descriptions.Item label="Виробник">
        {selected.ManufacturerName || "—"}
      </Descriptions.Item>
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
    <Flex
      vertical
      gap={isMobile ? 8 : 12}
      style={{ padding: isMobile ? 8 : 16, maxWidth: 1200, margin: "0 auto" }}
    >
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
          style={{ width: "100%" }}
          size={isMobile ? "middle" : "large"}
          value={activeDiscount || undefined}
        />

        <Flex align="center" gap={6} style={{ flexWrap: "wrap" }}>
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
          {rows.length
            ? `Знайдено: ${results.length} (у масиві: ${rows.length})`
            : "Завантаження XML..."}
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
          style: { cursor: "pointer" },
        })}
        scroll={{ x: "max-content" }}
        tableLayout="auto"
        sticky
        pagination={{
          size: isMobile ? "small" : "default",
          pageSize: isMobile ? 10 : 20,
          // pageSize: 10000,
          showSizeChanger: !isMobile,
        }}
        style={{ width: "100%", fontSize: 12 }}
      />

      <Modal
        title={
          selected
            ? selected.Name || selected.BarCode || "Деталі товару"
            : "Деталі товару"
        }
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
