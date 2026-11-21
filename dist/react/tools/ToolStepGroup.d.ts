import type { HermesToolCall } from "../../core/types";
import { type ToolLabels } from "./labels";
export interface ToolStepGroupProps {
    calls: HermesToolCall[];
    /** The turn is still running: expanded by default; collapsed once the reply is in. */
    running?: boolean;
    onOpen?: (call: HermesToolCall) => void;
    labels?: Partial<ToolLabels>;
}
export declare function ToolStepGroup({ calls, running, onOpen, labels }: ToolStepGroupProps): import("react").JSX.Element | null;
