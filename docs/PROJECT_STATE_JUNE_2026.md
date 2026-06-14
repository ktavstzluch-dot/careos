# CareOS Project State

## June 2026

This document captures the exact state of the CareOS project as of June 2026.

Purpose:

Allow any future Codex session, developer, or AI agent to continue development without losing product direction.

---

# Executive Summary

CareOS has evolved from a care logging application into a family care communication platform.

The core insight:

Families do not pay for logs.
Families pay for peace of mind.

The product is now focused on:

* Trust
* Communication
* Transparency
* Emotional connection

rather than administrative tracking.

---

# Current Technology Stack

Frontend:

* Next.js 15
* TypeScript
* React

Backend:

* Supabase

Hosting:

* Vercel

Source Control:

* GitHub

Repository:

ktavstzluch-dot/careos

---

# Current Infrastructure

## GitHub

Repository connected.

Development flow:

Codex
→ Branch
→ Pull Request
→ Review
→ Merge
→ Vercel Deploy

---

## Vercel

Connected to GitHub.

Production deploys automatically after merge into main.

Known issue:

Codex environments sometimes fail fetching Google Manrope fonts during build.

This is not always reproducible in Vercel.

---

## Supabase

Current backend.

Used for:

* Authentication
* Data storage
* Care sessions
* Care logs
* Photos
* Messages

Storage bucket:

care-photos

---

# Most Important Page

Current flagship page:

app/sessions/page.tsx

This page represents the core CareOS experience.

Almost all recent development has happened here.

---

# Current User Experience

## Session Lifecycle

Caregiver:

1. Opens session
2. Starts session
3. Adds updates
4. Shares Moments
5. Ends session

Family:

1. Opens CareOS
2. Reads Today's Care Story
3. Sees Moments
4. Reads AI summary

---

# Current Completed Features

## Session Timer

Implemented.

Features:

* Start Session
* End Session
* Active timer
* Remaining session timer

Behavior:

Start Session:

* status = active
* check_in_at saved

End Session:

* status = completed
* check_out_at saved

Countdown resets correctly after session completion.

---

## Session Actions v2

Implemented.

Actions:

### Sleep

Buttons:

* Start Sleep
* End Sleep

Saved separately in care_logs.

Displayed as a single combined Sleep card.

Example:

Sleep

10:00 AM – 11:00 AM

1h 00m

If less than one minute:

Less than 1 min

---

### Meal

Prompt:

What did they eat?

Example:

Chicken and rice

Stored in care_logs.

Displayed in Care Story:

Meal

Ate: Chicken and rice

---

### Medicine

Prompt:

What was given?

Example:

Tylenol 5ml

Displayed:

Medicine

Given: Tylenol 5ml

---

### Mood

Options:

* Happy
* Calm
* Tired
* Upset
* Sick

Displayed:

Mood

Happy

---

### Activity

Implemented.

Basic session event.

---

### Note

Implemented.

Basic session note.

---

# Care Story v3

Implemented.

Previous name:

Session Timeline

Current name:

Today's Care Story

Purpose:

Show a human-readable story of care.

Not a technical log.

Current improvements:

* Icons
* Better cards
* Event colors
* Better spacing
* Consistent timestamps
* Sleep event merging

Current event colors:

Sleep:

* soft purple

Meal:

* soft green

Medicine:

* soft orange

Mood:

* soft blue

Moments:

* soft cyan

Session events:

* neutral gray

---

# Moments v1

Implemented.

Old concept:

Photo Reports

New concept:

Moments

Reason:

Caregivers share moments.

They do not create reports.

Current language:

Section:
Moments

Heading:
Share a Moment

Button:
Add Photo Update

Prompt:
What's happening right now?

Moments automatically appear in Today's Care Story.

---

# AI Summary

Partially implemented.

Current version:

Rule-based summary.

Data sources:

* Session
* Care logs
* Moments
* Messages

Stored in:

care_sessions.summary

Future direction:

Human story.

Not technical report.

Desired example:

Today Anna cared for Willy for 3 hours. Willy enjoyed a walk, ate chicken and rice, took a nap, and stayed happy throughout the day.

---

# Product Direction

The project deliberately moved away from:

* Medical software
* Administrative software
* Care logging tools

Toward:

Family communication platform

Core emotional outcome:

Trust.

---

# Current UX Principles

Always ask:

Does this increase peace of mind?

If not:

Reconsider feature.

---

# Current Design Principles

Visual tone:

* Calm
* Soft
* Friendly
* Trustworthy

Color direction:

* Blue
* Green

Reference quality:

Apple-level simplicity.

Avoid:

* Dark themes
* Heavy dashboards
* Dense admin interfaces

---

# Next Approved Feature

## Caregiver Identity v1

Status:

Approved but not implemented.

Goal:

Show who shared updates.

Examples:

Shared by Anna

Added by Mike

Reason:

People trust people.

Not logs.

Potential implementation:

Use:

selectedSession.caregiver_name

Display beneath events and Moments.

No database migration required.

---

# Future Planned Features

Priority order:

1. Caregiver Identity v1
2. AI Daily Story
3. Messaging improvements
4. Dashboard redesign
5. Family invitations
6. Roles & permissions
7. AI assistant
8. Care insights

---

# What Must Be Preserved

The following product decisions are intentional and should not be reverted:

✓ Session Timeline renamed to Today's Care Story

✓ Photo Reports renamed to Moments

✓ Family-first language

✓ Soft blue/green CareOS design

✓ Sleep merged into single card

✓ Human-readable updates

✓ Trust-focused UX

---

# What Should Not Be Built

Do not turn CareOS into:

* EHR
* CRM
* Task manager
* Spreadsheet
* Administrative console

The product's value is emotional transparency.

Not data entry.

---

# North Star

A parent opens CareOS and immediately feels:

"My loved one is safe, cared for, and I know what their day looked like."

Every feature should move CareOS closer to that feeling.
