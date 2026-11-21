import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** Small collapsible JSON tree. Strings render as text, never HTML. */
import { useState } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
const mono = { fontFamily: "monospace", overflowWrap: "anywhere" };
function Scalar({ value }) {
    const color = typeof value === "string" ? "success.main" : value === null ? "text.disabled" : "info.main";
    const text = typeof value === "string" ? JSON.stringify(value) : String(value);
    return _jsx(Typography, { variant: "caption", component: "span", sx: { ...mono, color, whiteSpace: "pre-wrap" }, children: text });
}
export function JsonNode({ name, value, depth = 0 }) {
    const [open, setOpen] = useState(depth < 1);
    const key = name !== undefined && (_jsxs(Typography, { variant: "caption", component: "span", color: "text.secondary", sx: mono, children: [name, ": "] }));
    if (value === null || typeof value !== "object") {
        return _jsxs(Box, { sx: { pl: depth ? 2 : 0 }, children: [key, _jsx(Scalar, { value: value })] });
    }
    const entries = Array.isArray(value) ? value.map((v, i) => [String(i), v]) : Object.entries(value);
    const summary = Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`;
    return (_jsxs(Box, { sx: { pl: depth ? 2 : 0 }, children: [_jsx(ButtonBase, { "aria-expanded": open, "aria-label": `${name ?? "root"} ${summary}`, onClick: () => setOpen((v) => !v), sx: { ...mono, justifyContent: "flex-start", textAlign: "left" }, children: _jsxs(Typography, { variant: "caption", component: "span", sx: mono, children: [open ? "▾" : "▸", " ", key, summary] }) }), open && entries.map(([k, v]) => _jsx(JsonNode, { name: k, value: v, depth: depth + 1 }, k))] }));
}
export function JsonTree({ value }) {
    return _jsx(Box, { "data-testid": "json-tree", children: _jsx(JsonNode, { value: value }) });
}
