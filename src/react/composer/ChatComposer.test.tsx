import { createEchoAdapter } from "@mui/x-chat";
import { ChatProvider } from "@mui/x-chat-headless";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { ChatComposer } from "./ChatComposer";

const wrap = (ui: ReactNode, adapter = createEchoAdapter({ delayMs: 0 })) =>
  render(<ChatProvider adapter={adapter}>{ui}</ChatProvider>);
const input = () => screen.getByPlaceholderText("Message Hermes…") as HTMLTextAreaElement;

test("send is disabled when empty and enabled with text", () => {
  wrap(<ChatComposer />);
  const send = screen.getByRole("button", { name: "Send message" }) as HTMLButtonElement;
  expect(send.disabled).toBe(true);
  fireEvent.change(input(), { target: { value: "hi" } });
  expect(send.disabled).toBe(false);
});

test("send is a round accent button when enabled", () => {
  wrap(<ChatComposer />);
  fireEvent.change(input(), { target: { value: "hi" } });
  const send = screen.getByRole("button", { name: "Send message" });
  expect(getComputedStyle(send).borderRadius).toBe("50%");
  expect(send.className).toContain("colorPrimary");
});

test("Enter sends, Shift+Enter does not", async () => {
  wrap(<ChatComposer />);
  fireEvent.change(input(), { target: { value: "hello" } });
  fireEvent.keyDown(input(), { key: "Enter", shiftKey: true });
  expect(input().value).toBe("hello");
  fireEvent.keyDown(input(), { key: "Enter" });
  await waitFor(() => expect(input().value).toBe(""));
});

test("single focus ring: textarea has no own border/outline, only the surface carries focus style", () => {
  wrap(<ChatComposer />);
  const surface = screen.getByTestId("composer-surface");
  expect(surface.querySelectorAll("fieldset").length).toBe(0);
  expect(getComputedStyle(input()).outlineStyle).not.toBe("solid");
  expect(getComputedStyle(input()).borderStyle).not.toBe("solid");
});

test("counter appears only above 80% of max", () => {
  wrap(<ChatComposer maxMessage={10} />);
  fireEvent.change(input(), { target: { value: "12345678" } });
  expect(screen.queryByText("8 / 10")).toBeNull();
  fireEvent.change(input(), { target: { value: "123456789" } });
  expect(screen.getByText("9 / 10")).toBeTruthy();
});

test("shows Stop while streaming", async () => {
  const adapter = createEchoAdapter({ delayMs: 200, respond: () => "a long reply that streams" });
  wrap(<ChatComposer />, adapter);
  fireEvent.change(input(), { target: { value: "go" } });
  fireEvent.keyDown(input(), { key: "Enter" });
  const stop = await screen.findByRole("button", { name: "Stop generating" });
  fireEvent.click(stop);
  await waitFor(() => expect(screen.queryByRole("button", { name: "Stop generating" })).toBeNull());
});
