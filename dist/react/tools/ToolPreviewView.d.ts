import { type ToolPreviewKind } from "./toolPreview";
import { type ToolLabels } from "./labels";
export declare function ToolPreviewView({ preview, labels }: {
    preview: ToolPreviewKind;
    labels?: Partial<ToolLabels>;
}): import("react").JSX.Element | null;
