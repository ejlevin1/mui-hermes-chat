/** Shared contract types for mui-hermes-chat (pure TS, no React/MUI). */
export declare const ACCENTS: readonly ["indigo", "blue", "teal", "green", "orange", "red", "purple", "pink"];
export type AccentName = (typeof ACCENTS)[number];
export interface HermesToolCall {
    id: string;
    name: string;
    state: "done" | "failed" | "start";
    preview?: string;
    args?: Record<string, unknown>;
    args_clipped?: boolean;
    duration_s?: number;
    result_preview?: string;
}
export interface HermesMessage {
    id: string;
    role: "user" | "assistant";
    text: string;
    html: string;
    created?: number;
    tools?: HermesToolCall[];
}
export interface HistoryPage {
    messages: HermesMessage[];
    cursor: string | null;
    hasMore: boolean;
}
export interface Participant {
    name: string;
    initials?: string;
    color?: string | null;
    avatarUrl?: string;
}
export interface SessionInfo {
    id: string;
    profile: string;
    title: string;
    source: string;
    created: number | null;
    lastTurn: number | null;
    messages: number | null;
    active: boolean;
    resumeCmd: string;
}
export interface AgentInfo {
    profile: string;
    label: string;
    initials: string;
    color: string | null;
}
export type Target = Record<string, string>;
export interface ChatUrls {
    turn: string;
    approval?: string;
    new?: string;
    history?: string;
    messages?: string;
}
export type CsrfSource = (refresh?: boolean) => Promise<string>;
