---
name: ShowStream
description: A self-hosted media server whose interface stays quiet so that posters carry the color.
typography:
  display:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
  title:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.43
  mono:
    fontFamily: "Geist Mono Variable, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
rounded:
  sm: "0.35rem"
  md: "0.475rem"
  lg: "0.6rem"
  xl: "0.85rem"
spacing:
  gutter: "1rem"
  stack: "1rem"
  section: "3rem"
components:
  button-primary:
    backgroundColor: "var(--primary)"
    textColor: "var(--primary-foreground)"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
  button-secondary:
    backgroundColor: "var(--secondary)"
    textColor: "var(--foreground)"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
  button-destructive:
    backgroundColor: "var(--destructive)"
    textColor: "var(--destructive-foreground)"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
  input:
    textColor: "var(--foreground)"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
  card:
    backgroundColor: "var(--card)"
    textColor: "var(--foreground)"
    rounded: "{rounded.lg}"
    padding: "1rem"
---

# Design System: ShowStream

Written with `/impeccable document` on 2026-11-03 from the shipped code: `packages/ui/src/styles/tokens.css` and the preview that is now the Theme part of `/dev/components` in `apps/web`. The direction comes from `docs/PLAN.md` section 9.1. No one was available to name the qualitative language, so the North Star, the color names and the named rules below are proposals, not confirmed by the maintainer.

The color values live only in `packages/ui/src/styles/tokens.css`, which this file points to rather than copies. To change a color, or to switch to another theme, edit or paste the variables there, then run `pnpm --filter @workspace/ui test`, which checks contrast and gamut. Change this file only when a role changes.

## Overview

**Creative North Star: "The Darkened Cinema"** _(proposed)_

The room goes dark so that the screen can glow. ShowStream's interface is a cool, near-black frame around posters and backdrops, which supply all the color a screen needs. One warm amber, like the lights of a cinema marquee, marks the action that matters. Everything else steps back: tonal surfaces instead of shadows, muted text for metadata, and status colors only where a status is real.

Dark is the first theme, and light is complete rather than an afterthought. The theme follows the system unless the user picks one, and it applies before the first paint, so a reload never flashes.

The interface is an operating tool: people browse a library and press Play. Precision and consistency matter more than expression, and the brand lives in the accent, the type and the quiet.

**Key Characteristics:**

- A cool neutral base at hue 265, in both themes.
- One warm accent, used for the main action, links and focus.
- Depth through tonal layers, never shadows.
- Geist Sans for the interface and Geist Mono for technical data, served by the install itself.
- Contrast checked by a test: 7:1 for body text on the page, 4.5:1 for every other text pair, 3:1 for status and focus.

## Colors

A cool, near-neutral blue-gray at hue 265 carries every surface, with one amber accent and four status colors. The values, in OKLCH and all in the sRGB gamut, are in [`tokens.css`](packages/ui/src/styles/tokens.css), and `/dev/components` under `pnpm dev` shows each one in both themes.

The theme is shadcn's: every variable a shadcn theme defines has its own value in `:root` and in `.dark`, and `@theme inline` maps each to a Tailwind color, as `bg-card` or `text-muted-foreground`. ShowStream adds its own colors the way shadcn documents for new ones, in a second pair of blocks that a pasted theme leaves alone.

| Variable | Role |
|---|---|
| `background` | The page |
| `card` | Raised panels and cards |
| `popover` | Menus and dialogs |
| `muted` | Quiet fills, empty art |
| `secondary` | Secondary buttons, hover fills |
| `accent` | Hover and highlighted fills in menus and lists. The same value as `secondary` |
| `border` | Lines |
| `input` | Field strokes. The same value as `border` |
| `foreground` | Text |
| `card-foreground`, `popover-foreground`, `secondary-foreground`, `accent-foreground` | Text on those surfaces. The same value as `foreground` |
| `muted-foreground` | Metadata and hints |
| `primary` | The accent |
| `primary-foreground` | Text on the accent |
| `ring` | The focus ring. The same value as `primary` |
| `destructive` | Errors, and actions that cannot be undone |
| `chart-1` to `chart-5` | Series in charts, each at 3:1 or better on every surface. `chart-1` is the accent |
| `sidebar`, `sidebar-foreground`, `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-accent`, `sidebar-accent-foreground`, `sidebar-border`, `sidebar-ring` | The sidebar primitive. The same values as `card`, `foreground`, `primary`, `primary-foreground`, `secondary`, `foreground`, `border` and `primary` |

