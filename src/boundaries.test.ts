/* No @types/node in this repo: the node modules are loaded untyped on purpose. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const load = (m: string): Promise<any> => import(/* @vite-ignore */ m);
const [fs, path, url] = await Promise.all([load("node:fs"), load("node:path"), load("node:url")]);
const { readdirSync, readFileSync, statSync } = fs;
const { dirname, join, relative, resolve, sep } = path;
const { fileURLToPath } = url;

const SRC = dirname(fileURLToPath(import.meta.url));
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((n: string) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(SRC).filter((f: string) => /\.tsx?$/.test(f));
const specs = (f: string) =>
  [...readFileSync(f, "utf8").matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map((m: RegExpMatchArray) => m[1]);

test("no file imports a relative path outside src", () => {
  for (const f of files) for (const s of specs(f)) {
    if (!s.startsWith(".")) continue;
    const t = resolve(dirname(f), s);
    expect(t === SRC || t.startsWith(SRC + sep), `${relative(SRC, f)} -> ${s}`).toBe(true);
  }
});

test("src/core imports no react or @mui", () => {
  for (const f of files.filter((x: string) => x.startsWith(join(SRC, "core") + sep) && !/\.test\.tsx?$/.test(x))) for (const s of specs(f)) {
    expect(/^(react|react-dom|@mui|@emotion)(\/|$)/.test(s), `${relative(SRC, f)} -> ${s}`).toBe(false);
  }
});

test("every contract section 5 name is exported from the root", async () => {
  const api = (await import("./index")) as Record<string, unknown>;
  const values = ["parseChatEvents", "CHAT_EVENTS_CONTRACT", "runTurn", "sendApproval", "startOver", "fetchHistoryPage",
    "ChatHttpError", "initials", "avatarColor", "ToolFamily", "hermesChatAdapter", "HermesChat", "ParticipantAvatar",
    "ToolRow", "ToolStepGroup", "ToolDetailDrawer", "SessionInfoDrawer", "ChatComposer", "Approval", "MUI_HERMES_CHAT_VERSION"];
  for (const n of values) expect(api[n], n).toBeDefined();
  const idx = readFileSync(join(SRC, "index.ts"), "utf8");
  expect(idx).toMatch(/export \* from "\.\/core"/);
});
