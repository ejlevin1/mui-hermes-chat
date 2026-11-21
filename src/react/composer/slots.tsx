/** `composerSlots(labels, maxMessage)`: x-chat ChatBox `slots`/`slotProps` that swap in the single-surface composer. */
import { useSyncExternalStore, type ComponentType } from "react";
import Box from "@mui/material/Box";
import { ChatComposer } from "./ChatComposer";
import { JumpButton, JumpToLatest, type JumpState } from "./JumpToLatest";
import type { ComposerLabels } from "./labels";

export function composerSlots(labels?: Partial<ComposerLabels>, maxMessage?: number) {
  // The list-side slot publishes scroll state; the composer area renders the button above the composer.
  let state: JumpState | null = null;
  const subs = new Set<() => void>();
  const publish = (s: JumpState) => {
    if (state && state.isAtBottom === s.isAtBottom && state.unseenMessageCount === s.unseenMessageCount && state.scrollToBottom === s.scrollToBottom) return;
    state = s;
    subs.forEach((f) => f());
  };
  const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
  // composerRoot receives the stock children; we ignore them and render the whole composer.
  const Composer: ComponentType = () => {
    const s = useSyncExternalStore(subscribe, () => state, () => null);
    return (
      <Box data-testid="composer-area" sx={{ flexShrink: 0 }}>
        <JumpButton labels={labels} state={s} />
        <ChatComposer labels={labels} maxMessage={maxMessage} />
      </Box>
    );
  };
  const Jump: ComponentType = () => <JumpToLatest labels={labels} publish={publish} />;
  return {
    slots: { composerRoot: Composer, scrollToBottom: Jump },
    slotProps: {},
  } as const;
}
