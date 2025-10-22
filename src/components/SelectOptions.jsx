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
          allowClear={{
            clearIcon: <div style={{color: "red", cursor: "pointer", position: "absolute", right: 10, height: "100%"}}>
              очистити
            </div>,
          }}
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
