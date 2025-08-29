import { Input } from "antd";

const { Search } = Input;

export default function SearchBar({ onSearch, isMobile}) {
  return (
    <>
      <Search
        placeholder="Введіть артикул або назву"
        allowClear
        onSearch={onSearch}
        onChange={(e) => onSearch(e.target.value)}
        style={{ flex: isMobile ? "1 1 100%" : "0 1 420px", minWidth: 200 }}
        size={isMobile ? "middle" : "large"}
      />
    </>
  );
}
