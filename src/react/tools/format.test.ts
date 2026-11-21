import { ToolRowFormat as F } from "./format";

test("duration", () => {
  expect(F.duration(0.4)).toBe("0.4 s");
  expect(F.duration(12)).toBe("12 s");
  expect(F.duration(12.4)).toBe("12 s");
  expect(F.duration(125)).toBe("2 min 5 s");
  expect(F.duration(120)).toBe("2 min");
  expect(F.duration(-1)).toBeUndefined();
  expect(F.duration(undefined)).toBeUndefined();
  expect(F.duration(NaN)).toBeUndefined();
});

test("spokenDuration", () => {
  expect(F.spokenDuration(0.4)).toBe("0.4 seconds");
  expect(F.spokenDuration(1)).toBe("1 second");
  expect(F.spokenDuration(31)).toBe("31 seconds");
  expect(F.spokenDuration(60)).toBe("1 minute");
  expect(F.spokenDuration(125)).toBe("2 minutes 5 seconds");
  expect(F.spokenDuration(-2)).toBeUndefined();
});

test("accessibilityLabel", () => {
  expect(F.accessibilityLabel({ name: "terminal", status: "done", duration: 0.4, argsLine: "ls -la", summary: "1 file listed" }))
    .toBe("Tool terminal, done in 0.4 seconds, ls -la, 1 file listed");
  expect(F.accessibilityLabel({ name: "x", status: "running" })).toBe("Tool x, running");
  expect(F.accessibilityLabel({ name: "x", status: "failed", duration: 3 })).toBe("Tool x, failed after 3.0 seconds");
  expect(F.accessibilityLabel({ name: "x", status: "done" })).toBe("Tool x, done");
});
