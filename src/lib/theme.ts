/**
 * Workspace branding.
 *
 * A hotel can pick its own accent colour; we derive the full token set from it
 * so buttons, badges, charts and highlights all stay legible on light and dark
 * surfaces. The chosen hex is stored on the tenant record, while the exact
 * values applied are contrast-adjusted (never below a mid tone) so a very dark
 * or very pale brand colour cannot make the UI unreadable.
 */

export interface BrandPreset {
  id: string;
  label: string;
  hex: string;
}

export const DEFAULT_BRAND_COLOR = "#b08d4f";

export const BRAND_PRESETS: BrandPreset[] = [
  { id: "gold", label: "Stayora gold", hex: DEFAULT_BRAND_COLOR },
  { id: "teal", label: "Lagoon teal", hex: "#0f766e" },
  { id: "navy", label: "Midnight navy", hex: "#24476f" },
  { id: "emerald", label: "Emerald", hex: "#177a52" },
  { id: "burgundy", label: "Burgundy", hex: "#8d3350" },
  { id: "plum", label: "Plum", hex: "#6d4aa6" },
  { id: "terracotta", label: "Terracotta", hex: "#b45a2b" },
  { id: "slate", label: "Slate", hex: "#50627a" },
];

const isHex = (value?: string | null): value is string =>
  typeof value === "string" && /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());

export const normalizeBrandColor = (value?: string | null): string | null => {
  if (!isHex(value)) return null;
  const raw = value.trim().replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((char) => char + char).join("") : raw;
  return `#${full.toLowerCase()}`;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hexToRgb = (hex: string): [number, number, number] => {
  const value = normalizeBrandColor(hex) ?? DEFAULT_BRAND_COLOR;
  return [
    parseInt(value.slice(1, 3), 16),
    parseInt(value.slice(3, 5), 16),
    parseInt(value.slice(5, 7), 16),
  ];
};

const rgbToHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;

const rgbToHsl = ([r, g, b]: [number, number, number]): [number, number, number] => {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  if (max === min) return [0, 0, lightness];
  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;
  if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;
  return [hue / 6, saturation, lightness];
};

const hueToRgb = (p: number, q: number, t: number): number => {
  let channel = t;
  if (channel < 0) channel += 1;
  if (channel > 1) channel -= 1;
  if (channel < 1 / 6) return p + (q - p) * 6 * channel;
  if (channel < 1 / 2) return q;
  if (channel < 2 / 3) return p + (q - p) * (2 / 3 - channel) * 6;
  return p;
};

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  if (s === 0) {
    const gray = l * 255;
    return [gray, gray, gray];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    hueToRgb(p, q, h + 1 / 3) * 255,
    hueToRgb(p, q, h) * 255,
    hueToRgb(p, q, h - 1 / 3) * 255,
  ];
};

const mix = (from: string, to: string, weight: number): string => {
  const [r1, g1, b1] = hexToRgb(from);
  const [r2, g2, b2] = hexToRgb(to);
  return rgbToHex(r1 + (r2 - r1) * weight, g1 + (g2 - g1) * weight, b1 + (b2 - b1) * weight);
};

const luminance = ([r, g, b]: [number, number, number]): number => {
  const channels = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

export interface BrandPalette {
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  goldSoft: string;
  bright: string;
}

export const buildBrandPalette = (value?: string | null): BrandPalette => {
  const source = normalizeBrandColor(value) ?? DEFAULT_BRAND_COLOR;
  const [hue, saturation, lightness] = rgbToHsl(hexToRgb(source));
  // Keep the fill colour faithful to the pick, but never so dark that it
  // disappears. A second, brighter tone is used for accents on dark panels.
  const tuned = hslToRgb(hue, clamp(saturation, 0.05, 1), clamp(lightness, 0.32, 0.62));
  const brightTuned = hslToRgb(
    hue,
    clamp(saturation, 0.18, 0.72),
    clamp(Math.max(lightness, 0.44) + 0.24, 0.67, 0.78),
  );
  const primary = rgbToHex(...tuned);
  const onLight = "#16120d";
  const onDark = "#ffffff";
  const primaryForeground = luminance(tuned) > 0.3 ? onLight : onDark;
  return {
    primary,
    primaryForeground,
    accent: mix(primary, "#ffffff", 0.88),
    accentForeground: mix(primary, "#16120d", 0.55),
    goldSoft: mix(primary, "#ffffff", 0.86),
    bright: rgbToHex(...brightTuned),
  };
};

const CSS_TOKENS = [
  "--color-primary",
  "--color-primary-foreground",
  "--color-gold",
  "--color-gold-soft",
  "--color-accent",
  "--color-accent-foreground",
  "--color-chart-1",
  "--color-brand-bright",
];

/** Applies a workspace accent colour to the document, or restores the default. */
export const applyBrandTheme = (value?: string | null) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!normalizeBrandColor(value)) {
    CSS_TOKENS.forEach((token) => root.style.removeProperty(token));
    return;
  }
  const palette = buildBrandPalette(value);
  root.style.setProperty("--color-primary", palette.primary);
  root.style.setProperty("--color-primary-foreground", palette.primaryForeground);
  root.style.setProperty("--color-gold", palette.primary);
  root.style.setProperty("--color-gold-soft", palette.goldSoft);
  root.style.setProperty("--color-accent", palette.accent);
  root.style.setProperty("--color-accent-foreground", palette.accentForeground);
  root.style.setProperty("--color-chart-1", palette.primary);
  root.style.setProperty("--color-brand-bright", palette.bright);
};
