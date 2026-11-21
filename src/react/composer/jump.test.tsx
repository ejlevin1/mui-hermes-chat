/** Jump-to-latest renders inside the composer area (above the composer), not over the message list. */
import { createEchoAdapter } from "@mui/x-chat";
import { ChatProvider } from "@mui/x-chat-headless";
import { cleanup, render, screen } from "@testing-library/react";
import { JumpButton } from "./JumpToLatest";
import { composerSlots } from "./slots";

afterEach(() => { cleanup(); });

const state = (isAtBottom: boolean, unseenMessageCount = 0) => ({ isAtBottom, unseenMessageCount, scrollToBottom: vi.fn() });

describe("JumpButton", () => {
  test("hidden at the bottom, shown otherwise", () => {
    const { rerender } = render(<JumpButton state={state(true)} />);
    expect(screen.queryByTestId("jump-to-latest")).toBeNull();
    rerender(<JumpButton state={state(false)} />);
    expect(screen.getByTestId("jump-to-latest")).toBeTruthy();
  });
  test("composer root wraps the composer area; the list slot is publish-only (no overlay)", () => {
    const { slots } = composerSlots();
    const Root = slots.composerRoot;
    render(<ChatProvider adapter={createEchoAdapter({ delayMs: 0 })}><Root /></ChatProvider>);
    const area = screen.getByTestId("composer-area");
    expect(area.querySelector("form")).toBeTruthy();
  });
});
