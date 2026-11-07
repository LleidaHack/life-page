# Live event integration

The current public frontend reads event operations from the shared LleidaHackBackend. Start the backend's isolated demo with `bash scripts/local-operations.sh`. From `frontend/live-page` run:

```sh
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 NEXT_PUBLIC_EVENT_ID=1 NEXT_PUBLIC_ADMIN_URL=http://localhost:5175 npm run dev -- --port 3000
```

Live displays the server-clock-adjusted submission deadline, agenda, challenges/resources, Slack, FAQs, venue map and active alerts. Judging queues appear only in the judging phase. `/fullscreen` shows countdown, upcoming activities and judging turns; use `/fullscreen?room=ROOM_ID` for an individual room screen. `/judging` supports mobile team lookup. Five clicks on the tractor reveal the optional tractor runner game, controlled by touch buttons or arrow keys.

Alerts use `/v1/operations/{event_id}/ws` with reconnect and a three-second HTTP fallback. Other event state refreshes every three seconds. Deploy behind a proxy that supports WebSocket upgrades, and configure real API and event URLs. Live has no `/admin` route. Manage alerts, schedules and permissions in the separate Gestió application.

Web Push requires backend VAPID credentials, the push worker, browser permission and a supported secure context. On supported iOS versions the site must be installed on the home screen. The demo SVG map is not a measured venue plan and must be replaced with the actual event map. Verify push delivery, touch scanning in HackEPS, and Raspberry Pi display/fullscreen on real devices before event use. This branch is not a production deployment.

The LleidaCoins leaderboard shows the top 10 on the home page and the top 50 at `/leaderboard`, refreshed from the event snapshot every three seconds. Ranking uses current balance: prize redemptions subtract coins, and ledger corrections apply automatically. Equal balances share rank; only public nicknames and balances appear. Participants without ledger activity are omitted, and the empty state explains how to earn the first coins.

## HackEPS visual identity

Live reuses the edition's actual artwork from `hackeps/src/assets/img/home10` (isotype, edition logo, clouds and bunting). Copies live under `frontend/live-page/public/hackeps`; synchronize them when the main site's edition artwork changes. The visual palette follows the main site: orange `#ff7430`, sky `#94cbf5`, ink `#2e2e2e`, white and turquoise `#78c6bd`, with Space Mono typography. Public pages, ranking, fullscreen, notifications, demo map, app icon and the tractor game follow this palette. The scanner reuses HackEPS's existing DarkPage layout; management tools use Gestió's existing brand tokens.

## Live structure and notifications

The home page follows the earlier Live hierarchy: navigation with an always-visible submission countdown, official stream/next-event panel, Wi-Fi and contact blocks. New leaderboard, judging and event operations remain available. Configure `stream_url`, `wifi_name`, `wifi_instructions` and `wifi_guide_url` in Gestió; these are public information. Old edition Wi-Fi credentials and Slack URLs are not reused.

Alerts are transient bottom-corner notifications, never persistent content cards. The first snapshot establishes a silent baseline. New IDs display for eight seconds, with at most three visible. IDs persist per browser tab/event to deduplicate WebSocket, HTTP polling, service worker delivery and route changes. The sound button unlocks Web Audio through a user gesture and plays a short confirmation tone; subsequent new alerts play once while the page is visible. Muting stops future tones. Autoplay restrictions can require enabling sound again after a full reload.

For a visible Live page, Web Push forwards the same alert ID to the page instead of showing a duplicate system notification. Background or push-only announcements use the operating system notification (`silent: false`); actual sound depends on browser/OS settings. A click focuses an existing Live window. Test push routing with `node --test tests/push-notifications.test.mjs` from the frontend directory. Device push permissions and actual speaker output still require real-device validation.

The fullscreen display uses a minimal dark layout with a large countdown and three upcoming activities. Screen settings contain sound, push and native fullscreen controls. A tractor and the edition Marraco cross the reserved bottom strip alternately every 90 seconds (first appearance after 8 seconds). Decorations are hidden when reduced motion is requested.

