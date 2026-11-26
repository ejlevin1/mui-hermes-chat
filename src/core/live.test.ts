import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { liveSource } from "./live";
import { ChatHttpError } from "./transport";
import type { TranscriptMessage, TranscriptStatus } from "./transcript";

class FakeES {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;
  static all: FakeES[] = [];
  readyState = 0;
  closed = false;
  listeners: Record<string, ((e: unknown) => void)[]> = {};
  constructor(public url: string) {
    FakeES.all.push(this);
  }
  addEventListener(t: string, f: (e: unknown) => void) {
    (this.listeners[t] ??= []).push(f);
  }
  close() {
    this.closed = true;
    this.readyState = 2;
  }
  emit(type: string, data?: string, lastEventId = "") {
    for (const f of this.listeners[type] ?? []) f({ type, data, lastEventId });
  }
  open() {
    this.readyState = 1;
    this.emit("open");
  }
  fail(closed: boolean) {
    this.readyState = closed ? 2 : 0;
    this.emit("error");
  }
}

const ES = FakeES as unknown as typeof EventSource;
const msg = (id: string, seq: number) => ({ id, seq, role: "assistant", text: "", html: "" }) as unknown as TranscriptMessage;
const last = () => FakeES.all[FakeES.all.length - 1]!;

function setup(extra: Record<string, unknown> = {}) {
  const messages: TranscriptMessage[] = [];
  const statuses: TranscriptStatus[] = [];
  const feed = liveSource({ url: "/s", EventSource: ES, ...extra });
  return { messages, statuses, feed, on: { message: (m: TranscriptMessage) => messages.push(m), status: (s: TranscriptStatus) => statuses.push(s) } };
}

beforeEach(() => {
  vi.useFakeTimers();
  FakeES.all = [];
});
afterEach(() => vi.useRealTimers());

describe("page", () => {
  const res = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response;
  it("builds URLs with and without existing query, params, before", async () => {
    const f = vi.fn().mockResolvedValue(res(200, { messages: [msg("a", 1), { id: 2 }, null], cursor: "c1", has_more: true }));
    const feed = liveSource({ url: "/s", messagesUrl: "/m", params: { t: "x y" }, fetch: f as unknown as typeof fetch });
    const p = await feed.page(null);
    expect(f.mock.calls[0]![0]).toBe("/m?t=x+y");
    expect(f.mock.calls[0]![1]).toMatchObject({ credentials: "same-origin", headers: { Accept: "application/json" } });
    expect(p).toEqual({ messages: [msg("a", 1)], cursor: "c1", hasMore: true });
    await liveSource({ url: "/s", messagesUrl: "/m?k=1", fetch: f as unknown as typeof fetch }).page("c 1");
    expect(f.mock.calls[1]![0]).toBe("/m?k=1&before=c+1");
  });
  it("tolerates bad bodies and has_more without cursor", async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => { throw new Error("x"); } });
    const feed = liveSource({ url: "/s", messagesUrl: "/m", fetch: f as unknown as typeof fetch });
    expect(await feed.page(null)).toEqual({ messages: [], cursor: null, hasMore: false });
    f.mockResolvedValue(res(200, { messages: [], cursor: null, has_more: true }));
    expect((await feed.page(null)).hasMore).toBe(false);
  });
  it("throws ChatHttpError with code", async () => {
    const f = vi.fn().mockResolvedValue(res(400, { error: "bad_cursor" }));
    const feed = liveSource({ url: "/s", messagesUrl: "/m", fetch: f as unknown as typeof fetch });
    await expect(feed.page("z")).rejects.toMatchObject({ status: 400, code: "bad_cursor" });
    await expect(feed.page("z")).rejects.toBeInstanceOf(ChatHttpError);
  });
  it("without messagesUrl makes no request", async () => {
    const f = vi.fn();
    expect(await liveSource({ url: "/s", fetch: f as unknown as typeof fetch }).page(null)).toEqual({ messages: [], cursor: null, hasMore: false });
    expect(f).not.toHaveBeenCalled();
  });
});

