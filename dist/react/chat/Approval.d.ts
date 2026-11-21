import type { ApprovalEvent } from "../../core/events";
import { type ChatLabels } from "./labels";
export type { ApprovalEvent };
export declare function clock(left: number): string;
export interface ApprovalProps {
    event: ApprovalEvent;
    /** Resolves true when the server accepted the answer. */
    onDecide: (choice: "once" | "deny") => Promise<boolean>;
    labels?: Partial<ChatLabels>;
}
export declare function Approval({ event, onDecide, labels }: ApprovalProps): import("react").JSX.Element;
