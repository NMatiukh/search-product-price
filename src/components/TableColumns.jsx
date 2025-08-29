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
                title: "Артикул",
                dataIndex: "BarCode",
                key: "BarCode",
                ellipsis: true,
                render: (val) =>
                    highlightText(typeof val === "string" ? val : "", highlightTokens),
                width: 160,
            },
            {
                title: "Назва",
                dataIndex: "Name",
                key: "Name",
                ellipsis: true,
                render: (val) => highlightText(val, highlightTokens),
            },
            {
                title: "Ціна (грн)",
                dataIndex: "Price",
                key: "PriceUAH",
                align: "right",
                width: 120,
                render: (val, record) => {
                    const amount = typeof val === "number" ? val : Number(val);
                    const uah = toUAH?.(amount, record?.PriceCurrency || "UAH");
                    return uah != null && Number.isFinite(uah)
                        ? new Intl.NumberFormat("uk-UA", {
                            style: "currency",
                            currency: "UAH",
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        }).format(uah)
                        : "—";
                },
            },
        ],
        [highlightTokens, toUAH]
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
                        ? "#f5f5f5"
                        : Number(record.Amount) <= 0
                            ? "#fff1f0"
                            : undefined,
                },
            })}
            scroll={{ x: "max-content" }}
            tableLayout="auto"
            sticky
            pagination={{
                size: isMobile ? "small" : "default",
                pageSize: isMobile ? 10 : 20,
                showSizeChanger: !isMobile,
            }}
            style={{ width: "100%", fontSize: 12 }}
        />
    );
}
