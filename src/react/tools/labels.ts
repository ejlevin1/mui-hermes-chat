/** Default English strings for the tool components. */
export interface ToolLabels {
  running: string; done: string; failed: string; showPreview: string; hidePreview: string;
  steps: (n: number) => string; failedCount: (n: number) => string; showSteps: string; hideSteps: string;
  request: string; response: string; copy: string; copied: string; close: string; argsClipped: string;
  noArgs: string; noResponse: string; more: (n: number) => string; details: string;
}
export const defaultToolLabels: ToolLabels = {
  running: "Running", done: "Done", failed: "Failed", showPreview: "Show preview", hidePreview: "Hide preview",
  steps: (n) => `${n} steps`, failedCount: (n) => `${n} failed`, showSteps: "Show steps", hideSteps: "Hide steps",
  request: "Request", response: "Response", copy: "Copy", copied: "Copied", close: "Close",
  argsClipped: "Arguments were clipped by the server.", noArgs: "No arguments.", noResponse: "No response yet.",
  more: (n) => `… ${n} more`, details: "Tool details",
};
