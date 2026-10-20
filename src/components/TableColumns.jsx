import { Table } from "antd";
import { useMemo } from "react";
import { highlightText } from "../services/highlightText";

export default function TableColumns({
                                         displayRows,
                                         setSelected,
                                         setOpenModal,
                                         isMobile,
                                         highlightTokens,
                                         toUAH, // ⬅️ додали
                                     }) {
    const columns = useMemo(
        () => [
            {
                title: isMobile ? "Арт." : "Артикул",
                dataIndex: "BarCode",
                key: "BarCode",
                ellipsis: !isMobile,
                render: (val) =>
                    highlightText(typeof val === "string" ? val : "", highlightTokens),
                width: isMobile ? 78 : 160,
            },
            {
                title: "Назва",
                dataIndex: "Name",
                key: "Name",
                render: (val) => (
                    <span className="product-name-cell">
                        {highlightText(val, highlightTokens)}
                    </span>
                ),
            },
            {
                title: isMobile ? "Ціна, грн" : "Ціна (грн)",
                dataIndex: "Price",
                key: "PriceUAH",
                align: "right",
                width: isMobile ? 96 : 120,
                render: (val, record) => {
                    const amount = typeof val === "number" ? val : Number(val);
                    const uah = toUAH?.(amount, record?.PriceCurrency || "UAH");
                    if (uah == null || !Number.isFinite(uah)) return "—";

                    return new Intl.NumberFormat("uk-UA", {
                        ...(isMobile ? {} : {style: "currency", currency: "UAH"}),
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    }).format(uah);
                },
            },
        ],
        [highlightTokens, isMobile, toUAH]
    );

    return (
        <Table
            size="small"
            columns={columns}
            dataSource={displayRows}
            rowKey="key"
            onRow={(record) => ({
                onClick: () => {
                    setSelected(record);
                    setOpenModal(true);
                },
                style: {
                    cursor: "pointer",
                    backgroundColor: record.Obsolete
                        ? "#dddddd"
                        : Number(record.Amount) <= 0
                            ? "#ffd8e1"
                            : undefined,
                },
            })}
            scroll={isMobile ? undefined : {x: 620}}
            tableLayout="fixed"
            sticky
            // pagination={{
            //     size: isMobile ? "small" : "default",
            //     pageSize: isMobile ? 10 : 20,
            //     showSizeChanger: !isMobile,
            // }}
            pagination={false}
            className="catalog-table"
            style={{width: "100%", fontSize: isMobile ? 11 : 12}}
        />
    );
}
