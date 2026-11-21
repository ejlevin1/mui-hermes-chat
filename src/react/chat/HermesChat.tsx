/**
 * `<HermesChat />`: one card (toolbar → notes → message list → composer) on `@mui/x-chat`, fed by `hermesChatAdapter`.
 * Final replies render through the consumer's `renderHtml`; history pages in when the list is scrolled to the top.
 */
import AddCommentOutlined from "@mui/icons-material/AddCommentOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme, type Theme } from "@mui/material/styles";
import { visuallyHidden } from "@mui/utils";
import { ChatBox } from "@mui/x-chat";
import { useChat, useMessageContext } from "@mui/x-chat/headless";
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AGENT_AUTHOR_ID, USER_AUTHOR_ID, hermesChatAdapter, toChatMessages } from "../../adapter/adapter";
import { sendApproval, startOver } from "../../core/transport";
import type { ChatUrls, CsrfSource, HermesMessage, HermesToolCall, Participant, SessionInfo, Target } from "../../core/types";
import { ParticipantAvatar } from "../avatar/ParticipantAvatar";
import { composerSlots } from "../composer/slots";
import { SessionInfoButton } from "../info/SessionInfo";
import { ToolDetailDrawer } from "../tools/ToolDetailDrawer";
import { defaultChatLabels, type ChatLabels } from "./labels";
import { hermesPartRenderers } from "./parts";
import { useFitHeight } from "./useFitHeight";

export interface HermesChatProps {
  urls: ChatUrls;
  target: Target;
  csrf: CsrfSource;
  /** Newest history page from the read model; older pages load through `urls.messages`. */
  history: { messages: HermesMessage[]; cursor: string | null; hasMore: boolean };
  /** Renders server-sanitised reply html (the package never injects html itself). */
  renderHtml: (html: string) => ReactNode;
  participants: { user: Participant; agent: Participant };
  /** Enables the Info button. */
  session?: SessionInfo;
  labels?: Partial<ChatLabels>;
  maxMessage?: number;
  /** Server notice, e.g. "The earlier messages could not be loaded just now." */
  notice?: string;
  linkedNote?: string;
  /** The subject changed under the user: show the note. */
  changed?: boolean;
  /** Earlier conversations: a link to `earlierHref` in the toolbar. */
  hasEarlier?: boolean;
  earlierHref?: string;
  /** Called after every finished turn and after New chat. */
  onTurnEnd?: () => void;
  /** `inline` is the card in place; `sheet` a full-screen dialog behind a button; `auto` = sheet on phones. */
  mode?: "inline" | "sheet" | "auto";
  fit?: { minHeight?: number; bottomGap?: number };
  toolbarActions?: ReactNode;
  /** Minimum gap on the side opposite a bubble's avatar (CSS length or px). Default: the avatar column (avatar + gutter). */
  bubbleOppositeGap?: number | string;
}

type PanelProps = HermesChatProps & { fitHeight: boolean };

const CONVERSATION = "hermes";

/** Default `bubbleOppositeGap`: the small avatar (spacing 4) plus the gutter (spacing 1). */
export const AVATAR_COLUMN = (theme: Theme) => theme.spacing(5);

/** x-chat message slot styling: content-sized bubbles, capped at thread − own column − opposite column. */
export function bubbleSlotProps(theme: Theme, oppositeGap?: number | string) {
  const gap = oppositeGap === undefined ? AVATAR_COLUMN(theme) : typeof oppositeGap === "number" ? `${oppositeGap}px` : oppositeGap;
  return {
    messageRoot: {
      sx: {
        "&&": { gridTemplateColumns: "auto minmax(0, 1fr)", columnGap: theme.spacing(1), paddingInline: theme.spacing(1.5), paddingBlock: `0 ${theme.spacing(1.5)}`, alignItems: "start" },
        "&&.MuiChatMessage-roleUser": { gridTemplateColumns: "minmax(0, 1fr) auto" },
        "&.MuiChatMessage-roleUser .MuiChatMessage-content": { justifySelf: "end" },
        "&.MuiChatMessage-roleUser .MuiChatMessage-bubble": { bgcolor: "primary.main", color: "primary.contrastText" },
      },
    },
    messageContent: {
      sx: {
        // the grid cell already excludes the own avatar column; subtract the opposite column
        maxWidth: `calc(100% - ${gap})`,
        width: "fit-content",
        minWidth: 0,
        overflowWrap: "anywhere",
        justifySelf: "start",
        "& .MuiChatMessage-bubble": { borderRadius: theme.shape.borderRadius, padding: theme.spacing(1, 1.5), bgcolor: "action.hover", color: "text.primary" },
      },
    },
  };
}

