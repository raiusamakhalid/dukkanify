import { z } from "zod";
import { CssLengthSchema, HexColorSchema } from "./primitives";

/**
 * Theme tokens become CSS custom properties on a wrapper element, so a generated palette
 * needs no recompile and no theme provider (architecture.md §11).
 */

/**
 * Fonts are an enum, not free text, because a family the app cannot load is worse than a
 * family the model did not choose: `next/font` needs the name at build time. Both display
 * faces are Arabic-capable, which is what makes an Arabic storefront legible rather than
 * merely right-to-left.
 */
export const DISPLAY_FONTS = [
  "ibm-plex-sans-arabic",
  "noto-kufi-arabic",
] as const;
export const DisplayFontSchema = z.enum(DISPLAY_FONTS);
export type DisplayFont = z.infer<typeof DisplayFontSchema>;

export const BODY_FONTS = ["ibm-plex-sans-arabic", "source-serif-4"] as const;
export const BodyFontSchema = z.enum(BODY_FONTS);
export type BodyFont = z.infer<typeof BodyFontSchema>;

/** Named rather than numeric: the model picks an intent, the frontend owns the values. */
export const SPACING_SCALES = ["compact", "comfortable", "generous"] as const;
export const SpacingScaleSchema = z.enum(SPACING_SCALES);
export type SpacingScale = z.infer<typeof SpacingScaleSchema>;

export const ThemeColorsSchema = z.object({
  primary: HexColorSchema,
  secondary: HexColorSchema,
  accent: HexColorSchema,
  background: HexColorSchema,
  foreground: HexColorSchema,
  muted: HexColorSchema,
});
export type ThemeColors = z.infer<typeof ThemeColorsSchema>;

export const ThemeTokensSchema = z.object({
  colors: ThemeColorsSchema,
  fonts: z.object({
    display: DisplayFontSchema,
    body: BodyFontSchema,
  }),
  radius: CssLengthSchema,
  spacing: SpacingScaleSchema,
});
export type ThemeTokens = z.infer<typeof ThemeTokensSchema>;

/**
 * The single mapping from tokens to custom properties. Both the public storefront and the
 * builder preview call this, so a renamed token cannot drift between the two.
 */
export function themeToCssVariables(
  theme: ThemeTokens,
): Record<string, string> {
  return {
    "--brand-primary": theme.colors.primary,
    "--brand-secondary": theme.colors.secondary,
    "--brand-accent": theme.colors.accent,
    "--brand-bg": theme.colors.background,
    "--brand-fg": theme.colors.foreground,
    "--brand-muted": theme.colors.muted,
    "--brand-radius": theme.radius,
  };
}
