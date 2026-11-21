/** Jump-to-latest renders inside the composer area (above the composer), not over the message list. */
import { createEchoAdapter } from "@mui/x-chat";
import { ChatProvider } from "@mui/x-chat-headless";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { JumpButton, JumpToLatest } from "./JumpToLatest";
import { composerSlots } from "./slots";

vi.mock("@mui/x-chat-headless", async (orig) => ({
  ...(await orig<object>()),
  useMessageListContext: () => ({ isAtBottom: false, unseenMessageCount: 2, scrollToBottom: () => {} }),
}));

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
  test("composerSlots: Jump renders inside the composer area (first child), not in the list", async () => {
    const { slots } = composerSlots();
    const Root = slots.composerRoot;
    const Jump = slots.scrollToBottom;
    render(<ChatProvider adapter={createEchoAdapter({ delayMs: 0 })}><div data-testid="list"><Jump /></div><Root /></ChatProvider>);
    await act(async () => {});
    const area = screen.getByTestId("composer-area");
    const jump = within(area).getByTestId("jump-to-latest");
    expect(area.firstElementChild).toBe(jump);
    expect(within(screen.getByTestId("list")).queryByTestId("jump-to-latest")).toBeNull();
  });
  test("public JumpToLatest stays self-contained: renders the button from list context", () => {
    render(<JumpToLatest labels={{ newMessages: "2 new" }} />);
    expect(screen.getByTestId("jump-to-latest")).toBeTruthy();
    expect(screen.getByText("2 new")).toBeTruthy();
  });
});
