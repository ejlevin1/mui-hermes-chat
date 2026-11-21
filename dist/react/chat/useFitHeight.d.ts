/** Card `maxHeight = max(minHeight, innerHeight − card.top − bottomGap)`, kept current on resize, scroll-settle and layout change. */
import { type RefObject } from "react";
export interface FitHeightOptions {
    minHeight?: number;
    bottomGap?: number;
}
/** Pure math, exported for tests. */
export declare function fitMaxHeight(innerHeight: number, top: number, minHeight?: number, bottomGap?: number): number;
export declare function useFitHeight<T extends HTMLElement>({ minHeight, bottomGap }?: FitHeightOptions, enabled?: boolean): {
    ref: RefObject<T | null>;
    maxHeight: number | undefined;
};
