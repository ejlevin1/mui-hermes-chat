import { fireEvent, render, screen, cleanup, act } from "@testing-library/react";
import type { HermesToolCall } from "../../core/types";
import { ToolRow } from "./ToolRow";
import { ToolStepGroup } from "./ToolStepGroup";
import { ToolDetailDrawer } from "./ToolDetailDrawer";
import { JsonTree } from "./JsonTree";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

const c = (o: Partial<HermesToolCall> = {}): HermesToolCall => ({ id: "1", name: "terminal", state: "done", ...o });

test("done row: name, args, duration, opens detail", () => {
  const onOpen = vi.fn();
  render(<ToolRow call={c({ args: { command: "ls -la" }, duration_s: 0.4 })} onOpen={onOpen} />);
  expect(screen.getByText("terminal")).toBeTruthy();
  expect(screen.getByText("ls -la")).toBeTruthy();
  expect(screen.getByText("0.4 s")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Tool terminal, done in 0.4 seconds, ls -la" }));
  expect(onOpen).toHaveBeenCalledOnce();
});

test("failed row shows Failed", () => {
  render(<ToolRow call={c({ state: "failed", duration_s: 12 })} />);
  expect(screen.getByText("Failed")).toBeTruthy();
  expect(screen.getByText("12 s")).toBeTruthy();
});

test("running row ticks elapsed seconds", () => {
  vi.useFakeTimers();
  render(<ToolRow call={c({ state: "start" })} running />);
  expect(screen.getByTestId("tool-elapsed").textContent).toBe("0 s");
  act(() => { vi.advanceTimersByTime(3000); });
  expect(screen.getByTestId("tool-elapsed").textContent).toBe("3 s");
  expect(screen.getByRole("progressbar")).toBeTruthy();
});

test("chevron toggles inline preview only when there is one", () => {
  const { unmount } = render(<ToolRow call={c({ args: { command: "ls" }, result_preview: "out" })} />);
  expect(screen.queryByTestId("tool-preview-generic")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Show preview" }));
  expect(screen.getByTestId("tool-preview-generic")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Hide preview" }));
  expect(screen.queryByTestId("tool-preview-generic")).toBeNull();
  unmount();
  render(<ToolRow call={c({ name: "x" })} />);
  expect(screen.queryByRole("button", { name: "Show preview" })).toBeNull();
});

test("diff preview shows gutter symbols as text", () => {
  render(<ToolRow call={c({ name: "patch", args: { inline_diff: "@@ -1 +1 @@\n-a\n+b" } })} />);
  fireEvent.click(screen.getByRole("button", { name: "Show preview" }));
  const d = screen.getByTestId("tool-preview-diff").textContent!;
  expect(d).toContain("− a");
  expect(d).toContain("+ b");
});

test("single call renders the Steps card with one row", () => {
  render(<ToolStepGroup calls={[c()]} />);
  expect(screen.getByTestId("tool-step-group")).toBeTruthy();
  expect(screen.getByText("Steps")).toBeTruthy();
  expect(screen.getAllByTestId("tool-row")).toHaveLength(1);
});

const many = [c({ id: "1", duration_s: 5 }), c({ id: "2", state: "failed", duration_s: 7 }), c({ id: "3", duration_s: 0 })];

test("finished card: summary with failed count, all rows shown, no group toggle", () => {
  render(<ToolStepGroup calls={many} />);
  expect(screen.getByText("3 steps · 12 s")).toBeTruthy();
  expect(screen.getByText("1 failed")).toBeTruthy();
  expect(screen.getAllByTestId("tool-row")).toHaveLength(3);
  expect(screen.getByTestId("tool-step-group").querySelector("[aria-expanded]")).toBeNull();
});

test("running -> done keeps every row mounted (same nodes); new call appends", () => {
  const live = [c({ id: "1", duration_s: 1 }), c({ id: "2", state: "start" })];
  const { rerender } = render(<ToolStepGroup calls={live} running />);
  expect(screen.getByText("1 done · 1 running")).toBeTruthy();
  const before = screen.getAllByTestId("tool-row");
  expect(before).toHaveLength(2);
  rerender(<ToolStepGroup calls={[...live, c({ id: "3", state: "start" })]} running />);
  const grown = screen.getAllByTestId("tool-row");
  expect(grown).toHaveLength(3);
  expect(grown[0]).toBe(before[0]);
  expect(grown[1]).toBe(before[1]);
  const finished = [c({ id: "1", duration_s: 1 }), c({ id: "2", duration_s: 2 }), c({ id: "3", duration_s: 3 })];
  rerender(<ToolStepGroup calls={finished} running={false} />);
  const after = screen.getAllByTestId("tool-row");
  expect(after).toHaveLength(3);
  after.forEach((n, i) => expect(n).toBe(grown[i]));
  expect(screen.getByText("3 steps · 6.0 s")).toBeTruthy();
});

test("row click opens detail; chevron preview is per row", () => {
  const onOpen = vi.fn();
  const calls = [c({ id: "1", args: { command: "ls" }, result_preview: "out" }), c({ id: "2", name: "x" })];
  render(<ToolStepGroup calls={calls} onOpen={onOpen} />);
  fireEvent.click(screen.getAllByRole("button", { name: /Tool terminal/ })[0]!);
  expect(onOpen).toHaveBeenCalledWith(calls[0]);
  expect(screen.getAllByRole("button", { name: "Show preview" })).toHaveLength(1);
});

test("drawer: tabs request/response, args tree, clipped note, copy", () => {
  const writeText = vi.fn(() => Promise.resolve());
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  const call = c({ args: { command: "ls", nested: { a: "<b>x</b>" } }, args_clipped: true, result_preview: "file1" });
  render(<ToolDetailDrawer call={call} open onClose={() => {}} />);
  expect(screen.getByText("Terminal · Done")).toBeTruthy();
  expect(screen.getByText("Arguments were clipped by the server.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Copy" }));
  expect(writeText).toHaveBeenCalledWith(JSON.stringify(call.args, null, 2));
  fireEvent.click(screen.getByRole("tab", { name: "Response" }));
  expect(screen.getByText("file1")).toBeTruthy();
  expect(screen.queryByText("Arguments were clipped by the server.")).toBeNull();
});

test("drawer closed renders nothing; close button calls onClose", () => {
  const onClose = vi.fn();
  const { rerender } = render(<ToolDetailDrawer call={c()} open={false} onClose={onClose} />);
  expect(screen.queryByRole("tab")).toBeNull();
  rerender(<ToolDetailDrawer call={c()} open onClose={onClose} />);
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(onClose).toHaveBeenCalled();
});

test("drawer empty response", () => {
  render(<ToolDetailDrawer call={c()} open onClose={() => {}} />);
  expect(screen.getByText("No arguments.")).toBeTruthy();
  fireEvent.click(screen.getByRole("tab", { name: "Response" }));
  expect(screen.getByText("No response yet.")).toBeTruthy();
});

test("json tree shows strings as text, never HTML, and collapses", () => {
  const { container } = render(<JsonTree value={{ s: "<b>bold</b>", deep: { x: { y: 1 } } }} />);
  expect(screen.getByText('"<b>bold</b>"')).toBeTruthy();
  expect(container.querySelector("b")).toBeNull();
  expect(screen.queryByText("x: ")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "deep {1}" }));
  expect(screen.getByRole("button", { name: "x {1}" })).toBeTruthy();
});
