import { Table } from "antd";
import { useMemo } from "react";
import { highlightText } from "../services/highlightText";

export default function TableColumns({
  displayRows,
  setSelected,
  setOpenModal,
  isMobile,
  highlightTokens,
}) {
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
            ? "#f5f5f5" // 1) застарілий → сірий
            : Number(record.Amount) <= 0
            ? "#fff1f0" // 2) немає в наявності → червоний фон
            : undefined,
        },
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
  );
}
