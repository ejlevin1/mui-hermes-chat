/** Default English strings for the tool components. */
export interface ToolLabels {
    running: string;
    done: string;
    failed: string;
    showPreview: string;
    hidePreview: string;
    steps: (n: number) => string;
    failedCount: (n: number) => string;
    showSteps: string;
    hideSteps: string;
    request: string;
    response: string;
    copy: string;
    copied: string;
    close: string;
    argsClipped: string;
    noArgs: string;
    noResponse: string;
    more: (n: number) => string;
    details: string;
}
export declare const defaultToolLabels: ToolLabels;
