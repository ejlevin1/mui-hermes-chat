/** Session info: IconButton + right Drawer (full-screen Dialog under md) with session fields and resume command. */
import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import type { SessionInfo } from "../../core/types";

export interface SessionInfoLabels {
  button: string;
  title: string;
  close: string;
  sessionId: string;
  sessionTitle: string;
  profile: string;
  type: string;
  created: string;
  lastTurn: string;
  messages: string;
  status: string;
  active: string;
  archived: string;
  resume: string;
  copy: string;
  copied: string;
  empty: string;
}

export const DEFAULT_INFO_LABELS: SessionInfoLabels = {
  button: "Session info",
  title: "Session",
  close: "Close",
  sessionId: "Session ID",
  sessionTitle: "Title",
  profile: "Profile",
  type: "Type",
  created: "Created",
  lastTurn: "Last turn",
  messages: "Messages",
  status: "Status",
  active: "Active",
  archived: "Archived",
  resume: "Resume in a terminal",
  copy: "Copy",
  copied: "Copied",
  empty: "—",
};

export interface SessionInfoDrawerProps {
  session: SessionInfo;
  open: boolean;
  onClose: () => void;
  labels?: Partial<SessionInfoLabels>;
  agentAvatar?: ReactNode;
}

export interface SessionInfoButtonProps {
  session: SessionInfo;
  labels?: Partial<SessionInfoLabels>;
  agentAvatar?: ReactNode;
}

const RTF_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

function relative(epoch: number): string {
  const diff = epoch - Date.now() / 1000;
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, secs] of RTF_UNITS) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return rtf.format(Math.round(diff), "second");
}

const absolute = (epoch: number) => new Date(epoch * 1000).toLocaleString();

function CopyButton({ value, labels }: { value: string; labels: SessionInfoLabels }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={copy}>
      {copied ? labels.copied : labels.copy}
    </Button>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ display: "contents" }}>
      <Typography variant="body2" color="text.secondary" component="dt">
        {label}
      </Typography>
      <Typography variant="body2" component="dd" sx={{ m: 0, minWidth: 0, overflowWrap: "anywhere" }}>
        {children}
      </Typography>
    </Box>
  );
}

const mono = { fontFamily: "monospace", overflowWrap: "anywhere" } as const;

function InfoBody({ session, labels, agentAvatar, onClose }: Omit<SessionInfoDrawerProps, "open" | "labels"> & { labels: SessionInfoLabels }) {
  const dash = labels.empty;
  const val = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? dash : v);
  const time = (t: number | null) =>
    t === null || t === undefined ? (
      dash
    ) : (
      <span title={absolute(t)}>{relative(t)}</span>
    );
  return (
    <Stack spacing={3} sx={{ p: 3, width: { xs: "100%", md: 440 }, maxWidth: "100%" }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" component="h2">
          {labels.title}
        </Typography>
        <Tooltip title={labels.close}>
          <IconButton aria-label={labels.close} onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Stack>
      <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: "max-content 1fr", columnGap: 3, rowGap: 1.5 }}>
        <Row label={labels.sessionId}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Box component="span" sx={mono}>
              {val(session.id)}
            </Box>
            {session.id ? <CopyButton value={session.id} labels={labels} /> : null}
          </Stack>
        </Row>
        <Row label={labels.sessionTitle}>{val(session.title)}</Row>
        <Row label={labels.profile}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            {agentAvatar}
            <span>{val(session.profile)}</span>
          </Stack>
        </Row>
        <Row label={labels.type}>{val(session.source)}</Row>
        <Row label={labels.created}>{time(session.created)}</Row>
        <Row label={labels.lastTurn}>{time(session.lastTurn)}</Row>
        <Row label={labels.messages}>{val(session.messages)}</Row>
        <Row label={labels.status}>{session.active ? labels.active : labels.archived}</Row>
      </Box>
      <Stack spacing={1}>
        <Typography variant="subtitle2" component="h3">
          {labels.resume}
        </Typography>
        {session.resumeCmd ? (
          <>
            <Box
              component="pre"
              sx={{ ...mono, m: 0, p: 1.5, borderRadius: 1, bgcolor: "action.hover", whiteSpace: "pre-wrap", typography: "body2" }}
            >
              {session.resumeCmd}
            </Box>
            <Box>
              <CopyButton value={session.resumeCmd} labels={labels} />
            </Box>
          </>
        ) : (
          <Typography variant="body2">{dash}</Typography>
        )}
      </Stack>
    </Stack>
  );
}

export function SessionInfoDrawer({ session, open, onClose, labels, agentAvatar }: SessionInfoDrawerProps) {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up("md"));
  const l = { ...DEFAULT_INFO_LABELS, ...labels };
  const body = <InfoBody session={session} labels={l} agentAvatar={agentAvatar} onClose={onClose} />;
  if (wide) {
    return (
      <Drawer anchor="right" open={open} onClose={onClose} aria-label={l.title}>
        {body}
      </Drawer>
    );
  }
  return (
    <Dialog fullScreen open={open} onClose={onClose} aria-label={l.title}>
      {body}
    </Dialog>
  );
}

export function SessionInfoButton({ session, labels, agentAvatar }: SessionInfoButtonProps) {
  const [open, setOpen] = useState(false);
  const l = { ...DEFAULT_INFO_LABELS, ...labels };
  return (
    <>
      <Tooltip title={l.button}>
        <IconButton aria-label={l.button} onClick={() => setOpen(true)}>
          <InfoOutlinedIcon />
        </IconButton>
      </Tooltip>
      <SessionInfoDrawer session={session} open={open} onClose={() => setOpen(false)} labels={labels} agentAvatar={agentAvatar} />
    </>
  );
}
