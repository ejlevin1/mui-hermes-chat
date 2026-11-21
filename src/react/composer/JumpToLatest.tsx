/** Round "jump to latest" button, centred above the composer; replaces the x-chat scrollToBottom slot. */
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import { useMessageListContext } from "@mui/x-chat-headless";
import { defaultComposerLabels, type ComposerLabels } from "./labels";

export function JumpToLatest({ labels }: { labels?: Partial<ComposerLabels> }) {
  const l = { ...defaultComposerLabels, ...labels };
  const { isAtBottom, unseenMessageCount, scrollToBottom } = useMessageListContext();
  if (isAtBottom) return null;
  const fresh = unseenMessageCount > 0;
  return (
    // zero-height sticky row at the bottom of the list area: the button sits in flow above the composer
    <Box sx={{ position: "sticky", bottom: 0, height: 0, display: "flex", justifyContent: "center", overflow: "visible", pointerEvents: "none" }}>
      <Tooltip title={l.jumpToLatest}>
        <Button
          variant="contained"
          color="inherit"
          aria-label={l.jumpToLatest}
          onClick={() => scrollToBottom({ behavior: "smooth" })}
          startIcon={fresh ? <KeyboardArrowDown /> : undefined}
          sx={{
            pointerEvents: "auto",
            position: "absolute",
            bottom: (t) => t.spacing(1),
            borderRadius: 4,
            minWidth: 0,
            bgcolor: "background.paper",
            color: "text.primary",
            border: 1,
            borderColor: "divider",
          }}
        >
          {fresh ? l.newMessages : <KeyboardArrowDown />}
        </Button>
      </Tooltip>
    </Box>
  );
}
