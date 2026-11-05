# Live event integration

The current public frontend reads event operations from the shared LleidaHackBackend. Start the backend's isolated demo with `bash scripts/local-operations.sh`. From `frontend/live-page` run:

```sh
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 NEXT_PUBLIC_EVENT_ID=1 NEXT_PUBLIC_ADMIN_URL=http://localhost:5175 npm run dev -- --port 3000
```

Live displays the server-clock-adjusted submission deadline, agenda, challenges/resources, Slack, FAQs, venue map and active alerts. Judging queues appear only in the judging phase. `/fullscreen` shows countdown, upcoming activities and judging turns; use `/fullscreen?room=ROOM_ID` for an individual room screen. `/judging` supports mobile team lookup. Five clicks on the tractor reveal the optional tractor runner game, controlled by touch buttons or arrow keys.

Alerts use `/v1/operations/{event_id}/ws` with reconnect and a three-second HTTP fallback. Other event state refreshes every three seconds. Deploy behind a proxy that supports WebSocket upgrades, and configure real API, event and management URLs. The old standalone `/admin` alert editor is replaced by a link to the shared management panel.

Web Push requires backend VAPID credentials, the push worker, browser permission and a supported secure context. On supported iOS versions the site must be installed on the home screen. The demo SVG map is not a measured venue plan and must be replaced with the actual event map. Verify push delivery, touch scanning in HackEPS, and Raspberry Pi display/fullscreen on real devices before event use. This branch is not a production deployment.

The LleidaCoins leaderboard shows the top 10 on the home page and the top 50 at `/leaderboard`, refreshed from the event snapshot every three seconds. Ranking uses current balance: prize redemptions subtract coins, and ledger corrections apply automatically. Equal balances share rank; only public nicknames and balances appear. Participants without ledger activity are omitted, and the empty state explains how to earn the first coins.
