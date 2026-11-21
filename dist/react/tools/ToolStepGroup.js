import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** Consecutive tool calls: one call is a ToolRow; several collapse to "N steps · 12 s" with expand. */
import { useState } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ExpandLess from "@mui/icons-material/ExpandLess";
import { ToolRow } from "./ToolRow";
import { ToolRowFormat } from "./format";
import { defaultToolLabels } from "./labels";
export function ToolStepGroup({ calls, running, onOpen, labels }) {
    const l = { ...defaultToolLabels, ...labels };
    // null = follow the running default; a click pins the user's choice.
    const [pinned, setPinned] = useState(null);
    if (calls.length === 0)
        return null;
    const rowRunning = (c, i) => !!running && c.state === "start" && i === calls.length - 1;
    if (calls.length === 1)
        return _jsx(ToolRow, { call: calls[0], running: rowRunning(calls[0], 0), onOpen: onOpen, labels: labels });
    const open = pinned ?? !!running;
    const total = calls.reduce((s, c) => s + (c.duration_s ?? 0), 0);
    const failed = calls.filter((c) => c.state === "failed").length;
    const dur = ToolRowFormat.duration(calls.some((c) => c.duration_s !== undefined) ? total : undefined);
    const title = l.steps(calls.length) + (dur ? ` · ${dur}` : "");
    const action = open ? l.hideSteps : l.showSteps;
    return (_jsxs(Box, { "data-testid": "tool-step-group", sx: { display: "flex", flexDirection: "column", gap: 0.5 }, children: [_jsxs(ButtonBase, { "aria-expanded": open, "aria-label": `${title}. ${action}`, onClick: () => setPinned(!open), sx: { display: "flex", alignItems: "center", gap: 0.5, justifyContent: "flex-start", p: 0.5, borderRadius: 1, bgcolor: "action.hover" }, children: [_jsx(Typography, { variant: "body2", sx: { fontWeight: "fontWeightMedium" }, children: title }), failed > 0 && _jsx(Typography, { variant: "caption", color: "error", children: l.failedCount(failed) }), _jsx(Box, { sx: { flex: 1 } }), open ? _jsx(ExpandLess, { fontSize: "small" }) : _jsx(ExpandMore, { fontSize: "small" })] }), open && calls.map((c, i) => _jsx(ToolRow, { call: c, running: rowRunning(c, i), onOpen: onOpen, labels: labels }, c.id))] }));
}
