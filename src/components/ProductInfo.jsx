import { Typography } from "antd";

const { Text } = Typography;

export default function ProductInfo({ rows, displayRows }) {
  return (
    <Text type="secondary" style={{ marginLeft: "auto" }}>
      {rows.length
        ? `Знайдено: ${displayRows.length} (у масиві: ${rows.length})`
        : "Завантаження XML..."}
    </Text>
  );
}
