import { Flex, InputNumber, Typography } from "antd";

const { Text } = Typography;

export default function CurrencyInput({title, currencyRate, onChangeSetter, isMobile}) {
  return (
    <Flex align="center" gap={4}>
      <Text>{title}</Text>
      <InputNumber
        min={0}
        value={currencyRate}
        onChange={(v) => onChangeSetter(Number(v) || 0)}
        placeholder="грн"
        size={isMobile ? "middle" : "large"}
        style={{ width: 110 }}
      />
    </Flex>
  );
}
