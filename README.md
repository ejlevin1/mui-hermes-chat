# mui-hermes-chat

Embeddable Hermes chat for React 19 + MUI 9 apps, built on `@mui/x-chat` (pinned alpha). One package include gives
a full chat screen (avatars, composer, streamed replies, Jarvis-style tool rows, approvals, progressive history,
session info), plus the lower layers on their own (event parser, transport, x-chat adapter).

## Install
```sh
npm install mui-hermes-chat
```

Installing from a git tag (`github:ejlevin1/mui-hermes-chat#v0.1.x`) is legacy: `dist/` is no longer committed, so
only the v0.1.x tags carry a built `dist/`. Use the npm package from 0.2.0 on.

Peer deps: `react` 19, `react-dom`, `@mui/material` 9, `@mui/icons-material` 9, `@emotion/react`, `@emotion/styled`,
`@mui/x-chat` exactly `9.0.0-alpha.22`.

## Embed
```tsx
import { HermesChat } from "mui-hermes-chat";

<HermesChat
  urls={chat.urls}                                   // { turn, approval, new, history, messages }
  target={{ board: "main", task: "t_123" }}          // sent as query/body to every call
  csrf={async (refresh) => getCsrfToken(refresh)}
  history={{ messages: chat.messages, cursor: chat.history_page.cursor, hasMore: chat.history_page.has_more }}
  renderHtml={(html) => <SafeHtml html={html} />}    // your sanitising renderer; the package never injects html
  participants={{
    user: { name: me.viewer.name || me.email },
    agent: { name: chat.agent.label, initials: chat.agent.initials, color: chat.agent.color },
  }}
  session={sessionInfo}                              // optional: enables the Info button
  onTurnEnd={refetch}
/>
```

## Props (`HermesChatProps`)
| prop | type | notes |
|---|---|---|
| `urls`, `target`, `csrf` | `ChatUrls`, `Target`, `CsrfSource` | server endpoints, subject, token source |
| `history` | `{ messages, cursor, hasMore }` | newest page; older pages load via `urls.messages` |
| `renderHtml` | `(html) => ReactNode` | renders server-sanitised assistant html |
| `participants` | `{ user, agent }` | `Participant = { name, initials?, color?, avatarUrl? }` |
| `session?` | `SessionInfo` | enables the Info button and drawer |
| `labels?` | `Partial<ChatLabels>` | every user-visible string; English defaults |
| `maxMessage?` | number | composer length limit |
| `notice?`, `linkedNote?`, `changed?` | string / boolean | server notice, linked-subject note, "subject changed" note |
| `hasEarlier?`, `earlierHref?` | boolean / string | link to earlier conversations in the toolbar |
| `onTurnEnd?` | `() => void` | after each finished turn and after New chat |
| `mode?` | `inline \| sheet \| auto` | `auto` = sheet on phones |
| `fit?` | `{ minHeight?, bottomGap? }` | fit the card to the viewport (theme spacing units) |
| `bubbleOppositeGap?` | `number \| string` | min gap on the side opposite the avatar; default avatar size + gutter |
| `toolbarActions?` | `ReactNode` | extra toolbar content |
| `onStreamLost?` | `(info: { code: "network" \| "detached" }) => void` | called once when a turn's stream is lost; see [Long turns](#long-turns) |
| `resetKey?` | `string \| number` | when it changes after mount, the conversation re-initialises from the current `history` |

## Labels
Pass `labels={{ newChat: "Neuer Chat", ... }}`. Keys come from `ChatLabels` (chat, composer, tools and session-info
areas merged); defaults are exported as `defaultChatLabels`, `defaultComposerLabels`, `defaultToolLabels`,
`DEFAULT_INFO_LABELS`. Function labels such as `steps(n)` take the count.

