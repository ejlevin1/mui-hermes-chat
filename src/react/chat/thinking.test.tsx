/** ThinkingPart: capped inner-scroll viewport, no automatic height change, user-only toggles. */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThinkingPart } from "./ThinkingPart";
import { hermesPartRenderers } from "./parts";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("ThinkingPart", () => {
  it("keeps the same body node and style when streaming ends", () => {
    vi.useFakeTimers();
    const { rerender } = render(<ThinkingPart text="hmm" state="streaming" />);
    const body = screen.getByTestId("thinking-body");
    const cls = body.getAttribute("class");
    expect(screen.getByRole("button").textContent).toContain("Thinking");
    act(() => { vi.advanceTimersByTime(12000); });
    rerender(<ThinkingPart text="hmm done" state="done" />);
    expect(screen.getByTestId("thinking-body")).toBe(body);
    expect(body.getAttribute("class")).toBe(cls);
    expect(getComputedStyle(body).maxHeight).toBe("calc(9em)");
    expect(screen.getByRole("button").textContent).toContain("Thought for 12 s");
    expect(screen.getByRole("button").getAttribute("aria-expanded")).toBe("true");
  });

  it("caps height, header collapses, Show all removes the cap", () => {
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(500);
    render(<ThinkingPart text={"x\n".repeat(30)} state="streaming" />);
    const body = screen.getByTestId("thinking-body");
    expect(getComputedStyle(body).overflowY).toBe("auto");
    fireEvent.click(screen.getByText("Show all"));
    expect(getComputedStyle(body).maxHeight).toBe("none");
    expect(screen.getByText("Show less")).toBeTruthy();
    const header = screen.getByRole("button", { name: /Thinking/ });
    fireEvent.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(header.getAttribute("aria-controls")).toBe(body.parentElement!.id);
    fireEvent.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("true");
  });

  it("renders history (done at mount) collapsed", () => {
    render(<ThinkingPart text="old" state="done" />);
    const header = screen.getByRole("button", { name: "Thoughts" });
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByTestId("thinking-body").parentElement!.hidden).toBe(true);
  });

  it("is the reasoning part renderer, not x-chat's <details>", () => {
    const r = hermesPartRenderers({ decide: async () => true, renderHtml: () => null });
    const Reasoning = r.reasoning as unknown as (p: unknown) => ReactElement;
    const { container } = render(Reasoning({ part: { type: "reasoning", text: "t", state: "done" }, message: { parts: [] } }));
    expect(container.querySelector("details")).toBeNull();
    expect(screen.getByTestId("thinking")).toBeTruthy();
  });
});
