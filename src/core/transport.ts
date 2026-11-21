/** Transport for the Hermes chat endpoints: streamed turns, approval/new form posts and history paging (CSRF injected). */
import { parseChatEvents, type ChatEvent } from "./events";
import type { CsrfSource, HermesMessage, HistoryPage, Target } from "./types";

/** A non-OK chat reply carrying the server's own `text` (or `error` code) as message. */
export class ChatHttpError extends Error {
  override name = "ChatHttpError";
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

async function formOnce(url: string, fields: Record<string, string>, accept: string, csrf: CsrfSource, refresh: boolean, signal?: AbortSignal): Promise<Response> {
  const token = await csrf(refresh);
  return fetch(url, {
    method: "POST",
    credentials: "same-origin",
    signal,
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: accept, "X-KT-CSRF": token },
    body: new URLSearchParams({ ...fields, csrf: token }).toString(),
  });
}

async function isCsrfReject(res: Response): Promise<boolean> {
  if (res.status !== 403) return false;
  const body = (await res.clone().json().catch(() => null)) as { error?: unknown } | null;
  const e = body?.error;
  return e === "csrf" || (!!e && typeof e === "object" && (e as { code?: unknown }).code === "csrf");
}

/** POST a form; on 403 `{error:"csrf"}` retry exactly once with a refreshed token. */
async function form(url: string, fields: Record<string, string>, accept: string, csrf: CsrfSource, signal?: AbortSignal): Promise<Response> {
  const res = await formOnce(url, fields, accept, csrf, false, signal);
  if (await isCsrfReject(res)) return formOnce(url, fields, accept, csrf, true, signal);
  return res;
}

async function httpError(res: Response): Promise<ChatHttpError> {
  const j = (await res.json().catch(() => null)) as { text?: unknown; error?: unknown } | null;
  const code = typeof j?.error === "string" ? j.error : undefined;
  return new ChatHttpError(res.status, typeof j?.text === "string" ? j.text : "", code);
}

/** Run one turn; resolves when the stream is over. Throws on transport failure or a stream that ended with no reply/error. */
export async function runTurn(url: string, target: Target, message: string, onEvent: (e: ChatEvent) => void, csrf: CsrfSource, signal?: AbortSignal): Promise<void> {
  const res = await form(url, { ...target, message }, "text/event-stream", csrf, signal);
  if (!res.ok || !res.body) throw await httpError(res);
  let finished = false;
  const parser = parseChatEvents((e) => {
    if (e.t === "reply" || e.t === "error") finished = true;
    onEvent(e);
  });
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    parser.push(dec.decode(value, { stream: true }));
  }
  parser.push(dec.decode());
  parser.end();
  if (!finished) throw new Error("stream ended early");
}

export async function sendApproval(
  url: string,
  target: Target,
  a: { run_id: string; request_id: string; execution_generation: string | number },
  choice: "once" | "deny",
  csrf: CsrfSource,
  signal?: AbortSignal,
): Promise<boolean> {
  const res = await form(
    url,
    { ...target, run_id: a.run_id, request_id: a.request_id, execution_generation: String(a.execution_generation ?? ""), choice },
    "application/json",
    csrf,
    signal,
  );
  return res.ok;
}

export async function startOver(url: string, target: Target, csrf: CsrfSource, signal?: AbortSignal): Promise<boolean> {
  const res = await form(url, { ...target }, "application/json", csrf, signal);
  return res.ok || res.redirected;
}

/** GET the next older history page (`<url>?<target>&cursor=<c>`); throws `ChatHttpError` (e.g. 400 `bad_cursor`, 404). */
export async function fetchHistoryPage(url: string, target: Target, cursor: string, csrf?: CsrfSource, signal?: AbortSignal): Promise<HistoryPage> {
  const q = new URLSearchParams({ ...target, cursor }).toString();
  const full = url + (url.includes("?") ? "&" : "?") + q;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (csrf) headers["X-KT-CSRF"] = await csrf(false);
  const res = await fetch(full, { method: "GET", credentials: "same-origin", signal, headers });
  if (!res.ok) throw await httpError(res);
  const j = (await res.json().catch(() => null)) as { messages?: unknown; cursor?: unknown; has_more?: unknown } | null;
  const messages = Array.isArray(j?.messages) ? (j.messages as HermesMessage[]) : [];
  const next = typeof j?.cursor === "string" && j.cursor ? j.cursor : null;
  return { messages, cursor: next, hasMore: j?.has_more === true && next !== null };
}
