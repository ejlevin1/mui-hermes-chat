/** Pure core (no React/MUI): contract types, avatar helpers, event parser, transport. */
export * from "./types";
export { initials, avatarColor } from "./initials";
export { parseChatEvents, CHAT_EVENTS_CONTRACT } from "./events";
export { runTurn, sendApproval, startOver, fetchHistoryPage, ChatHttpError } from "./transport";
