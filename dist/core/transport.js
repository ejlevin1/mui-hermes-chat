/** Transport for the Hermes chat endpoints: streamed turns, approval/new form posts and history paging (CSRF injected). */
import { parseChatEvents } from "./events";
/** A non-OK chat reply carrying the server's own `text` (or `error` code) as message. */
export class ChatHttpError extends Error {
    status;
    code;
    name = "ChatHttpError";
    constructor(status, message, code) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
async function formOnce(url, fields, accept, csrf, refresh, signal) {
    const token = await csrf(refresh);
    return fetch(url, {
        method: "POST",
        credentials: "same-origin",
        signal,
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: accept, "X-KT-CSRF": token },
        body: new URLSearchParams({ ...fields, csrf: token }).toString(),
    });
}
async function isCsrfReject(res) {
    if (res.status !== 403)
        return false;
    const body = (await res.clone().json().catch(() => null));
    const e = body?.error;
    return e === "csrf" || (!!e && typeof e === "object" && e.code === "csrf");
}
/** POST a form; on 403 `{error:"csrf"}` retry exactly once with a refreshed token. */
async function form(url, fields, accept, csrf, signal) {
    const res = await formOnce(url, fields, accept, csrf, false, signal);
    if (await isCsrfReject(res))
        return formOnce(url, fields, accept, csrf, true, signal);
    return res;
}
async function httpError(res) {
    const j = (await res.json().catch(() => null));
    const code = typeof j?.error === "string" ? j.error : undefined;
    return new ChatHttpError(res.status, typeof j?.text === "string" ? j.text : "", code);
}
/** Run one turn; resolves when the stream is over. Throws on transport failure or a stream that ended with no reply/error. */
export async function runTurn(url, target, message, onEvent, csrf, signal) {
    const res = await form(url, { ...target, message }, "text/event-stream", csrf, signal);
    if (!res.ok || !res.body)
        throw await httpError(res);
    let finished = false;
    const parser = parseChatEvents((e) => {
        if (e.t === "reply" || e.t === "error")
            finished = true;
        onEvent(e);
    });
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    for (;;) {
        const { value, done } = await reader.read();
        if (done)
            break;
        parser.push(dec.decode(value, { stream: true }));
    }
    parser.push(dec.decode());
    parser.end();
    if (!finished)
        throw new Error("stream ended early");
}
export async function sendApproval(url, target, a, choice, csrf, signal) {
    const res = await form(url, { ...target, run_id: a.run_id, request_id: a.request_id, execution_generation: String(a.execution_generation ?? ""), choice }, "application/json", csrf, signal);
    return res.ok;
}
export async function startOver(url, target, csrf, signal) {
    const res = await form(url, { ...target }, "application/json", csrf, signal);
    return res.ok || res.redirected;
}
/** GET the next older history page (`<url>?<target>&cursor=<c>`); throws `ChatHttpError` (e.g. 400 `bad_cursor`, 404). */
export async function fetchHistoryPage(url, target, cursor, csrf, signal) {
    const q = new URLSearchParams({ ...target, cursor }).toString();
    const full = url + (url.includes("?") ? "&" : "?") + q;
    const headers = { Accept: "application/json" };
    if (csrf)
        headers["X-KT-CSRF"] = await csrf(false);
    const res = await fetch(full, { method: "GET", credentials: "same-origin", signal, headers });
    if (!res.ok)
        throw await httpError(res);
    const j = (await res.json().catch(() => null));
    const messages = Array.isArray(j?.messages) ? j.messages : [];
    const next = typeof j?.cursor === "string" && j.cursor ? j.cursor : null;
    return { messages, cursor: next, hasMore: j?.has_more === true && next !== null };
}
