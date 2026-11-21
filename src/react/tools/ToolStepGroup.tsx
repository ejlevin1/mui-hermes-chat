/** Consecutive tool calls: one call is a ToolRow; several collapse to "N steps · 12 s" with expand. */
import { useState } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ExpandLess from "@mui/icons-material/ExpandLess";
import type { HermesToolCall } from "../../core/types";
import { ToolRow } from "./ToolRow";
import { ToolRowFormat } from "./format";
import { defaultToolLabels, type ToolLabels } from "./labels";

export interface ToolStepGroupProps {
  calls: HermesToolCall[];
  /** The turn is still running: expanded by default; collapsed once the reply is in. */
  running?: boolean;
  onOpen?: (call: HermesToolCall) => void;
  labels?: Partial<ToolLabels>;
}

export function ToolStepGroup({ calls, running, onOpen, labels }: ToolStepGroupProps) {
  const l = { ...defaultToolLabels, ...labels };
  // null = follow the running default; a click pins the user's choice.
  const [pinned, setPinned] = useState<boolean | null>(null);
  if (calls.length === 0) return null;
  const rowRunning = (c: HermesToolCall, i: number) => !!running && c.state === "start" && i === calls.length - 1;
  if (calls.length === 1) return <ToolRow call={calls[0]!} running={rowRunning(calls[0]!, 0)} onOpen={onOpen} labels={labels} />;
  const open = pinned ?? !!running;
  const total = calls.reduce((s, c) => s + (c.duration_s ?? 0), 0);
  const failed = calls.filter((c) => c.state === "failed").length;
  const dur = ToolRowFormat.duration(calls.some((c) => c.duration_s !== undefined) ? total : undefined);
  const title = l.steps(calls.length) + (dur ? ` · ${dur}` : "");
  const action = open ? l.hideSteps : l.showSteps;
  return (
    <Box data-testid="tool-step-group" sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      <ButtonBase aria-expanded={open} aria-label={`${title}. ${action}`} onClick={() => setPinned(!open)}
        sx={{ display: "flex", alignItems: "center", gap: 0.5, justifyContent: "flex-start", p: 0.5, borderRadius: 1, bgcolor: "action.hover" }}>
        <Typography variant="body2" sx={{ fontWeight: "fontWeightMedium" }}>{title}</Typography>
        {failed > 0 && <Typography variant="caption" color="error">{l.failedCount(failed)}</Typography>}
        <Box sx={{ flex: 1 }} />
        {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
      </ButtonBase>
      {open && calls.map((c, i) => <ToolRow key={c.id} call={c} running={rowRunning(c, i)} onOpen={onOpen} labels={labels} />)}
    </Box>
  );
}
