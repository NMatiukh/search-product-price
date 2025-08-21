export function findArrayOfObjects(anyJson) {
    if (Array.isArray(anyJson)) {
        const objs = anyJson.filter((x) => x && typeof x === "object" && !Array.isArray(x));
        if (objs.length) return objs;
    }
    if (anyJson && typeof anyJson === "object") {
        for (const k of Object.keys(anyJson)) {
            const found = findArrayOfObjects(anyJson[k]);
            if (found) return found;
        }
    }
    return null;
}