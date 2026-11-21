/** Approval card for a pending tool approval: countdown, Approve once / Deny, result line. */
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import type { ApprovalEvent } from "../../core/events";
import { defaultChatLabels, type ChatLabels } from "./labels";

export type { ApprovalEvent };

export function clock(left: number): string {
  return Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
}

export interface ApprovalProps {
  event: ApprovalEvent;
  /** Resolves true when the server accepted the answer. */
  onDecide: (choice: "once" | "deny") => Promise<boolean>;
  labels?: Partial<ChatLabels>;
}

export function Approval({ event, onDecide, labels }: ApprovalProps) {
  const l = { ...defaultChatLabels, ...labels };
  const [left, setLeft] = useState(Number(event.expires_s) || 0);
  const [decided, setDecided] = useState(false);
  const [result, setResult] = useState("");
  const live = !decided && left > 0;

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setLeft((n) => n - 1), 1000);
    return () => clearInterval(id);
  }, [live]);

  const decide = async (choice: "once" | "deny") => {
    if (decided) return;
    setDecided(true); // both buttons lock before anything is awaited
    setResult(l.approvalSending);
    let ok = false;
    try {
      ok = await onDecide(choice);
    } catch {
      setResult(l.approvalFailed);
      return;
    }
    setResult(ok ? (choice === "once" ? l.approved : l.denied) : l.approvalRejected);
  };

  const expired = !decided && left <= 0 && Number(event.expires_s) > 0;
  return (
    <Paper variant="outlined" data-testid="approval" sx={{ p: 1.5 }}>
      <Typography variant="subtitle2" component="strong">{event.title || l.approvalTitle}</Typography>
      <Typography variant="body2" sx={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>{event.text || ""}</Typography>
      {live && <Typography variant="caption" color="text.secondary" component="p">{l.expiresIn(clock(left))}</Typography>}
      {expired && <Typography variant="caption" color="text.secondary" component="p">{l.expired}</Typography>}
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button variant="contained" disabled={decided || expired} onClick={() => void decide("once")}>{l.approveOnce}</Button>
        <Button variant="outlined" color="inherit" disabled={decided || expired} onClick={() => void decide("deny")}>{l.deny}</Button>
      </Stack>
      <Typography role="status" variant="caption" color="text.secondary" component="p">{result}</Typography>
    </Paper>
  );
}
