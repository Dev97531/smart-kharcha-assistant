# Plan: Committee Feature + App Rename

## 1. Rename app: "Smart Kharcha AI" → "Smart Kharcha with AI"

Update every visible occurrence (tab title, meta, OG/Twitter, login, profile, headers, AI chat header, PWA, README). Internal identifiers (package name, table prefixes, function names) stay as-is.

Files touched:
- `index.html` (title, meta description stays, OG/Twitter titles)
- `src/pages/LoginPage.tsx`, `src/pages/Index.tsx`, `src/pages/ProfilePage.tsx`, `src/pages/AskAIPage.tsx`
- `src/components/VoiceOrb.tsx` (any branding string)
- `README.md`
- `supabase/functions/smart-kharcha-chat/index.ts` (system prompt branding strings only — name only, keep AI behavior untouched per AI Stability constraint)

## 2. Committee (Chit Fund) feature — cloud-synced

### Data model (Lovable Cloud migration)

```text
committees
  id, name, monthly_amount, total_months, start_month,
  payout_method ('rotation' | 'draw'), organizer_id (auth user),
  organizer_name, status ('active' | 'completed'),
  created_at, updated_at

committee_members
  id, committee_id, name, phone (optional),
  user_id (nullable — linked if member is an app user),
  rotation_order (int, nullable),
  created_at

committee_contributions   -- monthly payments per member
  id, committee_id, member_id, month_number (1..total_months),
  paid (bool), paid_on (date), method ('online' | 'cash'),
  note, marked_by (organizer user id), created_at

committee_payouts         -- who received the lump sum each month
  id, committee_id, month_number (unique per committee),
  recipient_member_id, payout_date, method ('online' | 'cash'),
  amount, note, recorded_by (organizer user id), created_at
```

### Access rules (RLS, plain English)
- A committee row, its members, contributions and payouts are visible to: the organizer AND any member whose `user_id` matches the signed-in user. Everyone in the group sees the same ledger.
- Only the organizer can create the committee, add/remove members, mark monthly contributions paid/unpaid, and record the monthly payout recipient + method (online/cash).
- Members can read everything but cannot mutate.
- Standard GRANTs to `authenticated` + `service_role`; no `anon` access.

### UI

Bottom nav becomes 5-tab: Home · Lending · **Committee** · AI · Profile (icon: `Users` or `Wallet`).

New pages:
- `src/pages/CommitteePage.tsx` — list of committees user organizes or is part of, with status badges. "Create committee" CTA (organizer flow).
- `src/pages/CommitteeDetailPage.tsx` — group header (name, organizer, monthly amount, members, current month), tabs:
  - **Schedule** — month-by-month grid showing recipient + method (online/cash) + date. Organizer can tap a month to record/edit payout.
  - **Contributions** — current month checklist per member with online/cash toggle; organizer marks paid. History view available.
  - **Members** — list with rotation order.
- `src/pages/CreateCommitteePage.tsx` — name, monthly amount, total months, start month, payout method (rotation/draw), member list (name + optional phone), organizer auto = current user.

Reusable bits: `CommitteeCard`, `MonthRow`, method badge (Online/Cash), shadcn dialogs for record-payout & mark-paid.

### Routing
Add routes in `src/App.tsx`: `/committee`, `/committee/new`, `/committee/:id`.

### Data layer
- New hook `src/hooks/useCommittees.ts` using `@tanstack/react-query` + `supabase` client for fetch/mutate; invalidate on changes.
- Realtime subscription on `committee_contributions` + `committee_payouts` so members see organizer updates live.

### Confirmation rule
Per project memory, organizer must confirm via dialog before any save (mark paid, record payout, create committee).

## 3. Memory updates
- Rename app references in `mem://index.md` and related memory files.
- Add `mem://features/committee` describing the feature.

## 4. Out of scope (ask before doing)
- AI voice/chat tool-calls for committee (e.g. "mark Rahul paid via voice") — not included in v1.
- Notifications/reminders for upcoming contributions.
- Cross-account invites (members are added by name; linking to their app account by phone/email lookup is a follow-up).

Confirm and I'll switch to build mode and start with the migration, then UI.
