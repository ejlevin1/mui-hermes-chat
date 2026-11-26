/** Live transcript contract (hermes-transcript/1) and the pure merge helpers. */
import type { HermesMessage } from "./types";

export const TRANSCRIPT_CONTRACT = "hermes-transcript/1";

export type TranscriptSourceKind = "hermes_session" | "devx_lane";

export interface TranscriptMessage extends HermesMessage {
  /** > 0, strictly increasing per attempt in arrival order; the SSE `id:`. hermes_session: state.db messages.id of
   * the newest row folded into this message; devx_lane: 1-based line number of the newest record folded in. */
  seq: number;
  source: TranscriptSourceKind;
  /** Opaque attempt key from the server (e.g. "run:5367", "lane:view:2"). */
  attempt: string;
  /** Hermes session id, or the lane id for devx_lane. */
  session: string;
  /** Id of the HermesToolCall (in another message of this attempt) that spawned this message's session; null/absent = top level. */
  subagent_of?: string | null;
  /** Thinking text (redacted, capped). */
  reasoning?: string;
  /** `text` was cut at the server cap. */
  text_clipped?: boolean;
  reasoning_clipped?: boolean;
  model?: string;
}

export interface TranscriptPage {
  messages: TranscriptMessage[];
  cursor: string | null;
  hasMore: boolean;
}

export type TranscriptStatus = {
  state: "connecting" | "live" | "reconnecting" | "ended" | "error";
  ended_at?: number;
  end_reason?: string;
  error?: string;
};

export interface TranscriptFollow {
  message(m: TranscriptMessage): void;
  status(s: TranscriptStatus): void;
}

export interface TranscriptFeed {
  /** null = newest page. */
  page(cursor: string | null, signal?: AbortSignal): Promise<TranscriptPage>;
  /** Returns stop(). */
  follow(afterSeq: number | null, on: TranscriptFollow): () => void;
}

/** Pure upsert per 6.1: held ids are replaced in place; new ids go after (append) or before (prepend). */
export function mergeTranscript(
  held: TranscriptMessage[],
  incoming: TranscriptMessage[],
  where: "append" | "prepend",
): TranscriptMessage[] {
  const out = held.filter((m) => m && typeof m.id === "string");
  const index = new Map<string, number>();
  out.forEach((m, i) => index.set(m.id, i));
  const fresh: TranscriptMessage[] = [];
  const freshIndex = new Map<string, number>();
  for (const m of incoming) {
    if (!m || typeof m.id !== "string") continue;
    const at = index.get(m.id);
    if (at !== undefined) {
      if (where === "append" && m.seq < out[at].seq) continue;
      out[at] = m;
      continue;
    }
    const f = freshIndex.get(m.id);
    if (f !== undefined) {
      if (where === "append" && m.seq < fresh[f].seq) continue;
      fresh[f] = m;
    } else {
      freshIndex.set(m.id, fresh.length);
      fresh.push(m);
    }
  }
  return where === "append" ? [...out, ...fresh] : [...fresh, ...out];
}

/** Highest seq in the list, null when empty. */
export function maxSeq(list: TranscriptMessage[]): number | null {
  let max: number | null = null;
  for (const m of list) if (max === null || m.seq > max) max = m.seq;
  return max;
}
