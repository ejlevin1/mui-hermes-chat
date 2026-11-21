import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** Renders a resolved inline tool preview (monospace; gutter symbols never colour-only). */
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CheckBoxOutlined from "@mui/icons-material/CheckBoxOutlined";
import CheckBoxOutlineBlank from "@mui/icons-material/CheckBoxOutlineBlank";
import { gutter } from "./toolPreview";
import { defaultToolLabels } from "./labels";
const mono = { fontFamily: "monospace", whiteSpace: "pre-wrap", overflowWrap: "anywhere" };
export function ToolPreviewView({ preview, labels }) {
    const l = { ...defaultToolLabels, ...labels };
    const more = (n) => n > 0 && _jsx(Typography, { variant: "caption", color: "text.secondary", children: l.more(n) });
    switch (preview.kind) {
        case "none": return null;
        case "diff":
            return (_jsxs(Box, { "data-testid": "tool-preview-diff", sx: { overflowX: "auto" }, children: [preview.lines.map((line, i) => (_jsxs(Typography, { variant: "caption", component: "div", sx: {
                            ...mono,
                            color: line.kind === "added" ? "success.main" : line.kind === "removed" ? "error.main" : "text.secondary",
                        }, children: [_jsxs("span", { "aria-hidden": "true", children: [gutter(line.kind), " "] }), line.text] }, i))), more(preview.more)] }));
        case "todos":
            return (_jsxs(Box, { "data-testid": "tool-preview-todos", children: [preview.entries.map((t, i) => {
                        const done = t.status === "completed" || t.status === "done";
                        return (_jsxs(Typography, { variant: "caption", component: "div", sx: { display: "flex", gap: 0.5, alignItems: "center" }, children: [done ? _jsx(CheckBoxOutlined, { fontSize: "inherit", titleAccess: "completed" }) : _jsx(CheckBoxOutlineBlank, { fontSize: "inherit", titleAccess: t.status }), _jsx("span", { children: t.content })] }, t.id ?? i));
                    }), more(preview.more)] }));
        case "subagentGroup":
            return _jsx(Typography, { variant: "caption", color: "text.secondary", children: preview.children.length });
        case "image":
            return _jsx(Typography, { variant: "caption", sx: mono, children: preview.basename });
        case "generic":
            return (_jsxs(Box, { "data-testid": "tool-preview-generic", children: [preview.pairs.map((p) => (_jsxs(Typography, { variant: "caption", component: "div", sx: mono, children: [_jsxs(Box, { component: "span", sx: { color: "text.secondary" }, children: [p.key, ": "] }), p.value] }, p.key))), preview.resultLines.map((r, i) => (_jsx(Typography, { variant: "caption", component: "div", color: "text.secondary", sx: mono, children: r }, i)))] }));
    }
}
