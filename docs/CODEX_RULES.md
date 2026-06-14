# Codex Rules for CareOS

## Workflow Rules

Before every feature:

1. Explain what will be changed.
2. Wait for approval.
3. Make one focused change per PR.
4. Keep commits small.

## File Safety Rules

Do NOT modify unless explicitly requested:

* app/layout.tsx
* app/globals.css
* lib/supabase.ts
* tsconfig.json

Most session work should modify only:

app/sessions/page.tsx

## Product Rules

CareOS is a family care communication platform.

Families pay for peace of mind.

Do not turn CareOS into:

* CRM
* Medical software
* Spreadsheet
* Admin dashboard

## UX Rules

Prefer:

* Care Story
* Moments
* Share a Moment
* Today’s Care Story
* Shared by Anna

Avoid:

* Logs
* Reports
* Records
* Technical terminology

## Design Rules

Keep:

* Blue / green CareOS palette
* Soft cards
* Rounded corners
* Calm UI

Avoid:

* Dark themes
* Heavy borders
* Excessive bold text

## Build Rules

Always run:

npx tsc --noEmit

Run:

npm run build

when environment allows.

If build fails because next/font cannot fetch Manrope in Codex environment:

* Report it
* Do not rewrite fonts without approval

## Development Priorities

1. Keep Sessions stable
2. Improve Moments
3. Caregiver Identity v1
4. AI Daily Story
5. Messaging
6. Dashboard
7. Invitations and roles

## North Star

Parent opens CareOS and immediately feels:

"I know my loved one is okay."

Every feature should move the product closer to that feeling.
