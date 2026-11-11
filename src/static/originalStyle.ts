import type { OriginalStyle } from "../domain/content";

export const originalStyleDefaults: OriginalStyle = {
  backgroundColor: "#08080c",
  textColor: "#fff5ed",
  accentColor: "#f34b53",
  buttonColor: "#b5232b",
  buttonTextColor: "#ffffff",
  borderColor: "#b67b78",
  fontFamily: "montserrat",
  titleScale: 1,
  bodyScale: 1,
  contentMargin: 90,
  topSpacing: 40,
  factColumns: 3,
  galleryColumns: 2,
  cardGap: 14,
  buttonRadius: 15,
  borderWidth: 1,
  buttonVariant: "solid",
  shadow: "soft",
};

export const originalFontFamilies: Record<OriginalStyle["fontFamily"], string> = {
  montserrat: '"Montserrat", Arial, sans-serif',
  space: '"Space Grotesk", Arial, sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
  system: 'system-ui, -apple-system, "Segoe UI", sans-serif',
};

export const originalShadowValues: Record<OriginalStyle["shadow"], string> = {
  none: "none",
  soft: "0 10px 24px #0008",
  strong: "0 20px 44px #000b",
};
