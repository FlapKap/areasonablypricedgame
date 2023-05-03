export function pbNameToLabel(s: string) {
    return s[0].toUpperCase() + s.slice(1).toLowerCase().replace("_", " ");
}

export function randomSuffix() {
    return `${(Math.trunc(Math.random() * 1000)).toString(16)}`;
}