/* ---------- XML -> JSON ---------- */
export function parseXmlToJson(xmlString) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlString, "text/xml");
    if (xml.getElementsByTagName("parsererror").length) {
        throw new Error("Невірний XML. Перевірте синтаксис файлу.");
    }
    const xmlToObj = (node) => {
        if (node.nodeType === 3 || node.nodeType === 4) {
            const t = node.nodeValue?.trim();
            return t?.length ? t : null;
        }
        if (node.nodeType !== 1) return null;

        const obj = {};
        if (node.attributes?.length) {
            obj._attrs = {};
            for (const a of node.attributes) obj._attrs[a.name] = a.value;
        }

        let textContent = "";
        let hasChildren = false;

        for (const child of node.childNodes) {
            if (child.nodeType === 1) {
                hasChildren = true;
                const childObj = xmlToObj(child);
                if (childObj === null) continue;
                const key = child.nodeName;
                if (obj[key] !== undefined) {
                    if (!Array.isArray(obj[key])) obj[key] = [obj[key]];
                    obj[key].push(childObj);
                } else {
                    obj[key] = childObj;
                }
            } else if (child.nodeType === 3 || child.nodeType === 4) {
                const t = child.nodeValue?.trim();
                if (t) textContent += (textContent ? " " : "") + t;
            }
        }

        if (!hasChildren && textContent) return textContent;
        if (hasChildren && textContent) obj._text = textContent;
        return obj;
    };

    return {[xml.documentElement.nodeName]: xmlToObj(xml.documentElement)};
}