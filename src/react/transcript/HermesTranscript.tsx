/** Read-only live view of one agent attempt: message list, Steps cards, thinking, paging back, follow over a TranscriptFeed. */
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { keyframes } from "@mui/system";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { maxSeq, mergeTranscript, type TranscriptFeed, type TranscriptMessage, type TranscriptStatus } from "../../core/transcript";
import type { HermesToolCall, Participant } from "../../core/types";
import { ParticipantAvatar } from "../avatar/ParticipantAvatar";
import { useFitHeight } from "../chat/useFitHeight";
import { ToolDetailDrawer } from "../tools/ToolDetailDrawer";
import { MessageView, SubagentGroup, TranscriptCtx, type Ctx } from "./Messages";
import { defaultTranscriptLabels, type TranscriptLabels } from "./labels";

export interface HermesTranscriptProps {
  feed: TranscriptFeed;
  participants: { user: Participant; agent: Participant; subagent?: Participant };
  /** Default true: follow() after the first page; false = history only. */
  live?: boolean;
  onShowFull?: Ctx["onShowFull"];
  onStatus?: (s: TranscriptStatus) => void;
  labels?: Partial<TranscriptLabels>;
  fit?: { minHeight?: number; bottomGap?: number };
  agentBubble?: "plain" | "filled";
  emptyText?: string;
}

const pulse = keyframes`0%,100%{opacity:1}50%{opacity:.35}`;
const NEAR = 48;

type Row = { kind: "message"; m: TranscriptMessage } | { kind: "orphans"; parent: string; ms: TranscriptMessage[] };

/** Subagent messages by spawning call id, and the top-level rows (orphan subagent runs stay at their own position). */
export function layout(list: TranscriptMessage[]): { rows: Row[]; children: Map<string, TranscriptMessage[]> } {
  const known = new Set<string>();
  for (const m of list) for (const t of m.tools ?? []) known.add(t.id);
  const children = new Map<string, TranscriptMessage[]>();
  const rows: Row[] = [];
  for (const m of list) {
    const p = m.subagent_of;
    if (!p) { rows.push({ kind: "message", m }); continue; }
    if (known.has(p)) { children.set(p, [...(children.get(p) ?? []), m]); continue; }
    const last = rows[rows.length - 1];
    if (last && last.kind === "orphans" && last.parent === p) last.ms.push(m);
    else rows.push({ kind: "orphans", parent: p, ms: [m] });
  }
  return { rows, children };
}

