import { fireEvent, render, screen } from "@testing-library/react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { blue } from "@mui/material/colors";
import { ParticipantAvatar, accentToPalette } from "./index";
import { avatarColor } from "../../core/initials";

const bgOf = (el: HTMLElement) => getComputedStyle(el).backgroundColor;

test("initials from name, explicit initials win", () => {
  const { unmount } = render(<ParticipantAvatar participant={{ name: "Ada Lovelace" }} />);
  expect(screen.getByLabelText("Ada Lovelace").textContent).toBe("AL");
  unmount();
  render(<ParticipantAvatar participant={{ name: "Ada Lovelace", initials: "XY" }} />);
  expect(screen.getByLabelText("Ada Lovelace").textContent).toBe("XY");
});

test("person icon when no initials derivable", () => {
  render(<ParticipantAvatar participant={{ name: "!!!" }} />);
  expect(screen.getByLabelText("!!!").querySelector("svg")).toBeTruthy();
});

test("image falls back to initials on error", () => {
  render(<ParticipantAvatar participant={{ name: "Bob Ross", avatarUrl: "http://x/y.png" }} />);
  const el = screen.getByLabelText("Bob Ross");
  const img = el.querySelector("img")!;
  expect(img).toBeTruthy();
  fireEvent.error(img);
  expect(el.querySelector("img")).toBeNull();
  expect(el.textContent).toBe("BR");
});

test("colour stable per name and contrast text set", () => {
  const r1 = render(<ParticipantAvatar participant={{ name: "Stable" }} />);
  const a = bgOf(screen.getByLabelText("Stable"));
  r1.unmount();
  render(<ParticipantAvatar participant={{ name: "Stable" }} />);
  const el = screen.getByLabelText("Stable");
  expect(bgOf(el)).toBe(a);
  expect(a).not.toBe("");
  expect(getComputedStyle(el).color).not.toBe("");
  expect(avatarColor("Stable")).toBe(avatarColor("Stable"));
});

test("dark mode uses the 300 shade, light 600", () => {
  const light = createTheme();
  const dark = createTheme({ palette: { mode: "dark" } });
  expect(accentToPalette(light, "indigo")).not.toBe(accentToPalette(dark, "indigo"));
  expect(accentToPalette(dark, "gray")).toBeTruthy();
  const t = createTheme({ palette: { mode: "dark" } });
  render(
    <ThemeProvider theme={t}>
      <ParticipantAvatar participant={{ name: "Q", color: "blue" }} />
    </ThemeProvider>,
  );
  expect(bgOf(screen.getByLabelText("Q"))).toBe(
    (() => { const d = document.createElement("div"); d.style.backgroundColor = blue[300]; return d.style.backgroundColor; })(),
  );
});

test("palette role main preferred when theme defines it", () => {
  const t = createTheme({ palette: { primary: { main: "#123456" } } });
  expect(accentToPalette(t, "primary")).toBe("#123456");
});
