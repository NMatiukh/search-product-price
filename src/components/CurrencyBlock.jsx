import { Flex } from "antd";
import CurrencyInput from "./CurrencyInput";

export default function CurrencyBlock({ valueRate, onChangeSetter, isMobile }) {
  return (
    <Flex className="currency-block" align="center" gap={6} style={{ flexWrap: "wrap" }}>
      <CurrencyInput
        title="$"
        currencyRate={valueRate.usdRate}
        onChangeSetter={onChangeSetter.setUsdRate}
        isMobile={isMobile}
      />
      <CurrencyInput
        title="€"
        currencyRate={valueRate.eurRate}
        onChangeSetter={onChangeSetter.setEurRate}
        isMobile={isMobile}
      />
    </Flex>
  );
}
