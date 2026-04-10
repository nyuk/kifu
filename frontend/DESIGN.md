# KIFU DESIGN.md

## 1. Product Intent

KIFU is not a marketing site and not a generic admin dashboard.
It is a trading review workspace.

The product should feel like:

- a focused desk for replaying decisions
- a calm but deliberate financial tool
- a product where chart reading, review writing, and pattern inspection belong to the same system

The UI should help users answer:

- What should I do now?
- What happened at this moment?
- What did I think here?
- What pattern is repeating?

KIFU should feel denser and more intentional than a generic SaaS app, but it should never feel noisy or experimental.

## 2. Reference Mix

Use these references as structural anchors, not as skins to copy literally.

### Primary references

1. TradingView  
   Reason: chart-first hierarchy, disciplined trading workspace composition, strong control over visual noise

2. Coinbase Advanced Trade  
   Reason: compact fintech controls, trust-oriented spacing, clean action hierarchy, better fit for KIFU than general SaaS references

3. Koyfin  
   Reason: research-terminal structure, summary-plus-detail flow, strong panel discipline for analysis screens

## 3. Core Design Direction

### Mood

- Bright workspace by default
- Warm, neutral, paper-like surface
- Calm enough for long review sessions
- Structured enough to feel operational and finance-adjacent
- Never neon-heavy across the whole page
- Never flat and lifeless

### Product personality

- analytical
- restrained
- intentional
- editorial
- operational

## 4. Surface Model

Use a bright warm workspace as the default KIFU surface model.
Dark mode may exist as an option, but design decisions should optimize for the light workspace first.

### Base palette

- App background: warm ivory / pale stone
- Primary panel: soft off-white with slight warmth
- Secondary panel: muted paper card
- Border: visible but quiet parchment-gray
- Main text: charcoal, not pure black
- Muted text: warm gray-brown
- Strong UI accent: trust blue used sparingly on controls and key actions

### Accent logic

- Blue is for structure, selected control state, and trust
- Green and red are reserved for outcome or side meaning
- Amber is for caution, draft, pending, or attention
- Cyan/teal can be used sparingly for review or annotation references

### Important rule

Do not make every component neon, bright, or heavily tinted.
Accent colors should be sparse, deliberate, and easy to decode.
The light theme should still feel like a trading product, not a generic document editor.

## 5. Shape Language

- Prefer low-radius or lightly rounded corners
- Large pill-heavy UI should be reduced
- Avoid bubbly SaaS softness
- Panels should feel like desksheets or tool windows, not social cards

Recommended radius scale:

- Main panel: 10px to 14px
- Secondary card: 8px to 12px
- Small chip/button: 8px to 10px

## 6. Typography

### Goal

The interface must be easy to scan at a glance and easy to read for several minutes at a time.

### Rules

- Use sans-serif for operational UI
- Use stronger contrast before using larger size
- Prefer fewer font weights, but clear hierarchy
- Avoid tiny muted text on light backgrounds

### Hierarchy

- Page title: concise, strong, rarely more than one line
- Card title: clear and compact
- Eyebrow/meta: subtle but readable
- Supporting copy: short, not paragraph-heavy
- Numbers/stats: large enough to anchor scan flow

### Copy style

- Remove long explanatory intros unless they truly help first use
- Prefer labels that describe action directly
- Replace vague system text with user-facing wording

Good:

- 오늘의 복기
- 지금 해야 할 일
- 최근 말풍선
- 복기 스냅샷
- 차트로 이동

Avoid:

- long scene-setting intros
- duplicate descriptions across cards
- labels that repeat what the user already sees

## 7. Layout Principles

### General

- One screen should feel like one working surface
- Reduce dead air before adding more features
- Every large blank area must serve hierarchy, not happen accidentally
- Prefer fewer, stronger groupings over many floating cards

### Home

Home is a hub, not a full detail page.

Use this structure:

- Top row: `오늘의 복기` + `지금 해야 할 일`
- Second row: `최근 말풍선` + `복기 스냅샷` + `포지션 · 패턴 · 리포트`

Rules:

- Home cards should summarize and route, not fully unfold
- Avoid expanded detail modules on the home page
- Cards on the same row should feel aligned in height and density
- Compress vertical space before adding new decorative elements

### Chart

Chart remains the visual center.

Use this structure:

- Compact control bar
- Main chart
- Slim selection dock
- Event lane
- Right detail panel

Rules:

- Keep chart dominant
- Remove redundant top copy
- Keep event lane as a timeline, not a second dashboard
- Selection dock is a bridge, not a duplicate detail card

### Review

