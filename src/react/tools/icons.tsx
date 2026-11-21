/** Family icon key → MUI icon. */
import type { ReactElement } from "react";
import Terminal from "@mui/icons-material/Terminal";
import Description from "@mui/icons-material/Description";
import EditNote from "@mui/icons-material/EditNote";
import Search from "@mui/icons-material/Search";
import Public from "@mui/icons-material/Public";
import Psychology from "@mui/icons-material/Psychology";
import Extension from "@mui/icons-material/Extension";
import Groups from "@mui/icons-material/Groups";
import Notifications from "@mui/icons-material/Notifications";
import VerifiedUser from "@mui/icons-material/VerifiedUser";
import Checklist from "@mui/icons-material/Checklist";
import HelpOutline from "@mui/icons-material/HelpOutlineOutlined";
import Build from "@mui/icons-material/Build";
import { ToolFamily } from "./family";

const ICONS: Record<string, ReactElement> = {
  terminal: <Terminal fontSize="small" />, fileRead: <Description fontSize="small" />,
  fileWrite: <EditNote fontSize="small" />, search: <Search fontSize="small" />, browser: <Public fontSize="small" />,
  memory: <Psychology fontSize="small" />, mcp: <Extension fontSize="small" />, delegate: <Groups fontSize="small" />,
  notify: <Notifications fontSize="small" />, approvals: <VerifiedUser fontSize="small" />,
  todo: <Checklist fontSize="small" />, clarify: <HelpOutline fontSize="small" />, generic: <Build fontSize="small" />,
};

export function ToolIcon({ name }: { name: string }) {
  return ICONS[ToolFamily.icon(name)] ?? ICONS.generic!;
}
