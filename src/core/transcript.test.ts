import { describe, expect, it } from "vitest";
import { maxSeq, mergeTranscript, TRANSCRIPT_CONTRACT, type TranscriptMessage } from "./transcript";
import type { HermesMessage } from "./types";

const m = (id: string, seq: number, text = ""): TranscriptMessage =>
  ({
    id, seq, text, html: "", role: "assistant", created: 1, source: "devx_lane", attempt: "lane:a:1", session: "a",
  }) as TranscriptMessage;
const ids = (l: TranscriptMessage[]) => l.map((x) => x.id);

describe("mergeTranscript", () => {
  it("appends new ids in incoming order", () => {
    expect(ids(mergeTranscript([m("a", 1)], [m("b", 2), m("c", 3)], "append"))).toEqual(["a", "b", "c"]);
  });
  it("prepends new ids keeping their order", () => {
    expect(ids(mergeTranscript([m("c", 3)], [m("a", 1), m("b", 2)], "prepend"))).toEqual(["a", "b", "c"]);
  });
  it("upserts in place", () => {
    const r = mergeTranscript([m("a", 1), m("b", 2)], [m("a", 3, "new"), m("c", 4)], "append");
    expect(ids(r)).toEqual(["a", "b", "c"]);
    expect(r[0].text).toBe("new");
  });
  it("ignores a stale lower seq on append", () => {
    const r = mergeTranscript([m("a", 5, "keep")], [m("a", 3, "old")], "append");
    expect(r[0].text).toBe("keep");
  });
  it("dedupes inside incoming, last copy at first position", () => {
    const inc = [m("a", 1, "x"), m("b", 2), m("a", 3, "y")];
    const r = mergeTranscript([], inc, "append");
    expect(ids(r)).toEqual(["a", "b"]);
    expect(r[0].text).toBe("y");
    expect(ids(mergeTranscript([], inc, "prepend"))).toEqual(["a", "b"]);
  });
  it("drops entries without a string id", () => {
    const bad = { ...m("x", 1), id: 5 } as unknown as TranscriptMessage;
    expect(ids(mergeTranscript([], [bad, m("a", 1)], "append"))).toEqual(["a"]);
  });
  it("does not mutate inputs", () => {
    const held = [m("a", 1)];
    const inc = [m("a", 2, "z"), m("b", 3)];
    const hs = JSON.stringify(held);
    const is = JSON.stringify(inc);
    const r = mergeTranscript(held, inc, "append");
    expect(r).not.toBe(held);
    expect(JSON.stringify(held)).toBe(hs);
    expect(JSON.stringify(inc)).toBe(is);
  });
});

describe("maxSeq", () => {
  it("returns the highest seq or null", () => {
    expect(maxSeq([])).toBeNull();
    expect(maxSeq([m("a", 2), m("b", 9), m("c", 4)])).toBe(9);
  });
});

describe("system rows", () => {
  it("upsert by id like any message", () => {
    const d = { ...m("d1", 1), role: "system" as const, kind: "divider" as const, text: "Round 1" };
    const out = mergeTranscript([m("a", 0), d], [{ ...d, text: "Round 2", seq: 5 }], "append");
    expect(out.map((x) => x.id)).toEqual(["a", "d1"]);
    expect(out[1].text).toBe("Round 2");
    expect(maxSeq(out)).toBe(5);
  });
});

describe("types", () => {
  it("TranscriptMessage is assignable to HermesMessage", () => {
    const t: HermesMessage = m("a", 1);
    expect(t.id).toBe("a");
    expect(TRANSCRIPT_CONTRACT).toBe("hermes-transcript/1");
  });
});
