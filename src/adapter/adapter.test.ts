import type { ChatMessage } from "@mui/x-chat/types";
import { hermesChatAdapter, NOTE_NETWORK, toChatMessages } from "./adapter";
import type { HermesMessage, HistoryPage } from "../core/types";

const enc = new TextEncoder();
const frame = (o: object) => "data: " + JSON.stringify(o) + "\n\n";
const target = { board: "ops", task: "t1" };
const csrf = vi.fn(async (_refresh?: boolean) => "tok");
const msg = { id: "m", role: "user", parts: [{ type: "text", text: "hi" }] } as unknown as ChatMessage;

let calls: { url: string; body: string; headers: Record<string, string> }[];
let handler: (n: number, url: string) => Response;
beforeEach(() => {
  calls = [];
  csrf.mockClear();
  handler = () => new Response("{}");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, body: String(init?.body), headers: init?.headers as Record<string, string> });
      return handler(calls.length, url);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

/** SSE response; `split` re-chunks the bytes every n chars to exercise the parser through the adapter. */
function sse(frames: string[], opts: { hang?: boolean; signal?: AbortSignal; split?: number } = {}): Response {
  const text = frames.join("");
  const n = opts.split ?? text.length;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      for (let i = 0; i < text.length; i += n || 1) c.enqueue(enc.encode(text.slice(i, i + (n || 1))));
      if (!opts.hang) c.close();
      opts.signal?.addEventListener("abort", () => c.error(new DOMException("aborted", "AbortError")));
    },
  });
  return new Response(body, { status: 200 });
}

type Chunk = Record<string, unknown>;
async function chunks(signal: AbortSignal = new AbortController().signal, extra: object = {}) {
  const adapter = hermesChatAdapter({ urls: { turn: "/chat/turn" }, target, csrf, ...extra });
  const stream = (await adapter.sendMessage({ message: msg, messages: [msg], signal })) as unknown as ReadableStream<Chunk>;
  const out: Chunk[] = [];
  const r = stream.getReader();
  for (;;) {
    const { value, done } = await r.read();
    if (done) return out;
    out.push(value);
  }
}
const types = (c: Chunk[]) => c.map((x) => x.type);

const V1 = [
  frame({ t: "run", run_id: "r1" }),
  frame({ t: "thinking", text: "a" }),
  frame({ t: "thinking", text: "b" }),
  frame({ t: "tool", name: "kanban_show", state: "start" }),
  frame({ t: "tool", name: "kanban_show", state: "done" }),
  frame({ t: "tool", name: "terminal", state: "start" }),
  frame({ t: "tool", name: "terminal", state: "failed" }),
  frame({ t: "delta", text: "Hel" }),
  frame({ t: "delta", text: "lo" }),
  frame({ t: "approval", run_id: "r1", request_id: "q1", execution_generation: 2, text: "ok?" }),
  frame({ t: "reply", text: "Hello", html: "<p>Hello</p>" }),
  frame({ t: "end" }),
];
const V1_TYPES = [
  "start", "reasoning-start", "reasoning-delta", "reasoning-delta",
  "tool-input-start", "tool-input-available", "tool-output-available",
  "tool-input-start", "tool-input-available", "tool-output-error",
  "reasoning-end", "text-start", "text-delta", "text-delta",
  "data-approval", "text-end", "data-reply", "finish",
];

