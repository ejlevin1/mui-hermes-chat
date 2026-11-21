/** Session info: IconButton + right Drawer (full-screen Dialog under md) with session fields and resume command. */
import { type ReactNode } from "react";
import type { SessionInfo } from "../../core/types";
export interface SessionInfoLabels {
    button: string;
    title: string;
    close: string;
    sessionId: string;
    sessionTitle: string;
    profile: string;
    type: string;
    created: string;
    lastTurn: string;
    messages: string;
    status: string;
    active: string;
    archived: string;
    resume: string;
    copy: string;
    copied: string;
    empty: string;
}
export declare const DEFAULT_INFO_LABELS: SessionInfoLabels;
export interface SessionInfoDrawerProps {
    session: SessionInfo;
    open: boolean;
    onClose: () => void;
    labels?: Partial<SessionInfoLabels>;
    agentAvatar?: ReactNode;
}
export interface SessionInfoButtonProps {
    session: SessionInfo;
    labels?: Partial<SessionInfoLabels>;
    agentAvatar?: ReactNode;
}
export declare function SessionInfoDrawer({ session, open, onClose, labels, agentAvatar }: SessionInfoDrawerProps): import("react").JSX.Element;
export declare function SessionInfoButton({ session, labels, agentAvatar }: SessionInfoButtonProps): import("react").JSX.Element;
