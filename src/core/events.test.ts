import { CHAT_EVENTS_CONTRACT, parseChatEvents, type ChatEvent } from "./events";

const frame = (o: object) => "data: " + JSON.stringify(o) + "\n\n";
const ALL: ChatEvent[] = [
  { t: "run", run_id: "r1" },
  { t: "delta", text: "He" },
  { t: "thinking", text: "hmm" },
  { t: "tool", name: "kanban_show", state: "start" },
  { t: "tool", name: "kanban_show", state: "done" },
  { t: "approval", run_id: "r1", request_id: "q1", execution_generation: 3, title: "T", text: "X", expires_s: 60 },
  { t: "reply", text: "Hello", html: "<p>Hello</p>" },
  { t: "error", code: "x", text: "bad" },
  { t: "end" },
];
const V2: ChatEvent[] = [
  { t: "commentary", text: "Checking the board…" },
  { t: "tool", name: "terminal", state: "start", id: "call_1", preview: "ls -la", args: { command: "ls -la", nested: { a: [1, 2] } } },
  { t: "tool", name: "terminal", state: "done", id: "call_1", duration_s: 1.25, result_preview: "total 0" },
  { t: "tool", name: "read_file", state: "start", id: "read_file#1", args_clipped: true },
  { t: "tool", name: "read_file", state: "failed", id: "read_file#1", duration_s: 0.1 },
];

function collect(chunks: string[]): ChatEvent[] {
  const out: ChatEvent[] = [];
  const p = parseChatEvents((e) => out.push(e));
  chunks.forEach((c) => p.push(c));
  p.end();
  return out;
}
const splits = (text: string, n: number) => {
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += n) parts.push(text.slice(i, i + n));
  return parts;
};

test("contract id is v2", () => {
  expect(CHAT_EVENTS_CONTRACT).toBe("hermes-chat-events/2");
});

test("parses every v1 event type", () => {
  expect(collect([ALL.map(frame).join("")])).toEqual(ALL);
});

test("parses v2 tool fields and commentary", () => {
  expect(collect([V2.map(frame).join("")])).toEqual(V2);
});

test("is split-proof: every 1..7 char split gives the same events (v1+v2)", () => {
  const evs = [...ALL.slice(0, -1), ...V2, { t: "end" } as ChatEvent];
  const text = evs.map(frame).join("");
  for (let n = 1; n <= 7; n++) expect(collect(splits(text, n))).toEqual(evs);
});

test("splits inside the blank line, CRLF, and multi-byte text", () => {
  const f = "data: " + JSON.stringify({ t: "delta", text: "héllo 🌍" }) + "\r\n\r\n";
  for (let i = 1; i < f.length; i++) {
    expect(collect([f.slice(0, i), f.slice(i)])).toEqual([{ t: "delta", text: "héllo 🌍" }]);
  }
});

test("CRLF stream with event: lines, any split", () => {
  const text = "event: commentary\r\ndata: {\"text\":\"a\"}\r\n\r\nevent: end\r\ndata: {}\r\n\r\n";
  for (let n = 1; n <= 5; n++) expect(collect(splits(text, n))).toEqual([{ t: "commentary", text: "a" }, { t: "end" }]);
});

test("takes the type from the event: line when data has no t; comments and junk are ignored", () => {
  const out = collect([": ping\n\n", "event: delta\ndata: {\"text\":\"a\"}\n\n", "data: not json\n\n", "data: 5\n\n", "data: [1]\n\n", "data: {}\n\n"]);
  expect(out).toEqual([{ t: "delta", text: "a" }]);
});

test("multi-line data joins with newlines", () => {
  expect(collect(["data: {\"t\":\"delta\",\ndata: \"text\":\"x\"}\n\n"])).toEqual([{ t: "delta", text: "x" }]);
});

test("unknown fields and frames pass through for the consumer to ignore", () => {
  const out = collect([frame({ t: "tool", name: "x", state: "start", future: 1 }), frame({ t: "newframe", z: 2 })]);
  expect(out).toEqual([{ t: "tool", name: "x", state: "start", future: 1 }, { t: "newframe", z: 2 }]);
});

test("flushes a final frame without a blank line on end()", () => {
  expect(collect(["data: {\"t\":\"end\"}"])).toEqual([{ t: "end" }]);
});

// Layer boundary (AGENTS.md): src/core is pure TS.
const IMPORTS_UI = /\b(?:from|import)\s*\(?\s*["'](?:react|react-dom|@mui|@emotion)(?:\/[^"']*)?["']/;

test("boundary regex catches UI imports", () => {
  expect(IMPORTS_UI.test('import x from "react";')).toBe(true);
  expect(IMPORTS_UI.test("import type { X } from '@mui/x-chat/headless';")).toBe(true);
  expect(IMPORTS_UI.test('import "react";')).toBe(true);
  expect(IMPORTS_UI.test('await import("@mui/material")')).toBe(true);
  expect(IMPORTS_UI.test('import { a } from "./reactions";')).toBe(false);
  expect(IMPORTS_UI.test('import { a } from "react-markdown";')).toBe(false);
});

declare global {
  interface ImportMeta {
    glob(patterns: string[], opts: { query: string; import: string; eager: true }): Record<string, unknown>;
  }
}

test("src/core (non-test sources) imports neither react nor @mui", () => {
  const srcs = import.meta.glob(["./**/*.{ts,tsx}", "!./**/*.test.{ts,tsx}"], { query: "?raw", import: "default", eager: true }) as Record<string, string>;
  expect(Object.keys(srcs).length).toBeGreaterThanOrEqual(5);
  expect(Object.keys(srcs).filter((p) => IMPORTS_UI.test(srcs[p]))).toEqual([]);
});

test("keepalive-only gaps between frames (comment lines, any split) parse fine", () => {
  const stream = ": keepalive\n\n" + frame({ t: "delta", text: "a" }) + ":ka\n\n: ka\r\n\r\n" + frame({ t: "reply", text: "a", html: "<p>a</p>" }) + ": keepalive\n\n";
  for (let n = 1; n <= 7; n++) {
    const got: ChatEvent[] = [];
    const p = parseChatEvents((e) => got.push(e));
    for (let i = 0; i < stream.length; i += n) p.push(stream.slice(i, i + n));
    p.end();
    expect(got.map((e) => e.t)).toEqual(["delta", "reply"]);
  }
});
