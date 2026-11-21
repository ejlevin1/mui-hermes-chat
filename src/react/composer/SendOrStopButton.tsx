/** Round send / stop button shown inside the composer surface. */
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import StopRounded from "@mui/icons-material/StopRounded";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

export interface SendOrStopButtonProps {
  streaming: boolean;
  canSend: boolean;
  onSend: () => void;
  onStop: () => void;
  sendLabel: string;
  stopLabel: string;
}

export function SendOrStopButton({ streaming, canSend, onSend, onStop, sendLabel, stopLabel }: SendOrStopButtonProps) {
  const label = streaming ? stopLabel : sendLabel;
  return (
    <Tooltip title={label}>
      {/* span keeps the tooltip working while the button is disabled */}
      <span>
        <IconButton
          color="primary"
          aria-label={label}
          disabled={!streaming && !canSend}
          onClick={streaming ? onStop : onSend}
          sx={(t) => ({
            flexShrink: 0,
            backgroundColor: "primary.main",
            color: "primary.contrastText",
            "&:hover": { backgroundColor: "primary.dark" },
            "&.Mui-disabled": {
              backgroundColor: "action.disabledBackground",
              color: "action.disabled",
            },
            width: t.spacing(4),
            height: t.spacing(4),
          })}
        >
          {streaming ? <StopRounded fontSize="small" /> : <ArrowUpward fontSize="small" />}
        </IconButton>
      </span>
    </Tooltip>
  );
}
