/** The Steps card: one outlined card, a header with a quiet count, one row per tool call appended in arrival order; never folds. */
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { HermesToolCall } from "../../core/types";
import { ToolRow } from "./ToolRow";
import { ToolRowFormat } from "./format";
import { defaultToolLabels, type ToolLabels } from "./labels";

export interface ToolStepGroupProps {
  calls: HermesToolCall[];
  /** The turn is still running: the header shows live progress. Rows never fold or expand by themselves. */
  running?: boolean;
  onOpen?: (call: HermesToolCall) => void;
  labels?: Partial<ToolLabels>;
}

export function ToolStepGroup({ calls, running, onOpen, labels }: ToolStepGroupProps) {
  const l = { ...defaultToolLabels, ...labels };
  if (calls.length === 0) return null;
  const live = calls.filter((c) => c.state === "start").length;
  const failed = calls.filter((c) => c.state === "failed").length;
  const total = calls.reduce((s, c) => s + (c.duration_s ?? 0), 0);
  const dur = ToolRowFormat.duration(calls.some((c) => c.duration_s !== undefined) ? total : undefined);
  const count = running && live > 0 ? l.stepsProgress(calls.length - live, live) : l.steps(calls.length) + (dur ? ` · ${dur}` : "");
  return (
    <Box data-testid="tool-step-group" sx={{ display: "flex", flexDirection: "column", gap: 0.5, border: 1, borderColor: "divider", borderRadius: 1, p: 1, width: "100%", boxSizing: "border-box" }}>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, px: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: "fontWeightMedium" }}>{l.stepsHeader}</Typography>
        <Typography variant="caption" color="text.secondary">{count}</Typography>
        {failed > 0 && <Typography variant="caption" color="error">{l.failedCount(failed)}</Typography>}
      </Box>
      {calls.map((c, i) => (
        <ToolRow key={c.id} call={c} running={!!running && c.state === "start"} onOpen={onOpen} labels={labels} inCard first={i === 0} last={i === calls.length - 1} />
      ))}
    </Box>
  );
}
