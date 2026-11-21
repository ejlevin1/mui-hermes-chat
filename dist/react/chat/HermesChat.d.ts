import { type ReactNode } from "react";
import type { ChatUrls, CsrfSource, HermesMessage, Participant, SessionInfo, Target } from "../../core/types";
import { type ChatLabels } from "./labels";
export interface HermesChatProps {
    urls: ChatUrls;
    target: Target;
    csrf: CsrfSource;
    /** Newest history page from the read model; older pages load through `urls.messages`. */
    history: {
        messages: HermesMessage[];
        cursor: string | null;
        hasMore: boolean;
    };
    /** Renders server-sanitised reply html (the package never injects html itself). */
    renderHtml: (html: string) => ReactNode;
    participants: {
        user: Participant;
        agent: Participant;
    };
    /** Enables the Info button. */
    session?: SessionInfo;
    labels?: Partial<ChatLabels>;
    maxMessage?: number;
    /** Server notice, e.g. "The earlier messages could not be loaded just now." */
    notice?: string;
    linkedNote?: string;
    /** The subject changed under the user: show the note. */
    changed?: boolean;
    /** Earlier conversations: a link to `earlierHref` in the toolbar. */
    hasEarlier?: boolean;
    earlierHref?: string;
    /** Called after every finished turn and after New chat. */
    onTurnEnd?: () => void;
    /** `inline` is the card in place; `sheet` a full-screen dialog behind a button; `auto` = sheet on phones. */
    mode?: "inline" | "sheet" | "auto";
    fit?: {
        minHeight?: number;
        bottomGap?: number;
    };
    toolbarActions?: ReactNode;
}
export declare function HermesChat(props: HermesChatProps): import("react").JSX.Element;
export default HermesChat;
