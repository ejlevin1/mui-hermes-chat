/** `hermesChatAdapter`: maps `hermes-chat-events/2` turns and the paged history onto the @mui/x-chat `ChatAdapter`. */
import type { ChatAdapter } from "@mui/x-chat/headless";
import type { ChatMessage } from "@mui/x-chat/types";
import type { ChatUrls, CsrfSource, HermesMessage, HistoryPage, Target } from "../core/types";
export interface HermesAdapterOptions {
    urls: Pick<ChatUrls, "turn" | "messages">;
    target: Target;
    csrf: CsrfSource;
    /** The newest history page from the read model; `listMessages` without a cursor returns it. */
    initialPage?: HistoryPage;
    /** Shown as the error part when the connection drops with no server text. */
    networkErrorText?: string;
}
export declare const NOTE_NETWORK = "The connection to Hermes was lost. Your message is still in the box: send it again.";
/**
 * History rows → x-chat messages. User: one text part. Assistant: a `data-tools` part (`HermesToolCall[]`)
 * when it carries tools, then a `data-reply` part (`{text, html}`) when it has html, else a text part.
 */
export declare function toChatMessages(messages: HermesMessage[]): ChatMessage[];
export declare function hermesChatAdapter(opts: HermesAdapterOptions): ChatAdapter;
