/** liveSource: TranscriptFeed over SSE (follow with resume) and backward history pages (hermes-transcript/1, 6.2-6.4). */
import { ChatHttpError } from "./transport";
import type { TranscriptFeed, TranscriptFollow, TranscriptMessage, TranscriptPage } from "./transcript";

export interface LiveSourceOptions {
  /** Stream URL. */
  url: string;
  messagesUrl?: string;
  params?: Record<string, string>;
  EventSource?: typeof EventSource;
  fetch?: typeof fetch;
}

const BACKOFF_MS = [1000, 2000, 4000, 8000, 15000];
const ERROR_AFTER = 8;

function withQuery(url: string, params: Record<string, string>): string {
  const q = new URLSearchParams(params).toString();
  if (!q) return url;
  return url + (url.includes("?") ? "&" : "?") + q;
}

function isMessage(m: unknown): m is TranscriptMessage {
  if (typeof m !== "object" || m === null) return false;
  const r = m as { id?: unknown; seq?: unknown };
  return typeof r.id === "string" && typeof r.seq === "number";
}

function parse(data: unknown): unknown {
  if (typeof data !== "string") return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function liveSource(o: LiveSourceOptions): TranscriptFeed {
  const params = o.params ?? {};
  return {
    async page(cursor, signal): Promise<TranscriptPage> {
      if (!o.messagesUrl) return { messages: [], cursor: null, hasMore: false };
      const doFetch = o.fetch ?? globalThis.fetch.bind(globalThis);
      const q = { ...params, ...(cursor !== null ? { before: cursor } : {}) };
      const res = await doFetch(withQuery(o.messagesUrl, q), {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal,
      });
      const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok) {
        throw new ChatHttpError(
          res.status,
          typeof body?.text === "string" ? body.text : "",
          typeof body?.error === "string" ? body.error : undefined,
        );
      }
      const messages = Array.isArray(body?.messages) ? (body.messages as unknown[]).filter(isMessage) : [];
      const next = typeof body?.cursor === "string" ? body.cursor : null;
      return { messages, cursor: next, hasMore: body?.has_more === true && next !== null };
    },

    follow(afterSeq: number | null, on: TranscriptFollow): () => void {
      const ES = o.EventSource ?? globalThis.EventSource;
      if (!ES) {
        on.status({ state: "error", error: "EventSource unavailable" });
        return () => {};
      }
      let stopped = false;
      let es: EventSource | null = null;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let highest: number | null = afterSeq;
      let failures = 0;
      let reconnectingReported = false;
      let serverStatus = false;
      let endedAt: number | undefined;
      let endReason: string | undefined;

      const open = () => {
        const q = { ...params, ...(highest !== null ? { after: String(highest) } : {}) };
        const source = new ES(withQuery(o.url, q));
        es = source;
        serverStatus = false;
        const live = () => !stopped && es === source;

        source.addEventListener("open", () => {
          if (!live()) return;
          failures = 0;
          reconnectingReported = false;
          if (!serverStatus) on.status({ state: "live" });
        });
        source.addEventListener("message", (ev) => {
          if (!live()) return;
          const m = parse((ev as MessageEvent).data);
          if (!isMessage(m)) return;
          if (highest === null || m.seq > highest) highest = m.seq;
          on.message(m);
        });
        source.addEventListener("status", (ev) => {
          if (!live()) return;
          const d = parse((ev as MessageEvent).data) as { state?: unknown; ended_at?: unknown; end_reason?: unknown } | null;
          if (!d || (d.state !== "live" && d.state !== "ended")) return;
          serverStatus = true;
          if (typeof d.ended_at === "number") endedAt = d.ended_at;
          if (typeof d.end_reason === "string") endReason = d.end_reason;
          on.status({
            state: d.state,
            ...(typeof d.ended_at === "number" ? { ended_at: d.ended_at } : {}),
            ...(typeof d.end_reason === "string" ? { end_reason: d.end_reason } : {}),
          });
        });
        source.addEventListener("end", () => {
          if (!live()) return;
          source.close();
          es = null;
          on.status({
            state: "ended",
            ...(endedAt !== undefined ? { ended_at: endedAt } : {}),
            ...(endReason !== undefined ? { end_reason: endReason } : {}),
          });
        });
        source.addEventListener("error", () => {
          if (!live()) return;
          if (source.readyState !== ES.CLOSED) {
            // The browser reconnects itself (resending Last-Event-ID).
            if (!reconnectingReported) {
              reconnectingReported = true;
              on.status({ state: "reconnecting" });
            }
            return;
          }
          source.close();
          es = null;
          failures += 1;
          if (failures >= ERROR_AFTER) {
            on.status({ state: "error", error: `Live stream unavailable after ${failures} attempts` });
          } else {
            on.status({ state: "reconnecting" });
          }
          timer = setTimeout(() => {
            timer = null;
            if (!stopped) open();
          }, BACKOFF_MS[Math.min(failures - 1, BACKOFF_MS.length - 1)]);
        });
      };

      on.status({ state: "connecting" });
      open();

      return () => {
        stopped = true;
        if (timer) clearTimeout(timer);
        timer = null;
        es?.close();
        es = null;
      };
    },
  };
}
