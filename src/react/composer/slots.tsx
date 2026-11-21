/** `composerSlots(labels, maxMessage)`: x-chat ChatBox `slots`/`slotProps` that swap in the single-surface composer. */
import type { ComponentType } from "react";
import { ChatComposer } from "./ChatComposer";
import { JumpToLatest } from "./JumpToLatest";
import type { ComposerLabels } from "./labels";

export function composerSlots(labels?: Partial<ComposerLabels>, maxMessage?: number) {
  // composerRoot receives the stock children; we ignore them and render the whole composer.
  const Composer: ComponentType = () => <ChatComposer labels={labels} maxMessage={maxMessage} />;
  const Jump: ComponentType = () => <JumpToLatest labels={labels} />;
  return {
    slots: { composerRoot: Composer, scrollToBottom: Jump },
    slotProps: {},
  } as const;
}
