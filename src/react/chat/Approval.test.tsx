import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Approval } from "./Approval";

afterEach(cleanup);
const ev = { t: "approval", request_id: "r", title: "Run rm?", text: "rm -rf x", expires_s: 90 } as never;

test("shows the title and countdown, locks both buttons on first answer", async () => {
  const onDecide = vi.fn(async () => true);
  render(<Approval event={ev} onDecide={onDecide} />);
  expect(screen.getByText("Run rm?")).toBeTruthy();
  expect(screen.getByText("Expires in 1:30")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Approve once" }));
  expect((screen.getByRole("button", { name: "Deny" }) as HTMLButtonElement).disabled).toBe(true);
  await waitFor(() => expect(screen.getByText("Approved once.")).toBeTruthy());
  expect(onDecide).toHaveBeenCalledWith("once");
});

test("rejected answer is reported", async () => {
  render(<Approval event={ev} onDecide={async () => false} />);
  fireEvent.click(screen.getByRole("button", { name: "Deny" }));
  await waitFor(() => expect(screen.getByText(/not accepted/)).toBeTruthy());
});
