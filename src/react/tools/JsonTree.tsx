/** Small collapsible JSON tree. Strings render as text, never HTML. */
import { useState } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";

const mono = { fontFamily: "monospace", overflowWrap: "anywhere" } as const;

function Scalar({ value }: { value: unknown }) {
  const color = typeof value === "string" ? "success.main" : value === null ? "text.disabled" : "info.main";
  const text = typeof value === "string" ? JSON.stringify(value) : String(value);
  return <Typography variant="caption" component="span" sx={{ ...mono, color, whiteSpace: "pre-wrap" }}>{text}</Typography>;
}

export function JsonNode({ name, value, depth = 0 }: { name?: string; value: unknown; depth?: number }) {
  const [open, setOpen] = useState(depth < 1);
  const key = name !== undefined && (
    <Typography variant="caption" component="span" color="text.secondary" sx={mono}>{name}: </Typography>
  );
  if (value === null || typeof value !== "object") {
    return <Box sx={{ pl: depth ? 2 : 0 }}>{key}<Scalar value={value} /></Box>;
  }
  const entries: [string, unknown][] = Array.isArray(value) ? value.map((v, i) => [String(i), v]) : Object.entries(value);
  const summary = Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`;
  return (
    <Box sx={{ pl: depth ? 2 : 0 }}>
      <ButtonBase aria-expanded={open} aria-label={`${name ?? "root"} ${summary}`} onClick={() => setOpen((v) => !v)} sx={{ ...mono, justifyContent: "flex-start", textAlign: "left" }}>
        <Typography variant="caption" component="span" sx={mono}>{open ? "▾" : "▸"} {key}{summary}</Typography>
      </ButtonBase>
      {open && entries.map(([k, v]) => <JsonNode key={k} name={k} value={v} depth={depth + 1} />)}
    </Box>
  );
}

export function JsonTree({ value }: { value: unknown }) {
  return <Box data-testid="json-tree"><JsonNode value={value} /></Box>;
}
