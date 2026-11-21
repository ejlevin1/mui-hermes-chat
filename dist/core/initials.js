/** Avatar helpers: initials from a name/email and a stable accent colour per key. */
import { ACCENTS } from "./types";
export function initials(name) {
    let s = (name ?? "").trim();
    const at = s.indexOf("@");
    if (at >= 0)
        s = s.slice(0, at);
    const words = s
        .split(/[\s\-_.]+/u)
        .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
        .filter(Boolean)
        .map((w) => Array.from(w));
    if (words.length === 0)
        return "";
    const out = words.length >= 2
        ? words[0][0] + words[words.length - 1][0]
        : words[0].slice(0, 2).join("");
    return out.toUpperCase();
}
/** Stable FNV-1a hash of `key` onto the accent list. */
export function avatarColor(key) {
    let h = 0x811c9dc5;
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ACCENTS[h % ACCENTS.length];
}
