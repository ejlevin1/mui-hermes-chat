import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SessionInfoButton } from "./SessionInfo";
import type { SessionInfo } from "../../core/types";

const session: SessionInfo = {
  id: "sess-123",
  profile: "jarvis",
  title: "Fix the build",
  source: "cli",
  created: 1700000000,
  lastTurn: 1700003600,
  messages: 42,
  active: true,
  resumeCmd: "hermes -p jarvis --resume sess-123",
};

beforeEach(() => {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  }));
});
afterEach(() => vi.unstubAllGlobals());

const open = () => fireEvent.click(screen.getByRole("button", { name: "Session info" }));

test("renders all fields", () => {
  render(<SessionInfoButton session={session} agentAvatar={<i data-testid="av" />} />);
  expect(screen.queryByText("Fix the build")).toBeNull();
  open();
  for (const t of ["Session ID", "sess-123", "Fix the build", "jarvis", "cli", "42", "Active", "Resume in a terminal", session.resumeCmd])
    expect(screen.getByText(t)).toBeTruthy();
  expect(screen.getByTestId("av")).toBeTruthy();
  expect(document.querySelector("[title]:not(button)")).toBeTruthy();
});

test("copies id and resume command", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  render(<SessionInfoButton session={session} />);
  open();
  const btns = screen.getAllByRole("button", { name: "Copy" });
  fireEvent.click(btns[0]);
  await waitFor(() => expect(screen.getByText("Copied")).toBeTruthy());
  expect(writeText).toHaveBeenCalledWith("sess-123");
  fireEvent.click(screen.getAllByRole("button", { name: "Copy" })[0]);
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(session.resumeCmd));
});

test("missing values render a dash and archived status", () => {
  render(
    <SessionInfoButton
      session={{ ...session, title: "", source: "", created: null, lastTurn: null, messages: null, active: false, resumeCmd: "" }}
    />,
  );
  open();
  expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(6);
  expect(screen.getByText("Archived")).toBeTruthy();
});

test("closes", async () => {
  render(<SessionInfoButton session={session} />);
  open();
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.queryByText("Resume in a terminal")).toBeNull());
});
