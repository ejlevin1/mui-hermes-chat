/** Bubble layout: content-sized, capped at thread − opposite avatar column, no `ch` cap; theme corner radius. */
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { cleanup, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { HermesChat, bubbleSlotProps, type HermesChatProps } from "./HermesChat";

const theme = createTheme();
type Sx = Record<string, Record<string, unknown> | unknown>;
const content = (gap?: number | string) => (bubbleSlotProps(theme, gap).messageContent.sx as Sx);
const root = (gap?: number | string) => (bubbleSlotProps(theme, gap).messageRoot.sx as Sx);

describe("bubbleSlotProps", () => {
  test("max width = 100% minus the opposite avatar column (avatar + gutter)", () => {
    expect(content().maxWidth).toBe(`calc(100% - ${theme.spacing(5)})`);
    expect(content().width).toBe("fit-content");
  });
  test("bubbleOppositeGap overrides the default (number = px, string as is)", () => {
    expect(content(40).maxWidth).toBe("calc(100% - 40px)");
    expect(content("3rem").maxWidth).toBe("calc(100% - 3rem)");
  });
  test("user bubbles align end with the accent colour, agent bubbles start with grey", () => {
    const r = root();
    expect(r["&.MuiChatMessage-roleUser .MuiChatMessage-content"]).toEqual({ justifySelf: "end" });
    expect(r["&.MuiChatMessage-roleUser .MuiChatMessage-bubble"]).toEqual({ bgcolor: "primary.main", color: "primary.contrastText" });
    expect(content().justifySelf).toBe("start");
    expect((bubbleSlotProps(theme, undefined, "filled").messageContent.sx as Sx)["& .MuiChatMessage-bubble"]).toMatchObject({ bgcolor: "action.hover", padding: theme.spacing(1, 1.5) });
  });
  test("avatar track stays fixed (not auto) so grouped follow-up messages keep their column", () => {
    const r = root();
    const base = r["&&"] as Record<string, string>;
    expect(base.gridTemplateColumns).toBe(`${theme.spacing(4)} minmax(0, 1fr)`);
    expect(base["--MuiChatMessage-avatarSize"]).toBe(theme.spacing(4));
    expect((r["&&.MuiChatMessage-roleUser"] as Record<string, string>).gridTemplateColumns).toBe(`minmax(0, 1fr) ${theme.spacing(4)}`);
    expect(JSON.stringify(r)).not.toContain("auto");
  });
  test("one rule serves history and live messages (no per-source variant)", () => {
    expect(JSON.stringify(bubbleSlotProps(theme))).not.toMatch(/history|live/);
  });
  test("no 72ch anywhere in the chat sources", async () => {
    const fs = (await import(/* @vite-ignore */ "node:" + "fs")) as { readFileSync: (u: URL, e: string) => string };
    for (const f of ["HermesChat.tsx", "parts.tsx"]) expect(fs.readFileSync(new URL(f, import.meta.url), "utf8")).not.toContain("72ch");
  });
});


const props: HermesChatProps = {
  urls: { turn: "/t", approval: "/a", new: "/n", history: "/h", messages: "/m" },
  target: { board: "ops", task: "t1" },
  csrf: async () => "tok",
  history: {
    messages: [
      { id: "1", role: "user", text: "hi", html: "" },
      { id: "2", role: "assistant", text: "hello", html: "<p>hello</p>" },
    ],
    cursor: null,
    hasMore: false,
  },
  renderHtml: (html: string): ReactNode => <div data-html={html} />,
  participants: { user: { name: "Ada Lovelace" }, agent: { name: "Hermes", initials: "HE" } },
  mode: "inline",
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}")));
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("bubble radius", () => {
  test("agent and user bubbles use theme.shape.borderRadius px, not its square", async () => {
    const theme = createTheme({ shape: { borderRadius: 6 } });
    const { container } = render(<ThemeProvider theme={theme}><HermesChat {...props} agentBubble="filled" /></ThemeProvider>);
    await waitFor(() => expect(container.querySelectorAll(".MuiChatMessage-bubble").length).toBe(2));
    const radii = [...container.querySelectorAll(".MuiChatMessage-bubble")].map((b) => getComputedStyle(b).borderRadius);
    expect(radii).toEqual(["6px", "6px"]);
  });
});

describe("plain agent messages", () => {
  const bubbles = (c: HTMLElement) => [...c.querySelectorAll(".MuiChatMessage-bubble")] as HTMLElement[];
  const renderChat = async (extra: Partial<HermesChatProps> = {}, p: HermesChatProps = props) => {
    const r = render(<ThemeProvider theme={createTheme()}><HermesChat {...p} {...extra} /></ThemeProvider>);
    await waitFor(() => expect(bubbles(r.container).length).toBe(p.history.messages.length));
    return r;
  };
  test("default: agent bubble is transparent with no padding; user bubble keeps primary fill + padding", async () => {
    const { container } = await renderChat();
    const [user, agent] = bubbles(container).map((b) => getComputedStyle(b));
    expect(agent.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(agent.padding).toBe("0px");
    expect(user.backgroundColor).toBe("rgb(25, 118, 210)");
    expect(user.padding).toBe("8px 12px");
  });
  test('agentBubble="filled" reproduces the 0.3.2 look', async () => {
    const { container } = await renderChat({ agentBubble: "filled" });
    const agent = getComputedStyle(bubbles(container)[1]);
    expect(agent.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(agent.padding).toBe("8px 12px");
  });
  test("12px between a Steps card and the reply text; none above the first part", async () => {
    const p: HermesChatProps = { ...props, history: { ...props.history, messages: [
      { id: "2", role: "assistant", text: "done", html: "<p>done</p>", tools: [{ id: "a", name: "terminal", state: "done" }] } as never,
    ] } };
    const { container } = await renderChat({}, p);
    const parts = [...bubbles(container)[0].children].filter((e) => !e.className.includes("inlineMeta"));
    expect(parts.length).toBeGreaterThan(1);
    expect(getComputedStyle(parts[0]).marginTop).not.toBe("12px");
    expect(getComputedStyle(parts[1]).marginTop).toBe("12px");
  });
  test("agent meta renders after the content, left-aligned, as a caption", async () => {
    const p: HermesChatProps = { ...props, history: { ...props.history, messages: [
      { id: "2", role: "assistant", text: "hello", html: "<p>hello</p>", created: 1790000000 },
    ] } };
    const { container } = await renderChat({}, p);
    const meta = container.querySelector(".MuiChatMessage-inlineMeta") as HTMLElement;
    expect(meta).toBeTruthy();
    const cs = getComputedStyle(meta);
    expect(cs.position).toBe("static");
    expect(cs.justifyContent).toBe("flex-start");
    expect(cs.marginTop).toBe("4px");
    expect(meta.compareDocumentPosition(bubbles(container)[0].firstElementChild!) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });
  test("start-of-conversation is inside the scroll container", async () => {
    const { container, getByText } = await renderChat();
    const scroller = container.querySelector('[aria-label]') as HTMLElement;
    const log = container.querySelector('[role="log"]') as HTMLElement;
    expect(scroller).toBeTruthy();
    expect(log.contains(getByText("Start of conversation"))).toBe(true);
  });
});