## Theming
Colours are palette roles, so light and dark work. Participant colours are accent names:
`indigo | blue | teal | green | orange | red | purple | pink | gray`. `color: null` hashes the key onto the list
(`avatarColor(key)`). Initials come from `initials(name)` (email local part, first+last word, or first two letters;
empty shows a person icon).

## CSP
No inline `<style>`, no `eval`, no `innerHTML` in the package: assistant html goes only through your `renderHtml`.
Styling is MUI `sx`/`styled`, so a nonce'd Emotion cache on the consumer side is all that is needed. Tool args and
previews are rendered as text, never html.

## Event contract `hermes-chat-events/2`
`POST urls.turn` answers `text/event-stream`, frames `data: {json}`. v1 frames `run, delta, thinking, tool, approval,
reply, error, end` are unchanged; unknown fields and frames are ignored, so a v1 server works.

| `t` | fields |
|---|---|
| `tool` | `name`, `state: start\|done\|failed`, `id?`, `preview?` (≤300 chars), `args?` (redacted, ≤4 KB else `args_clipped: true`), `duration_s?`, `result_preview?` (≤500 chars) |
| `commentary` | `text`: interim note shown muted, never the final answer |

Server redacts secrets before clipping; nothing here is rendered as html.

## Long turns
A turn can outlive its HTTP stream. The server may send `: keepalive` SSE comment lines between frames (the parser
skips them) and, when the relay's idle cap hits, an `error` frame with `code: "detached"`: the run continues
server-side. If the stream ends without `reply`/`error`/`end` (network drop) or arrives `detached`, the chat keeps the
user's message, shows an info note (label `stillWorking`: "Hermes is still working on this. The answer will appear
here when it's done.") and calls `onStreamLost({ code: "network" | "detached" })` once. Any other `error` code, an HTTP
error before the stream starts (e.g. 409 `turn_in_progress`), a request that fails before any response (offline, DNS: the server never got the turn, so the "connection lost, send again" note) and a user abort behave as before.

Recipe: while the server says a turn is running, poll your read model; when it ends, bump `resetKey` with the fresh
`history`. The conversation re-initialises from `history` at the newest message and the note is gone.

```tsx
const [running, setRunning] = useState(false);
const [resetKey, setResetKey] = useState(0);
// your code: `polled` is true once a poll has returned after `running` became true (reset it when running flips)
const { history, turnRunning, polled } = usePolledReadModel(running);
useEffect(() => { if (running && polled && !turnRunning) { setRunning(false); setResetKey((k) => k + 1); } }, [running, polled, turnRunning]);
<HermesChat {...props} history={history} resetKey={resetKey} onStreamLost={() => setRunning(true)} />
```

An unchanged `resetKey` never remounts the chat.

## History paging
Read model carries the newest page (≤30 user turns) as `history`. `GET <urls.messages>?<target>&cursor=<c>` returns
`{ messages, cursor, has_more }`, the next older page, chronological. Cursors are opaque and server-signed; a bad one
answers 400 `bad_cursor`, anything not allowed 404. The client dedupes by message `id`. Messages are
`HermesMessage { id, role, text, html, created?, tools? }`.

## Use only the core / adapter
Everything is exported from the root. Without React: `parseChatEvents`, `runTurn`, `sendApproval`, `startOver`,
`fetchHistoryPage`, `initials`, `avatarColor` (`src/core` imports no React or MUI). With your own UI on x-chat:

```ts
import { hermesChatAdapter } from "mui-hermes-chat";
const adapter = hermesChatAdapter({ urls, target, csrf, initialPage: { messages, cursor, hasMore } });
// pass to <ChatProvider adapter={adapter} /> from @mui/x-chat
```

Layers: `src/core` (pure TS) · `src/adapter` (x-chat `ChatAdapter`) · `src/react/<area>`.

## Contributing
Run `npm run hooks` once per clone: it enables the gitleaks pre-commit and pre-push hooks (`brew install gitleaks`).
Use synthetic names, emails and paths in code and fixtures.

## License
MIT, see [LICENSE](LICENSE).
