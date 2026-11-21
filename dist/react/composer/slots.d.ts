import type { ComposerLabels } from "./labels";
export declare function composerSlots(labels?: Partial<ComposerLabels>, maxMessage?: number): {
    readonly slots: {
        readonly composerRoot: import("react").FunctionComponent<{}>;
        readonly scrollToBottom: import("react").FunctionComponent<{}>;
    };
    readonly slotProps: {};
};
