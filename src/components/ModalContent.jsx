import React, {useEffect} from "react";
import {Descriptions, Table, Tag, Divider} from "antd";
import SecureValue from "./SecureValue.jsx";

export default function ModalContent({
                                         selected,
                                         isMobile,
                                         activeDiscount,
                                         toUAH,
                                         valueRate, // { usdRate, eurRate }
                                     }) {
    const usdRate = valueRate?.usdRate ?? 0;
    const eurRate = valueRate?.eurRate ?? 0;

    const discounted = (p) =>
        typeof p === "number" && activeDiscount ? p * (1 - activeDiscount / 100) : p;

    const fmt = (n) => (typeof n === "number" && Number.isFinite(n) ? n.toFixed(2) : "—");

    // універсальна конвертація між валютами через грн
    const convert = (amount, from, to) => {
        if (amount == null) return null;
        const uah = toUAH(amount, from);
        if (uah == null) return null;

        switch (to) {
            case "UAH":
                return uah;
            case "USD":
                return usdRate ? uah / usdRate : null;
            case "EUR":
                return eurRate ? uah / eurRate : null;
            default:
                return null;
        }
    };

    const price = selected?.Price ?? null;
    const actPrice = selected?.ActPrice ?? null;
    const whPrice = typeof selected?.WhPrice === "number" ? selected.WhPrice : null;
    const cur = selected?.PriceCurrency || "UAH";

    // --- Таблиця: значення ---
    const rows = [
        {
            key: "orig",
            type: "Ціна",
            euro: convert(price, cur, "EUR"),
            dollar: convert(price, cur, "USD"),
            uah: convert(price, cur, "UAH"),
        },
        {
            key: "promo",
            type: "Ціна А",
            euro: convert(actPrice, cur, "EUR"),
            dollar: convert(actPrice, cur, "USD"),
            uah: convert(actPrice, cur, "UAH"),
        },
        {
            key: "wholesale", // ← гуртова (єдина заблюрена)
            type: "Ціна Г",
            euro: convert(whPrice, cur, "EUR"),
            dollar: convert(whPrice, cur, "USD"),
            uah: convert(whPrice, cur, "UAH"),
        },
        {
            key: "orig-d",
            type: `Ціна (${activeDiscount || 0}%)`,
            euro: convert(discounted(price), cur, "EUR"),
            dollar: convert(discounted(price), cur, "USD"),
            uah: convert(discounted(price), cur, "UAH"),
        },
    ];

    const dataSource = rows.map((r) => ({
        ...r,
        euro: fmt(r.euro),
        dollar: fmt(r.dollar),
        uah: fmt(r.uah),
    }));

    // Рендеримо SecureValue ТІЛЬКИ для рядка key === 'wholesale'
    const blurIfWholesale = (val, record) =>
        record.key === "wholesale" ? <SecureValue value={val}/> : <div style={{padding: 8}}>{val}</div>;

    const columns = [
        {title: " ", dataIndex: "type", key: "type"},
        {
            title: "Євро",
            dataIndex: "euro",
            key: "euro",
            align: "right",
            render: (val, record) => blurIfWholesale(val, record),
        },
        {
            title: "Долар",
            dataIndex: "dollar",
            key: "dollar",
            align: "right",
            render: (val, record) => blurIfWholesale(val, record),
        },
        {
            title: "Гривня",
            dataIndex: "uah",
            key: "uah",
            align: "right",
            render: (val, record) => blurIfWholesale(val, record),
        },
    ];

    return (
        <>
            <Table
                dataSource={dataSource}
                columns={columns}
                pagination={false}
                bordered
                size={isMobile ? "small" : "middle"}
                className={"tight-table"}
            />

            <Divider style={{margin: isMobile ? "8px 0" : "12px 0"}}/>

            <Descriptions
                size="small"
                column={isMobile ? 1 : 2}
                bordered
                labelStyle={{width: 180}}
                style={{wordBreak: "break-word", marginTop: 12}}
            >
                <Descriptions.Item label="Артикул">
                    {selected.BarCode || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Виробник">
                    {selected.ManufacturerName || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Кількість" className={'test-class-name'}>
                    <SecureValue style={{width: 'inherit', display: "block"}} value={selected.Amount ?? "—"}/>
                </Descriptions.Item>
                <Descriptions.Item label="Застарілий">
                    {selected.Obsolete ? <Tag color="red">Так</Tag> : <Tag>Ні</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="Black Friday">
                    {selected.BlackFriday ? <Tag color="green">Так</Tag> : <Tag>Ні</Tag>}
                </Descriptions.Item>
            </Descriptions>
        </>
    );
}
