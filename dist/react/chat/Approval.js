import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** Approval card for a pending tool approval: countdown, Approve once / Deny, result line. */
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { defaultChatLabels } from "./labels";
export function clock(left) {
    return Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
}
export function Approval({ event, onDecide, labels }) {
    const l = { ...defaultChatLabels, ...labels };
    const [left, setLeft] = useState(Number(event.expires_s) || 0);
    const [decided, setDecided] = useState(false);
    const [result, setResult] = useState("");
    const live = !decided && left > 0;
    useEffect(() => {
        if (!live)
            return;
        const id = setInterval(() => setLeft((n) => n - 1), 1000);
        return () => clearInterval(id);
    }, [live]);
    const decide = async (choice) => {
        if (decided)
            return;
        setDecided(true); // both buttons lock before anything is awaited
        setResult(l.approvalSending);
        let ok = false;
        try {
            ok = await onDecide(choice);
        }
        catch {
            setResult(l.approvalFailed);
            return;
        }
        setResult(ok ? (choice === "once" ? l.approved : l.denied) : l.approvalRejected);
    };
    const expired = !decided && left <= 0 && Number(event.expires_s) > 0;
    return (_jsxs(Paper, { variant: "outlined", "data-testid": "approval", sx: { p: 1.5 }, children: [_jsx(Typography, { variant: "subtitle2", component: "strong", children: event.title || l.approvalTitle }), _jsx(Typography, { variant: "body2", sx: { overflowWrap: "anywhere", whiteSpace: "pre-wrap" }, children: event.text || "" }), live && _jsx(Typography, { variant: "caption", color: "text.secondary", component: "p", children: l.expiresIn(clock(left)) }), expired && _jsx(Typography, { variant: "caption", color: "text.secondary", component: "p", children: l.expired }), _jsxs(Stack, { direction: "row", spacing: 1, sx: { mt: 1 }, children: [_jsx(Button, { variant: "contained", disabled: decided || expired, onClick: () => void decide("once"), children: l.approveOnce }), _jsx(Button, { variant: "outlined", color: "inherit", disabled: decided || expired, onClick: () => void decide("deny"), children: l.deny })] }), _jsx(Typography, { role: "status", variant: "caption", color: "text.secondary", component: "p", children: result })] }));
}
