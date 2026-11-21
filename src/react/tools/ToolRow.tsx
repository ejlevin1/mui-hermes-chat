/** One tool call row: status icon, family icon, name, args line, duration; opens detail, chevron toggles an inline preview. */
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import CheckCircleOutline from "@mui/icons-material/CheckCircleOutlined";
import ErrorOutline from "@mui/icons-material/ErrorOutlined";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ExpandLess from "@mui/icons-material/ExpandLess";
import type { HermesToolCall } from "../../core/types";
import { ToolFamily } from "./family";
import { ToolRowFormat, type ToolRunStatus } from "./format";
import { resolvePreview } from "./toolPreview";
import { ToolPreviewView } from "./ToolPreviewView";
import { ToolIcon } from "./icons";
import { defaultToolLabels, type ToolLabels } from "./labels";

export interface ToolRowProps {
  call: HermesToolCall;
  running?: boolean;
  onOpen?: (call: HermesToolCall) => void;
  labels?: Partial<ToolLabels>;
  /** Rendered inside the Steps card: status icon on a vertical connector, no own background box. */
  inCard?: boolean;
  first?: boolean;
  last?: boolean;
}

export function statusOf(call: HermesToolCall, running?: boolean): ToolRunStatus {
  if (call.state === "failed") return "failed";
  if (call.state === "start" || running) return call.state === "done" ? "done" : "running";
  return "done";
}

function Elapsed() {
  const [s, setS] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setS((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <span data-testid="tool-elapsed">{s} s</span>;
}

export function ToolRow({ call, running, onOpen, labels, inCard, first, last }: ToolRowProps) {
  const l = { ...defaultToolLabels, ...labels };
  const [expanded, setExpanded] = useState(false);
  const status = statusOf(call, running);
  const args = ToolFamily.argsLine(call.name, call.args, call.preview);
  const preview = resolvePreview(call);
  const hasPreview = preview.kind !== "none";
  const dur = ToolRowFormat.duration(call.duration_s);
  const label = ToolRowFormat.accessibilityLabel({ name: call.name, status, duration: call.duration_s, argsLine: args });
  const statusIcon = status === "running" ? <CircularProgress size={16} aria-label={l.running} />
    : status === "failed" ? <ErrorOutline fontSize="small" color="error" titleAccess={l.failed} />
    : <CheckCircleOutline fontSize="small" color="success" titleAccess={l.done} />;
  return (
    <Box
      data-testid="tool-row"
      data-status={status}
      sx={inCard
        ? (t) => ({ borderRadius: 1, p: 0.5, bgcolor: status === "done" ? alpha(t.palette.success.main, 0.06) : status === "failed" ? alpha(t.palette.error.main, 0.06) : "transparent" })
        : { bgcolor: "action.hover", borderRadius: 1, p: 0.5 }}
    >
      <Box sx={{ display: "flex", alignItems: "stretch", gap: 0.5 }}>
        {inCard && (
          <Box aria-hidden sx={{ position: "relative", width: 24, flexShrink: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Box sx={{ position: "absolute", left: "50%", width: "1px", bgcolor: "divider", top: first ? "50%" : -4, bottom: last ? "50%" : -4 }} />
            <Box sx={{ position: "relative", display: "flex", bgcolor: "background.paper", borderRadius: "50%", color: "text.secondary" }}>{statusIcon}</Box>
          </Box>
        )}
        <ButtonBase
          aria-label={label}
          onClick={() => onOpen?.(call)}
          sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 1, p: 0.5, borderRadius: 1, textAlign: "left", justifyContent: "flex-start" }}
        >
          <ToolIcon name={call.name} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: "fontWeightMedium" }}>{call.name}</Typography>
            {args && <Typography variant="caption" color="text.secondary" noWrap component="div" sx={{ fontFamily: "monospace" }}>{args}</Typography>}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary", flexShrink: 0 }}>
            {status === "running" && (<><Elapsed />{!inCard && <CircularProgress size={14} aria-label={l.running} />}</>)}
            {status === "done" && (<>{dur && <Typography variant="caption">{dur}</Typography>}{!inCard && <CheckCircleOutline fontSize="small" color="success" titleAccess={l.done} />}</>)}
            {status === "failed" && (<>{dur && <Typography variant="caption">{dur}</Typography>}{!inCard && <ErrorOutline fontSize="small" color="error" />}<Typography variant="caption" color="error">{l.failed}</Typography></>)}
          </Box>
        </ButtonBase>
        {hasPreview && (
          <Tooltip title={expanded ? l.hidePreview : l.showPreview}>
            <IconButton aria-label={expanded ? l.hidePreview : l.showPreview} aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
              {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}
      </Box>
      {expanded && hasPreview && (
        <Box sx={{ p: 1 }}><ToolPreviewView preview={preview} labels={labels} /></Box>
      )}
    </Box>
  );
}
