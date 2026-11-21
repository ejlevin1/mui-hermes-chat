/** Avatar for a chat participant: image, else initials, else a person icon; stable accent colour. */
import { useEffect, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import PersonIcon from "@mui/icons-material/Person";
import { useTheme } from "@mui/material/styles";
import { avatarColor, initials } from "../../core/initials";
import type { Participant } from "../../core/types";
import { accentToPalette } from "./accent";

export interface ParticipantAvatarProps {
  participant: Participant;
  size?: "sm" | "md";
}

export function ParticipantAvatar({ participant, size = "md" }: ParticipantAvatarProps) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [participant.avatarUrl]);
  const bg = accentToPalette(theme, participant.color || avatarColor(participant.name));
  const text = participant.initials ?? initials(participant.name);
  const showImage = !!participant.avatarUrl && !failed;
  const dim = size === "sm" ? 2 : 4;
  return (
    <Tooltip title={participant.name}>
      <Avatar
        aria-label={participant.name}
        src={showImage ? participant.avatarUrl : undefined}
        alt={participant.name}
        slotProps={{ img: { onError: () => setFailed(true) } }}
        sx={{
          width: theme.spacing(dim * 2),
          height: theme.spacing(dim * 2),
          bgcolor: bg,
          color: theme.palette.getContrastText(bg),
          fontSize: size === "sm" ? theme.typography.caption.fontSize : theme.typography.body2.fontSize,
        }}
      >
        {text || <PersonIcon fontSize="inherit" />}
      </Avatar>
    </Tooltip>
  );
}
