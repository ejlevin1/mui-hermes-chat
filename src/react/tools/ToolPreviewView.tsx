/** Renders a resolved inline tool preview (monospace; gutter symbols never colour-only). */
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CheckBoxOutlined from "@mui/icons-material/CheckBoxOutlined";
import CheckBoxOutlineBlank from "@mui/icons-material/CheckBoxOutlineBlank";
import { gutter, type ToolPreviewKind } from "./toolPreview";
import { defaultToolLabels, type ToolLabels } from "./labels";

const mono = { fontFamily: "monospace", whiteSpace: "pre-wrap", overflowWrap: "anywhere" } as const;

export function ToolPreviewView({ preview, labels }: { preview: ToolPreviewKind; labels?: Partial<ToolLabels> }) {
  const l = { ...defaultToolLabels, ...labels };
  const more = (n: number) => n > 0 && <Typography variant="caption" color="text.secondary">{l.more(n)}</Typography>;
  switch (preview.kind) {
    case "none": return null;
    case "diff":
      return (
        <Box data-testid="tool-preview-diff" sx={{ overflowX: "auto" }}>
          {preview.lines.map((line, i) => (
            <Typography key={i} variant="caption" component="div" sx={{
              ...mono,
              color: line.kind === "added" ? "success.main" : line.kind === "removed" ? "error.main" : "text.secondary",
            }}>
              <span aria-hidden="true">{gutter(line.kind)} </span>
              {line.text}
            </Typography>
          ))}
          {more(preview.more)}
        </Box>
      );
    case "todos":
      return (
        <Box data-testid="tool-preview-todos">
          {preview.entries.map((t, i) => {
            const done = t.status === "completed" || t.status === "done";
            return (
              <Typography key={t.id ?? i} variant="caption" component="div" sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                {done ? <CheckBoxOutlined fontSize="inherit" titleAccess="completed" /> : <CheckBoxOutlineBlank fontSize="inherit" titleAccess={t.status} />}
                <span>{t.content}</span>
              </Typography>
            );
          })}
          {more(preview.more)}
        </Box>
      );
    case "subagentGroup":
      return <Typography variant="caption" color="text.secondary">{preview.children.length}</Typography>;
    case "image":
      return <Typography variant="caption" sx={mono}>{preview.basename}</Typography>;
    case "generic":
      return (
        <Box data-testid="tool-preview-generic">
          {preview.pairs.map((p) => (
            <Typography key={p.key} variant="caption" component="div" sx={mono}>
              <Box component="span" sx={{ color: "text.secondary" }}>{p.key}: </Box>{p.value}
            </Typography>
          ))}
          {preview.resultLines.map((r, i) => (
            <Typography key={i} variant="caption" component="div" color="text.secondary" sx={mono}>{r}</Typography>
          ))}
        </Box>
      );
  }
}
