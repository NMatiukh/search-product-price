import { Flex } from "antd";
import CurrencyInput from "./CurrencyInput";

export default function CurrencyBlock({ valueRate, onChangeSetter, isMobile }) {
  return (
    <Flex align="center" gap={6} style={{ flexWrap: "wrap" }}>
      <CurrencyInput
        title="USD"
        currencyRate={valueRate.usdRate}
        onChangeSetter={onChangeSetter.setUsdRate}
        isMobile={isMobile}
      />
      <CurrencyInput
        title="EUR"
        currencyRate={valueRate.eurRate}
        onChangeSetter={onChangeSetter.setEurRate}
        isMobile={isMobile}
      />
    </Flex>
  );
}
