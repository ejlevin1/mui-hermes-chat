export interface SendOrStopButtonProps {
    streaming: boolean;
    canSend: boolean;
    onSend: () => void;
    onStop: () => void;
    sendLabel: string;
    stopLabel: string;
}
export declare function SendOrStopButton({ streaming, canSend, onSend, onStop, sendLabel, stopLabel }: SendOrStopButtonProps): import("react").JSX.Element;
