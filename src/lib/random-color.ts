import { variants } from "@catppuccin/palette";
import type { Color, AlphaColor } from "@catppuccin/palette";

const allColors = Object.values(variants.latte)
    .map(it => (it as Color | AlphaColor).hex);

export function randomColor(seed: string): string {
    const c = (seed.length * 39) % allColors.length;
    return allColors[c]
}