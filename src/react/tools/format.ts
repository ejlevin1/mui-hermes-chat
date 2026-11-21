/** Text of a collapsed tool row: duration, status and screen-reader label (port of Jarvis ToolRowFormat; pure TS). */

export type ToolRunStatus = "running" | "done" | "failed";

const valid = (s: number | undefined | null): s is number => typeof s === "number" && Number.isFinite(s) && s >= 0;

/** Visible duration: `0.4 s`, `12 s`, `2 min 5 s`; undefined when missing or negative. */
export function duration(seconds: number | undefined | null): string | undefined {
  if (!valid(seconds)) return undefined;
  if (seconds < 10) return `${seconds.toFixed(1)} s`;
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const whole = Math.round(seconds);
  return whole % 60 === 0 ? `${whole / 60} min` : `${Math.floor(whole / 60)} min ${whole % 60} s`;
}

const unit = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/** Spoken duration: `0.4 seconds`, `1 second`, `2 minutes 5 seconds`. */
export function spokenDuration(seconds: number | undefined | null): string | undefined {
  if (!valid(seconds)) return undefined;
  if (seconds < 10) {
    const tenths = Math.round(seconds * 10) / 10;
    return tenths === 1 ? "1 second" : `${tenths.toFixed(1)} seconds`;
  }
  const whole = Math.round(seconds);
  if (whole < 60) return unit(whole, "second");
  const minutes = unit(Math.floor(whole / 60), "minute");
  return whole % 60 === 0 ? minutes : `${minutes} ${unit(whole % 60, "second")}`;
}

/** "Tool terminal, done in 0.4 seconds, ls -la, 1 file listed". */
export function accessibilityLabel(o: {
  name: string; status: ToolRunStatus; duration?: number; argsLine?: string; summary?: string;
}): string {
  const spoken = spokenDuration(o.duration);
  const state =
    o.status === "running" ? "running"
    : o.status === "done" ? (spoken ? `done in ${spoken}` : "done")
    : spoken ? `failed after ${spoken}` : "failed";
  return [`Tool ${o.name}`, state, o.argsLine, o.summary ? o.summary : undefined].filter(Boolean).join(", ");
}

export const ToolRowFormat = { duration, spokenDuration, accessibilityLabel };
