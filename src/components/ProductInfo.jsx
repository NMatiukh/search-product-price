import { Typography } from "antd";

const { Text } = Typography;

export default function ProductInfo({ rows, displayRows }) {
  return (
    <Text className="product-count" style={{ marginLeft: "auto" }}>
      {rows.length
        ? `Знайдено: ${displayRows.length} (у масиві: ${rows.length})`
        : "Завантаження XML..."}
    </Text>
  );
}