describe("follow", () => {
  it("connecting -> live, messages in order, bad frames skipped", () => {
    const { on, messages, statuses, feed } = setup();
    feed.follow(null, on);
    expect(last().url).toBe("/s");
    last().open();
    last().emit("message", JSON.stringify(msg("a", 1)));
    last().emit("message", "not json");
    last().emit("message", JSON.stringify({ id: "x" }));
    last().emit("message", JSON.stringify(msg("b", 2)));
    expect(statuses.map((s) => s.state)).toEqual(["connecting", "live"]);
    expect(messages.map((m) => m.id)).toEqual(["a", "b"]);
  });
  it("uses after and existing query; server status suppresses live", () => {
    const { on, statuses, feed } = setup({ url: "/s?k=1" });
    feed.follow(7, on);
    expect(last().url).toBe("/s?k=1&after=7");
    last().emit("status", '{"state":"live"}');
    last().open();
    expect(statuses.map((s) => s.state)).toEqual(["connecting", "live"]);
  });
  it("status ended + end closes and never reconnects", () => {
    const { on, statuses, feed } = setup();
    feed.follow(null, on);
    last().open();
    last().emit("status", '{"state":"ended","ended_at":5,"end_reason":"done"}');
    last().emit("end", "{}");
    expect(last().closed).toBe(true);
    last().fail(true);
    vi.advanceTimersByTime(60000);
    expect(FakeES.all).toHaveLength(1);
    expect(statuses.at(-1)).toEqual({ state: "ended", ended_at: 5, end_reason: "done" });
  });
  it("CLOSED error reopens with after=max seq after 1s, 2s; reset after open", () => {
    const { on, statuses, feed } = setup();
    feed.follow(3, on);
    last().open();
    last().emit("message", JSON.stringify(msg("a", 9)));
    last().fail(true);
    expect(statuses.at(-1)?.state).toBe("reconnecting");
    vi.advanceTimersByTime(999);
    expect(FakeES.all).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(last().url).toBe("/s?after=9");
    last().fail(true);
    vi.advanceTimersByTime(1999);
    expect(FakeES.all).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(FakeES.all).toHaveLength(3);
    last().open();
    last().fail(true);
    vi.advanceTimersByTime(1000);
    expect(FakeES.all).toHaveLength(4);
  });
  it("CONNECTING error leaves reconnect to the browser, reports once", () => {
    const { on, statuses, feed } = setup();
    feed.follow(null, on);
    last().fail(false);
    last().fail(false);
    vi.advanceTimersByTime(60000);
    expect(FakeES.all).toHaveLength(1);
    expect(statuses.filter((s) => s.state === "reconnecting")).toHaveLength(1);
  });
  it("stop silences callbacks and pending reconnects", () => {
    const { on, messages, statuses, feed } = setup();
    const stop = feed.follow(null, on);
    const first = last();
    first.fail(true);
    stop();
    vi.advanceTimersByTime(60000);
    expect(FakeES.all).toHaveLength(1);
    first.emit("message", JSON.stringify(msg("a", 1)));
    first.open();
    expect(messages).toEqual([]);
    expect(statuses.map((s) => s.state)).toEqual(["connecting", "reconnecting"]);
  });
  it("8 failures -> error status, keeps retrying every 15s", () => {
    const { on, statuses, feed } = setup();
    feed.follow(null, on);
    for (const d of [1000, 2000, 4000, 8000, 15000, 15000, 15000]) {
      last().fail(true);
      vi.advanceTimersByTime(d);
    }
    expect(statuses.some((s) => s.state === "error")).toBe(false);
    last().fail(true);
    expect(statuses.at(-1)?.state).toBe("error");
    vi.advanceTimersByTime(15000);
    expect(FakeES.all).toHaveLength(9);
  });
  it("reports error without EventSource", () => {
    vi.stubGlobal("EventSource", undefined);
    try {
      const statuses: TranscriptStatus[] = [];
      const stop = liveSource({ url: "/s" }).follow(null, { message() {}, status: (s) => statuses.push(s) });
      stop();
      expect(statuses).toEqual([{ state: "error", error: "EventSource unavailable" }]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