describe("sendMessage", () => {
  test("maps every v1 event type to chunks", async () => {
    handler = () => sse(V1);
    const c = await chunks();
    expect(types(c)).toEqual(V1_TYPES);
    expect(c.filter((x) => x.type === "text-delta").map((x) => x.delta).join("")).toBe("Hello");
    const ap = c.find((x) => x.type === "data-approval")!;
    expect(ap.id).toBe("q1");
    expect(ap.data).toMatchObject({ t: "approval", run_id: "r1", request_id: "q1", execution_generation: 2, text: "ok?" });
    expect(calls[0].body).toContain("message=hi");
    expect(calls[0].body).toContain("board=ops");
    expect(calls[0].headers["X-KT-CSRF"]).toBe("tok");
    // v1 tools: one call id per name, empty input, string-free outputs
    const ins = c.filter((x) => x.type === "tool-input-available");
    expect(ins.map((x) => x.input)).toEqual([{}, {}]);
    expect(c.find((x) => x.type === "tool-output-available")!.toolCallId).toBe(ins[0].toolCallId);
    expect(c.find((x) => x.type === "tool-output-error")).toMatchObject({ toolCallId: ins[1].toolCallId, errorText: "failed" });
  });

  test("same chunks for any byte split of the stream", async () => {
    for (const split of [1, 3, 7]) {
      handler = () => sse(V1, { split });
      expect(types(await chunks())).toEqual(V1_TYPES);
    }
  });

  test("reply swap: streamed text closes, then data-reply carries text + html", async () => {
    handler = () => sse([frame({ t: "delta", text: "draft" }), frame({ t: "reply", text: "Final", html: "<p>Final</p>" })]);
    const c = await chunks();
    expect(types(c)).toEqual(["start", "text-start", "text-delta", "text-end", "data-reply", "finish"]);
    expect(c[4]).toEqual({ type: "data-reply", id: "reply", data: { text: "Final", html: "<p>Final</p>" } });
  });

  test("v2 tools: toolCallId = event id, input = args ?? {preview}, output = {result_preview, duration_s}", async () => {
    handler = () =>
      sse([
        frame({ t: "tool", name: "terminal", state: "start", id: "call_a", preview: "ls", args: { command: "ls" } }),
        frame({ t: "tool", name: "terminal", state: "start", id: "call_b", preview: "pwd" }),
        frame({ t: "tool", name: "terminal", state: "done", id: "call_b", duration_s: 0.5 }),
        frame({ t: "tool", name: "terminal", state: "done", id: "call_a", duration_s: 1.5, result_preview: "a.txt" }),
        frame({ t: "tool", name: "read_file", state: "start", id: "read_file#1", args_clipped: true }),
        frame({ t: "tool", name: "read_file", state: "failed", id: "read_file#1", result_preview: "ENOENT", duration_s: 0.1 }),
        frame({ t: "tool", name: "web", state: "done", id: "late_1", duration_s: 2 }),
        frame({ t: "reply", text: "ok", html: "<p>ok</p>" }),
      ]);
    const c = await chunks();
    const tool = c.filter((x) => String(x.type).startsWith("tool-"));
    expect(tool).toEqual([
      { type: "tool-input-start", toolCallId: "call_a", toolName: "terminal" },
      { type: "tool-input-available", toolCallId: "call_a", toolName: "terminal", input: { command: "ls" } },
      { type: "tool-input-start", toolCallId: "call_b", toolName: "terminal" },
      { type: "tool-input-available", toolCallId: "call_b", toolName: "terminal", input: { preview: "pwd" } },
      { type: "tool-output-available", toolCallId: "call_b", output: { duration_s: 0.5 } },
      { type: "tool-output-available", toolCallId: "call_a", output: { result_preview: "a.txt", duration_s: 1.5 } },
      { type: "tool-input-start", toolCallId: "read_file#1", toolName: "read_file" },
      { type: "tool-input-available", toolCallId: "read_file#1", toolName: "read_file", input: {} },
      { type: "tool-output-error", toolCallId: "read_file#1", errorText: "ENOENT" },
      // done without a start still opens the call first
      { type: "tool-input-start", toolCallId: "late_1", toolName: "web" },
      { type: "tool-input-available", toolCallId: "late_1", toolName: "web", input: {} },
      { type: "tool-output-available", toolCallId: "late_1", output: { duration_s: 2 } },
    ]);
  });

  test("commentary becomes a data-commentary part and closes open text/reasoning", async () => {
    handler = () =>
      sse([
        frame({ t: "thinking", text: "h" }),
        frame({ t: "commentary", text: "Looking…" }),
        frame({ t: "delta", text: "a" }),
        frame({ t: "commentary", text: "More" }),
        frame({ t: "reply", text: "a", html: "<p>a</p>" }),
      ]);
    const c = await chunks();
    expect(types(c)).toEqual([
      "start", "reasoning-start", "reasoning-delta", "reasoning-end", "data-commentary",
      "text-start", "text-delta", "text-end", "data-commentary", "data-reply", "finish",
    ]);
    const cm = c.filter((x) => x.type === "data-commentary");
    expect(cm.map((x) => x.data)).toEqual([{ text: "Looking…" }, { text: "More" }]);
    expect(cm[0].id).not.toBe(cm[1].id);
  });

  test("unknown frames are ignored", async () => {
    handler = () => sse([frame({ t: "future", x: 1 }), frame({ t: "reply", text: "a", html: "<p>a</p>" })]);
    expect(types(await chunks())).toEqual(["start", "data-reply", "finish"]);
  });

  test("an error event becomes a data-error part and the stream still finishes", async () => {
    handler = () => sse([frame({ t: "error", code: "hermes_restarted", text: "restarted" })]);
    const c = await chunks();
    expect(types(c)).toEqual(["start", "data-error", "finish"]);
    expect(c[1].data).toEqual({ text: "restarted", code: "hermes_restarted" });
  });

  test("a stream that dies with no reply is an error (custom network text)", async () => {
    handler = () => sse([frame({ t: "delta", text: "x" })]);
    const c = await chunks(undefined, { networkErrorText: "Lost." });
    expect(types(c)).toEqual(["start", "text-start", "text-delta", "data-error", "text-end", "finish"]);
    expect(c[3].data).toMatchObject({ text: "Lost." });
    expect(c.at(-1)).toMatchObject({ finishReason: "error" });
  });

  test("a network failure uses the default note", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    const c = await chunks();
    expect(c.find((x) => x.type === "data-error")!.data).toMatchObject({ text: NOTE_NETWORK });
  });

  test("a non-OK reply surfaces the server's text", async () => {
    handler = () => new Response(JSON.stringify({ text: "Too long." }), { status: 413 });
    const c = await chunks();
    expect(c.find((x) => x.type === "data-error")!.data).toMatchObject({ text: "Too long." });
  });

  test("abort: the signal reaches fetch, emits an abort chunk and no error", async () => {
    const ctl = new AbortController();
    handler = () => sse([frame({ t: "delta", text: "x" })], { hang: true, signal: ctl.signal });
    const p = chunks(ctl.signal);
    await vi.waitFor(() => expect(calls.length).toBe(1));
    await new Promise((r) => setTimeout(r, 10));
    ctl.abort();
    const c = await p;
    expect(types(c)).toContain("abort");
    expect(types(c)).not.toContain("data-error");
    expect(types(c)).not.toContain("finish");
  });

  test("retries once with a fresh token when the server says csrf", async () => {
    handler = (n) =>
      n === 1 ? new Response(JSON.stringify({ error: "csrf" }), { status: 403 }) : sse([frame({ t: "reply", text: "ok", html: "<p>ok</p>" })]);
    const c = await chunks();
    expect(csrf.mock.calls.map((a) => a[0])).toEqual([false, true]);
    expect(types(c)).toContain("data-reply");
  });
});

