/** Pure core (no React/MUI): contract types, avatar helpers, event parser, transport. */
export * from "./types";
export { initials, avatarColor } from "./initials";
export { parseChatEvents, CHAT_EVENTS_CONTRACT, type ChatEvent, type ApprovalEvent, type ToolEvent } from "./events";
export {
  TRANSCRIPT_CONTRACT,
  mergeTranscript,
  maxSeq,
  type TranscriptMessage,
  type TranscriptSourceKind,
  type TranscriptPage,
  type TranscriptStatus,
  type TranscriptFeed,
  type TranscriptFollow,
} from "./transcript";
export { runTurn, sendApproval, startOver, fetchHistoryPage, ChatHttpError } from "./transport";
