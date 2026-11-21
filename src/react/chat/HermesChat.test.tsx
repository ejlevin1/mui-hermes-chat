import { ThemeProvider, createTheme } from "@mui/material/styles";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { fitMaxHeight } from "./useFitHeight";
import { HermesChat, type HermesChatProps } from "./HermesChat";
import { toolCallsOf } from "./parts";
import type { HermesMessage } from "../../core/types";

const frame = (o: object) => "data: " + JSON.stringify(o) + "\n\n";
const enc = new TextEncoder();
const sse = (frames: string[]) => new Response(new ReadableStream({ start(c) { frames.forEach((f) => c.enqueue(enc.encode(f))); c.close(); } }), { status: 200 });

let calls: { url: string; body: string }[];
let handler: (url: string, body: string) => Response;
beforeEach(() => {
  calls = [];
  handler = () => new Response("{}");
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), body: String(init?.body ?? "") });
    return handler(String(url), String(init?.body ?? ""));
  }));
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const msg = (id: string, role: "user" | "assistant", text: string, extra: Partial<HermesMessage> = {}): HermesMessage =>
  ({ id, role, text, html: role === "assistant" ? `<p>${text}</p>` : "", ...extra });
const base: HermesChatProps = {
  urls: { turn: "/t", approval: "/a", new: "/n", history: "/h", messages: "/m" },
  target: { board: "ops", task: "t1" },
  csrf: async () => "tok",
  history: { messages: [], cursor: null, hasMore: false },
  renderHtml: (html: string): ReactNode => <div data-testid="rendered" data-html={html} />,
  participants: { user: { name: "Ada Lovelace" }, agent: { name: "Hermes", initials: "HE" } },
  mode: "inline",
};
const ui = (p: Partial<HermesChatProps> = {}) => render(<ThemeProvider theme={createTheme()}><HermesChat {...base} {...p} /></ThemeProvider>);

describe("fitMaxHeight", () => {
  test("viewport minus top minus gap, floored by minHeight", () => {
    expect(fitMaxHeight(1000, 200, 420, 24)).toBe(776);
    expect(fitMaxHeight(500, 300, 420, 24)).toBe(420);
    expect(fitMaxHeight(1000, 200)).toBe(776);
  });
});

