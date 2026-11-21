# Changelog

## 0.1.0 (2026-11-21)
First release. Contract: `hermes-chat-events/2`, paged history, session info.
- Core (pure TS): `parseChatEvents` (v2 frames: tool id/preview/args/duration/result, `commentary`), `runTurn`,
  `sendApproval`, `startOver`, `fetchHistoryPage`, `ChatHttpError`, `initials`, `avatarColor`, contract types.
- Adapter: `hermesChatAdapter({ urls, target, csrf, initialPage? })` for `@mui/x-chat` (backward paging + streaming).
- React: `HermesChat` (toolbar, fit height, paging, avatars, approvals), `ParticipantAvatar`, `ToolRow`,
  `ToolStepGroup`, `ToolDetailDrawer`, `SessionInfoDrawer`, `ChatComposer`, `Approval`.
- Strict-CSP safe: no inline styles, no eval; html only through the consumer's `renderHtml`.
