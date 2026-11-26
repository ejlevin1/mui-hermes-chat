import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TranscriptFeed, TranscriptFollow, TranscriptMessage, TranscriptPage } from "../../core/transcript";
import { HermesTranscript } from "./HermesTranscript";

beforeEach(() => {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

let seq = 0;
const msg = (id: string, role: "user" | "assistant", text: string, extra: Partial<TranscriptMessage> = {}): TranscriptMessage => ({
  id, role, text, html: "", seq: ++seq, source: "devx_lane", attempt: "lane:view:1", session: "view", ...extra,
});
const participants = { user: { name: "Dispatcher" }, agent: { name: "Ada Lovelace" } };

function fake(pages: Record<string, TranscriptPage | Error>) {
  let on: TranscriptFollow | undefined;
  const stop = vi.fn();
  const page = vi.fn(async (c: string | null) => {
    const r = pages[c ?? "null"];
    if (r instanceof Error) throw r;
    return r;
  });
  const follow = vi.fn((_after: number | null, h: TranscriptFollow) => { on = h; return stop; });
  const feed: TranscriptFeed = { page, follow };
  return { feed, page, follow, stop, on: () => on! };
}
const first = (): TranscriptPage => ({
  messages: [
    msg("u1", "user", "Please fix the bug"),
    msg("a1", "assistant", "Done, see the diff.", { reasoning: "pondering hard", tools: [{ id: "t1", name: "terminal", state: "done", preview: "ls" }] }),
  ],
  cursor: "c1", hasMore: true,
});
const setup = async (f = fake({ null: first() }), props: Partial<React.ComponentProps<typeof HermesTranscript>> = {}) => {
  render(<HermesTranscript feed={f.feed} participants={participants} {...props} />);
  await screen.findByText("Done, see the diff.");
  return f;
};

describe("HermesTranscript", () => {
  it("renders the first page: names, collapsed thinking, steps rows", async () => {
    await setup();
    expect(screen.getByText("Ada Lovelace")).toBeTruthy();
    expect(screen.getByLabelText("Dispatcher:")).toBeTruthy();
    expect(screen.getByText("Please fix the bug")).toBeTruthy();
    expect(screen.getByTestId("thinking-body").parentElement!.hidden).toBe(true);
    expect(screen.getByTestId("tool-step-group")).toBeTruthy();
    expect(screen.getAllByTestId("tool-row")).toHaveLength(1);
    expect(screen.getByRole("log", { name: "Transcript" })).toBeTruthy();
  });

  it("has no composer, approval, new chat or info controls", async () => {
    await setup();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByLabelText("New chat")).toBeNull();
    expect(screen.queryByText(/approve|deny/i)).toBeNull();
    expect(screen.queryByLabelText(/info/i)).toBeNull();
  });

  it("follows after the newest seq and upserts a re-sent message into one row", async () => {
    const f = fake({ null: first() });
    await setup(f);
    expect(f.follow.mock.calls[0][0]).toBe(seq);
    act(() => f.on().message(msg("a2", "assistant", "", { tools: [{ id: "t2", name: "read_file", state: "start" }] })));
    expect(screen.getAllByTestId("tool-row")).toHaveLength(2);
    expect(screen.getAllByTestId("tool-row")[1].getAttribute("data-status")).toBe("running");
    act(() => f.on().message(msg("a2", "assistant", "All read.", { tools: [{ id: "t2", name: "read_file", state: "done" }] })));
    expect(screen.getAllByTestId("tool-row")).toHaveLength(2);
    expect(screen.getAllByTestId("tool-row")[1].getAttribute("data-status")).toBe("done");
    expect(screen.getAllByText("All read.")).toHaveLength(1);
  });

  it("status chip goes Live then Ended and onStatus gets every status", async () => {
    const onStatus = vi.fn();
    const f = await setup(undefined, { onStatus });
    act(() => f.on().status({ state: "live" }));
    expect(screen.getByTestId("transcript-status").textContent).toBe("Live");
    act(() => f.on().status({ state: "ended" }));
    expect(screen.getByTestId("transcript-status").textContent).toBe("Ended");
    expect(onStatus.mock.calls.map((c) => c[0].state)).toEqual(["connecting", "live", "ended"]);
  });

  it("Load earlier prepends with the cursor", async () => {
    const f = fake({ null: first(), c1: { messages: [{ ...msg("u0", "user", "Earlier ask"), seq: 1 }], cursor: null, hasMore: false } });
    await setup(f);
    fireEvent.click(screen.getByRole("button", { name: "Load earlier messages" }));
    await screen.findByText("Earlier ask");
    expect(f.page).toHaveBeenLastCalledWith("c1");
    const order = screen.getAllByTestId("transcript-message").map((n) => n.textContent);
    expect(order[0]).toContain("Earlier ask");
    expect(screen.getByText("Start of conversation")).toBeTruthy();
  });

  it("older page error shows Retry", async () => {
    let fail = true;
    const f = fake({ null: first(), c1: { messages: [msg("u0", "user", "Earlier ask")], cursor: null, hasMore: false } });
    const real = f.page.getMockImplementation()!;
    f.page.mockImplementation(async (c) => { if (c === "c1" && fail) throw new Error("x"); return real(c); });
    await setup(f);
    fireEvent.click(screen.getByRole("button", { name: "Load earlier messages" }));
    await screen.findByText("Could not load earlier messages.");
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("Earlier ask");
  });

  it("first page error shows Retry and an Error chip", async () => {
    const f = fake({ null: new Error("boom") });
    render(<HermesTranscript feed={f.feed} participants={participants} />);
    await screen.findByText("Could not load the transcript.");
    expect(screen.getByTestId("transcript-status").textContent).toBe("Error");
    expect(f.follow).not.toHaveBeenCalled();
  });

  it("shows emptyText when there are no messages", async () => {
    const f = fake({ null: { messages: [], cursor: null, hasMore: false } });
    render(<HermesTranscript feed={f.feed} participants={participants} emptyText="Nothing yet" />);
    await screen.findByText("Nothing yet");
  });

  it("does not follow with live={false}", async () => {
    const f = await setup(undefined, { live: false });
    expect(f.follow).not.toHaveBeenCalled();
  });

  it("stops following on unmount", async () => {
    const f = await setup();
    cleanup();
    expect(f.stop).toHaveBeenCalledTimes(1);
  });

  it("subagent group: collapsed, expands, never shown twice; orphan renders in place", async () => {
    const f = fake({
      null: {
        messages: [
          msg("a1", "assistant", "Delegating", { tools: [{ id: "t1", name: "delegate_task", state: "done" }] }),
          msg("s1", "assistant", "sub says hi", { subagent_of: "t1", session: "child" }),
          msg("s2", "assistant", "sub says bye", { subagent_of: "t1", session: "child" }),
          msg("o1", "assistant", "lost child", { subagent_of: "gone" }),
        ],
        cursor: null, hasMore: false,
      },
    });
    render(<HermesTranscript feed={f.feed} participants={participants} />);
    await screen.findByText("Delegating");
    const groups = screen.getAllByTestId("subagent-group");
    expect(groups).toHaveLength(2);
    const row = screen.getAllByTestId("tool-row")[0].parentElement!;
    expect(within(row).getByTestId("subagent-group")).toBe(groups[0]);
    expect(screen.queryByText("sub says hi")).toBeNull();
    const toggle = within(groups[0]).getByRole("button");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.textContent).toContain("Subagent");
    expect(toggle.textContent).toContain("2 messages");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByText("sub says hi")).toHaveLength(1);
    expect(screen.queryByText("lost child")).toBeNull();
    expect(groups[1].getAttribute("data-parent")).toBe("gone");
  });

  it("never renders html", async () => {
    const f = fake({ null: { messages: [msg("a1", "assistant", "plain <b>x</b> text", { html: "<b>x</b>" })], cursor: null, hasMore: false } });
    const { container } = render(<HermesTranscript feed={f.feed} participants={participants} />);
    await screen.findByText(/plain/);
    expect(container.querySelector("b")).toBeNull();
  });

  it("Show full for clipped text calls onShowFull and shows plain text", async () => {
    const f = fake({ null: { messages: [msg("a1", "assistant", "cut he", { text_clipped: true })], cursor: null, hasMore: false } });
    const onShowFull = vi.fn(async () => "cut here and the rest <i>z</i>");
    const { container } = render(<HermesTranscript feed={f.feed} participants={participants} onShowFull={onShowFull} />);
    fireEvent.click(await screen.findByRole("button", { name: "Show full" }));
    await screen.findByText("cut here and the rest <i>z</i>");
    expect(onShowFull).toHaveBeenCalledWith({ message: "a1", field: "text" });
    expect(container.querySelector("i")).toBeNull();
  });

  it("no Show full link without onShowFull", async () => {
    const f = fake({ null: { messages: [msg("a1", "assistant", "cut he", { text_clipped: true })], cursor: null, hasMore: false } });
    render(<HermesTranscript feed={f.feed} participants={participants} />);
    await screen.findByText("cut he");
    expect(screen.queryByText("Show full")).toBeNull();
  });

  it("Show full for a clipped tool result in the detail drawer", async () => {
    const call = { id: "t1", name: "terminal", state: "done" as const, result_preview: "short", result_clipped: true };
    const f = fake({ null: { messages: [msg("a1", "assistant", "ran", { tools: [call] })], cursor: null, hasMore: false } });
    const onShowFull = vi.fn(async () => "the whole output");
    render(<HermesTranscript feed={f.feed} participants={participants} onShowFull={onShowFull} />);
    fireEvent.click(await screen.findByLabelText(/terminal/i));
    fireEvent.click(await screen.findByRole("tab", { name: "Response" }));
    fireEvent.click(await screen.findByRole("button", { name: "Show full" }));
    await waitFor(() => expect(screen.getByText("the whole output")).toBeTruthy());
    expect(onShowFull).toHaveBeenCalledWith({ message: "a1", tool: "t1", field: "result" });
  });
});
