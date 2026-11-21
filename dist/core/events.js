/** Event contract `hermes-chat-events/2`: the SSE frames of POST <urls.turn> and an incremental parser (pure TS). */
export const CHAT_EVENTS_CONTRACT = "hermes-chat-events/2";
/**
 * Incremental SSE parser: feed it text in any split (mid-line, mid-frame, mid-JSON, CRLF), call
 * `end()` once. The event type is `data.t`, else the `event:` line. Unusable frames are dropped;
 * unknown fields and frame types pass through untouched (consumers ignore what they don't know).
 */
export function parseChatEvents(onEvent) {
    let buf = "";
    const frame = (text) => {
        const data = [];
        let name = "";
        for (const line of text.split(/\r?\n/)) {
            if (!line || line[0] === ":")
                continue;
            if (line.startsWith("event:"))
                name = line.slice(6).trim();
            else if (line.startsWith("data:"))
                data.push(line.slice(5).replace(/^ /, ""));
        }
        if (!data.length)
            return;
        let obj;
        try {
            obj = JSON.parse(data.join("\n"));
        }
        catch {
            return; // unusable frame
        }
        if (obj && typeof obj === "object" && !Array.isArray(obj)) {
            const o = obj;
            const t = typeof o.t === "string" ? o.t : name;
            if (t)
                onEvent({ ...o, t });
        }
    };
    const drain = (all) => {
        for (;;) {
            const m = /\r?\n\r?\n/.exec(buf);
            if (!m)
                break;
            frame(buf.slice(0, m.index));
            buf = buf.slice(m.index + m[0].length);
        }
        if (all && buf.trim())
            frame(buf);
        if (all)
            buf = "";
    };
    return {
        push: (c) => {
            buf += c;
            drain(false);
        },
        end: () => drain(true),
    };
}
