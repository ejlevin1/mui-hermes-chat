/** Part renderers for the x-chat message parts the Hermes adapter emits. */
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ChatCodeBlock } from "@mui/x-chat";
import type { ChatPartRendererMap } from "@mui/x-chat/headless";
import { useEffect, useRef, type ReactNode } from "react";
import type { ApprovalEvent } from "../../core/events";
import type { HermesToolCall } from "../../core/types";
import { ToolStepGroup } from "../tools/ToolStepGroup";
import { ThinkingPart } from "./ThinkingPart";
import { Approval } from "./Approval";
import { defaultChatLabels, type ChatLabels } from "./labels";

const wrap = { whiteSpace: "pre-wrap", overflowWrap: "anywhere", minWidth: 0 } as const;

/** Streamed text: plain, but ``` fences become code blocks (with the library's copy button). */
export function StreamedText({ text }: { text: string }): ReactNode {
  const chunks = text.split(/```/);
  return (
    <>
      {chunks.map((c, i) => {
        if (i % 2 === 0) return c ? <Typography key={i} variant="body2" component="div" sx={wrap}>{c}</Typography> : null;
        const nl = c.indexOf("\n");
        const lang = nl >= 0 ? c.slice(0, nl).trim() : "";
        const code = nl >= 0 && /^[\w+#.-]*$/.test(lang) ? c.slice(nl + 1) : c;
        return <ChatCodeBlock key={i} language={lang || undefined}>{code.replace(/\n$/, "")}</ChatCodeBlock>;
      })}
    </>
  );
}

/** Server-sanitised reply html via the consumer's `renderHtml`, with a Copy button on every code block (DOM calls only). */
export function ReplyHtml({ html, renderHtml, labels }: { html: string; renderHtml: (html: string) => ReactNode; labels?: Partial<ChatLabels> }) {
  const l = { ...defaultChatLabels, ...labels };
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const added: HTMLElement[] = [];
    root.querySelectorAll("pre").forEach((pre) => {
      const host = pre.parentElement;
      if (!host || host.dataset.hcCopy) return;
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
  return <Box ref={ref} data-testid="reply-html">{renderHtml(html)}</Box>;
}

export interface PartDeps {
  /** Decide an approval through the approval endpoint (same POST + CSRF). */
  decide: (event: ApprovalEvent, choice: "once" | "deny") => Promise<boolean>;
  renderHtml: (html: string) => ReactNode;
  /** A tool row was opened (opens the detail drawer). */
  onOpenTool?: (call: HermesToolCall) => void;
  labels?: Partial<ChatLabels>;
}

interface ToolInvocationLike {
  toolCallId?: string;
  toolName: string;
  state: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

/** x-chat tool invocation → a contract tool call (live parts carry the adapter's input/output shapes). */
export function toolCallOf(inv: ToolInvocationLike): HermesToolCall {
  const state: HermesToolCall["state"] = inv.state === "output-available" ? "done" : inv.state === "output-error" ? "failed" : "start";
  const input = (inv.input && typeof inv.input === "object" ? inv.input : {}) as Record<string, unknown>;
  const out = (inv.output && typeof inv.output === "object" ? inv.output : {}) as Record<string, unknown>;
  const call: HermesToolCall = { id: inv.toolCallId ?? inv.toolName, name: inv.toolName, state };
  const keys = Object.keys(input);
  if (keys.length === 1 && keys[0] === "preview" && typeof input.preview === "string") call.preview = input.preview;
  else if (keys.length) call.args = input;
  if (typeof out.result_preview === "string") call.result_preview = out.result_preview;
  else if (inv.errorText && inv.errorText !== "failed") call.result_preview = inv.errorText;
  if (typeof out.duration_s === "number") call.duration_s = out.duration_s;
  return call;
}

/** Consecutive tool parts of one message (history `data-tools` + live dynamic-tool) as the calls to show. */
export function toolCallsOf(parts: ReadonlyArray<{ type: string; data?: unknown; toolInvocation?: unknown }>): HermesToolCall[] {
  const calls: HermesToolCall[] = [];
  for (const p of parts) {
    if (p.type === "data-tools" && Array.isArray(p.data)) calls.push(...(p.data as HermesToolCall[]));
    else if ((p.type === "dynamic-tool" || p.type === "tool") && p.toolInvocation) calls.push(toolCallOf(p.toolInvocation as ToolInvocationLike));
  }
  return calls;
}

export function hermesPartRenderers({ decide, renderHtml, onOpenTool, labels }: PartDeps): ChatPartRendererMap {
  const l = { ...defaultChatLabels, ...labels };
  // The first tool-ish part of a message renders the whole group; later ones render nothing.
  const group = ({ part, message }: { part: unknown; message: { parts: ReadonlyArray<{ type: string }> } }) => {
    const parts = message.parts as ReadonlyArray<{ type: string; data?: unknown; toolInvocation?: unknown }>;
    const first = parts.find((p) => p.type === "data-tools" || p.type === "dynamic-tool" || p.type === "tool");
    if (first !== part) return null;
    const calls = toolCallsOf(parts);
    const running = calls.some((c) => c.state === "start");
    return <ToolStepGroup calls={calls} running={running} onOpen={onOpenTool} labels={labels} />;
  };
  return {
    text: ({ part, message }) =>
      message.parts.some((p) => p.type === "data-reply") ? null : <StreamedText text={part.text} />,
    reasoning: ({ part }) => <ThinkingPart text={part.text} state={part.state} labels={labels} />,
    "data-reply": ({ part }) => <ReplyHtml html={(part.data as { html?: string }).html ?? ""} renderHtml={renderHtml} labels={labels} />,
    "data-commentary": ({ part }) => (
      <Typography variant="caption" color="text.secondary" component="p" sx={{ ...wrap, fontStyle: "italic", m: 0 }}>
        {(part.data as { text?: string }).text ?? ""}
      </Typography>
    ),
    "data-approval": ({ part }) => {
      const ev = part.data as ApprovalEvent;
      return <Approval event={ev} onDecide={(choice) => decide(ev, choice)} labels={labels} />;
    },
    "data-error": ({ part }) => <Alert severity="error">{(part.data as { text?: string }).text || l.errorDefault}</Alert>,
    "data-tools": group as never,
    "dynamic-tool": group as never,
    tool: group as never,
  };
}
