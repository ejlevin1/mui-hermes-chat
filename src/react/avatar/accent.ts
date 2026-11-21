/** Resolve an accent name to a colour for the current theme (palette role first, else MUI colour shade). */
import type { Theme } from "@mui/material/styles";
import { blue, green, grey, indigo, orange, pink, purple, red, teal } from "@mui/material/colors";

const SHADES: Record<string, { 300: string; 600: string }> = { indigo, blue, teal, green, orange, red, purple, pink, gray: grey, grey };

export function accentToPalette(theme: Theme, name: string): string {
  const role = (theme.palette as unknown as Record<string, { main?: unknown } | undefined>)[name];
  if (role && typeof role.main === "string") return role.main;
  const shades = SHADES[name] ?? indigo;
  return theme.palette.mode === "dark" ? shades[300] : shades[600];
}
