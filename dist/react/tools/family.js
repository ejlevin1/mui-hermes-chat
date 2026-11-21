/** Tool family table, labels, icon keys and one-line args summary (port of Jarvis ToolFamily; pure TS). */
export const MCP_PREFIX = "mcp__";
/** Longest line `argsLine` returns. */
export const ARGS_LINE_MAX = 120;
const EXACT = {
    terminal: "terminal", process_manage: "terminal", read_terminal: "terminal", close_terminal: "terminal",
    execute_code: "terminal",
    read_file: "fileRead",
    write_file: "fileWrite", patch: "fileWrite",
    search_files: "search", session_search: "search", web_search: "search", web_extract: "search", x_search: "search",
    memory: "memory", skill_manage: "memory", skill_view: "memory", skills_list: "memory",
    delegate_task: "delegate",
    notify: "notify",
    approval_tags: "approvals", manage_approval_tags: "approvals",
    todo: "todo", todo_list: "todo",
    clarify: "clarify",
};
const LABELS = {
    terminal: "Terminal", fileRead: "Read file", fileWrite: "Edit file", search: "Search", browser: "Browser",
    memory: "Memory", mcp: "MCP tool", delegate: "Sub-agent", notify: "Notification", approvals: "Approvals",
    todo: "To-do list", clarify: "Question", generic: "Tool",
};
/** Icon key per family; the React layer maps keys to MUI icons. */
const ICONS = {
    terminal: "terminal", fileRead: "fileRead", fileWrite: "fileWrite", search: "search", browser: "browser",
    memory: "memory", mcp: "mcp", delegate: "delegate", notify: "notify", approvals: "approvals", todo: "todo",
    clarify: "clarify", generic: "generic",
};
function resolve(name) {
    const n = name.toLowerCase();
    if (n.startsWith("browser_"))
        return "browser";
    if (n.startsWith(MCP_PREFIX))
        return "mcp";
    return Object.hasOwn(EXACT, n) ? EXACT[n] : "generic";
}
function text(value) {
    return typeof value === "string" && value.trim() !== "" ? value : undefined;
}
function firstScalar(args) {
    if (!args)
        return undefined;
    for (const key of Object.keys(args).sort()) {
        const v = args[key];
        let s;
        if (typeof v === "string")
            s = v.trim() === "" ? undefined : v;
        else if (typeof v === "number" && Number.isFinite(v))
            s = String(v);
        else if (typeof v === "boolean")
            s = String(v);
        if (s !== undefined && s.length <= ARGS_LINE_MAX)
            return s;
    }
    return undefined;
}
/** First line, trimmed, middle-ellipsised to `max` characters. */
export function clipMiddle(input, max = ARGS_LINE_MAX) {
    const line = input?.split(/\r?\n/).find((l) => l.trim() !== "")?.trim();
    if (!line)
        return undefined;
    const chars = Array.from(line);
    if (chars.length <= max)
        return line;
    const keep = max - 1;
    const head = Math.ceil(keep / 2);
    return chars.slice(0, head).join("") + "…" + chars.slice(chars.length - (keep - head)).join("");
}
/** The most telling part of a call on one line: command, path, quoted query, else `context` (preview), else a scalar arg. */
function argsLine(name, args, context) {
    const a = args ?? {};
    let picked;
    switch (resolve(name)) {
        case "terminal":
            picked = text(a.command) ?? text(a.code);
            break;
        case "fileRead":
        case "fileWrite":
            picked = text(a.path);
            break;
        case "search": {
            const q = text(a.query) ?? text(a.pattern);
            const urls = Array.isArray(a.urls) ? text(a.urls[0]) : undefined;
            picked = q !== undefined ? `"${q}"` : (text(a.url) ?? urls);
            break;
        }
        case "browser":
            picked = text(a.url);
            break;
        case "delegate":
            picked = text(a.goal);
            break;
        case "clarify":
            picked = text(a.question);
            break;
        default: break;
    }
    return clipMiddle(picked ?? text(context) ?? firstScalar(args));
}
export const ToolFamily = {
    resolve,
    label: (name) => LABELS[resolve(name)],
    labelOf: (family) => LABELS[family],
    icon: (name) => ICONS[resolve(name)],
    iconOf: (family) => ICONS[family],
    argsLine,
};