Review is a reading and decision-summary surface.

Rules:

- Emphasize sequence and clarity over decoration
- Avoid large unexplained empty regions
- Filters should feel compact and operational
- AI/report panels should feel editorial, not developer-debug
- Prefer light research-surface contrast over dark “lab tool” styling

## 8. Component Rules

### Top control bars

- Thin and compact
- No unnecessary descriptions
- Control groups should feel unified
- Labels must have enough contrast against the panel
- If a control group is not essential, remove it before styling it

### Cards

Every card should have:

- a clear title
- one dominant content area
- one optional action area

Avoid:

- stacking too many sub-cards inside one card
- mixing summary and deep detail in the same home card

### Buttons

- Primary button should be rare
- If everything is primary, nothing is primary
- Secondary buttons should still be readable and solid
- Avoid giant CTA buttons unless the whole card is about one action
- In the light theme, avoid low-contrast pastel buttons that feel disabled

### Chips and pills

- Keep compact
- Use only when they encode state or filters
- Do not rely on chip color alone for meaning

### Empty states

- Must look intentional, not like a broken layout
- Use one sentence plus one clear next step
- Avoid giant empty boxes
- Empty states should still preserve card rhythm and structure

## 9. Home Card Guidance

### 오늘의 복기

Purpose:

- start today’s review quickly
- show current progress in one glance

Should contain:

- title
- small progress summary
- one short flow/state message
- one clear start/continue button

Should not contain:

- oversized stat boxes
- long explanations
- too many nested surfaces

### 지금 해야 할 일

Purpose:

- answer “what do I do next?”

Should contain:

- 3 short prioritized actions
- small badges or states
- no oversized tiles unless absolutely necessary

### 최근 말풍선

Purpose:

- quick recall of the latest notes

Preferred form:

- compact list of recent entries
- each item: symbol, time, short note

### 복기 스냅샷

Purpose:

- quick operational status

Should contain:

- 4 key metrics max
- one short current-state line
- period/currency controls inside the card

### 포지션 · 패턴 · 리포트

Purpose:

- summary gateway to deeper areas

Should contain:

- 3 compact summaries
- short action labels

Should not contain:

- full report module
- full trend chart
- full position manager

## 10. Chart-Specific Rules

### Event lane

- Must read like a timeline
- Bubble and execution markers must feel related but distinct
- Markers must sit on the rail, not float around it
- Single markers should be compact
- Cluster counts should appear only when needed
- In light mode, marker contrast must come from form and controlled color, not glow

### Selection

- Use a soft vertical band to connect chart and event lane
- Avoid noisy marker overlays on the chart itself
- The chart should stay readable even when a moment is selected

## 11. Theme Default

KIFU should now treat the light workspace as the default design target.

This means:

- home should be optimized for warm light readability first
- chart should remain chart-first, but in a bright workspace
- review should feel like a research desk, not a dark experimental console

Dark theme, if retained, is a secondary adaptation layer.
Do not let dark-theme assumptions drive spacing, contrast, or hierarchy decisions.
## 12. Contrast Rules

This is currently one of KIFU’s biggest risks.

Do not ship:

- pale text on pale paper
- tinted text with insufficient contrast
- state colors that look stylish but are hard to read

Before increasing layout complexity, increase text readability.

## 13. Do / Don’t

### Do

- keep structure obvious
- make the next action clear
- use color sparingly but meaningfully
- keep chart and review hierarchy clean
- use warm light surfaces for reading-heavy screens
- make the bright workspace feel trustworthy and tool-like

### Don’t

- turn every card into a mini dashboard
- keep redundant intro copy
- overuse glowing accents
- hide important text with low contrast
- let home become a detail page
- duplicate the same content in dock, lane, and side panel

## 14. Implementation Priority

When modifying KIFU, apply design decisions in this order:

1. Information hierarchy
2. Layout density
3. Text contrast and readability
4. Surface and border consistency
5. Accent color meaning
6. Decorative polish

If a change looks more stylish but makes scanning harder, reject it.

## 15. Agent Usage Guide

When editing KIFU screens, follow this checklist:

1. Remove redundant headings and intros first
2. Compress oversized cards before adding new visuals
3. Keep the top row action-oriented
4. Keep the lower row summary-oriented
5. Make the chart the center on chart screens
6. Put detailed reading in the right panel or dedicated page, not everywhere

## 16. Success Criteria

The design is correct when:

- a first-time user immediately sees what to do next
- the chart feels cleaner, not busier
- the home page fits as a compact hub
- cards feel like one product, not separate experiments
- text is readable without zooming or effort
