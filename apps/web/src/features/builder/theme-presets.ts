import type { ThemeColors } from "@dukkanify/contracts";

/**
 * The colour pickers' one-click starting points, and the single place a theme is written to
 * the canvas.
 *
 * Both the presets and the individual pickers go through `applyBrandColours`, so "how a
 * colour reaches the storefront" is answered once: a custom property set on the canvas
 * element, which every section already paints from (architecture.md §11). No React render,
 * no recompile, no theme provider — dragging a picker repaints eight sections at the
 * browser's own frame rate.
 *
 * These are preview-only, and the panel says so. The API has no endpoint that persists a
 * theme, and a control that silently discards its work on refresh would be worse than one
 * that admits it.
 */

/** Theme token → custom property. The same pairs `themeToCssVariables` writes. */
const BRAND_PROPERTY: Record<keyof ThemeColors, string> = {
  primary: "--brand-primary",
  secondary: "--brand-secondary",
  accent: "--brand-accent",
  background: "--brand-bg",
  foreground: "--brand-fg",
  muted: "--brand-muted",
};

/** The element `EditableStorefront` marks, and the only element these properties are set on. */
function canvas(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-builder-canvas]");
}

export function applyBrandColour(key: keyof ThemeColors, value: string): void {
  canvas()?.style.setProperty(BRAND_PROPERTY[key], value);
}

export interface ThemePreset {
  readonly name: string;
  readonly colors: ThemeColors;
  readonly radius: string;
}

/**
 * Takes a preset rather than a whole `ThemeTokens`, because fonts and spacing are
 * deliberately not a preset's business: swapping the typeface under an Arabic storefront
 * would replace an Arabic-capable face with whatever the preset happened to name, and
 * `--brand-space` is set by `StorefrontFrame` from the generated theme.
 */
export function applyBrandTheme(preset: ThemePreset): void {
  const element = canvas();
  if (element === null) {
    return;
  }

  for (const key of Object.keys(BRAND_PROPERTY) as (keyof ThemeColors)[]) {
    element.style.setProperty(BRAND_PROPERTY[key], preset.colors[key]);
  }
  element.style.setProperty("--brand-radius", preset.radius);
}

/**
 * Four looks a Gulf shop plausibly wants, written as complete palettes.
 *
 * Complete, because a preset that changed three of six tokens would leave the storefront in
 * a state no generated theme could produce — half one palette and half another.
 */
export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    name: "Emirati",
    colors: {
      primary: "#0B5D4B",
      secondary: "#1D2A26",
      accent: "#C8A45D",
      background: "#FAF6EE",
      foreground: "#17211F",
      muted: "#6E7B76",
    },
    radius: "0.5rem",
  },
  {
    name: "Midnight Oud",
    colors: {
      primary: "#C8A45D",
      secondary: "#0E1A16",
      accent: "#E8D5B5",
      background: "#141A18",
      foreground: "#F3EFE6",
      muted: "#9AA5A0",
    },
    radius: "0.25rem",
  },
  {
    name: "Gold Souk",
    colors: {
      primary: "#073F35",
      secondary: "#2B2419",
      accent: "#C8A45D",
      background: "#FFFDF8",
      foreground: "#191512",
      muted: "#7C7568",
    },
    radius: "1rem",
  },
  {
    name: "Desert Linen",
    colors: {
      primary: "#2E3A34",
      secondary: "#E8D5B5",
      accent: "#A98B4F",
      background: "#F6F2EA",
      foreground: "#20261F",
      muted: "#77807A",
    },
    radius: "0rem",
  },
];
