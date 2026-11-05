# Live event integration

The current public frontend reads event operations from the shared LleidaHackBackend. Start the backend's isolated demo with `bash scripts/local-operations.sh`. From `frontend/live-page` run:

```sh
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 NEXT_PUBLIC_EVENT_ID=1 NEXT_PUBLIC_ADMIN_URL=http://localhost:5175 npm run dev -- --port 3000
```

Live displays the server-clock-adjusted submission deadline, agenda, challenges/resources, Slack, FAQs, venue map and active alerts. Judging queues appear only in the judging phase. `/fullscreen` shows countdown, upcoming activities and judging turns; use `/fullscreen?room=ROOM_ID` for an individual room screen. `/judging` supports mobile team lookup. Five clicks on the tractor reveal the optional tractor runner game, controlled by touch buttons or arrow keys.

Alerts use `/v1/operations/{event_id}/ws` with reconnect and a three-second HTTP fallback. Other event state refreshes every three seconds. Deploy behind a proxy that supports WebSocket upgrades, and configure real API, event and management URLs. The old standalone `/admin` alert editor is replaced by a link to the shared management panel.

Web Push requires backend VAPID credentials, the push worker, browser permission and a supported secure context. On supported iOS versions the site must be installed on the home screen. The demo SVG map is not a measured venue plan and must be replaced with the actual event map. Verify push delivery, touch scanning in HackEPS, and Raspberry Pi display/fullscreen on real devices before event use. This branch is not a production deployment.

The LleidaCoins leaderboard shows the top 10 on the home page and the top 50 at `/leaderboard`, refreshed from the event snapshot every three seconds. Ranking uses current balance: prize redemptions subtract coins, and ledger corrections apply automatically. Equal balances share rank; only public nicknames and balances appear. Participants without ledger activity are omitted, and the empty state explains how to earn the first coins.

## HackEPS visual identity

Live reuses the edition's actual artwork from `hackeps/src/assets/img/home10` (isotype, edition logo, clouds and bunting). Copies live under `frontend/live-page/public/hackeps`; synchronize them when the main site's edition artwork changes. The visual palette follows the main site: orange `#ff7430`, sky `#94cbf5`, ink `#2e2e2e`, white and turquoise `#78c6bd`, with Space Mono typography. Public pages, ranking, fullscreen, notifications, demo map, app icon and the tractor game follow this palette. The scanner reuses HackEPS's existing DarkPage layout; management tools use Gestió's existing brand tokens.

## Live structure and notifications

The home page follows the earlier Live hierarchy: navigation with an always-visible submission countdown, official stream/next-event panel, Wi-Fi and contact blocks. New leaderboard, judging and event operations remain available. Configure `stream_url`, `wifi_name`, `wifi_instructions` and `wifi_guide_url` in Gestió; these are public information. Old edition Wi-Fi credentials and Slack URLs are not reused.

Alerts are transient bottom-corner notifications, never persistent content cards. The first snapshot establishes a silent baseline. New IDs display for eight seconds, with at most three visible. IDs persist per browser tab/event to deduplicate WebSocket, HTTP polling, service worker delivery and route changes. The sound button unlocks Web Audio through a user gesture and plays a short confirmation tone; subsequent new alerts play once while the page is visible. Muting stops future tones. Autoplay restrictions can require enabling sound again after a full reload.

For a visible Live page, Web Push forwards the same alert ID to the page instead of showing a duplicate system notification. Background or push-only announcements use the operating system notification (`silent: false`); actual sound depends on browser/OS settings. A click focuses an existing Live window. Test push routing with `node --test tests/push-notifications.test.mjs` from the frontend directory. Device push permissions and actual speaker output still require real-device validation.

The fullscreen display uses a minimal dark layout with a large countdown and three upcoming activities. Screen settings contain sound, push and native fullscreen controls. A tractor and the edition Marraco cross the reserved bottom strip alternately every 90 seconds (first appearance after 8 seconds). Decorations are hidden when reduced motion is requested.
