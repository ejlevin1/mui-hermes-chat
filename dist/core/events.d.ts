/** Event contract `hermes-chat-events/2`: the SSE frames of POST <urls.turn> and an incremental parser (pure TS). */
export declare const CHAT_EVENTS_CONTRACT = "hermes-chat-events/2";
export type ChatEvent = {
    t: "run";
    run_id?: string;
} | {
    t: "delta";
    text: string;
} | {
    t: "thinking";
    text: string;
} | {
    t: "tool";
    name: string;
    state?: "start" | "done" | "failed";
    /** v2: unique per turn (upstream tool_call_id, else `<name>#<n>`). */
    id?: string;
    preview?: string;
    args?: Record<string, unknown>;
    args_clipped?: boolean;
    duration_s?: number;
    result_preview?: string;
} | {
    t: "commentary";
    text: string;
} | {
    t: "approval";
    run_id: string;
    request_id: string;
    execution_generation: string | number;
    title?: string;
    text?: string;
    expires_s?: number;
} | {
    t: "reply";
    text: string;
    html: string;
} | {
    t: "error";
    code?: string;
    text: string;
} | {
    t: "end";
};
export type ApprovalEvent = Extract<ChatEvent, {
    t: "approval";
}>;
export type ToolEvent = Extract<ChatEvent, {
    t: "tool";
}>;
/**
 * Incremental SSE parser: feed it text in any split (mid-line, mid-frame, mid-JSON, CRLF), call
 * `end()` once. The event type is `data.t`, else the `event:` line. Unusable frames are dropped;
 * unknown fields and frame types pass through untouched (consumers ignore what they don't know).
 */
export declare function parseChatEvents(onEvent: (e: ChatEvent) => void): {
    push: (c: string) => void;
    end: () => void;
};