describe("HermesChat layout", () => {
  test("card maxHeight follows the viewport (fit height)", async () => {
    vi.stubGlobal("innerHeight", 900);
    const orig = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      return this.dataset.testid === "hermes-chat" ? ({ top: 100 } as DOMRect) : orig.call(this);
    });
    ui({ fit: { bottomGap: 20 } });
    await waitFor(() => expect(getComputedStyle(screen.getByTestId("hermes-chat")).maxHeight).toBe("780px"));
    vi.restoreAllMocks();
  });

  test("empty chat is just toolbar + composer, no list chrome", async () => {
    ui();
    const card = screen.getByTestId("hermes-chat");
    expect(within(card).getByTestId("hermes-chat-toolbar")).toBeTruthy();
    expect(within(card).getByRole("textbox")).toBeTruthy();
    expect(screen.queryByText("Start of conversation")).toBeNull();
    expect(screen.queryByText("Load earlier messages")).toBeNull();
  });

  test("toolbar: agent name, New chat icon button, Info only with a session", () => {
    const { unmount } = ui();
    expect(screen.getByText("Hermes")).toBeTruthy();
    expect(screen.getByRole("button", { name: "New chat" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Session info" })).toBeNull();
    unmount();
    ui({ session: { id: "s1", profile: "p", title: "T", source: "cli", created: null, lastTurn: null, messages: 3, active: true, resumeCmd: "hermes -p p --resume s1" } });
    expect(screen.getByRole("button", { name: "Session info" })).toBeTruthy();
  });

  test("Earlier link only with hasEarlier + earlierHref; toolbarActions render", () => {
    ui({ hasEarlier: true, earlierHref: "/earlier", toolbarActions: <button>Extra</button> });
    expect(screen.getByRole("link", { name: "Earlier conversations" }).getAttribute("href")).toBe("/earlier");
    expect(screen.getByText("Extra")).toBeTruthy();
  });

  test("notice, linked note and changed note", () => {
    ui({ notice: "Could not load.", linkedNote: "Discussion on Parent.", changed: true });
    expect(screen.getByText("Could not load.")).toBeTruthy();
    expect(screen.getByText("Discussion on Parent.")).toBeTruthy();
    expect(screen.getByText(/Card changed/)).toBeTruthy();
  });
});

describe("HermesChat history", () => {
  const history = { messages: [msg("m1", "user", "hi"), msg("m2", "assistant", "yo")], cursor: "c1", hasMore: true };

  test("renders history; replies go through renderHtml only; avatars come from participants", async () => {
    ui({ history });
    expect(await screen.findByText("hi")).toBeTruthy();
    expect(screen.getByTestId("rendered").getAttribute("data-html")).toBe("<p>yo</p>");
    expect(document.querySelector("[inner-html], [dangerouslysetinnerhtml]")).toBeNull();
    await waitFor(() => expect(screen.getAllByLabelText("Ada Lovelace").length).toBeGreaterThan(0));
    expect(screen.getAllByLabelText("Hermes").length).toBeGreaterThan(1); // toolbar + message
  });

  test("author line is visually hidden but present for screen readers", async () => {
    ui({ history });
    await screen.findByText("hi");
    expect(screen.getAllByText(/Ada Lovelace|Hermes/).length).toBeGreaterThan(0);
  });

  test("opens scrolled to the newest message", async () => {
    const top = vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(1000);
    ui({ history });
    await screen.findByText("hi");
    const scroller = document.querySelector("[role=log]") as HTMLElement;
    await waitFor(() => expect(scroller.scrollTop).toBe(1000));
    top.mockRestore();
  });

  test("Load earlier prepends the older page, dedupes by id, then shows the start marker", async () => {
    handler = (url) => {
      expect(url).toContain("/m?");
      expect(url).toContain("cursor=c1");
      return new Response(JSON.stringify({ messages: [msg("m0", "user", "older"), msg("m1", "user", "hi")], cursor: null, has_more: false }));
    };
    ui({ history });
    fireEvent.click(await screen.findByRole("button", { name: "Load earlier messages" }));
    expect(await screen.findByText("older")).toBeTruthy();
    expect(screen.getAllByText("hi")).toHaveLength(1);
    expect(await screen.findByText("Start of conversation")).toBeTruthy();
    const order = screen.getAllByText(/^(older|hi)$/).map((n) => n.textContent);
    expect(order).toEqual(["older", "hi"]);
  });

  test("every user message (history, paged-in, live) gets the viewer layout; assistant does not", async () => {
    handler = (url) => url === "/t"
      ? sse([frame({ t: "reply", text: "ok", html: "<p>ok</p>" }), frame({ t: "end" })])
      : new Response(JSON.stringify({ messages: [msg("m0", "user", "older")], cursor: null, has_more: false }));
    ui({ history: { messages: [msg("h1", "user", "histuser"), msg("h2", "assistant", "histbot")], cursor: "c1", hasMore: true } });
    fireEvent.click(await screen.findByRole("button", { name: "Load earlier messages" }));
    await screen.findByText("older");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "liveuser" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByText("liveuser");
    const areas = (text: string) => {
      const el = text === "histbot" ? screen.getAllByTestId("rendered")[0]! : screen.getByText(text);
      const root = el.closest(".MuiChatMessage-root") as HTMLElement;
      return getComputedStyle(root).gridTemplateAreas;
    };
    const user = ["older", "histuser", "liveuser"].map(areas);
    // viewer layout puts content first (own messages right-aligned); consecutive user messages only differ by grouping (no avatar row)
    user.forEach((a) => expect(a.startsWith('"content ')).toBe(true));
    expect(areas("histbot").startsWith('"content ')).toBe(false);
  });

  test("paging failure shows an error row with Retry that recovers", async () => {
    let n = 0;
    handler = () => (n++ === 0
      ? new Response("{}", { status: 500 })
      : new Response(JSON.stringify({ messages: [msg("m0", "user", "older")], cursor: null, has_more: false })));
    ui({ history });
    fireEvent.click(await screen.findByRole("button", { name: "Load earlier messages" }));
    expect(await screen.findByText("Could not load earlier messages.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("older")).toBeTruthy();
  });
});

describe("HermesChat turns", () => {
  test("streams a turn: tool group part, commentary, reply via renderHtml, announces once", async () => {
    handler = (url) => (url === "/t" ? sse([
      frame({ t: "tool", name: "terminal", id: "a", state: "start", preview: "ls" }),
      frame({ t: "tool", name: "terminal", id: "a", state: "done", duration_s: 1 }),
      frame({ t: "commentary", text: "Looking around" }),
      frame({ t: "reply", text: "Done", html: "<p>Done</p>" }),
      frame({ t: "end" }),
    ]) : new Response("{}"));
    ui();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "go" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByText("Looking around")).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("rendered").getAttribute("data-html")).toBe("<p>Done</p>"));
    expect(document.body.textContent).toContain("terminal");
    await waitFor(() => expect(screen.getByTestId("hermes-said").textContent).toContain("Hermes replied."));
  });

  test("toolCallsOf folds history data-tools and live dynamic-tool parts into one list", () => {
    const out = toolCallsOf([
      { type: "data-tools", data: [{ id: "1", name: "a", state: "done" }] },
      { type: "dynamic-tool", toolInvocation: { toolCallId: "2", toolName: "b", state: "output-available", input: { q: 1 }, output: { duration_s: 2, result_preview: "ok" } } },
      { type: "dynamic-tool", toolInvocation: { toolCallId: "3", toolName: "c", state: "input-available", input: { preview: "p" } } },
      { type: "text" },
    ]);
    expect(out.map((c) => [c.id, c.state])).toEqual([["1", "done"], ["2", "done"], ["3", "start"]]);
    expect(out[1]).toMatchObject({ args: { q: 1 }, duration_s: 2, result_preview: "ok" });
    expect(out[2]!.preview).toBe("p");
  });

  test("history tool calls render a step group", async () => {
    ui({ history: { messages: [msg("m1", "assistant", "done", { tools: [{ id: "1", name: "terminal", state: "done" }, { id: "2", name: "read_file", state: "done" }] })], cursor: null, hasMore: false } });
    expect(await screen.findByTestId("tool-step-group")).toBeTruthy();
  });
});

