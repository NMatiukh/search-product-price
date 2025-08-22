import React from "react";
import { Modal } from "antd";
import ModalContent from "./ModalContent";

export default function ModalWindow({
  selected,
  isMobile,
  openModal,
  setOpenModal,
  activeDiscount,
  valueRate,
}) {
  const toUAH = (price, currency) => {
    if (!price && price !== 0) return null;
    const c = (currency || "").toUpperCase().trim();
    if (c === "UAH" || c === "ГРН" || c === "₴" || c === "") return price;
    if (c === "USD")
      return valueRate.usdRate ? price * valueRate.usdRate : null;
    if (c === "EUR")
      return valueRate.eurRate ? price * valueRate.eurRate : null;
    return null;
  };

  return (
    <Modal
      title={
        selected
          ? selected.Name || selected.BarCode || "Деталі товару"
          : "Деталі товару"
      }
      open={openModal}
      onCancel={() => setOpenModal(false)}
      onOk={() => setOpenModal(false)}
      okText="Готово"
      cancelText="Закрити"
      width={isMobile ? "100%" : 720}
    >
      {selected && (
        <ModalContent
          selected={selected}
          isMobile={isMobile}
          activeDiscount={activeDiscount}
          toUAH={toUAH}
        />
      )}
    </Modal>
  );
}
