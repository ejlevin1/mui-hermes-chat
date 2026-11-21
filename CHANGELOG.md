# Changelog

## 0.2.2 (2026-11-21)
- Fix: history/paged-in `role: "user"` messages now carry author id `user` (agent: `hermes`), so they use the same viewer style (right-aligned, accent bubble, avatar right) as live messages. No prop changes.
- Send button is a circle (`border-radius: 50%`), accent filled whenever there is text; grey only when truly disabled.
- Composer insets: field and Send keep >= 8px (`theme.spacing(1)`) from the surface edges at every density.
- New exports `USER_AUTHOR_ID`, `AGENT_AUTHOR_ID` (adapter). Nothing breaking.

## 0.2.1 (2026-11-21)
- Fix CI: regenerate `package-lock.json` with npm 10 so `npm ci` passes on Node 22 (missing optional `yaml@2.9.1` entry).

## 0.2.0 (2026-11-21)
- Published to npm (`mui-hermes-chat`) from CI with provenance (trusted publishing, no tokens): install from npm.
- `dist/` is no longer committed; it is built in CI and shipped in the npm package. Git tags `v0.1.x` keep their `dist/`.
- CI hardening: actions pinned to commit SHAs, read-only `GITHUB_TOKEN`, checksum-verified gitleaks download, package
  contents checked with `npm pack --dry-run`.
- Dependabot for npm and GitHub Actions (weekly, minor + patch grouped).
- `SECURITY.md`: report vulnerabilities privately via GitHub.

## 0.1.1 (2026-11-21)
- MIT license.
- gitleaks git hooks (pre-commit, pre-push) and a CI `secrets` job; `npm run hooks` enables them.
- Synthetic names in test fixtures.

## 0.1.0 (2026-11-21)
First release. Contract: `hermes-chat-events/2`, paged history, session info.
- Core (pure TS): `parseChatEvents` (v2 frames: tool id/preview/args/duration/result, `commentary`), `runTurn`,
  `sendApproval`, `startOver`, `fetchHistoryPage`, `ChatHttpError`, `initials`, `avatarColor`, contract types.
- Adapter: `hermesChatAdapter({ urls, target, csrf, initialPage? })` for `@mui/x-chat` (backward paging + streaming).
- React: `HermesChat` (toolbar, fit height, paging, avatars, approvals), `ParticipantAvatar`, `ToolRow`,
  `ToolStepGroup`, `ToolDetailDrawer`, `SessionInfoDrawer`, `ChatComposer`, `Approval`.
- Strict-CSP safe: no inline styles, no eval; html only through the consumer's `renderHtml`.
