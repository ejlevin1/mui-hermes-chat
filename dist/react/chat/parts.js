import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
/** Part renderers for the x-chat message parts the Hermes adapter emits. */
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ChatCodeBlock } from "@mui/x-chat";
import { useEffect, useRef } from "react";
import { ToolStepGroup } from "../tools/ToolStepGroup";
import { Approval } from "./Approval";
import { defaultChatLabels } from "./labels";
const wrap = { whiteSpace: "pre-wrap", overflowWrap: "anywhere", minWidth: 0 };
/** Streamed text: plain, but ``` fences become code blocks (with the library's copy button). */
export function StreamedText({ text }) {
    const chunks = text.split(/```/);
    return (_jsx(_Fragment, { children: chunks.map((c, i) => {
            if (i % 2 === 0)
                return c ? _jsx(Typography, { variant: "body2", component: "div", sx: wrap, children: c }, i) : null;
            const nl = c.indexOf("\n");
            const lang = nl >= 0 ? c.slice(0, nl).trim() : "";
            const code = nl >= 0 && /^[\w+#.-]*$/.test(lang) ? c.slice(nl + 1) : c;
            return _jsx(ChatCodeBlock, { language: lang || undefined, children: code.replace(/\n$/, "") }, i);
        }) }));
}
/** Server-sanitised reply html via the consumer's `renderHtml`, with a Copy button on every code block (DOM calls only). */
export function ReplyHtml({ html, renderHtml, labels }) {
    const l = { ...defaultChatLabels, ...labels };
    const ref = useRef(null);
    useEffect(() => {
        const root = ref.current;
        if (!root)
            return;
        const added = [];
        root.querySelectorAll("pre").forEach((pre) => {
            const host = pre.parentElement;
            if (!host || host.dataset.hcCopy)
                return;
            host.dataset.hcCopy = "1";
            host.style.position = "relative";
            const b = document.createElement("button");
            b.type = "button";
            b.textContent = l.copyCodeShort;
            b.setAttribute("aria-label", l.copyCode);
            b.style.cssText = "position:absolute;top:4px;right:4px"; // CSSOM, allowed by style-src
            b.addEventListener("click", () => {
                void navigator.clipboard?.writeText(pre.textContent ?? "").then(() => {
                    b.textContent = l.copiedCode;
                    setTimeout(() => { b.textContent = l.copyCodeShort; }, 1500);
                });
            });
            host.appendChild(b);
            added.push(b);
        });
        return () => added.forEach((b) => { b.parentElement?.removeAttribute("data-hc-copy"); b.remove(); });
    }, [html, l.copyCode, l.copyCodeShort, l.copiedCode]);
    return _jsx(Box, { ref: ref, "data-testid": "reply-html", children: renderHtml(html) });
}
/** x-chat tool invocation → a contract tool call (live parts carry the adapter's input/output shapes). */
export function toolCallOf(inv) {
    const state = inv.state === "output-available" ? "done" : inv.state === "output-error" ? "failed" : "start";
    const input = (inv.input && typeof inv.input === "object" ? inv.input : {});
    const out = (inv.output && typeof inv.output === "object" ? inv.output : {});
    const call = { id: inv.toolCallId ?? inv.toolName, name: inv.toolName, state };
    const keys = Object.keys(input);
    if (keys.length === 1 && keys[0] === "preview" && typeof input.preview === "string")
        call.preview = input.preview;
    else if (keys.length)
        call.args = input;
    if (typeof out.result_preview === "string")
        call.result_preview = out.result_preview;
    else if (inv.errorText && inv.errorText !== "failed")
        call.result_preview = inv.errorText;
    if (typeof out.duration_s === "number")
        call.duration_s = out.duration_s;
    return call;
}
/** Consecutive tool parts of one message (history `data-tools` + live dynamic-tool) as the calls to show. */
export function toolCallsOf(parts) {
    const calls = [];
    for (const p of parts) {
        if (p.type === "data-tools" && Array.isArray(p.data))
            calls.push(...p.data);
        else if ((p.type === "dynamic-tool" || p.type === "tool") && p.toolInvocation)
            calls.push(toolCallOf(p.toolInvocation));
    }
    return calls;
}
export function hermesPartRenderers({ decide, renderHtml, onOpenTool, labels }) {
    const l = { ...defaultChatLabels, ...labels };
    // The first tool-ish part of a message renders the whole group; later ones render nothing.
    const group = ({ part, message }) => {
        const parts = message.parts;
        const first = parts.find((p) => p.type === "data-tools" || p.type === "dynamic-tool" || p.type === "tool");
        if (first !== part)
            return null;
        const calls = toolCallsOf(parts);
        const running = calls.some((c) => c.state === "start");
        return _jsx(ToolStepGroup, { calls: calls, running: running, onOpen: onOpenTool, labels: labels });
    };
    return {
        text: ({ part, message }) => message.parts.some((p) => p.type === "data-reply") ? null : _jsx(StreamedText, { text: part.text }),
        "data-reply": ({ part }) => _jsx(ReplyHtml, { html: part.data.html ?? "", renderHtml: renderHtml, labels: labels }),
        "data-commentary": ({ part }) => (_jsx(Typography, { variant: "caption", color: "text.secondary", component: "p", sx: { ...wrap, fontStyle: "italic", m: 0 }, children: part.data.text ?? "" })),
        "data-approval": ({ part }) => {
            const ev = part.data;
            return _jsx(Approval, { event: ev, onDecide: (choice) => decide(ev, choice), labels: labels });
        },
        "data-error": ({ part }) => _jsx(Alert, { severity: "error", children: part.data.text || l.errorDefault }),
        "data-tools": group,
        "dynamic-tool": group,
        tool: group,
    };
}
