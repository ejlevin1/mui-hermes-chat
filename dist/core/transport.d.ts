/** Transport for the Hermes chat endpoints: streamed turns, approval/new form posts and history paging (CSRF injected). */
import { type ChatEvent } from "./events";
import type { CsrfSource, HistoryPage, Target } from "./types";
/** A non-OK chat reply carrying the server's own `text` (or `error` code) as message. */
export declare class ChatHttpError extends Error {
    status: number;
    code?: string | undefined;
    name: string;
    constructor(status: number, message: string, code?: string | undefined);
}
/** Run one turn; resolves when the stream is over. Throws on transport failure or a stream that ended with no reply/error. */
export declare function runTurn(url: string, target: Target, message: string, onEvent: (e: ChatEvent) => void, csrf: CsrfSource, signal?: AbortSignal): Promise<void>;
export declare function sendApproval(url: string, target: Target, a: {
    run_id: string;
    request_id: string;
    execution_generation: string | number;
}, choice: "once" | "deny", csrf: CsrfSource, signal?: AbortSignal): Promise<boolean>;
export declare function startOver(url: string, target: Target, csrf: CsrfSource, signal?: AbortSignal): Promise<boolean>;
/** GET the next older history page (`<url>?<target>&cursor=<c>`); throws `ChatHttpError` (e.g. 400 `bad_cursor`, 404). */
export declare function fetchHistoryPage(url: string, target: Target, cursor: string, csrf?: CsrfSource, signal?: AbortSignal): Promise<HistoryPage>;
