/** Every user-visible string of `<HermesTranscript />` with English defaults (reuses the Chat and tool labels). */
import { defaultChatLabels, type ChatOwnLabels } from "../chat/labels";
import { defaultToolLabels, type ToolLabels } from "../tools/labels";
import { defaultComposerLabels, type ComposerLabels } from "../composer/labels";

export interface TranscriptOwnLabels {
  live: string;
  reconnecting: string;
  ended: string;
  error: string;
  subagent: string;
  subagentCount: (n: number) => string;
  empty: string;
  transcript: string;
  loadFailed: string;
}

type Reused = Pick<ChatOwnLabels, "loadingEarlier" | "startOfConversation" | "loadEarlier" | "loadEarlierFailed" | "retry" | "thinking" | "thoughtFor" | "thoughts" | "showAll" | "showLess" | "author" | "errorDefault" | "copyCode" | "copyCodeShort" | "copiedCode" | "commentary" | "messageList">;

export type TranscriptLabels = ToolLabels & Pick<ComposerLabels, "jumpToLatest" | "newMessages"> & Reused & TranscriptOwnLabels;

export const defaultTranscriptLabels: TranscriptLabels = {
  ...defaultToolLabels,
  jumpToLatest: defaultComposerLabels.jumpToLatest,
  newMessages: defaultComposerLabels.newMessages,
  loadingEarlier: defaultChatLabels.loadingEarlier,
  startOfConversation: defaultChatLabels.startOfConversation,
  loadEarlier: defaultChatLabels.loadEarlier,
  loadEarlierFailed: defaultChatLabels.loadEarlierFailed,
  retry: defaultChatLabels.retry,
  thinking: defaultChatLabels.thinking,
  thoughtFor: defaultChatLabels.thoughtFor,
  thoughts: defaultChatLabels.thoughts,
  showAll: defaultChatLabels.showAll,
  showLess: defaultChatLabels.showLess,
  author: defaultChatLabels.author,
  errorDefault: defaultChatLabels.errorDefault,
  copyCode: defaultChatLabels.copyCode,
  copyCodeShort: defaultChatLabels.copyCodeShort,
  copiedCode: defaultChatLabels.copiedCode,
  commentary: defaultChatLabels.commentary,
  messageList: defaultChatLabels.messageList,
  live: "Live",
  reconnecting: "Reconnecting",
  ended: "Ended",
  error: "Error",
  subagent: "Subagent",
  subagentCount: (n) => (n === 1 ? "1 message" : `${n} messages`),
  empty: "No messages yet.",
  transcript: "Transcript",
  loadFailed: "Could not load the transcript.",
};
