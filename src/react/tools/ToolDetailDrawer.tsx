/** Tool call detail: right Drawer (full-screen Dialog under `md`) with Request / Response tabs. */
import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import Close from "@mui/icons-material/Close";
import type { HermesToolCall } from "../../core/types";
import { ToolFamily } from "./family";
import { ToolRowFormat } from "./format";
import { ToolIcon } from "./icons";
import { JsonTree } from "./JsonTree";
import { statusOf } from "./ToolRow";
import { defaultToolLabels, type ToolLabels } from "./labels";

export interface ToolDetailDrawerProps {
  call: HermesToolCall | null | undefined;
  open: boolean;
  onClose: () => void;
  labels?: Partial<ToolLabels>;
  /** Fetch the unclipped result (server-redacted plain text); only offered when the call has `result_clipped`. */
  onShowFull?: (call: HermesToolCall) => Promise<string>;
}

function CopyButton({ text, labels }: { text: string; labels: ToolLabels }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button variant="outlined" onClick={() => {
      void navigator.clipboard?.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }}>{copied ? labels.copied : labels.copy}</Button>
  );
}

function Body({ call, onClose, l, onShowFull }: { call: HermesToolCall; onClose: () => void; l: ToolLabels; onShowFull?: (call: HermesToolCall) => Promise<string> }) {
  const [tab, setTab] = useState<"request" | "response">("request");
  const [full, setFull] = useState<{ state: "idle" | "loading" | "failed" | "done"; text?: string }>({ state: "idle" });
  const loadFull = () => {
    setFull({ state: "loading" });
    onShowFull!(call).then((text) => setFull({ state: "done", text }), () => setFull({ state: "failed" }));
  };
  const result = full.state === "done" ? full.text ?? "" : call.result_preview;
  const status = statusOf(call);
  const dur = ToolRowFormat.duration(call.duration_s);
  const statusText = status === "failed" ? l.failed : status === "running" ? l.running : l.done;
  const argsJson = JSON.stringify(call.args ?? {}, null, 2);
  const hasArgs = !!call.args && Object.keys(call.args).length > 0;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 2 }}>
        <ToolIcon name={call.name} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap>{call.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {ToolFamily.label(call.name)} · {statusText}{dur ? ` · ${dur}` : ""}
          </Typography>
        </Box>
        <Tooltip title={l.close}><IconButton aria-label={l.close} onClick={onClose}><Close /></IconButton></Tooltip>
      </Box>
      <Tabs value={tab} onChange={(_, v: "request" | "response") => setTab(v)}>
        <Tab value="request" label={l.request} id="tool-tab-request" aria-controls="tool-panel" />
        <Tab value="response" label={l.response} id="tool-tab-response" aria-controls="tool-panel" />
      </Tabs>
      <Box role="tabpanel" id="tool-panel" aria-labelledby={`tool-tab-${tab}`} sx={{ p: 2, overflow: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 1, alignItems: "flex-start" }}>
        {tab === "request" ? (
          <>
            {hasArgs ? <JsonTree value={call.args} /> : <Typography variant="body2" color="text.secondary">{l.noArgs}</Typography>}
            {call.args_clipped && <Typography variant="caption" color="warning.main">{l.argsClipped}</Typography>}
            {hasArgs && <CopyButton text={argsJson} labels={l} />}
          </>
        ) : result ? (
          <>
            <Typography variant="body2" component="pre" sx={{ fontFamily: "monospace", whiteSpace: "pre-wrap", overflowWrap: "anywhere", m: 0 }}>{result}</Typography>
            {onShowFull && call.result_clipped && full.state !== "done" && (
              full.state === "loading" ? <Typography variant="caption" color="text.secondary" role="status">{l.loadingFull}</Typography> : (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {full.state === "failed" && <Typography variant="caption" color="error" role="alert">{l.showFullFailed}</Typography>}
                  <Link component="button" type="button" variant="caption" onClick={loadFull}>{l.showFull}</Link>
                </Box>
              )
            )}
            <CopyButton text={result} labels={l} />
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">{l.noResponse}</Typography>
        )}
      </Box>
    </Box>
  );
}

export function ToolDetailDrawer({ call, open, onClose, labels, onShowFull }: ToolDetailDrawerProps) {
  const l = { ...defaultToolLabels, ...labels };
  const theme = useTheme();
  const small = useMediaQuery(theme.breakpoints.down("md"));
  if (!call) return null;
  const body = <Body key={call.id} call={call} onClose={onClose} l={l} onShowFull={onShowFull} />;
  return small ? (
    <Dialog fullScreen open={open} onClose={onClose} aria-label={l.details}>{body}</Dialog>
  ) : (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { md: 440 }, maxWidth: "100%" }, "aria-label": l.details } as object }}>{body}</Drawer>
  );
}
