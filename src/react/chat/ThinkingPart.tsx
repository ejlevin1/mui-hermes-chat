/** Own "Thinking" block: capped inner-scroll viewport that never changes height by itself; only the reader toggles it. */
import PsychologyOutlined from "@mui/icons-material/PsychologyOutlined";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { keyframes } from "@mui/system";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { defaultChatLabels, type ChatLabels } from "./labels";

const pulse = keyframes`0%,100%{opacity:1}50%{opacity:.45}`;
const LINES = 6;

function scrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let p = el?.parentElement ?? null; p; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if (oy === "auto" || oy === "scroll") return p;
  }
  return null;
}

export interface ThinkingPartProps {
  text: string;
  /** x-chat part state: "streaming" while tokens arrive. */
  state?: string;
  labels?: Partial<ChatLabels>;
}

export function ThinkingPart({ text, state, labels }: ThinkingPartProps) {
  const l = { ...defaultChatLabels, ...labels };
  const streaming = state === "streaming";
  const startedStreaming = useRef(streaming);
  const t0 = useRef(Date.now());
  const [seconds, setSeconds] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
  // History (done at mount) starts collapsed; a live part starts in the capped viewport.
  const [open, setOpen] = useState(streaming);
  const [all, setAll] = useState(false);
  const [overflow, setOverflow] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLButtonElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const anchor = useRef<number | null>(null);

  useEffect(() => {
    if (!streaming) return;
    const tick = () => setSeconds(Math.round((Date.now() - t0.current) / 1000));
    const h = setInterval(tick, 1000);
    return () => clearInterval(h);
  }, [streaming]);
  useEffect(() => {
    if (!streaming && startedStreaming.current && duration === null) setDuration(Math.max(1, Math.round((Date.now() - t0.current) / 1000)));
  }, [streaming, duration]);

  // Keep the header where it was after a user toggle.
  useLayoutEffect(() => {
    if (anchor.current === null || !header.current) return;
    const delta = header.current.getBoundingClientRect().top - anchor.current;
    anchor.current = null;
    const sp = scrollParent(root.current);
    if (sp && delta) sp.scrollTop += delta;
  }, [open, all]);

  useLayoutEffect(() => {
    const el = body.current;
    if (!el || !open) return;
    setOverflow(el.scrollHeight > el.clientHeight + 1 || all);
    if (streaming && stick.current && !all) el.scrollTop = el.scrollHeight;
  }, [text, streaming, open, all]);

  const toggle = (fn: () => void) => {
    anchor.current = header.current?.getBoundingClientRect().top ?? null;
    fn();
  };
  const onScroll = () => {
    const el = body.current;
    if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 4;
    setScrolled(el.scrollTop > 0);
  };

  const title = streaming ? `${l.thinking}${seconds ? ` ${seconds} s` : ""}` : duration !== null ? l.thoughtFor(duration) : l.thoughts;
  const capped = !all;
  return (
    <Box ref={root} data-testid="thinking" sx={{ minWidth: 0, borderLeft: 1, borderColor: "divider", pl: 1.5, color: "text.secondary" }}>
      <ButtonBase
        ref={header}
        onClick={() => toggle(() => setOpen((o) => !o))}
        aria-expanded={open}
        aria-controls={id}
        sx={{ display: "flex", width: "100%", justifyContent: "flex-start", gap: 0.75, py: 0.5, borderRadius: 1, textAlign: "left" }}
      >
        <PsychologyOutlined fontSize="small" />
        <Typography
          variant="caption"
          sx={{
            flex: 1,
            animation: streaming ? `${pulse} 1.6s ease-in-out infinite` : undefined,
            "@media (prefers-reduced-motion: reduce)": { animation: "none" },
          }}
        >
          {title}
        </Typography>
        <ExpandMore fontSize="small" sx={{ transform: open ? "rotate(180deg)" : "none" }} />
      </ButtonBase>
      <Box id={id} hidden={!open} sx={{ display: open ? "block" : "none" }}>
        <Box
          ref={body}
          data-testid="thinking-body"
          onScroll={onScroll}
          sx={{
            maxHeight: capped ? `calc(${LINES} * 1.5em)` : "none",
            overflowY: capped ? "auto" : "visible",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            typography: "caption",
            ...(capped && scrolled
              ? { maskImage: "linear-gradient(to bottom, transparent, #000 1.5em)", WebkitMaskImage: "linear-gradient(to bottom, transparent, #000 1.5em)" }
              : {}),
          }}
        >
          {text}
        </Box>
        {overflow && (
          <Box sx={{ textAlign: "right" }}>
            <Link component="button" type="button" variant="caption" underline="hover" onClick={() => toggle(() => setAll((a) => !a))}>
              {all ? l.showLess : l.showAll}
            </Link>
          </Box>
        )}
      </Box>
    </Box>
  );
}
