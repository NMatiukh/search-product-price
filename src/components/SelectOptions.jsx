import { Select } from "antd";

export default function SelectOptions({
  placeholder,
  isOptions,
  value,
  onChangeSetter,
  style = {},
  isMobile,
  showSearch = false,
  optionFilterProp = "",
}) {

  return (
    <>
      <Select
        allowClear
        placeholder={placeholder}
        value={value}
        options={isOptions}
        onChange={onChangeSetter}
        style={{ width: "100%", ...style }}
        size={isMobile ? "middle" : "large"}
        showSearch={showSearch}
        optionFilterProp={optionFilterProp}
      />
    </>
  );
}