/** Per-message avatar from the participants (the message role picks which). */
function avatarSlot(participants: HermesChatProps["participants"]) {
  return function MessageAvatarSlot({ className }: { className?: string }) {
    const { role } = useMessageContext();
    return (
      <Box className={className} sx={{ display: "flex", alignItems: "flex-start" }}>
        <ParticipantAvatar participant={role === "user" ? participants.user : participants.agent} size="sm" />
      </Box>
    );
  };
}

/** The author line is dropped visually (compact header) but stays for screen readers. */
function HiddenAuthor({ children }: { children?: ReactNode }) {
  return <Box component="span" sx={visuallyHidden}>{children}</Box>;
}

/** Paging status above the list: loading row, error + Retry, keyboard "Load earlier", start marker. */
function HistoryBar({ labels }: { labels: ChatLabels }) {
  const { messages, hasMoreHistory, isLoadingHistory, error, loadMoreHistory } = useChat();
  if (!messages.length) return null;
  const failed = error?.source === "history";
  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1, px: 1.5, py: 0.5, flexShrink: 0 }}>
      {isLoadingHistory ? (
        <Typography variant="caption" color="text.secondary" role="status">{labels.loadingEarlier}</Typography>
      ) : failed ? (
        <>
          <Typography variant="caption" color="error" role="alert">{labels.loadEarlierFailed}</Typography>
          <Button variant="outlined" color="inherit" onClick={() => void loadMoreHistory()}>{labels.retry}</Button>
        </>
      ) : hasMoreHistory ? (
        <Button variant="text" color="inherit" onClick={() => void loadMoreHistory()}>{labels.loadEarlier}</Button>
      ) : (
        <Typography variant="caption" color="text.secondary">{labels.startOfConversation}</Typography>
      )}
    </Box>
  );
}

