/**
 * Перевірка і декодування XML-тексту
 * - видаляє нелегальні символи
 * - екранує "сирі" &
 * - декодує сутності (&quot;, &#123;, &#xAB;)
 */
export function cleanAndDecodeXml(text) {
    if (!text) return text;

    // 1. Прибрати нелегальні керівні символи (окрім \t \n \r та NEL)
    text = Array.from(text).filter((char) => {
        const code = char.codePointAt(0);
        const isC0Control = code <= 0x1F && code !== 0x09 && code !== 0x0A && code !== 0x0D;
        const isDisallowedC1Control = code >= 0x7F && code <= 0x9F && code !== 0x85;
        return !isC0Control && !isDisallowedC1Control;
    }).join("");

    // 2. Екранувати "сирі" &, які не починають сутність
    text = text.replace(/&(?!#\d+;|#x[0-9a-fA-F]+;|[a-zA-Z][\w.-]*;)/g, "&amp;");

    // 3. Декодувати числові сутності
    text = text
        .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

    // 4. Декодувати стандартні XML-сутності
    const map = {
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&apos;": "'",
        "&amp;": "&",
    };

    let prev;
    do {
        prev = text;
        text = text.replace(/&(lt|gt|quot|apos|amp);/g, (m) => map[m]);
        // Якщо було подвійне кодування (&amp;quot;), цикл ще раз докодує
    } while (text !== prev);

    return text;
}
