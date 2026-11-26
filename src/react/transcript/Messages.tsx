/** Transcript message rendering: bubbles, Steps card with subagent groups inside tool rows. */
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { createContext, useContext, useId, useState, type ReactNode } from "react";
import type { TranscriptMessage } from "../../core/transcript";
import type { HermesToolCall, Participant } from "../../core/types";
import { ParticipantAvatar } from "../avatar/ParticipantAvatar";
import { StreamedText } from "../chat/parts";
import { ThinkingPart } from "../chat/ThinkingPart";
import { ToolRow } from "../tools/ToolRow";
import { ToolRowFormat } from "../tools/format";
import type { TranscriptLabels } from "./labels";
import { ShowFull } from "./ShowFull";

export interface Ctx {
  labels: TranscriptLabels;
  participants: { user: Participant; agent: Participant; subagent?: Participant };
  agentBubble: "plain" | "filled";
  /** subagent messages by the tool call id that spawned them */
  children: Map<string, TranscriptMessage[]>;
  onOpenTool: (call: HermesToolCall, message: string) => void;
  onShowFull?: (ref: { message: string; tool?: string; field: "text" | "reasoning" | "result" }) => Promise<string>;
}
export const TranscriptCtx = createContext<Ctx | null>(null);
const useCtx = () => useContext(TranscriptCtx)!;

const wrap = { overflowWrap: "anywhere", minWidth: 0 } as const;

function Full({ m, field, text }: { m: TranscriptMessage; field: "text" | "reasoning"; text: string }) {
  const { labels, onShowFull } = useCtx();
  const clipped = field === "text" ? m.text_clipped : m.reasoning_clipped;
  const plain = (t: string) => <Typography variant="body2" component="div" sx={{ ...wrap, whiteSpace: "pre-wrap" }}>{t}</Typography>;
  if (field === "reasoning") {
    return (
      <ShowFull labels={labels} load={clipped && onShowFull ? () => onShowFull({ message: m.id, field }) : undefined} render={(t) => <ThinkingPart text={t} labels={labels as never} />}>
        <ThinkingPart text={text} labels={labels as never} />
      </ShowFull>
    );
  }
  return (
    <ShowFull labels={labels} load={clipped && onShowFull ? () => onShowFull({ message: m.id, field }) : undefined} render={plain}>
      <StreamedText text={text} />
    </ShowFull>
  );
}

export function SubagentGroup({ parent, messages }: { parent: string; messages: TranscriptMessage[] }) {
  const { labels, participants } = useCtx();
  const [open, setOpen] = useState(false);
  const id = useId();
  const who = participants.subagent ?? { name: labels.subagent };
  const running = messages.some((m) => m.tools?.some((t) => t.state === "start"));
  return (
    <Box data-testid="subagent-group" data-parent={parent} sx={{ ml: 3, mt: 0.5, minWidth: 0, borderLeft: 2, borderColor: "divider", pl: 1 }}>
      <ButtonBase aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)} sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", justifyContent: "flex-start", textAlign: "left", py: 0.5 }}>
        <ParticipantAvatar participant={who} size="sm" />
        <Typography variant="body2" noWrap sx={{ fontWeight: "fontWeightMedium", minWidth: 0 }}>{who.name}</Typography>
        <Typography variant="caption" color="text.secondary">{labels.subagentCount(messages.length)} · {running ? labels.running : labels.done}</Typography>
        <ExpandMore fontSize="small" sx={{ ml: "auto", transform: open ? "rotate(180deg)" : "none" }} />
      </ButtonBase>
      {open && (
        <Box id={id} sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
          {messages.map((m) => <MessageView key={m.id} m={m} />)}
        </Box>
      )}
    </Box>
  );
}

function Steps({ m, calls }: { m: TranscriptMessage; calls: HermesToolCall[] }) {
  const { labels, children, onOpenTool } = useCtx();
  const live = calls.filter((c) => c.state === "start").length;
  const failed = calls.filter((c) => c.state === "failed").length;
  const total = calls.reduce((s, c) => s + (c.duration_s ?? 0), 0);
  const dur = ToolRowFormat.duration(calls.some((c) => c.duration_s !== undefined) ? total : undefined);
  const count = live > 0 ? labels.stepsProgress(calls.length - live, live) : labels.steps(calls.length) + (dur ? ` · ${dur}` : "");
  return (
    <Box data-testid="tool-step-group" sx={{ display: "flex", flexDirection: "column", gap: 0.5, border: 1, borderColor: "divider", borderRadius: 1, p: 1, width: "100%", boxSizing: "border-box", minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, px: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: "fontWeightMedium" }}>{labels.stepsHeader}</Typography>
        <Typography variant="caption" color="text.secondary">{count}</Typography>
        {failed > 0 && <Typography variant="caption" color="error">{labels.failedCount(failed)}</Typography>}
      </Box>
      {calls.map((c, i) => {
        const sub = children.get(c.id);
        return (
          <Box key={c.id} sx={{ minWidth: 0 }}>
            <ToolRow call={c} running={c.state === "start"} onOpen={(x) => onOpenTool(x, m.id)} labels={labels} inCard first={i === 0} last={i === calls.length - 1} />
            {sub && sub.length > 0 && <SubagentGroup parent={c.id} messages={sub} />}
          </Box>
        );
      })}
    </Box>
  );
}

export function MessageView({ m }: { m: TranscriptMessage }): ReactNode {
  const { participants, agentBubble, onShowFull, labels } = useCtx();
  const user = m.role === "user";
  const who = user ? participants.user : participants.agent;
  const calls = m.tools ?? [];
  const body: ReactNode[] = [];
  if (m.reasoning) body.push(<Full key="r" m={m} field="reasoning" text={m.reasoning} />);
  if (calls.length) body.push(<Steps key="s" m={m} calls={calls} />);
  if (m.text) body.push(<Full key="t" m={m} field="text" text={m.text} />);
  void onShowFull; void labels;
  if (!body.length) return null;
  const filled = user || agentBubble === "filled";
  return (
    <Box data-testid="transcript-message" data-role={m.role} sx={{ display: "flex", flexDirection: user ? "row-reverse" : "row", alignItems: "flex-start", gap: 1, px: 1.5, minWidth: 0 }}>
      <Box aria-label={labels.author(who.name)} sx={{ flexShrink: 0 }}><ParticipantAvatar participant={who} size="sm" /></Box>
      <Box
        sx={(t) => ({
          display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0, maxWidth: "100%",
          ...(user ? { bgcolor: "primary.main", color: "primary.contrastText" } : filled ? { bgcolor: "action.hover" } : {}),
          ...(filled ? { px: 1.5, py: 1, borderRadius: 1 } : { py: 0.5, flex: 1 }),
          ...(user ? {} : { color: t.palette.text.primary }),
        })}
      >
        {body}
      </Box>
    </Box>
  );
}
