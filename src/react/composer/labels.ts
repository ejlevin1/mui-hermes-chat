/** Composer user-visible strings with English defaults. */
export interface ComposerLabels {
  placeholder: string;
  send: string;
  stop: string;
  hint: string;
  jumpToLatest: string;
  newMessages: string;
}

export const defaultComposerLabels: ComposerLabels = {
  placeholder: "Message Hermes…",
  send: "Send message",
  stop: "Stop generating",
  hint: "Enter to send · Shift+Enter for a new line",
  jumpToLatest: "Jump to latest",
  newMessages: "New messages",
};
