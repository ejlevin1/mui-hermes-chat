import type { HermesToolCall } from "../../core/types";
import { type ToolRunStatus } from "./format";
import { type ToolLabels } from "./labels";
export interface ToolRowProps {
    call: HermesToolCall;
    running?: boolean;
    onOpen?: (call: HermesToolCall) => void;
    labels?: Partial<ToolLabels>;
}
export declare function statusOf(call: HermesToolCall, running?: boolean): ToolRunStatus;
export declare function ToolRow({ call, running, onOpen, labels }: ToolRowProps): import("react").JSX.Element;
