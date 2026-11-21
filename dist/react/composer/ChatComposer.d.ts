import { type ComposerLabels } from "./labels";
export interface ChatComposerProps {
    labels?: Partial<ComposerLabels>;
    maxMessage?: number;
    disabled?: boolean;
}
export declare function ChatComposer({ labels, maxMessage, disabled }: ChatComposerProps): import("react").JSX.Element;
