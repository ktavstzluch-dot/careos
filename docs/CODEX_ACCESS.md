# CareOS Access Information

## GitHub

Repository:

https://github.com/ktavstzluch-dot/careos

Repository Name:
careos

Owner:
ktavstzluch-dot

Required Permissions:

* Read repository
* Write code
* Create branches
* Create commits
* Create pull requests
* Merge pull requests

Current Workflow:

Codex
→ Create Branch
→ Commit Changes
→ Create PR
→ User Review
→ Merge PR
→ Vercel Deploy

---

## Vercel

Project Name:
careos

Vercel Team:
careos-s-projects

Production Deployment:
https://vercel.com/careos-s-projects/careos
Required Permissions:

* View deployments
* View build logs
* Trigger redeploys (optional)

---

## Supabase

Project:
https://qaphhgcildgwozzqjcst.supabase.co

Required Permissions:

* View schema
* Execute SQL migrations
* Manage storage buckets
* View RLS policies

Important Bucket:

care-photos

---

## Environment Variables

Required in Vercel:

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY

Important:

Never hardcode these values into the repository.

---

## Important Project Files

Main Working File:

app/sessions/page.tsx

Documentation:

/docs/CAREOS_MASTER_CONTEXT.md
/docs/ROADMAP.md
/docs/CODEX_RULES.md
/docs/PROJECT_STATE_JUNE_2026.md

---

## Product Owner Notes

Before implementing any feature:

1. Explain planned change.
2. Wait for approval.
3. Create focused PR.
4. Avoid unrelated file changes.

Do not modify without explicit approval:

* app/layout.tsx
* app/globals.css
* lib/supabase.ts
* tsconfig.json

Primary Product Goal:

Families pay for peace of mind.

Build trust, communication, and transparency.