ShowStream's own:

| Variable | Role |
|---|---|
| `destructive-foreground` | Text on destructive |
| `success` | Ready, done |
| `warning` | In progress, needs attention |
| `info` | Neutral news, queued |
| `overlay` | Scrim over posters and video, dark in both themes |
| `overlay-foreground` | Text on the scrim, in both themes |

### Primary

- **Marquee Amber** (`primary`): the main action on a screen, such as Play, plus links and the focus ring. Bright amber on dark, and a deep burnt amber on light, so that text on it reads at 4.5:1 or better.

### Neutral

- **Projection Black** (`background`, dark): the room around the screen. **Paper Gray** (`background`, light) is its daytime counterpart.
- **Stage Gray** (`card`, `popover`, `muted`, `secondary`): three steps of lift, each a little lighter in dark mode, for panels, menus and quiet fills.
- **Screen White** (`foreground`) and **Credits Gray** (`muted-foreground`): text, and the metadata under it.
- **Seam Gray** (`border`): the lines between things, and the stroke of a field.

### Status

- **Green Light** (`success`), **Amber Signal** (`warning`), **Cool Blue** (`info`) and **Red Alert** (`destructive`). Status colors appear as text, a dot or an icon on any surface, at 3:1 or better.

### Named Rules

**The One Warm Light Rule.** `primary` is the only warm color in the chrome. Use it for the main action of a screen and for focus, not for decoration, so that the eye finds Play first.

**The Poster Owns the Color Rule.** Surfaces stay neutral at hue 265. Color comes from artwork, and from status only when there is a status to report.

**The One Place Rule.** Every color is a variable in `tokens.css`, and nowhere else. The accent appears in `primary`, `ring`, `chart-1`, `sidebar-primary` and `sidebar-ring`, so change them together. The contrast test checks the result.

## Typography

**Display Font:** Geist Variable (with `ui-sans-serif`, `system-ui`, `sans-serif`)
**Body Font:** Geist Variable
**Label/Mono Font:** Geist Mono Variable (with `ui-monospace`, `monospace`)

**Character:** One neutral, precise grotesque for everything people read, and its monospaced sibling for technical facts. Both come from `@fontsource-variable` and are bundled by Vite, so the install serves them and no font CDN is asked.

### Hierarchy

- **Display** (600, 1.875rem, tight tracking): a page title on a large screen, such as the preview's heading.
- **Headline** (600, 1.5rem): the heading of a single-purpose page, such as login and setup.
- **Title** (600, 1.25rem): section headings.
- **Body** (400, 1rem, line-height 1.5): running text and form fields. Keep descriptions to about 65ch.
- **Label** (500, 0.875rem): buttons, field labels, metadata.
- **Mono** (400, 0.875rem): codecs, resolutions, timecodes, paths and other values a person might compare or copy. Use `tabular-nums` where digits line up.

### Named Rules

**The Mono Means Data Rule.** Geist Mono is for measured values only, never for a "technical" look.

## Layout

`PageContainer` gives every page its width: `max-w-3xl` for text and forms, `max-w-7xl` for libraries, and the full width for heroes and the player, with a `1rem` side gutter, `2rem` from `md`. The poster grid has 2 columns on a phone, and steps to 3, 4, 5 and 6 at `sm`, `md`, `lg` and `xl`. Sections are `3rem` apart, and related items `0.5rem` to `1rem`. Everything works at 390px wide with no horizontal scroll.

## Elevation & Depth

Flat. There are no shadows. Depth comes from tonal steps: `background`, then `card`, then `popover`, each a little lighter in dark mode, with a `border` line where two surfaces meet. Over artwork, depth comes from the `overlay` scrim.

**The Tonal Lift Rule.** To raise a surface, move it one step up the neutral scale and give it a border. Never add a shadow.

**The Scrim Rule.** Text over a poster sits on `overlay` at 75% or stronger, usually as a gradient from the bottom. At 75% over a white poster, `overlay-foreground` still reads at 4.5:1, which the contrast test checks. `overlay` at 25% only dims art, and carries no text.

## Shapes

Gently rounded corners from one radius, `0.6rem` (`--radius`). Steps derive from it: small (`0.35rem`) for tight elements, medium (`0.475rem`) for buttons and fields, large (`0.6rem`) for cards and posters, extra large (`0.85rem`) for large panels. Borders are 1px in `border`. Posters keep the 2:3 ratio and clip to the large radius.

