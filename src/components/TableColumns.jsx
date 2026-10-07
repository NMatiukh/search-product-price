import { Table } from "antd";
import { useMemo } from "react";
import { highlightText } from "../services/highlightText";

export default function TableColumns({
                                         displayRows,
                                         setSelected,
                                         setOpenModal,
                                         // isMobile,
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
                render: (val) => (
                    <span className="product-name-cell">
                        {highlightText(val, highlightTokens)}
                    </span>
                ),
            },
            {
                title: "Ціна (грн)",
                dataIndex: "Price",
                key: "PriceUAH",
                align: "right",
                width: 120,
                render: (val, record) => {
                    const exactUah = record?.PriceList?.retail?.uah;
                    const amount = typeof val === "number" ? val : Number(val);
                    const uah = typeof exactUah === "number"
                        ? exactUah
                        : toUAH?.(amount, record?.PriceCurrency || "UAH");
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
                        ? "#dddddd"
                        : Number(record.Amount) <= 0
                            ? "#ffd8e1"
                            : undefined,
                },
            })}
            scroll={{ x: 620 }}
            tableLayout="fixed"
            sticky
            // pagination={{
            //     size: isMobile ? "small" : "default",
            //     pageSize: isMobile ? 10 : 20,
            //     showSizeChanger: !isMobile,
            // }}
            pagination={false}
            className="catalog-table"
            style={{ width: "100%", fontSize: 12 }}
        />
    );
}
