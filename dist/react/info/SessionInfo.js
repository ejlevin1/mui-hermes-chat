import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** Session info: IconButton + right Drawer (full-screen Dialog under md) with session fields and resume command. */
import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
export const DEFAULT_INFO_LABELS = {
    button: "Session info",
    title: "Session",
    close: "Close",
    sessionId: "Session ID",
    sessionTitle: "Title",
    profile: "Profile",
    type: "Type",
    created: "Created",
    lastTurn: "Last turn",
    messages: "Messages",
    status: "Status",
    active: "Active",
    archived: "Archived",
    resume: "Resume in a terminal",
    copy: "Copy",
    copied: "Copied",
    empty: "—",
};
const RTF_UNITS = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
];
function relative(epoch) {
    const diff = epoch - Date.now() / 1000;
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    for (const [unit, secs] of RTF_UNITS) {
        if (Math.abs(diff) >= secs)
            return rtf.format(Math.round(diff / secs), unit);
    }
    return rtf.format(Math.round(diff), "second");
}
const absolute = (epoch) => new Date(epoch * 1000).toLocaleString();
function CopyButton({ value, labels }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
        catch {
            /* clipboard unavailable */
        }
    };
    return (_jsx(Button, { variant: "outlined", startIcon: _jsx(ContentCopyIcon, {}), onClick: copy, children: copied ? labels.copied : labels.copy }));
}
function Row({ label, children }) {
    return (_jsxs(Box, { sx: { display: "contents" }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", component: "dt", children: label }), _jsx(Typography, { variant: "body2", component: "dd", sx: { m: 0, minWidth: 0, overflowWrap: "anywhere" }, children: children })] }));
}
const mono = { fontFamily: "monospace", overflowWrap: "anywhere" };
function InfoBody({ session, labels, agentAvatar, onClose }) {
    const dash = labels.empty;
    const val = (v) => (v === null || v === undefined || v === "" ? dash : v);
    const time = (t) => t === null || t === undefined ? (dash) : (_jsx("span", { title: absolute(t), children: relative(t) }));
    return (_jsxs(Stack, { spacing: 3, sx: { p: 3, width: { xs: "100%", md: 440 }, maxWidth: "100%" }, children: [_jsxs(Stack, { direction: "row", sx: { alignItems: "center", justifyContent: "space-between" }, children: [_jsx(Typography, { variant: "h6", component: "h2", children: labels.title }), _jsx(Tooltip, { title: labels.close, children: _jsx(IconButton, { "aria-label": labels.close, onClick: onClose, children: _jsx(CloseIcon, {}) }) })] }), _jsxs(Box, { component: "dl", sx: { m: 0, display: "grid", gridTemplateColumns: "max-content 1fr", columnGap: 3, rowGap: 1.5 }, children: [_jsx(Row, { label: labels.sessionId, children: _jsxs(Stack, { direction: "row", spacing: 1, sx: { alignItems: "center" }, children: [_jsx(Box, { component: "span", sx: mono, children: val(session.id) }), session.id ? _jsx(CopyButton, { value: session.id, labels: labels }) : null] }) }), _jsx(Row, { label: labels.sessionTitle, children: val(session.title) }), _jsx(Row, { label: labels.profile, children: _jsxs(Stack, { direction: "row", spacing: 1, sx: { alignItems: "center" }, children: [agentAvatar, _jsx("span", { children: val(session.profile) })] }) }), _jsx(Row, { label: labels.type, children: val(session.source) }), _jsx(Row, { label: labels.created, children: time(session.created) }), _jsx(Row, { label: labels.lastTurn, children: time(session.lastTurn) }), _jsx(Row, { label: labels.messages, children: val(session.messages) }), _jsx(Row, { label: labels.status, children: session.active ? labels.active : labels.archived })] }), _jsxs(Stack, { spacing: 1, children: [_jsx(Typography, { variant: "subtitle2", component: "h3", children: labels.resume }), session.resumeCmd ? (_jsxs(_Fragment, { children: [_jsx(Box, { component: "pre", sx: { ...mono, m: 0, p: 1.5, borderRadius: 1, bgcolor: "action.hover", whiteSpace: "pre-wrap", typography: "body2" }, children: session.resumeCmd }), _jsx(Box, { children: _jsx(CopyButton, { value: session.resumeCmd, labels: labels }) })] })) : (_jsx(Typography, { variant: "body2", children: dash }))] })] }));
}
export function SessionInfoDrawer({ session, open, onClose, labels, agentAvatar }) {
    const theme = useTheme();
    const wide = useMediaQuery(theme.breakpoints.up("md"));
    const l = { ...DEFAULT_INFO_LABELS, ...labels };
    const body = _jsx(InfoBody, { session: session, labels: l, agentAvatar: agentAvatar, onClose: onClose });
    if (wide) {
        return (_jsx(Drawer, { anchor: "right", open: open, onClose: onClose, "aria-label": l.title, children: body }));
    }
    return (_jsx(Dialog, { fullScreen: true, open: open, onClose: onClose, "aria-label": l.title, children: body }));
}
export function SessionInfoButton({ session, labels, agentAvatar }) {
    const [open, setOpen] = useState(false);
    const l = { ...DEFAULT_INFO_LABELS, ...labels };
    return (_jsxs(_Fragment, { children: [_jsx(Tooltip, { title: l.button, children: _jsx(IconButton, { "aria-label": l.button, onClick: () => setOpen(true), children: _jsx(InfoOutlinedIcon, {}) }) }), _jsx(SessionInfoDrawer, { session: session, open: open, onClose: () => setOpen(false), labels: labels, agentAvatar: agentAvatar })] }));
}
