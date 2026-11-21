/** `hermesChatAdapter`: maps `hermes-chat-events/2` turns and the paged history onto the @mui/x-chat `ChatAdapter`. */
import type { ChatAdapter } from "@mui/x-chat/headless";
import type { ChatMessage, ChatMessageChunk, ChatMessagePart } from "@mui/x-chat/types";
import type { ChatEvent, ToolEvent } from "../core/events";
import { ChatHttpError, StreamLostError, fetchHistoryPage, runTurn } from "../core/transport";
import type { ChatUrls, CsrfSource, HermesMessage, HistoryPage, Target } from "../core/types";

export interface HermesAdapterOptions {
  urls: Pick<ChatUrls, "turn" | "messages">;
  target: Target;
  csrf: CsrfSource;
  /** The newest history page from the read model; `listMessages` without a cursor returns it. */
  initialPage?: HistoryPage;
  /** Shown as the error part when the connection drops with no server text. */
  networkErrorText?: string;
  /** Called once when the turn stream is lost (`network`: it ended without a final frame; `detached`: the relay's idle cap). The run may continue server-side. */
  onStreamLost?: (info: { code: StreamLostCode }) => void;
}

export type StreamLostCode = "network" | "detached";

let seq = 0;
const nextId = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export const NOTE_NETWORK = "The connection to Hermes was lost. Your message is still in the box: send it again.";

const toolInput = (e: ToolEvent): Record<string, unknown> => e.args ?? (e.preview !== undefined ? { preview: e.preview } : {});

function toolOutput(e: ToolEvent): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (e.result_preview !== undefined) out.result_preview = e.result_preview;
  if (e.duration_s !== undefined) out.duration_s = e.duration_s;
  return out;
}

export const USER_AUTHOR_ID = "user";
export const AGENT_AUTHOR_ID = "hermes";

/**
 * History rows → x-chat messages. User: one text part. Assistant: a `data-tools` part (`HermesToolCall[]`)
 * when it carries tools, then a `data-reply` part (`{text, html}`) when it has html, else a text part.
 */
export function toChatMessages(messages: HermesMessage[]): ChatMessage[] {
  return messages.map((m) => {
    const parts: ChatMessagePart[] = [];
    if (m.role === "assistant") {
      if (m.tools?.length) parts.push({ type: "data-tools", id: `${m.id}-tools`, data: m.tools });
      if (m.html) parts.push({ type: "data-reply", id: "reply", data: { text: m.text, html: m.html } });
      else if (m.text) parts.push({ type: "text", text: m.text });
    } else {
      parts.push({ type: "text", text: m.text });
    }
    // Author ids match `currentUser`/`members` in HermesChat: x-chat decides viewer ownership by author id.
    const author = { id: m.role === "user" ? USER_AUTHOR_ID : AGENT_AUTHOR_ID };
    const msg: ChatMessage = { id: m.id, role: m.role, author, parts, status: "sent" };
    if (typeof m.created === "number") msg.createdAt = new Date(m.created * 1000).toISOString();
    return msg;
  });
}