const um = (id: string, text = id): HermesMessage => ({ id, role: "user", text, html: "" });
const am = (id: string, extra: Partial<HermesMessage> = {}): HermesMessage => ({ id, role: "assistant", text: id, html: `<p>${id}</p>`, ...extra });

describe("toChatMessages", () => {
  test("user text, assistant data-tools before data-reply, created → ISO", () => {
    const tools = [{ id: "c1", name: "terminal", state: "done" as const, preview: "ls", duration_s: 1 }];
    const out = toChatMessages([um("u1", "hi"), am("a1", { tools, created: 1700000000 }), { id: "a2", role: "assistant", text: "plain", html: "" }, { id: "a3", role: "assistant", text: "", html: "", tools }]);
    expect(out[0]).toEqual({ id: "u1", role: "user", parts: [{ type: "text", text: "hi" }], status: "sent" });
    expect(out[1].parts).toEqual([
      { type: "data-tools", id: "a1-tools", data: tools },
      { type: "data-reply", id: "reply", data: { text: "a1", html: "<p>a1</p>" } },
    ]);
    expect(out[1].createdAt).toBe("2023-11-14T22:13:20.000Z");
    expect(out[2].parts).toEqual([{ type: "text", text: "plain" }]);
    expect(out[3].parts).toEqual([{ type: "data-tools", id: "a3-tools", data: tools }]);
  });
});

