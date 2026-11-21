import { jsx as _jsx } from "react/jsx-runtime";
/** Avatar for a chat participant: image, else initials, else a person icon; stable accent colour. */
import { useEffect, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import PersonIcon from "@mui/icons-material/Person";
import { useTheme } from "@mui/material/styles";
import { avatarColor, initials } from "../../core/initials";
import { accentToPalette } from "./accent";
export function ParticipantAvatar({ participant, size = "md" }) {
    const theme = useTheme();
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [participant.avatarUrl]);
    const bg = accentToPalette(theme, participant.color || avatarColor(participant.name));
    const text = participant.initials ?? initials(participant.name);
    const showImage = !!participant.avatarUrl && !failed;
    const dim = size === "sm" ? 3 : 4;
    return (_jsx(Tooltip, { title: participant.name, children: _jsx(Avatar, { "aria-label": participant.name, src: showImage ? participant.avatarUrl : undefined, alt: participant.name, slotProps: { img: { onError: () => setFailed(true) } }, sx: {
                width: theme.spacing(dim * 2),
                height: theme.spacing(dim * 2),
                bgcolor: bg,
                color: theme.palette.getContrastText(bg),
                fontSize: size === "sm" ? theme.typography.caption.fontSize : theme.typography.body2.fontSize,
            }, children: text || _jsx(PersonIcon, { fontSize: "inherit" }) }) }));
}
