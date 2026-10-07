import { Select } from "antd";
import {CloseCircleFilled} from "@ant-design/icons";

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
        className="retro-select"
          allowClear={{
            clearIcon: <CloseCircleFilled className="select-clear-icon" aria-label="Очистити" />,
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
