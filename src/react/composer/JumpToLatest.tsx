/** Round "jump to latest" button: `JumpToLatest` (public, standalone) and the composer-area split (publisher + button). */
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import { useEffect } from "react";
import { useMessageListContext } from "@mui/x-chat-headless";
import { defaultComposerLabels, type ComposerLabels } from "./labels";

export interface JumpState { isAtBottom: boolean; unseenMessageCount: number; scrollToBottom: (o?: { behavior?: "smooth" | "auto" }) => void }

/** Presentational button: rendered in the composer area, in flow above the composer (never over message text). */
export function JumpButton({ labels, state }: { labels?: Partial<ComposerLabels>; state: JumpState | null }) {
  const l = { ...defaultComposerLabels, ...labels };
  if (!state || state.isAtBottom) return null;
  const fresh = state.unseenMessageCount > 0;
  return (
    <Box data-testid="jump-to-latest" sx={{ display: "flex", justifyContent: "center", pb: 1 }}>
      <Tooltip title={l.jumpToLatest}>
        <Button
          variant="contained"
          color="inherit"
          aria-label={l.jumpToLatest}
          onClick={() => state.scrollToBottom({ behavior: "smooth" })}
          startIcon={fresh ? <KeyboardArrowDown /> : undefined}
          sx={{ borderRadius: 4, minWidth: 0, bgcolor: "background.paper", color: "text.primary", border: 1, borderColor: "divider" }}
        >
          {fresh ? l.newMessages : <KeyboardArrowDown />}
        </Button>
      </Tooltip>
    </Box>
  );
}

/** Public, self-contained: reads the list scroll state and renders the button (usable as any ChatBox scrollToBottom slot). */
export function JumpToLatest({ labels }: { labels?: Partial<ComposerLabels> }) {
  return <JumpButton labels={labels} state={useMessageListContext()} />;
}

/** Module-only: reads the list scroll state (only available inside the message list) and hands it to `publish`; renders nothing. */
export function JumpStatePublisher({ publish }: { publish: (s: JumpState) => void }) {
  const { isAtBottom, unseenMessageCount, scrollToBottom } = useMessageListContext();
  useEffect(() => { publish({ isAtBottom, unseenMessageCount, scrollToBottom }); }, [publish, isAtBottom, unseenMessageCount, scrollToBottom]);
  return null;
}
