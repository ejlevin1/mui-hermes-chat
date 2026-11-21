# mui-hermes-chat

Embeddable Hermes chat for React 19 + MUI 9 apps, built on `@mui/x-chat` (pinned alpha). One package include gives
a full chat screen (avatars, composer, streamed replies, Jarvis-style tool rows, approvals, progressive history,
session info), plus the lower layers on their own (event parser, transport, x-chat adapter).

Install (private, by git tag): `"mui-hermes-chat": "github:ejlevin1/mui-hermes-chat#v<x.y.z>"`.
`dist/` is committed so consumers need no build step. First consumer: hermes-kanban-tasks.
