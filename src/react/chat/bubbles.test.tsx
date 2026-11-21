import { ThemeProvider, createTheme } from "@mui/material/styles";
import { cleanup, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { HermesChat, type HermesChatProps } from "./HermesChat";

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
    const { container } = render(<ThemeProvider theme={theme}><HermesChat {...props} /></ThemeProvider>);
    await waitFor(() => expect(container.querySelectorAll(".MuiChatMessage-bubble").length).toBe(2));
    const radii = [...container.querySelectorAll(".MuiChatMessage-bubble")].map((b) => getComputedStyle(b).borderRadius);
    expect(radii).toEqual(["6px", "6px"]);
  });
});