describe("listMessages paging", () => {
  const initialPage: HistoryPage = { messages: [um("3"), am("4")], cursor: "c1", hasMore: true };
  const adapter = (extra: object = {}) =>
    hermesChatAdapter({ urls: { turn: "/t", messages: "/chat/messages" }, target, csrf, initialPage, ...extra });

  test("initial load returns the read-model page without fetching", async () => {
    const r = await adapter().listMessages!({ conversationId: "x", direction: "backward" });
    expect(r.messages.map((m) => m.id)).toEqual(["3", "4"]);
    expect(r).toMatchObject({ cursor: "c1", hasMore: true });
    expect(calls).toHaveLength(0);
  });

  test("backward pages via the cursor, dedupes by id, stops at has_more=false", async () => {
    handler = (_n, url) => {
      const c = new URL(url, "http://h").searchParams.get("cursor");
      if (c === "c1") return new Response(JSON.stringify({ messages: [um("1"), am("2"), um("3")], cursor: "c2", has_more: true }));
      return new Response(JSON.stringify({ messages: [um("0"), am("2")], cursor: null, has_more: false }));
    };
    const a = adapter();
    await a.listMessages!({ conversationId: "x", direction: "backward" });
    const p1 = await a.listMessages!({ conversationId: "x", cursor: "c1", direction: "backward" });
    expect(p1.messages.map((m) => m.id)).toEqual(["1", "2"]);
    expect(p1).toMatchObject({ cursor: "c2", hasMore: true });
    const q = new URL(calls[0].url, "http://h").searchParams;
    expect(Object.fromEntries(q)).toEqual({ board: "ops", task: "t1", cursor: "c1" });
    const p2 = await a.listMessages!({ conversationId: "x", cursor: "c2", direction: "backward" });
    expect(p2.messages.map((m) => m.id)).toEqual(["0"]);
    expect(p2.hasMore).toBe(false);
    expect(p2.cursor).toBeUndefined();
  });

  test("no initial page → empty, hasMore false; no messages url → no fetch", async () => {
    const a = hermesChatAdapter({ urls: { turn: "/t" }, target, csrf });
    expect(await a.listMessages!({ conversationId: "x" })).toEqual({ messages: [], cursor: undefined, hasMore: false });
    expect(await a.listMessages!({ conversationId: "x", cursor: "c" })).toEqual({ messages: [], hasMore: false });
    expect(calls).toHaveLength(0);
  });

  test("hasMore without a cursor is treated as the end", async () => {
    const a = adapter({ initialPage: { messages: [], cursor: null, hasMore: true } });
    expect((await a.listMessages!({ conversationId: "x" })).hasMore).toBe(false);
  });

  test("a bad cursor rejects (x-chat surfaces a history error)", async () => {
    handler = () => new Response(JSON.stringify({ error: "bad_cursor" }), { status: 400 });
    await expect(adapter().listMessages!({ conversationId: "x", cursor: "zz" })).rejects.toMatchObject({ status: 400, code: "bad_cursor" });
  });
});
