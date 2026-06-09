---
name: Committee (Chit Fund) Tracker
description: Group savings feature where members contribute monthly and one receives the pool; tracked in cloud with realtime sync
type: feature
---
Cloud-synced (not local-first) — uses Supabase tables `committees`, `committee_members`, `committee_contributions`, `committee_payouts`.

Roles:
- Organizer: creates committee, adds members, marks monthly contributions paid (online/cash), records each month's payout recipient + date + method.
- Members: read-only view of all committee data (visible only if their `user_id` matches the signed-in user, otherwise they're tracked by name only).

Per-month payout amount = monthly_amount × member_count (organizer counted).

UI lives at `/committee`, `/committee/new`, `/committee/:id` (Schedule / Contributions / Members tabs). Realtime subscription refreshes data so members see organizer updates live.

Confirmation dialog required before creating a committee, recording a payout, or deleting — consistent with the global confirmation rule.
