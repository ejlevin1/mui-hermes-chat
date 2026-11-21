/** Avatar helpers: initials from a name/email and a stable accent colour per key. */
import { type AccentName } from "./types";
export declare function initials(name: string): string;
/** Stable FNV-1a hash of `key` onto the accent list. */
export declare function avatarColor(key: string): AccentName;
