/** Inline tool preview resolver (port of Jarvis ToolPreview.resolve limits; pure TS). */
import type { HermesToolCall } from "../../core/types";
export type DiffKind = "added" | "removed" | "hunk" | "context";
export interface DiffLine {
    kind: DiffKind;
    text: string;
}
export interface TodoEntry {
    id?: string;
    content: string;
    status: string;
}
export type ToolPreviewKind = {
    kind: "diff";
    lines: DiffLine[];
    more: number;
} | {
    kind: "todos";
    entries: TodoEntry[];
    more: number;
} | {
    kind: "subagentGroup";
    children: string[];
} | {
    kind: "image";
    basename: string;
} | {
    kind: "generic";
    pairs: {
        key: string;
        value: string;
    }[];
    resultLines: string[];
} | {
    kind: "none";
};
export declare const LIMITS: {
    readonly maxDiffLines: 12;
    readonly maxTodos: 12;
    readonly maxPairs: 3;
    readonly maxResultLines: 3;
    readonly maxKey: 40;
    readonly maxValue: 80;
    readonly maxLine: 160;
    readonly maxInputBytes: number;
};
export declare const gutter: (k: DiffKind) => string;
export declare function clip(text: string, limit: number): string;
/** First line, SGR and control characters dropped, trimmed. */
export declare function oneLine(text: string): string;
/** Null unless `text` is a plausible unified diff of a sane size. */
export declare function diffPreview(text: string): ToolPreviewKind | null;
export declare function todoPreview(todos: TodoEntry[]): ToolPreviewKind | null;
export declare function basename(path: string): string | undefined;
/** The one dispatch function for inline tool previews. */
export declare function resolvePreview(call: HermesToolCall | undefined, children?: string[]): ToolPreviewKind;
export declare const ToolPreview: {
    resolve: typeof resolvePreview;
    diffPreview: typeof diffPreview;
    todoPreview: typeof todoPreview;
    basename: typeof basename;
    oneLine: typeof oneLine;
    clip: typeof clip;
    LIMITS: {
        readonly maxDiffLines: 12;
        readonly maxTodos: 12;
        readonly maxPairs: 3;
        readonly maxResultLines: 3;
        readonly maxKey: 40;
        readonly maxValue: 80;
        readonly maxLine: 160;
        readonly maxInputBytes: number;
    };
};
