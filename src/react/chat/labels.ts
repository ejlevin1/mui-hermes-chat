/** Every user-visible string of `<HermesChat />` (own + the composer, tool and info areas) with English defaults. */
import { defaultComposerLabels, type ComposerLabels } from "../composer/labels";
import { DEFAULT_INFO_LABELS, type SessionInfoLabels } from "../info/SessionInfo";
import { defaultToolLabels, type ToolLabels } from "../tools/labels";

export interface ChatOwnLabels {
  newChat: string;
  newChatTitle: string;
  newChatBody: string;
  newChatConfirm: string;
  cancel: string;
  startOverFailed: string;
  earlierConversations: string;
  loadingEarlier: string;
  startOfConversation: string;
  loadEarlier: string;
  loadEarlierFailed: string;
  retry: string;
  changedNote: string;
  replied: string;
  chat: string;
  chatOpen: string;
  author: (name: string) => string;
  commentary: string;
  errorDefault: string;
  copyCode: string;
  copyCodeShort: string;
  copiedCode: string;
  approvalTitle: string;
  approveOnce: string;
  deny: string;
  approvalSending: string;
  approvalFailed: string;
  approved: string;
  denied: string;
  approvalRejected: string;
  expired: string;
  expiresIn: (clock: string) => string;
  messageList: string;
  thinking: string;
  thoughtFor: (seconds: number) => string;
  thoughts: string;
  showAll: string;
  showLess: string;
}

export type ChatLabels = ComposerLabels & ToolLabels & SessionInfoLabels & ChatOwnLabels;

export const defaultChatLabels: ChatLabels = {
  ...defaultComposerLabels,
  ...defaultToolLabels,
  ...DEFAULT_INFO_LABELS,
  newChat: "New chat",
  newChatTitle: "Start over?",
  newChatBody: "This conversation will be archived.",
  newChatConfirm: "Start over",
  cancel: "Cancel",
  startOverFailed: "Could not start over just now.",
  earlierConversations: "Earlier conversations",
  loadingEarlier: "Loading earlier messages…",
  startOfConversation: "Start of conversation",
  loadEarlier: "Load earlier messages",
  loadEarlierFailed: "Could not load earlier messages.",
  retry: "Retry",
  changedNote: "Card changed: the next message will tell the agent.",
  replied: "Hermes replied.",
  chat: "Chat",
  chatOpen: "Open chat",
  author: (name) => `${name}:`,
  commentary: "Note",
  errorDefault: "Something went wrong.",
  copyCode: "Copy code",
  copyCodeShort: "Copy",
  copiedCode: "Copied",
  approvalTitle: "Approval needed",
  approveOnce: "Approve once",
  deny: "Deny",
  approvalSending: "Sending…",
  approvalFailed: "Could not send the answer.",
  approved: "Approved once.",
  denied: "Denied.",
  approvalRejected: "The answer was not accepted (it may have expired).",
  expired: "Expired",
  expiresIn: (c) => `Expires in ${c}`,
  messageList: "Conversation",
  thinking: "Thinking…",
  thoughtFor: (s) => `Thought for ${s} s`,
  thoughts: "Thoughts",
  showAll: "Show all",
  showLess: "Show less",
};
