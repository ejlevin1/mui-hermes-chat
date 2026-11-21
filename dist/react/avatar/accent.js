import { blue, green, grey, indigo, orange, pink, purple, red, teal } from "@mui/material/colors";
const SHADES = { indigo, blue, teal, green, orange, red, purple, pink, gray: grey, grey };
export function accentToPalette(theme, name) {
    const role = theme.palette[name];
    if (role && typeof role.main === "string")
        return role.main;
    const shades = SHADES[name] ?? indigo;
    return theme.palette.mode === "dark" ? shades[300] : shades[600];
}
