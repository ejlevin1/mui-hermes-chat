import type { Participant } from "../../core/types";
export interface ParticipantAvatarProps {
    participant: Participant;
    size?: "sm" | "md";
}
export declare function ParticipantAvatar({ participant, size }: ParticipantAvatarProps): import("react").JSX.Element;
