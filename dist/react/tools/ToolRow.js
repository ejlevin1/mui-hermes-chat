import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** One tool call row: family icon, name, args line, status; opens detail, chevron toggles an inline preview. */
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutlined";
import ErrorOutline from "@mui/icons-material/ErrorOutlined";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ExpandLess from "@mui/icons-material/ExpandLess";
import { ToolFamily } from "./family";
import { ToolRowFormat } from "./format";
import { resolvePreview } from "./toolPreview";
import { ToolPreviewView } from "./ToolPreviewView";
import { ToolIcon } from "./icons";
import { defaultToolLabels } from "./labels";
export function statusOf(call, running) {
    if (call.state === "failed")
        return "failed";
    if (call.state === "start" || running)
        return call.state === "done" ? "done" : "running";
    return "done";
}
function Elapsed() {
    const [s, setS] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setS((n) => n + 1), 1000);
        return () => clearInterval(t);
    }, []);
    return _jsxs("span", { "data-testid": "tool-elapsed", children: [s, " s"] });
}
export function ToolRow({ call, running, onOpen, labels }) {
    const l = { ...defaultToolLabels, ...labels };
    const [expanded, setExpanded] = useState(false);
    const status = statusOf(call, running);
    const args = ToolFamily.argsLine(call.name, call.args, call.preview);
    const preview = resolvePreview(call);
    const hasPreview = preview.kind !== "none";
    const dur = ToolRowFormat.duration(call.duration_s);
    const label = ToolRowFormat.accessibilityLabel({ name: call.name, status, duration: call.duration_s, argsLine: args });
    return (_jsxs(Box, { "data-testid": "tool-row", sx: { bgcolor: "action.hover", borderRadius: 1, p: 0.5 }, children: [_jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5 }, children: [_jsxs(ButtonBase, { "aria-label": label, onClick: () => onOpen?.(call), sx: { flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 1, p: 0.5, borderRadius: 1, textAlign: "left", justifyContent: "flex-start" }, children: [_jsx(ToolIcon, { name: call.name }), _jsxs(Box, { sx: { minWidth: 0, flex: 1 }, children: [_jsx(Typography, { variant: "body2", noWrap: true, sx: { fontWeight: "fontWeightMedium" }, children: call.name }), args && _jsx(Typography, { variant: "caption", color: "text.secondary", noWrap: true, component: "div", sx: { fontFamily: "monospace" }, children: args })] }), _jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary", flexShrink: 0 }, children: [status === "running" && (_jsxs(_Fragment, { children: [_jsx(Elapsed, {}), _jsx(CircularProgress, { size: 14, "aria-label": l.running })] })), status === "done" && (_jsxs(_Fragment, { children: [dur && _jsx(Typography, { variant: "caption", children: dur }), _jsx(CheckCircleOutline, { fontSize: "small", color: "success", titleAccess: l.done })] })), status === "failed" && (_jsxs(_Fragment, { children: [dur && _jsx(Typography, { variant: "caption", children: dur }), _jsx(ErrorOutline, { fontSize: "small", color: "error" }), _jsx(Typography, { variant: "caption", color: "error", children: l.failed })] }))] })] }), hasPreview && (_jsx(Tooltip, { title: expanded ? l.hidePreview : l.showPreview, children: _jsx(IconButton, { "aria-label": expanded ? l.hidePreview : l.showPreview, "aria-expanded": expanded, onClick: () => setExpanded((v) => !v), children: expanded ? _jsx(ExpandLess, { fontSize: "small" }) : _jsx(ExpandMore, { fontSize: "small" }) }) }))] }), expanded && hasPreview && (_jsx(Box, { sx: { p: 1 }, children: _jsx(ToolPreviewView, { preview: preview, labels: labels }) }))] }));
}
