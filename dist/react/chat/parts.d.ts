import type { ChatPartRendererMap } from "@mui/x-chat/headless";
import { type ReactNode } from "react";
import type { ApprovalEvent } from "../../core/events";
import type { HermesToolCall } from "../../core/types";
import { type ChatLabels } from "./labels";
/** Streamed text: plain, but ``` fences become code blocks (with the library's copy button). */
export declare function StreamedText({ text }: {
    text: string;
}): ReactNode;
/** Server-sanitised reply html via the consumer's `renderHtml`, with a Copy button on every code block (DOM calls only). */
export declare function ReplyHtml({ html, renderHtml, labels }: {
    html: string;
    renderHtml: (html: string) => ReactNode;
    labels?: Partial<ChatLabels>;
}): import("react").JSX.Element;
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
export declare function toolCallOf(inv: ToolInvocationLike): HermesToolCall;
/** Consecutive tool parts of one message (history `data-tools` + live dynamic-tool) as the calls to show. */
export declare function toolCallsOf(parts: ReadonlyArray<{
    type: string;
    data?: unknown;
    toolInvocation?: unknown;
}>): HermesToolCall[];
export declare function hermesPartRenderers({ decide, renderHtml, onOpenTool, labels }: PartDeps): ChatPartRendererMap;
export {};
