# KIFU Stitch Design Brief

## Product

KIFU is a **trading review workspace**.

It is not:

- a marketing landing page
- a generic admin dashboard
- a developer tool

It should feel like:

- a focused desk for reviewing trades
- a calm but deliberate financial workspace
- a tool for replaying decisions, not just viewing metrics

## Core Goal

Make it easy for a user to answer:

- What should I do now?
- What happened at this point in time?
- What did I think here?
- What should I review next?

## Theme Direction

Use a **bright workspace** as the default direction.

Not pure white.
Not dark mode.
Not neon-heavy.

Preferred feel:

- warm ivory background
- soft paper panels
- quiet parchment-gray borders
- charcoal text
- restrained blue as the main structural accent

## Strong Constraints

- The chart must remain the visual center
- Remove unnecessary introductory copy
- Compress vertical height before adding more elements
- Avoid giant empty panels
- Avoid huge CTA buttons unless they are the single purpose of the card
- Avoid generic SaaS hero sections
- Avoid decorative status bars or system text

## Layout Rules

### Home

Home is a **hub**, not a full detail page.

Preferred structure:

- Row 1: `오늘의 복기` + `지금 해야 할 일`
- Row 2: `최근 말풍선` + `복기 스냅샷` + `포지션 · 패턴 · 리포트`

Rules:

- top row should be compact and actionable
- bottom row should summarize and route
- cards on the same row should feel aligned in density and height
- do not unfold large detailed submodules on home

### Chart

Preferred structure:

- compact control bar
- main chart
- slim selection dock
- event lane
- right detail panel

Rules:

- chart first, always
- event lane should feel like a timeline
- selection dock should be a bridge, not a duplicate detail card
- remove nonessential controls before styling them

### Review

Preferred structure:

- compact filter bar
- reading-oriented sections
- summary + detail rhythm

Rules:

- reduce empty areas
- keep text readable
- make AI/report areas feel editorial, not debug-like

## Component Rules

### Cards

Every card should have:

- one clear title
- one dominant content area
- one optional action area

Avoid:

- too many nested sub-cards
- mixing summary and deep detail in the same card

### Buttons

- one clear primary action per area at most
- secondary actions should still be readable
- primary blue should be rare and intentional

### Chips / pills

- compact
- meaningful
- not purely decorative

### Empty states

- intentional
- short
- one next step
- no giant dead boxes

## Visual References

Use these as inspiration, not skins to copy:

1. TradingView
   - chart-first hierarchy
   - controlled visual noise

2. Coinbase Advanced Trade
   - compact fintech controls
   - trust-oriented layout

3. Koyfin
   - research workspace composition
   - summary + detail rhythm

## What Stitch Should Improve

- better spacing hierarchy
- stronger card density without clutter
- more intentional button hierarchy
- cleaner home structure
- more coherent chart workspace layout
- better event lane composition

## What Stitch Should Not Do

- do not redesign it as a generic SaaS dashboard
- do not add marketing sections
- do not turn the chart page into a widget wall
- do not overuse gradients, neon, or dark-glass styling
- do not replace trading review with spreadsheet aesthetics
