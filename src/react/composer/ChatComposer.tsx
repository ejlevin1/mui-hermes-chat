/** Single-surface chat composer built on the x-chat headless hooks. */
import Box from "@mui/material/Box";
import InputBase from "@mui/material/InputBase";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useChat, useChatComposer } from "@mui/x-chat-headless";
import type { KeyboardEvent } from "react";
import { defaultComposerLabels, type ComposerLabels } from "./labels";
import { SendOrStopButton } from "./SendOrStopButton";

export interface ChatComposerProps {
  labels?: Partial<ComposerLabels>;
  maxMessage?: number;
  disabled?: boolean;
}

export function ChatComposer({ labels, maxMessage, disabled }: ChatComposerProps) {
  const l = { ...defaultComposerLabels, ...labels };
  const { value, setValue, submit } = useChatComposer();
  const { isStreaming, stopStreaming } = useChat();
  const touch = useMediaQuery("(hover: none)");
  const length = value.length;
  const canSend = !disabled && value.trim().length > 0 && (!maxMessage || length <= maxMessage);
  const showCounter = !!maxMessage && length > maxMessage * 0.8;

  const send = () => {
    if (canSend && !isStreaming) void submit();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    send();
  };

  return (
    <Box component="form" onSubmit={(e) => { e.preventDefault(); send(); }} sx={{ flexShrink: 0, px: 1.5, pb: 1.5 }}>
      <Box
        data-testid="composer-surface"
        sx={{
          display: "flex",
          alignItems: "flex-end",
          gap: 1,
          py: 1,
          pl: 1.5,
          pr: 1,
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          "&:focus-within": {
            borderColor: "primary.main",
            boxShadow: (t) => `0 0 0 1px ${(t.vars || t).palette.primary.main}`,
          },
        }}
      >
        <InputBase
          multiline
          fullWidth
          minRows={1}
          maxRows={8}
          value={value}
          disabled={disabled}
          placeholder={l.placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          inputProps={{ "aria-label": l.placeholder }}
          sx={{ py: 0.5, alignItems: "flex-end", "& textarea": { outline: "none" } }}
        />
        <SendOrStopButton
          streaming={isStreaming}
          canSend={canSend}
          onSend={send}
          onStop={stopStreaming}
          sendLabel={l.send}
          stopLabel={l.stop}
        />
      </Box>
      {(!touch || showCounter) && (
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mt: 0.5, px: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {touch ? "" : l.hint}
          </Typography>
          {showCounter && (
            <Typography variant="caption" color={length > maxMessage! ? "error" : "text.secondary"}>
              {`${length} / ${maxMessage}`}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
