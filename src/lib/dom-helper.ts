export function isInsideBounds(e: MouseEvent, bounds: DOMRect): boolean {
    const outSide = e.clientX <= bounds.left ||
        e.clientX >= bounds.right ||
        e.clientY <= bounds.top ||
        e.clientY >= bounds.bottom
    return !outSide;
}

export function isInsideElement(e: MouseEvent, element: Element | HTMLElement): boolean {
    const bounds = element.getBoundingClientRect();
    return isInsideBounds(e, bounds);
}

export function isInsideElements(e: MouseEvent, ...elements): boolean {
    if (elements.length === 0) return false;
    return elements.some(el => isInsideElement(e, el))
}

export function isInsideElementsById(e: MouseEvent, ...elementIds: string[]): boolean {
    const elements = elementIds
        .map(id => document.getElementById(id))
        .filter(el => !!el);
    if (elements.length === 0) return false;
    return isInsideElements(e, ...elements);
}