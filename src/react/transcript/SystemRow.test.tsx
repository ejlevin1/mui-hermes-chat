import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TranscriptFeed, TranscriptMessage } from "../../core/transcript";
import { HermesTranscript } from "./HermesTranscript";

beforeEach(() => {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

let seq = 0;
const msg = (id: string, role: TranscriptMessage["role"], text: string, extra: Partial<TranscriptMessage> = {}): TranscriptMessage => ({
  id, role, text, html: "", seq: ++seq, source: "devx_lane", attempt: "lane:view:1", session: "view", ...extra,
});
const participants = { user: { name: "Dispatcher" }, agent: { name: "Ada Lovelace" } };
const feedOf = (messages: TranscriptMessage[]): TranscriptFeed => ({
  page: async () => ({ messages, cursor: null, hasMore: false }),
  follow: () => () => {},
});
const show = (messages: TranscriptMessage[], props: Partial<React.ComponentProps<typeof HermesTranscript>> = {}) =>
  render(<HermesTranscript feed={feedOf(messages)} participants={participants} {...props} />);

describe("system rows", () => {
  it("divider: separator with aria-label, title, no avatar or bubble", async () => {
    show([msg("d1", "system", "Review round 2", { kind: "divider", subagent_of: "ghost", tools: [{ id: "t", name: "x", state: "done" }] })]);
    const row = await screen.findByRole("separator");
    expect(row.getAttribute("aria-label")).toBe("Review round 2");
    expect(row.getAttribute("data-kind")).toBe("divider");
    expect(row.getAttribute("data-testid")).toBe("transcript-system");
    expect(within(row).getByText("Review round 2").getAttribute("title")).toBe("Review round 2");
    expect(screen.queryByTestId("transcript-message")).toBeNull();
    expect(screen.queryByTestId("subagent-group")).toBeNull();
    expect(screen.queryByTestId("tool-step-group")).toBeNull();
  });

  it("divider uses labels.dividerLabel", async () => {
    show([msg("d1", "system", "Round", { kind: "divider" })], { labels: { dividerLabel: (t) => `- ${t} -` } });
    expect(await screen.findByText("- Round -")).toBeTruthy();
  });

  it("event: time, renderStatus(status), plain text", async () => {
    const renderStatus = vi.fn((s: string) => <b data-testid="st">[{s}]</b>);
    const { container } = show([msg("e1", "system", "moved <i>x</i>", { kind: "event", status: "review", ts: 1_700_000_000 })], { renderStatus, labels: { eventTime: () => "12:34" } });
    const row = await screen.findByTestId("transcript-system");
    expect(row.getAttribute("data-kind")).toBe("event");
    expect(renderStatus).toHaveBeenCalledWith("review");
    expect(screen.getByTestId("st").textContent).toBe("[review]");
    expect(row.textContent).toContain("12:34");
    expect(row.textContent).toContain("moved <i>x</i>");
    expect(container.querySelector("i")).toBeNull();
    expect(screen.queryByTestId("transcript-message")).toBeNull();
  });

  it("event without kind and no renderStatus shows the raw status", async () => {
    show([msg("e1", "system", "hello", { status: "blocked" })]);
    const row = await screen.findByTestId("transcript-system");
    expect(row.getAttribute("data-kind")).toBe("event");
    expect(row.textContent).toContain("blocked");
    expect(row.textContent).toContain("hello");
  });

  it("participant overrides the row name", async () => {
    show([msg("u1", "user", "go", { participant: "devx" }), msg("u2", "user", "hi")]);
    await screen.findByText("go");
    expect(screen.getByLabelText("devx")).toBeTruthy();
    expect(screen.getByLabelText("Dispatcher")).toBeTruthy();
  });

  it("0.4.0-shaped messages render unchanged", async () => {
    const { container } = show([msg("u1", "user", "Please fix"), msg("a1", "assistant", "Done", { reasoning: "hm" })]);
    await screen.findByText("Done");
    expect(screen.queryByTestId("transcript-system")).toBeNull();
    expect(container.querySelector('[data-testid="hermes-transcript"]')!.innerHTML).toMatchSnapshot();
  });
});
