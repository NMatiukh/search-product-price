import React, {useEffect, useState} from "react";
import {Descriptions, Table, Tag, Divider} from "antd";
import SecureValue from "./SecureValue.jsx";

export default function ModalContent({
                                         selected,
                                         isMobile,
                                         activeDiscount,
                                         toUAH,
                                         valueRate, // { usdRate, eurRate }
                                     }) {
    const [wholesaleVisible, setWholesaleVisible] = useState(false);

    useEffect(() => {
        setWholesaleVisible(false);
    }, [selected?.key]);

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
    const exactPrices = selected?.PriceList ?? null;
    const priceRow = (group, fallback) => {
        const exact = exactPrices?.[group];
        if (exact) {
            return {euro: exact.eur, dollar: exact.usd, uah: exact.uah};
        }
        return {
            euro: convert(fallback, cur, "EUR"),
            dollar: convert(fallback, cur, "USD"),
            uah: convert(fallback, cur, "UAH"),
        };
    };
    const retail = priceRow("retail", price);
    const promo = priceRow("promo", actPrice);
    const wholesale = priceRow("wholesale", whPrice);
    const retailUah = retail.uah;
    const wholesaleUah = wholesale.uah;
    const wholesaleMarkupPercent =
        typeof retailUah === "number" && retailUah > 0 && typeof wholesaleUah === "number"
            ? ((retailUah - wholesaleUah) / retailUah) * 100
            : null;
    const wholesaleLabel = Number.isFinite(wholesaleMarkupPercent)
        ? `Ціна Г (${new Intl.NumberFormat("uk-UA", {
            maximumFractionDigits: 1,
        }).format(wholesaleMarkupPercent)}% націнки від роздрібної)`
        : "Ціна Г";

    // --- Таблиця: значення ---
    const rows = [
        {
            key: "orig",
            type: "Ціна",
            ...retail,
        },
        {
            key: "promo",
            type: "Ціна А",
            ...promo,
        },
        {
            key: "wholesale", // ← гуртова (єдина заблюрена)
            type: wholesaleLabel,
            ...wholesale,
        },
        {
            key: "orig-d",
            type: `Ціна (${activeDiscount || 0}%)`,
            euro: discounted(retail.euro),
            dollar: discounted(retail.dollar),
            uah: discounted(retail.uah),
        },
    ];

    const dataSource = rows.map((r) => ({
        ...r,
        euro: fmt(r.euro),
        dollar: fmt(r.dollar),
        uah: fmt(r.uah),
    }));

    // Увесь рядок гуртової ціни відкривається одним кліком.
    const blurIfWholesale = (val, record) =>
        record.key === "wholesale" && val !== "—"
            ? <span className={wholesaleVisible ? "wholesale-value is-visible" : "wholesale-value"}>
                {val}
            </span>
            : <div style={{padding: 8}}>{val}</div>;

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
                className={"tight-table price-detail-table"}
                scroll={{x: 420}}
                rowClassName={(record) => record.key === "wholesale" ? "wholesale-row" : ""}
                onRow={(record) => record.key === "wholesale"
                    ? {
                        role: "button",
                        tabIndex: 0,
                        "aria-label": wholesaleVisible
                            ? "Приховати гуртову ціну"
                            : "Показати гуртову ціну",
                        onClick: () => setWholesaleVisible((visible) => !visible),
                        onKeyDown: (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setWholesaleVisible((visible) => !visible);
                            }
                        },
                    }
                    : {}}
            />

            <Divider style={{margin: isMobile ? "8px 0" : "12px 0"}}/>

            <Descriptions
                size="small"
                column={isMobile ? 1 : 2}
                bordered
                labelStyle={{width: isMobile ? 118 : 180}}
                className="retro-descriptions"
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