function Panel(props: PanelProps) {
  const { urls, target, csrf, history, renderHtml, participants, session, maxMessage, notice, linkedNote, changed, hasEarlier, earlierHref, onTurnEnd, toolbarActions, fit, fitHeight, bubbleOppositeGap } = props;
  const theme = useTheme();
  const bubbles = useMemo(() => bubbleSlotProps(theme, bubbleOppositeGap), [theme, bubbleOppositeGap]);
  const labels = useMemo<ChatLabels>(() => ({ ...defaultChatLabels, ...props.labels }), [props.labels]);
  const [epoch, setEpoch] = useState(0);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [said, setSaid] = useState("");
  const [tool, setTool] = useState<HermesToolCall | null>(null);
  const scroller = useRef<HTMLElement | null>(null);
  const { ref, maxHeight } = useFitHeight<HTMLDivElement>(fit, fitHeight);

  // After New chat the history is gone: an empty first page.
  const page = useMemo(() => (epoch ? { messages: [], cursor: null, hasMore: false } : history), [epoch, history]);
  const adapter = useMemo(
    () => hermesChatAdapter({ urls, target, csrf, initialPage: page }),
    [urls, target, csrf, page],
  );
  const initialMessages = useMemo(() => toChatMessages(page.messages), [page]);
  const partRenderers = useMemo(
    () => hermesPartRenderers({
      decide: (ev, choice) => sendApproval(urls.approval ?? "", target, ev, choice, csrf),
      renderHtml,
      onOpenTool: setTool,
      labels,
    }),
    [urls.approval, target, csrf, renderHtml, labels],
  );
  const composer = useMemo(() => composerSlots(labels, maxMessage), [labels, maxMessage]);
  const slots = useMemo(
    () => ({
      ...composer.slots,
      messageAvatar: avatarSlot(participants),
      messageAuthorName: HiddenAuthor,
      conversationHeader: () => <HistoryBar labels={labels} />,
    }),
    [composer, participants, labels],
  );

  // x-chat only follows appends: open (and re-open after New chat) at the newest message.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    const raf = requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; }); // rows are measured after first paint
    return () => cancelAnimationFrame(raf);
  }, [epoch]);

  const reset = async () => {
    setConfirming(false);
    try {
      if (!urls.new || !(await startOver(urls.new, target, csrf))) throw new Error("refused");
      setError("");
      setEpoch((n) => n + 1);
      onTurnEnd?.();
    } catch {
      setError(labels.startOverFailed);
    }
  };

  const earlier = hasEarlier && earlierHref;
  return (
    <Paper
      ref={ref}
      variant="outlined"
      data-testid="hermes-chat"
      sx={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0, bgcolor: "background.paper", overflow: "hidden", maxHeight: fitHeight && maxHeight ? maxHeight : undefined, height: fitHeight ? "auto" : "100%" }}
    >
      <Box
        data-testid="hermes-chat-toolbar"
        sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1, flexShrink: 0, borderBottom: 1, borderColor: "divider" }}
      >
        <ParticipantAvatar participant={participants.agent} size="sm" />
        <Typography variant="subtitle1" component="h2" noWrap sx={{ flex: 1, minWidth: 0 }}>{participants.agent.name}</Typography>
        {earlier && <Link href={earlierHref}>{labels.earlierConversations}</Link>}
        {toolbarActions}
        {session && <SessionInfoButton session={session} labels={labels} agentAvatar={<ParticipantAvatar participant={participants.agent} />} />}
        <Tooltip title={labels.newChat}>
          <IconButton aria-label={labels.newChat} onClick={() => setConfirming(true)}><AddCommentOutlined /></IconButton>
        </Tooltip>
      </Box>
      {(linkedNote || notice || changed || error) && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, px: 1.5, pt: 1, flexShrink: 0 }}>
          {linkedNote && <Typography variant="body2" color="text.secondary">{linkedNote}</Typography>}
          {notice && <Alert severity="warning">{notice}</Alert>}
          {changed && <Typography variant="caption" color="text.secondary" role="status">{labels.changedNote}</Typography>}
          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
        </Box>
      )}
      <ChatBox
        key={epoch}
        adapter={adapter}
        initialMessages={initialMessages}
        initialActiveConversationId={CONVERSATION}
        currentUser={{ id: USER_AUTHOR_ID, displayName: participants.user.name, role: "user" }}
        members={[
          { id: USER_AUTHOR_ID, displayName: participants.user.name, role: "user" },
          { id: AGENT_AUTHOR_ID, displayName: participants.agent.name, role: "assistant" },
        ]}
        getMessageAuthorId={(m) => m.author?.id ?? (m.role === "user" ? USER_AUTHOR_ID : AGENT_AUTHOR_ID)}
        partRenderers={partRenderers}
        features={{ attachments: false }}
        onFinish={() => { setSaid((s) => (s.endsWith("​") ? labels.replied : labels.replied + "​")); onTurnEnd?.(); }}
        slots={slots}
        slotProps={{
          messageList: { autoScroll: true, slotProps: { messageListScroller: { ref: scroller, "aria-live": "off", "aria-label": labels.messageList } } },
          ...bubbles,
        } as never}
        sx={{ flex: "0 1 auto", minHeight: 0, height: "auto", border: 0, bgcolor: "transparent" }}
      />
      <Box role="status" data-testid="hermes-said" sx={visuallyHidden}>{said}</Box>
      <ToolDetailDrawer call={tool} open={!!tool} onClose={() => setTool(null)} labels={labels} />
      <Dialog open={confirming} onClose={() => setConfirming(false)}>
        <DialogTitle>{labels.newChatTitle}</DialogTitle>
        <DialogContent><DialogContentText>{labels.newChatBody}</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>{labels.cancel}</Button>
          <Button variant="contained" onClick={() => void reset()}>{labels.newChatConfirm}</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

export function HermesChat(props: HermesChatProps) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("md"));
  const labels = { ...defaultChatLabels, ...props.labels };
  const sheet = props.mode === "sheet" || (props.mode !== "inline" && phone);
  // lazy initialiser: mounting on a phone opens the sheet once; closing never reopens it
  const [open, setOpen] = useState(sheet);
  if (!sheet) return <Panel {...props} fitHeight />;
  return (
    <>
      <Button variant="outlined" onClick={() => setOpen(true)}>{labels.chatOpen}</Button>
      <Dialog fullScreen keepMounted open={open} onClose={() => setOpen(false)} aria-label={labels.chat}>
        <Box sx={{ display: "flex", flexDirection: "column", height: "100dvh", p: 1.5, gap: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={() => setOpen(false)}>{labels.close}</Button>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <Panel {...props} fitHeight={false} />
          </Box>
        </Box>
      </Dialog>
    </>
  );
}

export default HermesChat;
