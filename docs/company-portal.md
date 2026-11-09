# Company judging portal

`/companies` is the private company area, linked from Live. Organizers invite a company from Management. Everyone in that company uses one email/password; signing in on another device leaves existing sessions active. Notes, scores, favorites and a proposed winner are shared within the company and private from other companies and public Live.

The portal automatically opens the current HackEPS event resolved by Live, only when the company has an active grant for that event. It never falls back to an older granted event. The event and assigned room are shown as context rather than selectors. The first assigned room is used; organizers should grant the company its judging room. The current presentation comes from that assigned room. Scanning admits the team but leaves the timer stopped. The company starts the five-minute clock, may add one minute at a time, and explicitly finishes the presentation. The clock uses the backend start timestamp and per-presentation duration, so refreshes do not restart it. Reaching zero never ends the turn automatically. Finishing removes the team from the active view; the next called team needs its own badge scan. The project panel shows the team, member names, description and available Devpost/repository/demo links. A separate project list supports search, favorites and comparison of up to four projects. Selecting a proposed winner never publishes an official result.

Notes require explicit saving. Unsaved edits remain during network errors; navigation warns before discarding them. If another device saves first, the conflict panel shows the saved text, score and favorite and lets the user explicitly choose which version to keep. The application never automatically replays a write after a timeout. Session expiry asks the user to copy pending notes before signing in again. Tokens are kept in sessionStorage; setup tokens are read from the URL fragment and immediately removed from the address bar.

## Local access

With the backend local demo seed, open `http://localhost:3000/companies` using `company@example.test` / `LocalDemo2026!`. These are disposable local credentials. A presentation needs `started_at` to drive the countdown; otherwise the waiting clock displays 05:00.

## Release dependency

Deploy the backend company portal API and additive migration before this frontend. Set the existing `NEXT_PUBLIC_API_BASE_URL` to the intended API. The backend invitation origin must match this Live origin. Follow the backend `docs/company-portal.md` for backups, mail template provisioning and the durable mail worker. The frontend alone does not enable email delivery.

## Timer controls rollout

Requires backend migration `20261109_company_timer` and the versioned presentation-action endpoint before this frontend is published. Pending timer writes retain their operation UUID for safe retries. Finishing requires saved notes, and notes are locked while the completion request is unresolved. Organization scanner copy is updated in the paired HackEPS PR.
