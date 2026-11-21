import { jsx as _jsx } from "react/jsx-runtime";
import { ChatComposer } from "./ChatComposer";
import { JumpToLatest } from "./JumpToLatest";
export function composerSlots(labels, maxMessage) {
    // composerRoot receives the stock children; we ignore them and render the whole composer.
    const Composer = () => _jsx(ChatComposer, { labels: labels, maxMessage: maxMessage });
    const Jump = () => _jsx(JumpToLatest, { labels: labels });
    return {
        slots: { composerRoot: Composer, scrollToBottom: Jump },
        slotProps: {},
    };
}
