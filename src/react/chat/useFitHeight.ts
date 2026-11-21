/** Card `maxHeight = max(minHeight, innerHeight − card.top − bottomGap)`, kept current on resize, scroll-settle and layout change. */
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export interface FitHeightOptions {
  minHeight?: number;
  bottomGap?: number;
}

/** Pure math, exported for tests. */
export function fitMaxHeight(innerHeight: number, top: number, minHeight = 420, bottomGap = 24): number {
  return Math.max(minHeight, Math.floor(innerHeight - top - bottomGap));
}

export function useFitHeight<T extends HTMLElement>(
  { minHeight = 420, bottomGap = 24 }: FitHeightOptions = {},
  enabled = true,
): { ref: RefObject<T | null>; maxHeight: number | undefined } {
  const ref = useRef<T | null>(null);
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setMaxHeight(fitMaxHeight(window.innerHeight, el.getBoundingClientRect().top, minHeight, bottomGap));
  }, [minHeight, bottomGap]);

  useEffect(() => {
    if (!enabled) return;
    measure();
    let settle: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      clearTimeout(settle);
      settle = setTimeout(measure, 100); // re-measure once scrolling settles
    };
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      if (ref.current?.parentElement) ro.observe(ref.current.parentElement);
      ro.observe(document.documentElement);
    }
    return () => {
      clearTimeout(settle);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll);
      ro?.disconnect();
    };
  }, [enabled, measure]);

  return { ref, maxHeight: enabled ? maxHeight : undefined };
}
