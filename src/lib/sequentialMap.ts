export async function sequentialMap(array, fn) {
    const result = [];
    for (const value of array) {
        const mappedValue = await fn(value);
        result.push(mappedValue);
    }
    return result;
}