describe("HermesChat New chat", () => {
  test("confirm dialog, POSTs urls.new, clears history", async () => {
    handler = () => new Response(JSON.stringify({ ok: true }));
    ui({ history: { messages: [msg("m1", "user", "hi")], cursor: null, hasMore: false } });
    await screen.findByText("hi");
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    expect(await screen.findByText("Start over?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    await waitFor(() => expect(calls.some((c) => c.url === "/n")).toBe(true));
    await waitFor(() => expect(screen.queryByText("hi")).toBeNull());
  });

  test("Cancel does not call the server", async () => {
    ui();
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(calls.some((c) => c.url === "/n")).toBe(false);
  });

  test("labels override defaults", () => {
    ui({ labels: { newChat: "Nuevo chat" } });
    expect(screen.getByRole("button", { name: "Nuevo chat" })).toBeTruthy();
  });
});

describe("HermesChat long turns", () => {
  const send = async () => {
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "go" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  };

  test("a stream that closes without a final frame: info note, onStreamLost once, no error alert", async () => {
    handler = (url) => (url === "/t" ? sse([frame({ t: "delta", text: "par" })]) : new Response("{}"));
    const onStreamLost = vi.fn();
    ui({ onStreamLost });
    await send();
    expect(await screen.findByText("Hermes is still working on this. The answer will appear here when it's done.")).toBeTruthy();
    expect(onStreamLost).toHaveBeenCalledTimes(1);
    expect(onStreamLost).toHaveBeenCalledWith({ code: "network" });
    expect(document.querySelector(".MuiAlert-standardError")).toBeNull();
    expect(document.body.textContent).not.toContain("send it again");
  });

  test("error code detached: the same note with code detached; labels override the text", async () => {
    handler = (url) => (url === "/t" ? sse([frame({ t: "error", code: "detached", text: "idle" })]) : new Response("{}"));
    const onStreamLost = vi.fn();
    ui({ onStreamLost, labels: { stillWorking: "Still on it." } });
    await send();
    expect(await screen.findByText("Still on it.")).toBeTruthy();
    expect(onStreamLost).toHaveBeenCalledWith({ code: "detached" });
    expect(onStreamLost).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".MuiAlert-standardError")).toBeNull();
  });

  test("another error code keeps the error alert", async () => {
    handler = (url) => (url === "/t" ? sse([frame({ t: "error", code: "boom", text: "It broke" })]) : new Response("{}"));
    const onStreamLost = vi.fn();
    ui({ onStreamLost });
    await send();
    expect(await screen.findByText("It broke")).toBeTruthy();
    expect(onStreamLost).not.toHaveBeenCalled();
  });

  test("resetKey change shows the newer history page and drops the note; same key does not remount", async () => {
    handler = (url) => (url === "/t" ? sse([frame({ t: "delta", text: "par" })]) : new Response("{}"));
    const first = { messages: [msg("m1", "user", "hello")], cursor: null, hasMore: false };
    const second = { messages: [msg("m1", "user", "hello"), msg("m2", "assistant", "Fresh reply")], cursor: null, hasMore: false };
    const tree = (history: HermesChatProps["history"], resetKey: number) => (
      <ThemeProvider theme={createTheme()}><HermesChat {...base} history={history} resetKey={resetKey} /></ThemeProvider>
    );
    const { rerender } = render(tree(first, 1));
    await screen.findByText("hello");
    await send();
    await screen.findByText(/still working/);
    rerender(tree(second, 1));
    expect(screen.queryByText("Fresh reply")).toBeNull();
    expect(screen.getByText(/still working/)).toBeTruthy();
    rerender(tree(second, 2));
    expect(await screen.findByTestId("rendered")).toBeTruthy();
    expect(screen.getByTestId("rendered").getAttribute("data-html")).toBe("<p>Fresh reply</p>");
    expect(screen.queryByText(/still working/)).toBeNull();
  });
});
