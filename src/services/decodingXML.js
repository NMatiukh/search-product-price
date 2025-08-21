/* ---------- ДЕКОДУВАННЯ XML З ПІДТРИМКОЮ encoding ---------- */
function sniffXmlEncoding(bytes) {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  )
    return "utf-8";
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff)
    return "utf-16be";
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe)
    return "utf-16le";
  const head = new TextDecoder("ascii").decode(bytes.slice(0, 1024));
  const m = head.match(/encoding\s*=\s*["']([^"']+)["']/i);
  if (m && m[1]) return m[1].toLowerCase();
  return "utf-8";
}

function decodeXmlBytes(bytes) {
  const tryDecode = (enc) => {
    try {
      return new TextDecoder(enc).decode(bytes);
    } catch {
      return null;
    }
  };
  const enc = sniffXmlEncoding(bytes);
  return (
    tryDecode(enc) ||
    tryDecode("utf-8") ||
    tryDecode("windows-1251") ||
    tryDecode("utf-16le") ||
    tryDecode("utf-16be") ||
    tryDecode("iso-8859-1")
  );
}

export { decodeXmlBytes };