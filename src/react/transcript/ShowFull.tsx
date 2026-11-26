/** "Show full" for a clipped field: link → loading → full plain text in place (or failure + retry). */
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { useState, type ReactNode } from "react";
import type { TranscriptLabels } from "./labels";

/** `render(full)` shows the unclipped text; before that `children` is the clipped content. */
export function ShowFull({ load, labels, render, children }: { load?: () => Promise<string>; labels: TranscriptLabels; render: (full: string) => ReactNode; children: ReactNode }) {
  const [s, setS] = useState<{ state: "idle" | "loading" | "failed" | "done"; text?: string }>({ state: "idle" });
  if (s.state === "done") return <>{render(s.text ?? "")}</>;
  const go = () => {
    setS({ state: "loading" });
    load!().then((text) => setS({ state: "done", text }), () => setS({ state: "failed" }));
  };
  return (
    <>
      {children}
      {load && (s.state === "loading" ? (
        <Typography variant="caption" color="text.secondary" role="status">{labels.loadingFull}</Typography>
      ) : (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {s.state === "failed" && <Typography variant="caption" color="error" role="alert">{labels.showFullFailed}</Typography>}
          <Link component="button" type="button" variant="caption" onClick={go}>{s.state === "failed" ? labels.retry : labels.showFull}</Link>
        </Box>
      ))}
    </>
  );
}
