import type { HermesToolCall } from "../../core/types";
import { type ToolLabels } from "./labels";
export interface ToolDetailDrawerProps {
    call: HermesToolCall | null | undefined;
    open: boolean;
    onClose: () => void;
    labels?: Partial<ToolLabels>;
}
export declare function ToolDetailDrawer({ call, open, onClose, labels }: ToolDetailDrawerProps): import("react").JSX.Element | null;
