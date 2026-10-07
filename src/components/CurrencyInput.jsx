import { Flex, InputNumber, Typography } from "antd";

const { Text } = Typography;

export default function CurrencyInput({title, currencyRate, onChangeSetter, isMobile}) {
  return (
    <Flex className="currency-item" align="center" gap={4}>
      <Text className="currency-code">{title}</Text>
      <InputNumber
        min={0}
        value={currencyRate}
        onChange={(v) => onChangeSetter(Number(v) || 0)}
        placeholder="грн"
        size={isMobile ? "middle" : "large"}
        className="currency-input"
        style={{ width: 100 }}
        readOnly
      />
    </Flex>
  );
}
