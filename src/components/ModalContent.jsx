import React from 'react'

export default function ModalContent({ selected, isMobile, activeDiscount, toUAH }) {
    const discounted = (p) =>
      activeDiscount ? p * (1 - activeDiscount / 100) : p;

  return (
    <>
      <Descriptions
        size="middle"
        column={isMobile ? 1 : 2}
        bordered
        labelStyle={{ width: 180 }}
        style={{ wordBreak: "break-word" }}
      >
        <Descriptions.Item label="Код 1С">
          {selected.Code || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Артикул">
          {selected.BarCode || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Ціна (оригінал)">
          {selected.Price
            ? `${selected.Price.toFixed(2)} ${
                selected.PriceCurrency || ""
              }`.trim()
            : "—"}
        </Descriptions.Item>
        <Descriptions.Item label={`Ціна зі знижкою (${activeDiscount || 0}%)`}>
          {selected.Price
            ? `${discounted(selected.Price).toFixed(2)} ${
                selected.PriceCurrency || ""
              }`.trim()
            : "—"}
        </Descriptions.Item>

        <Descriptions.Item label="Ціна (грн)">
          {toUAH(selected.Price, selected.PriceCurrency) != null
            ? `${toUAH(selected.Price, selected.PriceCurrency).toFixed(2)} грн`
            : "—"}
        </Descriptions.Item>
        <Descriptions.Item label={`Ціна зі знижкою (грн)`}>
          {toUAH(discounted(selected.Price), selected.PriceCurrency) != null
            ? `${toUAH(
                discounted(selected.Price),
                selected.PriceCurrency
              ).toFixed(2)} грн`
            : "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Ціна гурт (оригінал)">
          {typeof selected.WhPrice === "number"
            ? `${selected.WhPrice.toFixed(2)} ${
                selected.PriceCurrency || ""
              }`.trim()
            : "—"}
        </Descriptions.Item>

        <Descriptions.Item label="Ціна гурт (грн)">
          {toUAH(selected.WhPrice, selected.PriceCurrency) != null
            ? `${toUAH(selected.WhPrice, selected.PriceCurrency).toFixed(
                2
              )} грн`
            : "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Валюта">
          {selected.PriceCurrency || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Виробник">
          {selected.ManufacturerName || "—"}
        </Descriptions.Item>
        <Descriptions.Item label="Кількість">
          {selected.Amount}
        </Descriptions.Item>
        <Descriptions.Item label="Застарілий">
          {selected.Obsolete ? <Tag color="red">Так</Tag> : <Tag>Ні</Tag>}
        </Descriptions.Item>
        <Descriptions.Item label="Black Friday">
          {selected.BlackFriday ? <Tag color="green">Так</Tag> : <Tag>Ні</Tag>}
        </Descriptions.Item>
      </Descriptions>
    </>
  );
}