export function hermesChatAdapter(opts: HermesAdapterOptions): ChatAdapter {
  const seen = new Set<string>();
  const fresh = (ms: HermesMessage[]) =>
    ms.filter((m) => {
      if (!m?.id || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  const result = (page: HistoryPage, ms: HermesMessage[]) => ({
    messages: toChatMessages(ms),
    cursor: page.cursor ?? undefined,
    hasMore: page.hasMore && page.cursor !== null,
  });

  return {
    async listMessages({ cursor }) {
      if (cursor === undefined) {
        // Initial load: the newest page the read model already carries.
        seen.clear();
        const page = opts.initialPage ?? { messages: [], cursor: null, hasMore: false };
        return result(page, fresh(page.messages));
      }
      if (!opts.urls.messages) return { messages: [], hasMore: false };
      const page = await fetchHistoryPage(opts.urls.messages, opts.target, cursor, opts.csrf);
      return result(page, fresh(page.messages));
    },

    async sendMessage({ message, signal }) {
      const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
      const messageId = nextId("hermes");
      let closed = false;
      return new ReadableStream<ChatMessageChunk>({
        start(c) {
          let textId = "";
          let reasonId = "";
          /** Open tool calls: event `id` (v2) or tool name (v1) → toolCallId. */
          const tools = new Map<string, string>();
          const closeText = () => {
            if (textId) {
              c.enqueue({ type: "text-end", id: textId });
              textId = "";
            }
          };
          const closeReason = () => {
            if (reasonId) {
              c.enqueue({ type: "reasoning-end", id: reasonId });
              reasonId = "";
            }
          };
          const finish = (reason: string) => {
            if (closed) return;
            closeReason();
            closeText();
            c.enqueue({ type: "finish", messageId, finishReason: reason });
            closed = true;
            c.close();
          };
          c.enqueue({ type: "start", messageId });
          let lost = false;
          /** Lost stream ≠ failed turn: an info note part, the user's message stays, nothing to resend. */
          const streamLost = (code: StreamLostCode) => {
            if (lost || closed) return;
            lost = true;
            closeReason();
            closeText();
            c.enqueue({ type: "data-stream-lost", id: "stream-lost", data: { code } });
            opts.onStreamLost?.({ code });
          };
          const onTool = (e: ToolEvent) => {
            const st = e.state || "start";
            const key = e.id ?? e.name;
            let id = tools.get(key);
            if (st === "start" || !id) {
              id = e.id ?? nextId("tool");
              tools.set(key, id);
              c.enqueue({ type: "tool-input-start", toolCallId: id, toolName: e.name });
              c.enqueue({ type: "tool-input-available", toolCallId: id, toolName: e.name, input: toolInput(e) });
            }
            if (st === "done") {
              c.enqueue({ type: "tool-output-available", toolCallId: id, output: toolOutput(e) });
              tools.delete(key);
            } else if (st === "failed") {
              c.enqueue({ type: "tool-output-error", toolCallId: id, errorText: e.result_preview || "failed" });
              tools.delete(key);
            }
          };
          const on = (e: ChatEvent) => {
            if (closed) return;
            switch (e.t) {
              case "delta":
                closeReason();
                if (!textId) {
                  textId = nextId("t");
                  c.enqueue({ type: "text-start", id: textId });
                }
                c.enqueue({ type: "text-delta", id: textId, delta: e.text });
                break;
              case "thinking":
                if (!reasonId) {
                  reasonId = nextId("r");
                  c.enqueue({ type: "reasoning-start", id: reasonId });
                }
                c.enqueue({ type: "reasoning-delta", id: reasonId, delta: e.text });
                break;
              case "commentary":
                closeReason();
                closeText();
                c.enqueue({ type: "data-commentary", id: nextId("c"), data: { text: e.text } });
                break;
              case "tool":
                onTool(e);
                break;
              case "approval":
                c.enqueue({ type: "data-approval", id: e.request_id, data: e });
                break;
              case "reply":
                closeText();
                c.enqueue({ type: "data-reply", id: "reply", data: { text: e.text, html: e.html } });
                break;
              case "error":
                if (e.code === "detached") {
                  streamLost("detached");
                  finish("stop");
                  break;
                }
                c.enqueue({ type: "data-error", id: "error", data: { text: e.text || "Something went wrong.", code: e.code } });
                break;
              case "end":
                finish("stop");
                break;
              default:
                break; // `run` carries only the run id; unknown frames are ignored
            }
          };
          runTurn(opts.urls.turn, opts.target, text, on, opts.csrf, signal).then(
            () => finish("stop"),
            (err: unknown) => {
              if (closed) return;
              if (signal.aborted) {
                closed = true;
                c.enqueue({ type: "abort", messageId });
                c.close();
                return;
              }
              if (err instanceof StreamLostError) {
                streamLost("network");
                finish("stop");
                return;
              }
              on({ t: "error", text: (err instanceof ChatHttpError && err.message) || opts.networkErrorText || NOTE_NETWORK });
              finish("error");
            },
          );
        },
        cancel() {
          closed = true;
        },
      });
    },
  };
}
