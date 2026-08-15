# Murmel — Redesign Brief for Claude Design

## What this is
Murmel is a personal strength + cardio training tracker (single-file HTML/CSS/JS app, dark theme, German UI). It has a coin economy, prestige/rank system, and "boss battle" style progression gamification layered on top of a workout logger. Deployed via GitHub Pages from `github.com/mauriciozagatta-rgb/Murmel`.

## Goal
Restyle the UI to lean further into the game-like aesthetic — fits the existing coin economy / prestige / boss battle theme — without changing the underlying app structure or functionality. This is a visual/CSS redesign pass, not a rebuild.

## Current design system (for reference)
- Dark theme, `--bg`, `--card`, `--line`, `--txt`, `--dim`, `--mut` custom properties
- Color language per training type: push / pull / legs each get their own accent color (`--push`, `--pull`, `--legs`), cardio has its own accent (`--cardio`) — kept separate from push/pull/legs and from gold
- Gold (`--gold`) used for rank/prestige/PR moments
- Marble/tier gamification motifs already present (rank badges, tier progression)
- `.card` components, `.step` steppers, `.seg` segmented controls, bottom tab bar (`#tabs`) — standard mobile app chrome

## Two known bugs to fix as part of this pass

### 1. Stepper clipping on iPhone
Each logged set renders a row with: set number, a weight stepper, a reps stepper, a done-checkbox, and a delete button, all in one flex row (`.setrow`, `~line 1794`). Each stepper alone is ~150px wide (two 46px +/− buttons plus a 60px value). On a 375px-wide iPhone screen minus card padding, the row needs ~440px minimum — it overflows/clips. Needs a layout that works down to 375px viewport width: candidates are stacking the two steppers vertically on narrow screens, shrinking button hit-targets, or moving delete into a swipe/long-press action instead of an inline button. Decide the approach in Claude Design.

### 2. Streak display confusion
`streakInfo()` (`~line 2988`) computes a **weekly** streak — consecutive weeks where session count met a goal — shown as "🔥 X Wochen-Streak" on the home screen and in badges. There's a separate, unrelated `habitStreak()` (`~line 4758`) for daily habit-tracking streaks, not workouts. [User: describe the specific confusion here — wrong number, unclear what it's counting, or inconsistent between screens — before or during the Claude Design session.]

## Constraints
- Visual/CSS/layout changes only — do not alter data model, state management, sync logic, or business logic
- Keep the existing push/pull/legs/cardio color language, just refine it
- Must work well on iPhone viewport widths (375px and up) — this is a PWA-style mobile-first app
- German UI text stays as-is

## Source file
`~/Documents/Murmel/Murmel.html` (single file, ~5250 lines, inline CSS + JS, no build step)
