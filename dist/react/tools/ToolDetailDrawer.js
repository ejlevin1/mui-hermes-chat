import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** Tool call detail: right Drawer (full-screen Dialog under `md`) with Request / Response tabs. */
import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import Close from "@mui/icons-material/Close";
import { ToolFamily } from "./family";
import { ToolRowFormat } from "./format";
import { ToolIcon } from "./icons";
import { JsonTree } from "./JsonTree";
import { statusOf } from "./ToolRow";
import { defaultToolLabels } from "./labels";
function CopyButton({ text, labels }) {
    const [copied, setCopied] = useState(false);
    return (_jsx(Button, { variant: "outlined", onClick: () => {
            void navigator.clipboard?.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }, children: copied ? labels.copied : labels.copy }));
}
function Body({ call, onClose, l }) {
    const [tab, setTab] = useState("request");
    const status = statusOf(call);
    const dur = ToolRowFormat.duration(call.duration_s);
    const statusText = status === "failed" ? l.failed : status === "running" ? l.running : l.done;
    const argsJson = JSON.stringify(call.args ?? {}, null, 2);
    const hasArgs = !!call.args && Object.keys(call.args).length > 0;
    return (_jsxs(Box, { sx: { display: "flex", flexDirection: "column", height: "100%" }, children: [_jsxs(Box, { sx: { display: "flex", alignItems: "center", gap: 1, p: 2 }, children: [_jsx(ToolIcon, { name: call.name }), _jsxs(Box, { sx: { flex: 1, minWidth: 0 }, children: [_jsx(Typography, { variant: "subtitle1", noWrap: true, children: call.name }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [ToolFamily.label(call.name), " \u00B7 ", statusText, dur ? ` · ${dur}` : ""] })] }), _jsx(Tooltip, { title: l.close, children: _jsx(IconButton, { "aria-label": l.close, onClick: onClose, children: _jsx(Close, {}) }) })] }), _jsxs(Tabs, { value: tab, onChange: (_, v) => setTab(v), children: [_jsx(Tab, { value: "request", label: l.request, id: "tool-tab-request", "aria-controls": "tool-panel" }), _jsx(Tab, { value: "response", label: l.response, id: "tool-tab-response", "aria-controls": "tool-panel" })] }), _jsx(Box, { role: "tabpanel", id: "tool-panel", "aria-labelledby": `tool-tab-${tab}`, sx: { p: 2, overflow: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 1, alignItems: "flex-start" }, children: tab === "request" ? (_jsxs(_Fragment, { children: [hasArgs ? _jsx(JsonTree, { value: call.args }) : _jsx(Typography, { variant: "body2", color: "text.secondary", children: l.noArgs }), call.args_clipped && _jsx(Typography, { variant: "caption", color: "warning.main", children: l.argsClipped }), hasArgs && _jsx(CopyButton, { text: argsJson, labels: l })] })) : call.result_preview ? (_jsxs(_Fragment, { children: [_jsx(Typography, { variant: "body2", component: "pre", sx: { fontFamily: "monospace", whiteSpace: "pre-wrap", overflowWrap: "anywhere", m: 0 }, children: call.result_preview }), _jsx(CopyButton, { text: call.result_preview, labels: l })] })) : (_jsx(Typography, { variant: "body2", color: "text.secondary", children: l.noResponse })) })] }));
}
export function ToolDetailDrawer({ call, open, onClose, labels }) {
    const l = { ...defaultToolLabels, ...labels };
    const theme = useTheme();
    const small = useMediaQuery(theme.breakpoints.down("md"));
    if (!call)
        return null;
    const body = _jsx(Body, { call: call, onClose: onClose, l: l }, call.id);
    return small ? (_jsx(Dialog, { fullScreen: true, open: open, onClose: onClose, "aria-label": l.details, children: body })) : (_jsx(Drawer, { anchor: "right", open: open, onClose: onClose, slotProps: { paper: { sx: { width: { md: 440 }, maxWidth: "100%" }, "aria-label": l.details } }, children: body }));
}
