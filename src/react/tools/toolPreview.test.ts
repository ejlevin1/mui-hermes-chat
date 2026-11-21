import type { HermesToolCall } from "../../core/types";
import { ToolPreview, gutter } from "./toolPreview";

const call = (o: Partial<HermesToolCall> = {}): HermesToolCall => ({ id: "1", name: "x", state: "done", ...o });
const DIFF = "--- a/f\n+++ b/f\n@@ -1,2 +1,2 @@\n keep\n-old\n+new";

test("diff with gutters", () => {
  const p = ToolPreview.resolve(call({ args: { inline_diff: DIFF } }));
  expect(p.kind).toBe("diff");
  if (p.kind !== "diff") return;
  expect(p.lines.map((l) => gutter(l.kind) + l.text)).toEqual(["@@@ -1,2 +1,2 @@", " keep", "−old", "+new"]);
});

test("diff capped at 12 lines with more count", () => {
  const body = Array.from({ length: 20 }, (_, i) => `+l${i}`).join("\n");
  const p = ToolPreview.resolve(call({ args: { inline_diff: `@@ -0,0 +1,20 @@\n${body}` } }));
  if (p.kind !== "diff") throw new Error("not diff");
  expect(p.lines).toHaveLength(12);
  expect(p.more).toBe(9);
});

test("diff strips SGR and rejects non-diffs, nulls, oversize", () => {
  expect(ToolPreview.diffPreview("\u001b[32m@@ -1 +1 @@\u001b[0m\n+a")?.kind).toBe("diff");
  expect(ToolPreview.diffPreview("hello world")).toBeNull();
  expect(ToolPreview.diffPreview("@@ -1 +1 @@\n context only")).toBeNull();
  expect(ToolPreview.diffPreview("@@\n+a\u0000")).toBeNull();
  expect(ToolPreview.diffPreview("@@\n+" + "a".repeat(256 * 1024))).toBeNull();
  expect(ToolPreview.diffPreview("a/f → b/f\n@@ -1 +1 @@\n-x\n+y")?.kind).toBe("diff");
});

test("todos capped at 12, blanks dropped", () => {
  const todos = Array.from({ length: 15 }, (_, i) => ({ id: String(i), content: `t${i}`, status: "pending" }));
  const p = ToolPreview.resolve(call({ name: "todo", args: { todos: [{ content: "  ", status: "x" }, ...todos] } }));
  if (p.kind !== "todos") throw new Error("not todos");
  expect(p.entries).toHaveLength(12);
  expect(p.more).toBe(3);
});

test("generic: ≤3 pairs sorted, limits, ≤3 result lines", () => {
  const p = ToolPreview.resolve(call({
    args: { d: 1, b: true, a: "v".repeat(100), c: "z", o: { nested: 1 }, ["k".repeat(60)]: "q" },
    result_preview: "one\n\ntwo\nthree\nfour " + "w".repeat(200),
  }));
  if (p.kind !== "generic") throw new Error("not generic");
  expect(p.pairs).toHaveLength(3);
  expect(p.pairs[0]!.key).toBe("a");
  expect(p.pairs[0]!.value).toHaveLength(80);
  expect(p.resultLines).toEqual(["one", "two", "three"]);
});

test("key clipped to 40, long result line to 160", () => {
  const p = ToolPreview.resolve(call({ args: { ["k".repeat(60)]: "q" }, result_preview: "r".repeat(300) }));
  if (p.kind !== "generic") throw new Error("not generic");
  expect(p.pairs[0]!.key).toHaveLength(40);
  expect(p.resultLines[0]).toHaveLength(160);
});

test("image, subagent group, none", () => {
  expect(ToolPreview.resolve(call({ args: { image_path: "/tmp/a/pic.png" } }))).toEqual({ kind: "image", basename: "pic.png" });
  expect(ToolPreview.resolve(call(), ["c1"])).toEqual({ kind: "subagentGroup", children: ["c1"] });
  expect(ToolPreview.resolve(call())).toEqual({ kind: "none" });
  expect(ToolPreview.resolve(undefined)).toEqual({ kind: "none" });
});
