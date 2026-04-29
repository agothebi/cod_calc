# PWA Release Checklist

Use this checklist for every deploy that changes app assets.

## 1) Bump service worker cache version

- File: `sw.js`
- Update `CACHE_VERSION` to the next value:
  - `cats-davidson-v2` -> `cats-davidson-v3` -> `cats-davidson-v4`

Bump when any of these change:
- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `logo.png` or any icon used by the app shell

## 2) Deploy

- Deploy your updated app as usual.

## 3) Post-deploy verification

### Desktop browser
- Open the app once online.
- Hard refresh once.
- In DevTools > Application > Cache Storage, confirm only the latest `cats-davidson-vX` is active.

### Android (Chrome installed PWA)
- Open installed app while online.
- Confirm latest UI/behavior appears.
- Close and reopen once to confirm updated shell loads.

### iPhone (Safari + Add to Home Screen app)
- Open app in Safari once while online after deploy.
- Launch from Home Screen and confirm latest UI/behavior.
- If stale, fully close app and reopen (normal iOS behavior).

### Offline sanity check
- After one online open, disable network and relaunch app.
- Confirm app shell still loads and basic calculator flow works.

## 4) Release acceptance criteria

- `sw.js` cache version is bumped for this release.
- Updated assets are served after users open online.
- Android + iPhone install experience remains stable.
