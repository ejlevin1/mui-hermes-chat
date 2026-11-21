import { ChatHttpError, fetchHistoryPage, runTurn, sendApproval, startOver } from "./transport";
import type { ChatEvent } from "./events";

const enc = new TextEncoder();
const frame = (o: object) => "data: " + JSON.stringify(o) + "\n\n";
const target = { board: "ops", task: "t1" };
const csrf = vi.fn(async (_refresh?: boolean) => "tok");

let calls: { url: string; init?: RequestInit }[];
let handler: (n: number) => Response;
beforeEach(() => {
  calls = [];
  csrf.mockClear();
  handler = () => new Response("{}");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return handler(calls.length);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

const sse = (frames: string[]) =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(c) {
        frames.forEach((f) => c.enqueue(enc.encode(f)));
        c.close();
      },
    }),
  );
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status });
const form = (n = 0) => Object.fromEntries(new URLSearchParams(String(calls[n].init?.body)));

test("runTurn posts the form with CSRF and streams events", async () => {
  handler = () => sse([frame({ t: "delta", text: "a" }), frame({ t: "reply", text: "a", html: "<p>a</p>" })]);
  const evs: ChatEvent[] = [];
  await runTurn("/chat/turn", target, "hi", (e) => evs.push(e), csrf);
  expect(evs.map((e) => e.t)).toEqual(["delta", "reply"]);
  expect(form()).toEqual({ board: "ops", task: "t1", message: "hi", csrf: "tok" });
  expect((calls[0].init?.headers as Record<string, string>)["X-KT-CSRF"]).toBe("tok");
  expect(calls[0].init?.method).toBe("POST");
});

test("runTurn throws when the stream ends without reply or error", async () => {
  handler = () => sse([frame({ t: "end" })]);
  await expect(runTurn("/chat/turn", target, "x", () => {}, csrf)).rejects.toThrow("stream ended early");
});

test("runTurn throws ChatHttpError with the server text on non-OK", async () => {
  handler = () => json({ text: "Too long.", error: "too_long" }, 413);
  const err = await runTurn("/chat/turn", target, "x", () => {}, csrf).catch((e: unknown) => e);
  expect(err).toBeInstanceOf(ChatHttpError);
  expect(err).toMatchObject({ status: 413, message: "Too long.", code: "too_long" });
});

test("CSRF: retries exactly once with a refreshed token on 403 {error:'csrf'}", async () => {
  handler = () => json({ error: "csrf" }, 403);
  expect(await startOver("/chat/new", target, csrf)).toBe(false);
  expect(csrf.mock.calls.map((a) => a[0])).toEqual([false, true]);
  expect(calls).toHaveLength(2);
});

test("CSRF: object-form error code also retries; other 403s do not", async () => {
  handler = (n) => (n === 1 ? json({ error: { code: "csrf" } }, 403) : json({}));
  expect(await startOver("/chat/new", target, csrf)).toBe(true);
  expect(calls).toHaveLength(2);
  calls = [];
  handler = () => json({ error: "forbidden" }, 403);
  expect(await startOver("/chat/new", target, csrf)).toBe(false);
  expect(calls).toHaveLength(1);
});

test("sendApproval posts the approval fields with CSRF", async () => {
  const ok = await sendApproval("/chat/approval", target, { run_id: "r", request_id: "q", execution_generation: 7 }, "once", csrf);
  expect(ok).toBe(true);
  expect(form()).toMatchObject({ run_id: "r", request_id: "q", execution_generation: "7", choice: "once", csrf: "tok", board: "ops", task: "t1" });
});

test("fetchHistoryPage GETs target + cursor and maps has_more", async () => {
  const m = { id: "1", role: "user", text: "hi", html: "" };
  handler = () => json({ messages: [m], cursor: "c2", has_more: true });
  const page = await fetchHistoryPage("/chat/messages", target, "c1 &x", csrf);
  expect(page).toEqual({ messages: [m], cursor: "c2", hasMore: true });
  const u = new URL(calls[0].url, "http://h");
  expect(u.pathname).toBe("/chat/messages");
  expect(Object.fromEntries(u.searchParams)).toEqual({ board: "ops", task: "t1", cursor: "c1 &x" });
  expect(calls[0].init?.method).toBe("GET");
  expect(calls[0].init?.body).toBeUndefined();
});

test("fetchHistoryPage appends to a URL that already has a query; works without csrf", async () => {
  handler = () => json({ messages: [], cursor: null, has_more: false });
  expect(await fetchHistoryPage("/m?x=1", target, "c")).toEqual({ messages: [], cursor: null, hasMore: false });
  expect(calls[0].url).toBe("/m?x=1&board=ops&task=t1&cursor=c");
  expect((calls[0].init?.headers as Record<string, string>)["X-KT-CSRF"]).toBeUndefined();
});

test("fetchHistoryPage: 400 bad_cursor throws ChatHttpError", async () => {
  handler = () => json({ error: "bad_cursor" }, 400);
  await expect(fetchHistoryPage("/m", target, "zz", csrf)).rejects.toMatchObject({ status: 400, code: "bad_cursor" });
});

test("fetchHistoryPage passes the abort signal", async () => {
  const ctl = new AbortController();
  handler = () => json({ messages: [], cursor: null, has_more: false });
  await fetchHistoryPage("/m", target, "c", undefined, ctl.signal);
  expect(calls[0].init?.signal).toBe(ctl.signal);
});
