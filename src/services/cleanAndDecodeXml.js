/**
 * Перевірка і декодування XML-тексту
 * - видаляє нелегальні символи
 * - екранує "сирі" &
 * - декодує сутності (&quot;, &#123;, &#xAB;)
 */
export function cleanAndDecodeXml(text) {
    if (!text) return text;

    // 1. Прибрати нелегальні керівні символи (окрім \t \n \r)
    text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u0084\u0086-\u009F]/g, "");

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
