/** Event contract `hermes-chat-events/2`: the SSE frames of POST <urls.turn> and an incremental parser (pure TS). */

export const CHAT_EVENTS_CONTRACT = "hermes-chat-events/2";

export type ChatEvent =
  | { t: "run"; run_id?: string }
  | { t: "delta"; text: string }
  | { t: "thinking"; text: string }
  | {
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
    }
  | { t: "commentary"; text: string }
  | { t: "approval"; run_id: string; request_id: string; execution_generation: string | number; title?: string; text?: string; expires_s?: number }
  | { t: "reply"; text: string; html: string }
  | { t: "error"; code?: string; text: string }
  | { t: "end" };

export type ApprovalEvent = Extract<ChatEvent, { t: "approval" }>;
export type ToolEvent = Extract<ChatEvent, { t: "tool" }>;

/**
 * Incremental SSE parser: feed it text in any split (mid-line, mid-frame, mid-JSON, CRLF), call
 * `end()` once. The event type is `data.t`, else the `event:` line. Unusable frames are dropped;
 * unknown fields and frame types pass through untouched (consumers ignore what they don't know).
 */
export function parseChatEvents(onEvent: (e: ChatEvent) => void) {
  let buf = "";
  const frame = (text: string) => {
    const data: string[] = [];
    let name = "";
    for (const line of text.split(/\r?\n/)) {
      if (!line || line[0] === ":") continue;
      if (line.startsWith("event:")) name = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
    }
    if (!data.length) return;
    let obj: unknown;
    try {
      obj = JSON.parse(data.join("\n"));
    } catch {
      return; // unusable frame
    }
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      const o = obj as Record<string, unknown>;
      const t = typeof o.t === "string" ? o.t : name;
      if (t) onEvent({ ...o, t } as ChatEvent);
    }
  };
  const drain = (all: boolean) => {
    for (;;) {
      const m = /\r?\n\r?\n/.exec(buf);
      if (!m) break;
      frame(buf.slice(0, m.index));
      buf = buf.slice(m.index + m[0].length);
    }
    if (all && buf.trim()) frame(buf);
    if (all) buf = "";
  };
  return {
    push: (c: string) => {
      buf += c;
      drain(false);
    },
    end: () => drain(true),
  };
}
