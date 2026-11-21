import { jsx as _jsx } from "react/jsx-runtime";
/** Round send / stop button shown inside the composer surface. */
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import StopRounded from "@mui/icons-material/StopRounded";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
export function SendOrStopButton({ streaming, canSend, onSend, onStop, sendLabel, stopLabel }) {
    const label = streaming ? stopLabel : sendLabel;
    return (_jsx(Tooltip, { title: label, children: _jsx("span", { children: _jsx(IconButton, { color: "primary", "aria-label": label, disabled: !streaming && !canSend, onClick: streaming ? onStop : onSend, sx: (t) => ({
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
                }), children: streaming ? _jsx(StopRounded, { fontSize: "small" }) : _jsx(ArrowUpward, { fontSize: "small" }) }) }) }));
}
