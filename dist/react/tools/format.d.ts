/** Text of a collapsed tool row: duration, status and screen-reader label (port of Jarvis ToolRowFormat; pure TS). */
export type ToolRunStatus = "running" | "done" | "failed";
/** Visible duration: `0.4 s`, `12 s`, `2 min 5 s`; undefined when missing or negative. */
export declare function duration(seconds: number | undefined | null): string | undefined;
/** Spoken duration: `0.4 seconds`, `1 second`, `2 minutes 5 seconds`. */
export declare function spokenDuration(seconds: number | undefined | null): string | undefined;
/** "Tool terminal, done in 0.4 seconds, ls -la, 1 file listed". */
export declare function accessibilityLabel(o: {
    name: string;
    status: ToolRunStatus;
    duration?: number;
    argsLine?: string;
    summary?: string;
}): string;
export declare const ToolRowFormat: {
    duration: typeof duration;
    spokenDuration: typeof spokenDuration;
    accessibilityLabel: typeof accessibilityLabel;
};