The public homepage groups edition artwork and the submission timer in one orange masthead. Stream and next-activity information sit beside Wi-Fi and contact details, followed by an unboxed agenda and the LleidaCoins ranking. Its scoped styles preserve the independent fullscreen display.

## Manual live broadcast without API credentials

In Gestió → Comunicació → Live, paste the YouTube video URL, enable **Mostrar retransmissió**, and save. Supported links: `youtube.com/watch?v=VIDEO_ID`, `youtu.be/VIDEO_ID`, and YouTube `/live/`, `/embed/` or `/shorts/` video links. Channel links are not video links. Disable the switch and save when the broadcast ends.

The home page displays the selected video during hacking and judging, with muted autoplay and inline playback. Viewers can enable sound in the player; browser autoplay policies may require interaction. Stream status is controlled by the organizer, not detected automatically. The backend persists `stream_enabled` (default false) alongside `stream_url` in event configuration; deploy the backend update before the management and Live clients. No database migration or YouTube API key is required. Existing channel links remain available in the channel card.

Fullscreen projection also follows the broadcast switch, including room-specific screens. While enabled with a valid video link, the video replaces the countdown and judging queues. Disabling it restores the normal screen automatically through the existing configuration polling. Alerts and screen controls remain available.

## Production deployment (Vercel)

The Live frontend talks only to **LleidaHackBackend** (`/v1/operations/{event}/public`, `/push-key`, `/subscribe`, `/ws` and `/v1/event/get_hackeps`). Browsers connect to the backend directly (HTTPS and WSS), so Vercel only serves the Next.js app. The former Live backend (`backend/`) is no longer used.

1. Vercel project settings:
   - **Root Directory:** `frontend/live-page` (framework: Next.js; pnpm is detected from `pnpm-lock.yaml`).
   - **Domain:** e.g. `live.hackeps.com`.
2. Environment variables (Production, and Preview if previews should load data). `NEXT_PUBLIC_*` values are baked in at build time, so redeploy after changing them:
   - `NEXT_PUBLIC_API_BASE_URL` — LleidaHackBackend base URL, e.g. `https://backend.main.lleidahack.dev`. **Required:** production and preview builds fail without it.
   - `NEXT_PUBLIC_EVENT_ID` — optional. Empty resolves the current HackEPS edition through `/v1/event/get_hackeps`.
   - `NEXT_PUBLIC_DEVPOST_URL` — optional Devpost page of the edition (the button is hidden when empty).
3. Backend `CORS_ORIGINS` must list the Live origin(s) exactly, e.g. `https://live.hackeps.com`. Vercel preview URLs change on every deployment and are not allowed unless added explicitly; test previews against a non-production backend or a fixed preview domain.
4. Reverse proxy of the backend: enable WebSocket upgrades for `/v1/operations/{event}/ws` (Nginx Proxy Manager → "Websockets Support"). Without it, Live falls back to HTTP polling.
5. `/sw.js` is served with `Cache-Control: no-cache`, so open screens pick up service-worker updates.
6. Secrets: `backend/.env` was committed in the past and is no longer tracked. Rotate the old `ADMIN_USERNAME`/`ADMIN_PASSWORD`.

The Dockerfile and `docker-compose.yml` remain as a self-hosted alternative (they build the standalone server with the same variables, prefixed `LIVE_` in Compose).

### Load behaviour

- HTTP snapshot polling is a fallback: every ~20 s while the WebSocket is open, ~4 s otherwise, with jitter, exponential backoff on errors and no polling in hidden tabs.
- WebSocket reconnects with exponential backoff (3 s → 60 s, jitter), stops on close code 1008 (unknown event) and reconnects when no heartbeat arrives for 45 s.
- The service worker shows a system notification unless a visible Live page for the same event acknowledges the alert.