## Components

The primitives in `@workspace/ui` are shadcn's `base-nova` style on Base UI, kept close to upstream, and `/dev/components` under `pnpm dev` shows each one, and every pattern, in both themes. They style through Tailwind utilities on the variables above, and merge classes with `cn()`. Upstream gives floating layers, such as menus, popovers, selects and sheets, a small shadow, which they keep for now against the Tonal Lift Rule above; the maintainer decides whether it stays. The patterns in `packages/ui/src/patterns` build on them, as the last part of this section describes. Until the screens move to the patterns in item 6, the descriptions of buttons, cards and fields below are of the plain elements `apps/web` uses.

### Buttons

- **Shape:** medium radius (`0.475rem`).
- **Primary:** `primary` with `primary-foreground`, label type, `0.5rem 0.75rem` padding. One per screen.
- **Secondary:** `secondary` with `secondary-foreground`, for the other actions.
- **Outline:** a `border` stroke on a transparent fill, for a quiet alternative.
- **Destructive:** `destructive` with `destructive-foreground`, only for what cannot be undone.
- **Disabled:** 60% opacity.
- **Focus:** the global ring.

### Cards / Containers

- **Corner Style:** large radius (`0.6rem`).
- **Background:** `card`, with `card-foreground` text.
- **Shadow Strategy:** none. See Elevation & Depth.
- **Border:** 1px `border`.
- **Internal Padding:** `1rem`.

### Inputs / Fields

- **Style:** a 1px `input` stroke on a transparent fill, medium radius, `0.5rem 0.75rem` padding.
- **Focus:** the global ring.
- **Error:** the stroke turns `destructive`, and the message below it is `destructive` text at label size.

### Patterns

- **Poster card** (`MediaCard`): the poster at 2:3 with the large radius and a `border` ring, the title in label type and the year in `muted-foreground` below. The ring turns `ring` on hover. A status badge sits at the top left of the poster and a round Play at the bottom right, beside the link rather than inside it.
- **Status badge** (`StatusBadge`): an outline badge on an opaque `card` fill, so that it reads on artwork without a scrim. The word is `foreground`, and only the icon takes `success`, `warning`, `info` or `destructive`.
- **Missing art** (`MediaImage`): a `muted` fill at the art's own size, with a film icon and the title in `muted-foreground`.
- **Hero** (`MediaHero`): the backdrop fills the section and fades into `background` from the bottom on a phone and from the left on a wide screen, so the title, details and actions sit on the page's own color. The poster shows beside the text from `md` up.
- **Player**: controls sit on an `overlay` gradient from the bottom, in `overlay-foreground`, with the time in Geist Mono and `tabular-nums`. They hide after 3 seconds of playback.
- **States**: empty and error states center an icon, a title and a short line, with one action. Loading keeps the layout with `muted` skeletons in the same grid.
- **Navigation**: a sidebar that collapses to icons on a wide screen, and a bottom bar on a phone, with the current item in `primary`.

### Focus ring

Primitives and patterns use shadcn's ring on `:focus-visible`: 3px of `ring` at 50%, with a border in `ring` on fields and buttons. Plain elements keep the 2px `ring` outline, offset by 2px, from the base styles in `tokens.css`. `ring` is the accent, and the contrast test checks that it reads at 3:1 or better on every surface.

### Browser surfaces

Text selection is the accent at 30%. The caret, checkboxes and other native controls take the accent, and scrollbars use `border` on a transparent track. `color-scheme` follows the theme, so native controls and the canvas match it.

## Do's and Don'ts

### Do:

- **Do** use the semantic utilities, such as `bg-card`, `text-muted-foreground` and `border-border`, for every color.
- **Do** keep one `primary` action per screen.
- **Do** show status with `success`, `warning`, `info` or `destructive`, paired with a word or icon, never color alone.
- **Do** put text over artwork on `overlay` at 75% or stronger.
- **Do** check new screens in both themes, at 390px and 1280px, by keyboard.

### Don't:

- **Don't** use raw colors such as `text-red-500`, hex values or `bg-black` in `apps/web`. A test fails on them.
- **Don't** add shadows. Raise a surface with a tonal step and a border.
- **Don't** add a second accent or tint surfaces with color.
- **Don't** load fonts from a CDN. They ship with the app.
- **Don't** set a `dark` class on anything but `<html>`, except to preview a theme. The theme provider owns it.
