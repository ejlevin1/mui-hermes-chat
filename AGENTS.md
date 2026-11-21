# Conventions
- Library, not an app: no imports from any consumer; everything app-specific comes in through props.
- Layers: `src/core` (pure TS, no React), `src/adapter` (x-chat ChatAdapter), `src/react` (components). core never
  imports react or MUI; a test enforces the boundaries.
- Strict CSP consumers: no inline <style>, no eval, no innerHTML except through the consumer's `renderHtml` prop.
  Styling only via MUI `sx`/theme (consumer's nonce'd Emotion cache).
- Theme tokens only: no hex colours, px radii or font sizes outside the theme (the Hermes design-system rule).
- `npm run typecheck && npm test` must pass; `npm run build` regenerates `dist/`, which is committed on release.
- Releases: bump package.json version + MUI_HERMES_CHAT_VERSION + CHANGELOG.md, rebuild dist, tag `v<x.y.z>`.
