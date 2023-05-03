export function screenIsSmall() {
    const width  = window.innerWidth || document.documentElement.clientWidth ||
        document.body.clientWidth;
    const height = window.innerHeight|| document.documentElement.clientHeight||
        document.body.clientHeight;
    return width < 800 || height < 800;
}