import { Input } from "antd";
import {SearchOutlined} from "@ant-design/icons";

export default function SearchBar({ onSearch, isMobile}) {
  return (
    <>
      <Input
        prefix={<SearchOutlined className="search-icon" />}
        placeholder="Введіть артикул або назву"
        allowClear
        onSearch={onSearch}
        onChange={(e) => onSearch(e.target.value)}
        className="retro-search"
        style={{ flex: isMobile ? "1 1 100%" : "1 1 520px", minWidth: 200 }}
        size={isMobile ? "middle" : "large"}
      />
    </>
  );
}
