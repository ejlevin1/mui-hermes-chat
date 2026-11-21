import { jsx as _jsx } from "react/jsx-runtime";
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
const ICONS = {
    terminal: _jsx(Terminal, { fontSize: "small" }), fileRead: _jsx(Description, { fontSize: "small" }),
    fileWrite: _jsx(EditNote, { fontSize: "small" }), search: _jsx(Search, { fontSize: "small" }), browser: _jsx(Public, { fontSize: "small" }),
    memory: _jsx(Psychology, { fontSize: "small" }), mcp: _jsx(Extension, { fontSize: "small" }), delegate: _jsx(Groups, { fontSize: "small" }),
    notify: _jsx(Notifications, { fontSize: "small" }), approvals: _jsx(VerifiedUser, { fontSize: "small" }),
    todo: _jsx(Checklist, { fontSize: "small" }), clarify: _jsx(HelpOutline, { fontSize: "small" }), generic: _jsx(Build, { fontSize: "small" }),
};
export function ToolIcon({ name }) {
    return ICONS[ToolFamily.icon(name)] ?? ICONS.generic;
}
