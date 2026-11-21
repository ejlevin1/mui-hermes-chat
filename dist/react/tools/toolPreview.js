export const LIMITS = {
    maxDiffLines: 12, maxTodos: 12, maxPairs: 3, maxResultLines: 3, maxKey: 40, maxValue: 80, maxLine: 160,
    maxInputBytes: 256 * 1024,
};
const NONE = { kind: "none" };
const bytes = (s) => new TextEncoder().encode(s).length;
// eslint-disable-next-line no-control-regex
const SGR = /\u001b\[[0-9;]*m/g;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f]/g;
export const gutter = (k) => ({ added: "+", removed: "−", hunk: "@", context: " " })[k];
export function clip(text, limit) {
    const c = Array.from(text);
    return c.length <= limit ? text : c.slice(0, limit - 1).join("") + "…";
}
/** First line, SGR and control characters dropped, trimmed. */
export function oneLine(text) {
    const line = text.split(/\r?\n|\r/)[0] ?? "";
    return line.replace(SGR, "").replace(CONTROL, "").trim();
}
function diffLine(line, inHeader, next) {
    if (line.startsWith("diff ") || line.startsWith("index "))
        return "fileHeader";
    if (line.startsWith("--- ") && next.startsWith("+++ "))
        return "fileHeader";
    if (inHeader && !line.startsWith("@@"))
        return "skip";
    const first = Array.from(line)[0];
    let kind;
    switch (first) {
        case "+":
            kind = "added";
            break;
        case "-":
            kind = "removed";
            break;
        case "@":
            kind = "hunk";
            break;
        case " ":
        case "\\":
            kind = "context";
            break;
        case "…": return { kind: "hunk", text: clip(oneLine(line), LIMITS.maxLine) };
        case undefined: return "skip";
        default: return line.includes(" → ") ? "fileHeader" : "invalid";
    }
    return { kind, text: clip(kind === "hunk" ? line : line.slice(1), LIMITS.maxLine) };
}
/** Null unless `text` is a plausible unified diff of a sane size. */
export function diffPreview(text) {
    if (!text || bytes(text) > LIMITS.maxInputBytes || text.includes("\u0000"))
        return null;
    const raw = text.replace(SGR, "").split(/\r?\n|\r/);
    let inHeader = true;
    const lines = [];
    for (let i = 0; i < raw.length; i++) {
        const line = raw[i];
        if (line.startsWith("@@"))
            inHeader = false;
        const r = diffLine(line, inHeader, raw[i + 1] ?? "");
        if (r === "skip")
            continue;
        if (r === "invalid")
            return null;
        if (r === "fileHeader") {
            inHeader = true;
            continue;
        }
        lines.push(r);
    }
    if (!lines.some((l) => l.kind === "added" || l.kind === "removed"))
        return null;
    return { kind: "diff", lines: lines.slice(0, LIMITS.maxDiffLines), more: Math.max(0, lines.length - LIMITS.maxDiffLines) };
}
export function todoPreview(todos) {
    const valid = [];
    for (const t of todos) {
        const text = oneLine(t.content);
        if (text)
            valid.push({ id: t.id, content: clip(text, LIMITS.maxLine), status: t.status });
    }
    if (!valid.length)
        return null;
    return { kind: "todos", entries: valid.slice(0, LIMITS.maxTodos), more: Math.max(0, valid.length - LIMITS.maxTodos) };
}
function todoList(value) {
    if (!Array.isArray(value))
        return undefined;
    return value.flatMap((v) => {
        if (!v || typeof v !== "object")
            return [];
        const o = v;
        if (typeof o.content !== "string")
            return [];
        return [{ id: o.id === undefined ? undefined : String(o.id), content: o.content, status: typeof o.status === "string" ? o.status : "pending" }];
    });
}
function scalar(v) {
    if (typeof v === "string")
        return bytes(v) <= LIMITS.maxInputBytes ? v : v.slice(0, LIMITS.maxValue);
    if (typeof v === "number" && Number.isFinite(v))
        return String(v);
    if (typeof v === "boolean")
        return String(v);
    return undefined;
}
export function basename(path) {
    if (bytes(path) > 4096)
        return undefined;
    const name = oneLine(path.replace(/\/+$/, "").split("/").pop() ?? "");
    return name ? clip(name, LIMITS.maxValue) : undefined;
}
function genericPreview(call) {
    const pairs = [];
    for (const key of Object.keys(call.args ?? {}).sort()) {
        if (pairs.length >= LIMITS.maxPairs)
            break;
        const s = scalar(call.args[key]);
        if (s === undefined)
            continue;
        const line = oneLine(s);
        if (line)
            pairs.push({ key: clip(oneLine(key), LIMITS.maxKey), value: clip(line, LIMITS.maxValue) });
    }
    const head = (call.result_preview ?? "").slice(0, LIMITS.maxInputBytes);
    const resultLines = head.split(/\r?\n|\r/).map(oneLine).filter(Boolean).slice(0, LIMITS.maxResultLines).map((l) => clip(l, LIMITS.maxLine));
    return pairs.length || resultLines.length ? { kind: "generic", pairs, resultLines } : null;
}
/** The one dispatch function for inline tool previews. */
export function resolvePreview(call, children = []) {
    if (children.length)
        return { kind: "subagentGroup", children };
    if (!call)
        return NONE;
    const a = call.args;
    const diff = typeof a?.inline_diff === "string" ? a.inline_diff : typeof a?.diff === "string" ? a.diff : undefined;
    if (diff) {
        const p = diffPreview(diff);
        if (p)
            return p;
    }
    const todos = todoList(a?.todos);
    if (todos) {
        const p = todoPreview(todos);
        if (p)
            return p;
    }
    if (typeof a?.image_path === "string") {
        const name = basename(a.image_path);
        if (name)
            return { kind: "image", basename: name };
    }
    return genericPreview(call) ?? NONE;
}
export const ToolPreview = { resolve: resolvePreview, diffPreview, todoPreview, basename, oneLine, clip, LIMITS };