export function HermesTranscript({ feed, participants, live = true, onShowFull, onStatus, labels: lp, fit, agentBubble = "plain", emptyText }: HermesTranscriptProps) {
  const labels = useMemo<TranscriptLabels>(() => ({ ...defaultTranscriptLabels, ...lp }), [lp]);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [firstError, setFirstError] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [older, setOlder] = useState<"idle" | "loading" | "error">("idle");
  const [status, setStatus] = useState<TranscriptStatus | null>(null);
  const [tool, setTool] = useState<{ call: HermesToolCall; message: string } | null>(null);
  const [unseen, setUnseen] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const held = useRef<TranscriptMessage[]>([]);
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const pending = useRef<"bottom" | "keep" | "follow" | null>("bottom");
  const prevHeight = useRef(0);
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;
  const { ref: paperRef, maxHeight } = useFitHeight<HTMLDivElement>(fit ?? {});

  const apply = useCallback((next: TranscriptMessage[], how: "bottom" | "keep" | "follow") => {
    held.current = next;
    pending.current = how;
    setMessages(next);
  }, []);
  const report = useCallback((s: TranscriptStatus) => { setStatus(s); onStatusRef.current?.(s); }, []);

  useEffect(() => {
    held.current = [];
    setMessages([]); setLoaded(false); setFirstError(false); setCursor(null); setHasMore(false); setOlder("idle"); setStatus(null); setUnseen(false);
    atBottom.current = true;
    const ac = new AbortController();
    let stop: (() => void) | undefined;
    let dead = false;
    report({ state: "connecting" });
    feed.page(null, ac.signal).then((page) => {
      if (dead) return;
      apply(mergeTranscript([], page.messages, "append"), "bottom");
      setCursor(page.cursor); setHasMore(page.hasMore); setLoaded(true);
      if (live === false) return;
      stop = feed.follow(maxSeq(held.current), {
        message: (m) => {
          if (dead) return;
          apply(mergeTranscript(held.current, [m], "append"), "follow");
        },
        status: (s) => { if (!dead) report(s); },
      });
    }, () => {
      if (dead) return;
      setFirstError(true); setLoaded(true);
      report({ state: "error", error: labels.loadFailed });
    });
    return () => { dead = true; ac.abort(); stop?.(); };
    // labels.loadFailed is only a message for the error status
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed, live, attempt, apply, report]);

  const loadOlder = () => {
    if (older === "loading" || !hasMore) return;
    setOlder("loading");
    const el = scroller.current;
    prevHeight.current = el ? el.scrollHeight : 0;
    const f = feed;
    f.page(cursor).then((page) => {
      if (f !== feed) return;
      apply(mergeTranscript(held.current, page.messages, "prepend"), "keep");
      setCursor(page.cursor); setHasMore(page.hasMore); setOlder("idle");
    }, () => { setOlder("error"); });
  };

  useLayoutEffect(() => {
    const el = scroller.current;
    const how = pending.current;
    pending.current = null;
    if (!el || !how) return;
    if (how === "bottom") { el.scrollTop = el.scrollHeight; atBottom.current = true; }
    else if (how === "keep") el.scrollTop += el.scrollHeight - prevHeight.current;
    else if (atBottom.current) el.scrollTop = el.scrollHeight;
    else setUnseen(true);
  }, [messages]);

  const jump = () => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
    atBottom.current = true; setUnseen(false); setNotBottom(false);
  };
  const [notBottom, setNotBottom] = useState(false);
  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR;
    atBottom.current = near;
    setNotBottom(!near);
    if (near) setUnseen(false);
  };

  const { rows, children } = useMemo(() => layout(messages), [messages]);
  const ctx = useMemo<Ctx>(() => ({
    labels, participants, agentBubble, children,
    onOpenTool: (call, message) => setTool({ call, message }),
    onShowFull,
  }), [labels, participants, agentBubble, children, onShowFull]);

  // keep the open drawer's call current when the message is re-sent
  const openCall = useMemo(() => {
    if (!tool) return null;
    const m = messages.find((x) => x.id === tool.message);
    return m?.tools?.find((t) => t.id === tool.call.id) ?? tool.call;
  }, [tool, messages]);

  const state = status?.state;
  const chipLabel = state === "live" ? labels.live : state === "reconnecting" ? labels.reconnecting : state === "ended" ? labels.ended : state === "error" ? labels.error : null;
  const empty = loaded && !firstError && messages.length === 0;
  const showJump = notBottom || unseen;

  return (
    <Paper ref={paperRef} variant="outlined" data-testid="hermes-transcript" sx={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0, bgcolor: "background.paper", overflow: "hidden", position: "relative", maxHeight: maxHeight ?? undefined }}>
      <Box data-testid="hermes-transcript-header" sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1, flexShrink: 0, borderBottom: 1, borderColor: "divider" }}>
        <ParticipantAvatar participant={participants.agent} size="sm" />
        <Typography variant="subtitle1" component="h2" noWrap sx={{ flex: 1, minWidth: 0 }}>{participants.agent.name}</Typography>
        {chipLabel && (
          <Chip
            size="small"
            variant="outlined"
            role="status"
            data-testid="transcript-status"
            data-state={state}
            color={state === "live" ? "success" : state === "error" ? "error" : state === "reconnecting" ? "warning" : "default"}
            label={chipLabel}
            icon={state === "live" ? (
              <Box aria-hidden component="span" sx={{ width: "0.5em", height: "0.5em", borderRadius: "50%", bgcolor: "currentColor", animation: `${pulse} 1.6s ease-in-out infinite`, "@media (prefers-reduced-motion: reduce)": { animation: "none" } }} />
            ) : undefined}
          />
        )}
      </Box>
      <Box sx={{ position: "relative", display: "flex", flexDirection: "column", minHeight: 0, flex: "1 1 auto" }}>
        <Box
          ref={scroller}
          role="log"
          aria-live="off"
          aria-label={labels.transcript}
          onScroll={onScroll}
          sx={{ overflowY: "auto", overflowX: "hidden", minHeight: 0, maxHeight: maxHeight ? `calc(${maxHeight}px - 3.5rem)` : undefined, display: "flex", flexDirection: "column", gap: 1.5, py: 1, minWidth: 0 }}
        >
          {firstError ? (
            <Box sx={{ px: 1.5 }}>
              <Alert severity="error" action={<Button color="inherit" onClick={() => setAttempt((n) => n + 1)}>{labels.retry}</Button>}>{labels.loadFailed}</Alert>
            </Box>
          ) : !loaded ? null : empty ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, py: 2, textAlign: "center" }}>{emptyText ?? labels.empty}</Typography>
          ) : (
            <TranscriptCtx.Provider value={ctx}>
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1, px: 1.5, py: 0.5, flexShrink: 0 }}>
                {older === "loading" ? (
                  <Typography variant="caption" color="text.secondary" role="status">{labels.loadingEarlier}</Typography>
                ) : older === "error" ? (
                  <>
                    <Typography variant="caption" color="error" role="alert">{labels.loadEarlierFailed}</Typography>
                    <Button variant="outlined" color="inherit" onClick={loadOlder}>{labels.retry}</Button>
                  </>
                ) : hasMore ? (
                  <Button variant="text" color="inherit" onClick={loadOlder}>{labels.loadEarlier}</Button>
                ) : (
                  <Typography variant="caption" color="text.secondary">{labels.startOfConversation}</Typography>
                )}
              </Box>
              {rows.map((r) => r.kind === "message"
                ? <MessageView key={r.m.id} m={r.m} />
                : <Box key={`o:${r.parent}:${r.ms[0].id}`} sx={{ px: 1.5, minWidth: 0 }}><SubagentGroup parent={r.parent} messages={r.ms} /></Box>)}
            </TranscriptCtx.Provider>
          )}
        </Box>
        {showJump && (
          <Box sx={{ position: "absolute", left: 0, right: 0, bottom: 1, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
            <Button variant="contained" size="small" onClick={jump} sx={{ pointerEvents: "auto" }}>{unseen ? labels.newMessages : labels.jumpToLatest}</Button>
          </Box>
        )}
      </Box>
      <ToolDetailDrawer
        call={openCall}
        open={!!tool}
        onClose={() => setTool(null)}
        labels={labels}
        onShowFull={onShowFull && tool ? (c) => onShowFull({ message: tool.message, tool: c.id, field: "result" }) : undefined}
      />
    </Paper>
  );
}

export default HermesTranscript;
