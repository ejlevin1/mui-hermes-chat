/** Tool family table, labels, icon keys and one-line args summary (port of Jarvis ToolFamily; pure TS). */
export type ToolFamilyName = "terminal" | "fileRead" | "fileWrite" | "search" | "browser" | "memory" | "mcp" | "delegate" | "notify" | "approvals" | "todo" | "clarify" | "generic";
export declare const MCP_PREFIX = "mcp__";
/** Longest line `argsLine` returns. */
export declare const ARGS_LINE_MAX = 120;
declare function resolve(name: string): ToolFamilyName;
/** First line, trimmed, middle-ellipsised to `max` characters. */
export declare function clipMiddle(input: string | undefined, max?: number): string | undefined;
/** The most telling part of a call on one line: command, path, quoted query, else `context` (preview), else a scalar arg. */
declare function argsLine(name: string, args?: Record<string, unknown>, context?: string): string | undefined;
export declare const ToolFamily: {
    readonly resolve: typeof resolve;
    readonly label: (name: string) => string;
    readonly labelOf: (family: ToolFamilyName) => string;
    readonly icon: (name: string) => string;
    readonly iconOf: (family: ToolFamilyName) => string;
    readonly argsLine: typeof argsLine;
};
export {};
