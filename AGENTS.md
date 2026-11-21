# Conventions
- Library, not an app: no imports from any consumer; everything app-specific comes in through props.
- Layers: `src/core` (pure TS, no React), `src/adapter` (x-chat ChatAdapter), `src/react` (components). core never
  imports react or MUI; a test enforces the boundaries.
- Strict CSP consumers: no inline <style>, no eval, no innerHTML except through the consumer's `renderHtml` prop.
  Styling only via MUI `sx`/theme (consumer's nonce'd Emotion cache).
- Theme tokens only: no hex colours, px radii or font sizes outside the theme (the Hermes design-system rule).
- `npm run typecheck && npm test` must pass; `npm run build` writes `dist/`, which is NOT committed (CI builds
  it; the npm package ships it).
- Releases: bump the version in package.json + package-lock.json + `MUI_HERMES_CHAT_VERSION` (and its test) +
  CHANGELOG.md, merge to main, tag `v<x.y.z>` on main. `.github/workflows/publish.yml` then publishes to npm with
  provenance via trusted publishing (OIDC; no token anywhere) and skips a version already on npm.
- One-time bootstrap: publish the first version by hand (`npm publish --access public`), then run
  `npm trust github mui-hermes-chat --repo ejlevin1/mui-hermes-chat --file publish.yml --allow-publish`.
  Never rename `publish.yml` (it is the registered trusted publisher).

# Secrets guard
- Run `npm run hooks` once per clone (sets `core.hooksPath=.githooks`).
- The hooks (`pre-commit`, `pre-push`) need `gitleaks` (`brew install gitleaks`) and fail closed without it.
- Never commit real names, emails, host names, IPs or home paths: use synthetic values (`Ada Lovelace`, `ada@example.com`, `/Users/alice/`).
- CI job `secrets` scans the full history and is the backstop; `--no-verify` is the explicit local bypass.
