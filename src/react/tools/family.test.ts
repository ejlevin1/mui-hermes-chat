import { ToolFamily, clipMiddle } from "./family";

test("resolve", () => {
  expect(ToolFamily.resolve("terminal")).toBe("terminal");
  expect(ToolFamily.resolve("Browser_click")).toBe("browser");
  expect(ToolFamily.resolve("mcp__srv__do")).toBe("mcp");
  expect(ToolFamily.resolve("write_file")).toBe("fileWrite");
  expect(ToolFamily.resolve("web_extract")).toBe("search");
  expect(ToolFamily.resolve("constructor")).toBe("generic");
  expect(ToolFamily.resolve("nope")).toBe("generic");
});

test("label and icon", () => {
  expect(ToolFamily.label("delegate_task")).toBe("Sub-agent");
  expect(ToolFamily.icon("read_file")).toBe("fileRead");
  expect(ToolFamily.icon("zzz")).toBe("generic");
});

test("argsLine picks per family", () => {
  expect(ToolFamily.argsLine("terminal", { command: "ls -la" })).toBe("ls -la");
  expect(ToolFamily.argsLine("execute_code", { code: "print(1)" })).toBe("print(1)");
  expect(ToolFamily.argsLine("read_file", { path: "/a/b" })).toBe("/a/b");
  expect(ToolFamily.argsLine("web_search", { query: "cats" })).toBe('"cats"');
  expect(ToolFamily.argsLine("web_extract", { urls: ["https://x"] })).toBe("https://x");
  expect(ToolFamily.argsLine("browser_navigate", { url: "https://y" })).toBe("https://y");
  expect(ToolFamily.argsLine("delegate_task", { goal: "do it" })).toBe("do it");
  expect(ToolFamily.argsLine("clarify", { question: "why?" })).toBe("why?");
});

test("argsLine falls back to context then first scalar", () => {
  expect(ToolFamily.argsLine("memory", { action: "add" }, "saved note")).toBe("saved note");
  expect(ToolFamily.argsLine("memory", { zeta: 1, alpha: "x" })).toBe("x");
  expect(ToolFamily.argsLine("memory", { big: "y".repeat(200), n: 3 })).toBe("3");
  expect(ToolFamily.argsLine("memory", {})).toBeUndefined();
  expect(ToolFamily.argsLine("terminal", { command: "  " }, "  ")).toBeUndefined();
});

test("argsLine uses first line only and middle ellipsis at 120", () => {
  expect(ToolFamily.argsLine("terminal", { command: "a\nb" })).toBe("a");
  const out = ToolFamily.argsLine("terminal", { command: "x".repeat(60) + "MID" + "y".repeat(200) })!;
  expect(Array.from(out)).toHaveLength(120);
  expect(out.startsWith("xxx")).toBe(true);
  expect(out.endsWith("yyy")).toBe(true);
  expect(out).toContain("…");
  expect(clipMiddle("short")).toBe("short");
});
