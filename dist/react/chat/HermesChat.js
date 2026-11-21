import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useTheme } from "@mui/material/styles";
import { visuallyHidden } from "@mui/utils";
import { ChatBox } from "@mui/x-chat";
import { useChat, useMessageContext } from "@mui/x-chat/headless";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { hermesChatAdapter, toChatMessages } from "../../adapter/adapter";
import { sendApproval, startOver } from "../../core/transport";
import { ParticipantAvatar } from "../avatar/ParticipantAvatar";
import { composerSlots } from "../composer/slots";
import { SessionInfoButton } from "../info/SessionInfo";
import { ToolDetailDrawer } from "../tools/ToolDetailDrawer";
import { defaultChatLabels } from "./labels";
import { hermesPartRenderers } from "./parts";
import { useFitHeight } from "./useFitHeight";
const CONVERSATION = "hermes";
/** Per-message avatar from the participants (the message role picks which). */
function avatarSlot(participants) {
    return function MessageAvatarSlot({ className }) {
        const { role } = useMessageContext();
        return (_jsx(Box, { className: className, sx: { display: "flex", alignItems: "flex-start" }, children: _jsx(ParticipantAvatar, { participant: role === "user" ? participants.user : participants.agent, size: "sm" }) }));
    };
}
/** The author line is dropped visually (compact header) but stays for screen readers. */
function HiddenAuthor({ children }) {
    return _jsx(Box, { component: "span", sx: visuallyHidden, children: children });
}
/** Paging status above the list: loading row, error + Retry, keyboard "Load earlier", start marker. */
function HistoryBar({ labels }) {
    const { messages, hasMoreHistory, isLoadingHistory, error, loadMoreHistory } = useChat();
    if (!messages.length)
        return null;
    const failed = error?.source === "history";
    return (_jsx(Box, { sx: { display: "flex", justifyContent: "center", alignItems: "center", gap: 1, px: 1.5, py: 0.5, flexShrink: 0 }, children: isLoadingHistory ? (_jsx(Typography, { variant: "caption", color: "text.secondary", role: "status", children: labels.loadingEarlier })) : failed ? (_jsxs(_Fragment, { children: [_jsx(Typography, { variant: "caption", color: "error", role: "alert", children: labels.loadEarlierFailed }), _jsx(Button, { variant: "outlined", color: "inherit", onClick: () => void loadMoreHistory(), children: labels.retry })] })) : hasMoreHistory ? (_jsx(Button, { variant: "text", color: "inherit", onClick: () => void loadMoreHistory(), children: labels.loadEarlier })) : (_jsx(Typography, { variant: "caption", color: "text.secondary", children: labels.startOfConversation })) }));
}
function Panel(props) {
    const { urls, target, csrf, history, renderHtml, participants, session, maxMessage, notice, linkedNote, changed, hasEarlier, earlierHref, onTurnEnd, toolbarActions, fit, fitHeight } = props;
    const labels = useMemo(() => ({ ...defaultChatLabels, ...props.labels }), [props.labels]);
    const [epoch, setEpoch] = useState(0);
    const [error, setError] = useState("");
    const [confirming, setConfirming] = useState(false);
    const [said, setSaid] = useState("");
    const [tool, setTool] = useState(null);
    const scroller = useRef(null);
    const { ref, maxHeight } = useFitHeight(fit, fitHeight);
    // After New chat the history is gone: an empty first page.
    const page = useMemo(() => (epoch ? { messages: [], cursor: null, hasMore: false } : history), [epoch, history]);
    const adapter = useMemo(() => hermesChatAdapter({ urls, target, csrf, initialPage: page }), [urls, target, csrf, page]);
    const initialMessages = useMemo(() => toChatMessages(page.messages), [page]);
    const partRenderers = useMemo(() => hermesPartRenderers({
        decide: (ev, choice) => sendApproval(urls.approval ?? "", target, ev, choice, csrf),
        renderHtml,
        onOpenTool: setTool,
        labels,
    }), [urls.approval, target, csrf, renderHtml, labels]);
    const composer = useMemo(() => composerSlots(labels, maxMessage), [labels, maxMessage]);
    const slots = useMemo(() => ({
        ...composer.slots,
        messageAvatar: avatarSlot(participants),
        messageAuthorName: HiddenAuthor,
        conversationHeader: () => _jsx(HistoryBar, { labels: labels }),
    }), [composer, participants, labels]);
    // x-chat only follows appends: open (and re-open after New chat) at the newest message.
    useLayoutEffect(() => {
        const el = scroller.current;
        if (!el)
            return;
        el.scrollTop = el.scrollHeight;
        const raf = requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; }); // rows are measured after first paint
        return () => cancelAnimationFrame(raf);
    }, [epoch]);
    const reset = async () => {
        setConfirming(false);
        try {
            if (!urls.new || !(await startOver(urls.new, target, csrf)))
                throw new Error("refused");
            setError("");
            setEpoch((n) => n + 1);
            onTurnEnd?.();
        }
        catch {
            setError(labels.startOverFailed);
        }
    };
    const earlier = hasEarlier && earlierHref;
    return (_jsxs(Paper, { ref: ref, variant: "outlined", "data-testid": "hermes-chat", sx: { display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0, bgcolor: "background.paper", overflow: "hidden", maxHeight: fitHeight && maxHeight ? maxHeight : undefined, height: fitHeight ? "auto" : "100%" }, children: [_jsxs(Box, { "data-testid": "hermes-chat-toolbar", sx: { display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1, flexShrink: 0, borderBottom: 1, borderColor: "divider" }, children: [_jsx(ParticipantAvatar, { participant: participants.agent, size: "sm" }), _jsx(Typography, { variant: "subtitle1", component: "h2", noWrap: true, sx: { flex: 1, minWidth: 0 }, children: participants.agent.name }), earlier && _jsx(Link, { href: earlierHref, children: labels.earlierConversations }), toolbarActions, session && _jsx(SessionInfoButton, { session: session, labels: labels, agentAvatar: _jsx(ParticipantAvatar, { participant: participants.agent }) }), _jsx(Tooltip, { title: labels.newChat, children: _jsx(IconButton, { "aria-label": labels.newChat, onClick: () => setConfirming(true), children: _jsx(AddCommentOutlined, {}) }) })] }), (linkedNote || notice || changed || error) && (_jsxs(Box, { sx: { display: "flex", flexDirection: "column", gap: 1, px: 1.5, pt: 1, flexShrink: 0 }, children: [linkedNote && _jsx(Typography, { variant: "body2", color: "text.secondary", children: linkedNote }), notice && _jsx(Alert, { severity: "warning", children: notice }), changed && _jsx(Typography, { variant: "caption", color: "text.secondary", role: "status", children: labels.changedNote }), error && _jsx(Alert, { severity: "error", onClose: () => setError(""), children: error })] })), _jsx(ChatBox, { adapter: adapter, initialMessages: initialMessages, initialActiveConversationId: CONVERSATION, currentUser: { id: "user", displayName: participants.user.name, role: "user" }, members: [
                    { id: "user", displayName: participants.user.name, role: "user" },
                    { id: "hermes", displayName: participants.agent.name, role: "assistant" },
                ], partRenderers: partRenderers, features: { attachments: false }, onFinish: () => { setSaid((s) => (s.endsWith("​") ? labels.replied : labels.replied + "​")); onTurnEnd?.(); }, slots: slots, slotProps: {
                    messageList: { autoScroll: true, slotProps: { messageListScroller: { ref: scroller, "aria-live": "off", "aria-label": labels.messageList } } },
                    messageContent: { sx: { maxWidth: "72ch", overflowWrap: "anywhere" } },
                }, sx: { flex: "0 1 auto", minHeight: 0, height: "auto", border: 0, bgcolor: "transparent" } }, epoch), _jsx(Box, { role: "status", "data-testid": "hermes-said", sx: visuallyHidden, children: said }), _jsx(ToolDetailDrawer, { call: tool, open: !!tool, onClose: () => setTool(null), labels: labels }), _jsxs(Dialog, { open: confirming, onClose: () => setConfirming(false), children: [_jsx(DialogTitle, { children: labels.newChatTitle }), _jsx(DialogContent, { children: _jsx(DialogContentText, { children: labels.newChatBody }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setConfirming(false), children: labels.cancel }), _jsx(Button, { variant: "contained", onClick: () => void reset(), children: labels.newChatConfirm })] })] })] }));
}
export function HermesChat(props) {
    const theme = useTheme();
    const phone = useMediaQuery(theme.breakpoints.down("md"));
    const labels = { ...defaultChatLabels, ...props.labels };
    const sheet = props.mode === "sheet" || (props.mode !== "inline" && phone);
    // lazy initialiser: mounting on a phone opens the sheet once; closing never reopens it
    const [open, setOpen] = useState(sheet);
    if (!sheet)
        return _jsx(Panel, { ...props, fitHeight: true });
    return (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "outlined", onClick: () => setOpen(true), children: labels.chatOpen }), _jsx(Dialog, { fullScreen: true, keepMounted: true, open: open, onClose: () => setOpen(false), "aria-label": labels.chat, children: _jsxs(Box, { sx: { display: "flex", flexDirection: "column", height: "100dvh", p: 1.5, gap: 1 }, children: [_jsx(Box, { sx: { display: "flex", justifyContent: "flex-end" }, children: _jsx(Button, { onClick: () => setOpen(false), children: labels.close }) }), _jsx(Box, { sx: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }, children: _jsx(Panel, { ...props, fitHeight: false }) })] }) })] }));
}
export default HermesChat;
