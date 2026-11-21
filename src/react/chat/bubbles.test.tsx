/** Bubble layout: content-sized, capped at thread − opposite avatar column, no `ch` cap. */
import { createTheme } from "@mui/material/styles";
import { bubbleSlotProps } from "./HermesChat";

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
    expect((content()["& .MuiChatMessage-bubble"] as Record<string, unknown>).bgcolor).toBe("action.hover");
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
